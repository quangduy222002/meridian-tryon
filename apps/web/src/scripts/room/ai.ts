/**
 * AI furnishing: describe a room ("bedroom for two with a desk") and Claude lays out furniture from the catalogue
 * inside that room. Runs in the browser with the visitor's own Anthropic API key (no server), and loads only when
 * someone presses "Furnish".
 */
import Anthropic from '@anthropic-ai/sdk';
import { FURNITURE } from './catalog';
import { nodeMap, pointInPoly, roomName, type Item, type Plan, type Room, type Vec2 } from './plan';

export interface AiItem {
  type: string;
  x: number;
  z: number;
  rot: number;
  color: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Describes the room's edges (wall centrelines), their thickness and the doors and windows on them. */
function describeRoom(p: Plan, room: Room) {
  const nodes = nodeMap(p);
  const edges = room.nodes.map((id, i) => {
    const a = nodes.get(id)!;
    const b = nodes.get(room.nodes[(i + 1) % room.nodes.length]!)!;
    const wall = p.walls.find((w) => (w.a === a.id && w.b === b.id) || (w.a === b.id && w.b === a.id));
    const L = Math.hypot(b.x - a.x, b.z - a.z);
    const openings = (wall ? p.openings.filter((o) => o.wall === wall.id) : []).map((o) => {
      const t = wall!.a === a.id ? o.t : 1 - o.t;
      return `${o.kind} ${o.width.toFixed(2)} m wide centred at (${r2(a.x + (b.x - a.x) * t)}, ${r2(a.z + (b.z - a.z) * t)})`;
    });
    return `- from (${r2(a.x)}, ${r2(a.z)}) to (${r2(b.x)}, ${r2(b.z)}), ${L.toFixed(2)} m long, wall ${((wall?.thick ?? 0.15) * 100).toFixed(0)} cm thick${openings.length ? `; ${openings.join('; ')}` : ''}`;
  });
  return edges.join('\n');
}

const systemPrompt = (
  p: Plan,
  room: Room,
  keep: Item[],
) => `You are an interior designer laying out furniture in one room of a floor plan.

Coordinates are metres on the plan: x grows to the right, z grows downwards (towards the bottom of the plan).
The room "${roomName(p, room)}" (${room.area.toFixed(1)} m²) is the polygon with these edges, given as wall centrelines:
${describeRoom(p, room)}

Furniture you can use (type: name, width × depth × height in metres, colours):
${Object.entries(FURNITURE)
  .map(([t, d]) => `- ${t}: ${d.name}, ${d.w} × ${d.d} × ${d.h}, colours ${d.colors.join(' ')}`)
  .join('\n')}

Placing an item: x, z is the centre of its footprint. rot is clockwise in degrees, one of 0, 90, 180, 270.
At rot 0 the width runs along x, the depth along z, and the front faces +z (down the plan), so its back is against a wall above it.
rot 180: front faces -z (back against a wall below it). rot 90: front faces -x (back against a wall on its right). rot 270: front faces +x (back against a wall on its left).
To put an item flush against a wall, place its centre (wall thickness / 2 + item depth / 2 + 0.01) from the wall's centreline.

Rules: every footprint must lie fully inside the room; items must not overlap each other (rugs may sit under sofas, beds and tables); keep door openings and a 0.9 m arc in front of each door clear; keep 0.6 m walkways; do not block windows with tall items (wardrobes, bookshelves, fridges); beds need access from both sides when the room allows; face sofas towards a TV unit when both are used.
${keep.length ? `Already in the room and staying (do not overlap them):\n${keep.map((i) => `- ${i.type} at (${r2(i.x)}, ${r2(i.z)}) rot ${i.rot}`).join('\n')}` : 'The room is empty.'}

Only use what the request needs; a summary of one sentence in the request's language.`;

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'summary'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'x', 'z', 'rot', 'color'],
        properties: {
          type: { type: 'string', enum: Object.keys(FURNITURE) },
          x: { type: 'number' },
          z: { type: 'number' },
          rot: { type: 'integer', enum: [0, 90, 180, 270] },
          color: { type: 'string' },
        },
      },
    },
    summary: { type: 'string' },
  },
};

/** Footprint corners of an item in plan space. */
function corners(it: AiItem): Vec2[] {
  const d = FURNITURE[it.type]!;
  const a = (it.rot * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    [-d.w / 2, -d.d / 2],
    [d.w / 2, -d.d / 2],
    [d.w / 2, d.d / 2],
    [-d.w / 2, d.d / 2],
  ].map(([x, z]) => [it.x + x! * c - z! * s, it.z + x! * s + z! * c] as Vec2);
}

/** Nudges an item towards the room's centre until its whole footprint is inside the room. */
function keepInside(it: AiItem, room: Room) {
  for (let i = 0; i < 40 && !corners(it).every((q) => pointInPoly(q, room.poly)); i++) {
    const dx = room.centroid[0] - it.x;
    const dz = room.centroid[1] - it.z;
    const l = Math.hypot(dx, dz) || 1;
    it.x += (dx / l) * 0.05;
    it.z += (dz / l) * 0.05;
  }
}

/** Asks Claude for a layout. Throws an Error whose message is safe to show. */
export async function furnishRoom(apiKey: string, request: string, p: Plan, room: Room, keep: Item[]) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  let res: Anthropic.Beta.BetaMessage;
  try {
    res = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      // If the model declines, the API retries on a fallback model inside the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
      system: systemPrompt(p, room, keep),
      messages: [{ role: 'user', content: request }],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError)
      throw new Error('That API key was rejected. Check it and try again.', { cause: err });
    if (err instanceof Anthropic.PermissionDeniedError)
      throw new Error('This API key is not allowed to use the model.', { cause: err });
    if (err instanceof Anthropic.RateLimitError)
      throw new Error('Rate limited by Anthropic — wait a moment and retry.', { cause: err });
    if (err instanceof Anthropic.APIConnectionError)
      throw new Error('Could not reach Anthropic. Check your connection.', { cause: err });
    if (err instanceof Anthropic.APIError)
      throw new Error(`Anthropic API error ${err.status ?? ''}: ${err.message}`, { cause: err });
    throw err;
  }
  if (res.stop_reason === 'refusal') throw new Error('The model declined this request. Try rephrasing it.');
  if (res.stop_reason === 'max_tokens') throw new Error('The answer was cut off. Try a simpler request.');
  const text = res.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('The model returned no layout. Try again.');
  let out: { items: AiItem[]; summary: string };
  try {
    out = JSON.parse(text.text) as { items: AiItem[]; summary: string };
  } catch {
    throw new Error('The model returned an unreadable layout. Try again.');
  }
  const items = (out.items ?? [])
    .filter((i) => FURNITURE[i.type] && Number.isFinite(i.x) && Number.isFinite(i.z))
    .map((i) => {
      const def = FURNITURE[i.type]!;
      const it: AiItem = {
        type: i.type,
        x: i.x,
        z: i.z,
        rot: (((Math.round((i.rot ?? 0) / 90) * 90) % 360) + 360) % 360,
        color: def.colors.includes(i.color) ? i.color : def.colors[0]!,
      };
      keepInside(it, room);
      return it;
    });
  if (!items.length) throw new Error('The model placed nothing. Try describing the room differently.');
  return { items, summary: out.summary ?? '' };
}
