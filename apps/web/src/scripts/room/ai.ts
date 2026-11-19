/**
 * AI furnishing: describe a room ("bedroom for two with a desk") and Claude lays out furniture from the catalogue
 * inside that room. Runs in the browser, on the viewer's own Claude account when the page is a claude.ai Artifact,
 * else with the visitor's own Anthropic API key (no server either way). Loads only when someone presses "Furnish".
 */
import { hostFailure, type HostSample } from '../../lib/claude-host';
import { FURNITURE } from './catalog';
import { STYLES } from './styles';
import { nodeMap, pointInPoly, roomName, type Item, type Plan, type Room, type Vec2 } from './plan';

export interface AiItem {
  type: string;
  x: number;
  z: number;
  rot: number;
  color: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Compass point a plan direction faces, given where north is (degrees clockwise from "up" on the plan). */
function compass(dx: number, dz: number, north: number) {
  const bearing = ((Math.atan2(dx, -dz) * 180) / Math.PI - north + 720) % 360;
  return ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][
    Math.round(bearing / 45) % 8
  ]!;
}

/**
 * Describes the room's edges (wall centrelines): length, thickness, whether the wall is outside or shared, and the
 * doors and windows on it, with the way each window looks out.
 */
function describeRoom(p: Plan, room: Room) {
  const nodes = nodeMap(p);
  const edges = room.nodes.map((id, i) => {
    const a = nodes.get(id)!;
    const b = nodes.get(room.nodes[(i + 1) % room.nodes.length]!)!;
    const wall = p.walls.find((w) => (w.a === a.id && w.b === b.id) || (w.a === b.id && w.b === a.id));
    const L = Math.hypot(b.x - a.x, b.z - a.z);
    // Outward normal: the side of the edge that is not in the room.
    let n: Vec2 = [-(b.z - a.z) / L, (b.x - a.x) / L];
    const mid: Vec2 = [(a.x + b.x) / 2, (a.z + b.z) / 2];
    if (pointInPoly([mid[0] + n[0] * 0.3, mid[1] + n[1] * 0.3], room.poly)) n = [-n[0], -n[1]];
    const openings = (wall ? p.openings.filter((o) => o.wall === wall.id) : []).map((o) => {
      const t = wall!.a === a.id ? o.t : 1 - o.t;
      const at = `centred at (${r2(a.x + (b.x - a.x) * t)}, ${r2(a.z + (b.z - a.z) * t)})`;
      if (o.kind === 'door') return `${o.leaves === 2 ? 'double door' : 'door'} ${o.width.toFixed(2)} m wide ${at}`;
      const kind = o.tall ? 'glass door to the outside' : 'window';
      return `${kind} ${o.width.toFixed(2)} m wide ${at}, facing ${compass(n[0], n[1], p.north)}`;
    });
    const what = wall?.rail ? 'railing' : `wall ${((wall?.thick ?? 0.15) * 100).toFixed(0)} cm thick`;
    return `- from (${r2(a.x)}, ${r2(a.z)}) to (${r2(b.x)}, ${r2(b.z)}), ${L.toFixed(2)} m long, ${what}${openings.length ? `; ${openings.join('; ')}` : ''}`;
  });
  return edges.join('\n');
}

/** What a seasoned residential designer weighs for each kind of room. */
const ROOM_GUIDE: Record<string, string> = {
  Living: `Living room: one conversation group (sofa, armchairs) within about 2.4 m across, around a focal point (TV wall or window). Viewing distance from sofa to TV about 2.0–3.0 m, screen square to the seats. Coffee table 0.40–0.45 m in front of the sofa. Sofa back against a wall or floating with a 0.9 m walkway behind it, never blocking the way from the entrance. A rug under at least the front legs of the seating.`,
  'Living & kitchen': `Open living and kitchen: kitchen run along a wall with 1.0–1.2 m clear in front of it; dining table between kitchen and living as the transition; living group facing away from the kitchen towards the TV or window; a clear route from the entrance to the kitchen.`,
  Kitchen: `Kitchen: counter along a wall, fridge at the end of the run (never in the middle), 1.0–1.2 m clear in front of counters; keep the sink–hob–fridge triangle short (each leg 1.2–2.7 m).`,
  Dining: `Dining: table centred under the light with 0.9 m from each table edge to walls or furniture (1.2 m where people walk behind seated guests).`,
  Bedroom: `Bedroom: headboard against a solid wall, not under a window and not in line with the door (in Vietnamese practice the bed should not face the door directly; also no mirror facing the bed). 0.6–0.7 m free on both sides of a double bed and about 0.9 m at the foot. Nightstands on both sides. Wardrobe on a solid wall with 0.9 m clear in front. A desk, if asked, by the window with daylight from the side.`,
  Study: `Study: desk by a window with daylight from the side (from the left for a right-handed person), not with the back to the door; shelving on a solid wall; 0.9 m behind the chair.`,
  Bathroom: `Bathroom: WC with 0.2 m to the side walls and 0.6 m clear in front, ideally not seen first from the door; vanity near the door with 0.7 m in front; bath or shower on the far, wet end.`,
  Balcony: `Balcony: keep it light and open — a plant or two and at most a small seat; leave the glass door and a 0.9 m path clear.`,
  Hall: `Hall: keep it a clear route of at least 0.9 m; at most a slim piece (plant, bookshelf) against a wall.`,
};

const systemPrompt = (p: Plan, room: Room, keep: Item[], styleId?: string) => {
  const st = styleId ? STYLES[styleId] : undefined;
  const name = roomName(p, room);
  const xs = room.poly.map((q) => q[0]);
  const zs = room.poly.map((q) => q[1]);
  return `You are a senior interior architect with years of residential practice, laying out furniture in one room of a floor plan the way you would for a paying client: functional first, then comfortable, then beautiful.

How you work:
1. Read the room: its shape, where people enter, where daylight comes from, which walls are solid (they take tall furniture and headboards) and the routes people take between doors.
2. Decide the zones and the focal point before placing anything, and keep each zone compact.
3. Place the largest pieces first, against solid walls and parallel to them; then the pieces that serve them; leave the rest of the floor open. A good room keeps roughly 40–50 % of its floor free.
4. Check every clearance below, then balance the room visually (do not push everything to one side).

Clearances and rules that always apply:
- Every footprint lies fully inside the room; items never overlap (rugs may sit under sofas, beds and tables).
- Keep each door's 0.9 m swing and the space in front of it clear; main routes 0.9 m wide, secondary ones at least 0.6 m.
- Do not block windows or glass doors with tall items (wardrobes, bookshelves, fridges); low pieces may sit under a window.
- Backs of sofas, beds, desks and cabinets go against walls unless a floating layout is clearly better and keeps the clearances.
- Use only what the request needs, at the scale the room can take: a small room gets fewer, well-chosen pieces.
- Colours: one palette for the whole room, one accent at most${st ? ' (use the style palette below)' : " (choose from each item's listed colours)"}.
${
  st
    ? `
Design style: ${st.name} (${st.vi}). ${st.brief}
Palette (hex, use these for the items' colours): timber ${st.wood}; upholstery ${st.fabric.join(' ')}; cabinetry ${st.cases.join(' ')}; accents ${st.accent.join(' ')}.
Pieces that make this style read, to reach for first where the room and the request allow: ${st.signature.map((t) => FURNITURE[t]?.name ?? t).join(', ')}.`
    : ''
}
${(() => {
  const guide = ROOM_GUIDE[name] ?? Object.entries(ROOM_GUIDE).find(([k]) => name.includes(k))?.[1];
  return guide ? `\nFor this room — ${guide}` : '';
})()}

The plan: coordinates are metres; x grows to the right, z grows downwards (towards the bottom of the plan).
The room "${name}" (${room.area.toFixed(1)} m², about ${(Math.max(...xs) - Math.min(...xs)).toFixed(1)} × ${(Math.max(...zs) - Math.min(...zs)).toFixed(1)} m) is the polygon with these edges, given as wall centrelines:
${describeRoom(p, room)}

Furniture you can use (type: name [group: pieces in one group are alternatives], width × depth × height in metres, default colours). Pick the model that fits the room and the request (a 2-seat sofa in a small living room, a corner sofa in a large one, a single bed in a child's room). "art" hangs on a wall: place it against a solid wall like any other piece, above a sofa, bed or sideboard.
${Object.entries(FURNITURE)
  .map(([t, d]) => `- ${t}: ${d.name} [${d.group}], ${d.w} × ${d.d} × ${d.h}, colours ${d.colors.join(' ')}`)
  .join('\n')}

Placing an item: x, z is the centre of its footprint. rot is clockwise in degrees, one of 0, 90, 180, 270.
At rot 0 the width runs along x, the depth along z, and the front faces +z (down the plan), so its back is against a wall above it.
rot 180: front faces -z (back against a wall below it). rot 90: front faces -x (back against a wall on its right). rot 270: front faces +x (back against a wall on its left).
To put an item flush against a wall, place its centre (wall thickness / 2 + item depth / 2 + 0.01) from the wall's centreline.
${keep.length ? `Already in the room and staying (do not overlap them):\n${keep.map((i) => `- ${i.type} at (${r2(i.x)}, ${r2(i.z)}) rot ${i.rot}`).join('\n')}` : 'The room is empty.'}

The summary: one or two sentences in the language of the request, as you would explain the layout to the client — the zones and the main reason behind them (light, circulation, focal point), not a list of items.`;
};

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

type Layout = { items: AiItem[]; summary: string };

/** Through the host's Claude (claude.ai Artifact): the same brief, with the JSON shape spelled out. */
async function askHost(
  sample: HostSample,
  request: string,
  p: Plan,
  room: Room,
  keep: Item[],
  styleId?: string,
): Promise<Layout> {
  const prompt = `${systemPrompt(p, room, keep, styleId)}

The request: ${request}

Reply with only a JSON object: {"items": [{"type": string, "x": number, "z": number, "rot": 0 | 90 | 180 | 270, "color": string}], "summary": string}.`;
  try {
    return await sample.json<Layout>(prompt);
  } catch (err) {
    throw new Error(hostFailure(err), { cause: err });
  }
}

/** Through the Anthropic API with the visitor's key. */
async function askApi(
  apiKey: string,
  request: string,
  p: Plan,
  room: Room,
  keep: Item[],
  styleId?: string,
): Promise<Layout> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  let res: Awaited<ReturnType<typeof client.beta.messages.create>>;
  try {
    res = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      // If the model declines, the API retries on a fallback model inside the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
      system: systemPrompt(p, room, keep, styleId),
      messages: [{ role: 'user', content: request }],
      stream: false,
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
  try {
    return JSON.parse(text.text) as Layout;
  } catch {
    throw new Error('The model returned an unreadable layout. Try again.');
  }
}

/**
 * Asks Claude for a layout — through the host page's Claude when given one, else the Anthropic API with a key.
 * Throws an Error whose message is safe to show.
 */
export async function furnishRoom(
  brain: string | HostSample,
  request: string,
  p: Plan,
  room: Room,
  keep: Item[],
  styleId?: string,
) {
  const out =
    typeof brain === 'string'
      ? await askApi(brain, request, p, room, keep, styleId)
      : await askHost(brain, request, p, room, keep, styleId);
  if (!out || !Array.isArray(out.items)) throw new Error('The model returned no layout. Try again.');
  const items = (out.items ?? [])
    .filter((i) => FURNITURE[i.type] && Number.isFinite(i.x) && Number.isFinite(i.z))
    .map((i) => {
      const def = FURNITURE[i.type]!;
      const it: AiItem = {
        type: i.type,
        x: i.x,
        z: i.z,
        rot: (((Math.round((i.rot ?? 0) / 90) * 90) % 360) + 360) % 360,
        // Any palette colour the model chose (styles bring their own), else the piece's default.
        color: /^#[0-9a-f]{6}$/i.test(i.color ?? '') ? i.color : def.colors[0]!,
      };
      keepInside(it, room);
      return it;
    });
  if (!items.length) throw new Error('The model placed nothing. Try describing the room differently.');
  return { items, summary: out.summary ?? '' };
}
