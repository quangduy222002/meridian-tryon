/**
 * AI furnishing: describe a room ("bedroom for two with a desk") and Claude lays out furniture from the catalogue
 * inside that room. Runs in the browser, on the viewer's own Claude account when the page is a claude.ai Artifact,
 * else with the visitor's own Anthropic API key (no server either way). Loads only when someone presses "Furnish".
 */
import { hostFailure, type HostSample } from '../../lib/claude-host';
import { FLOORS, FURNITURE, WALLS } from './catalog';
import { CUSTOM_FORMAT, customId, registerCustoms, sanitizeCustom, type CustomDef } from './custom';
import { STYLES, type DesignStyle, type Legs } from './styles';
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
- Light the room in layers with the [Lighting] fittings (ceiling fittings never collide with floor furniture; wall lights go flush against a wall): general light from downlights about 1.2–1.5 m apart and 0.6–0.7 m from the walls, or one ceiling light in a small room; task light from a pendant centred over the dining table, a light over the vanity mirror, a floor lamp by a reading chair or desk; accent light from wall lights either side of the bed and near artwork. Add lighting unless the request says not to.
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
  .filter(([, d]) => d.group !== 'Stairs')
  .map(([t, d]) => `- ${t}: ${d.name} [${d.group}], ${d.w} × ${d.d} × ${d.h}, colours ${d.colors.join(' ')}`)
  .join('\n')}

Placing an item: x, z is the centre of its footprint. rot is clockwise in degrees, one of 0, 90, 180, 270.
At rot 0 the width runs along x, the depth along z, and the front faces +z (down the plan), so its back is against a wall above it.
rot 180: front faces -z (back against a wall below it). rot 90: front faces -x (back against a wall on its right). rot 270: front faces +x (back against a wall on its left).
To put an item flush against a wall, place its centre (wall thickness / 2 + item depth / 2 + 0.01) from the wall's centreline.
${keep.length ? `Already in the room and staying (do not overlap them):\n${keep.map((i) => `- ${i.type} at (${r2(i.x)}, ${r2(i.z)}) rot ${i.rot}`).join('\n')}` : 'The room is empty.'}

The summary: one or two sentences in the language of the request, as you would explain the layout to the client — the zones and the main reason behind them (light, circulation, focal point), not a list of items.`;
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

type Layout = { items: AiItem[]; summary: string; customs?: Record<string, unknown> };

/** Claude, through the host page (claude.ai Artifact) or the Anthropic API with a key. */
export type Brain = string | HostSample;

/** The first JSON value in a reply (a fenced block, or from the first brace to the last). */
function parseJson<T>(text: string): T {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text)?.[1];
  const raw = fenced ?? text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  return JSON.parse(raw) as T;
}

async function toBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/**
 * Asks Claude for JSON: `system` holds the brief, `user` the request; `images` (PNG or JPEG) are shown with it. Throws an
 * Error whose message is safe to show.
 */
export async function askJson<T>(brain: Brain, system: string, user: string, images: Blob[] = []): Promise<T> {
  if (typeof brain !== 'string') {
    try {
      return await brain.json<T>(`${system}\n\n${user}`, images.length ? { images } : undefined);
    } catch (err) {
      throw new Error(hostFailure(err), { cause: err });
    }
  }
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: brain, dangerouslyAllowBrowser: true });
  let res: Awaited<ReturnType<typeof client.beta.messages.create>>;
  try {
    const content = [
      ...(await Promise.all(
        images.map(async (b) => ({
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: b.type === 'image/jpeg' ? ('image/jpeg' as const) : ('image/png' as const),
            data: await toBase64(b),
          },
        })),
      )),
      { type: 'text' as const, text: user },
    ];
    res = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      // If the model declines, the API retries on a fallback model inside the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system: `${system}\n\nReply with the JSON only.`,
      messages: [{ role: 'user', content }],
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
  if (res.stop_reason === 'max_tokens') throw new Error('The answer was cut off. Try asking for less at once.');
  const text = res.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('The model returned no answer. Try again.');
  try {
    return parseJson<T>(text.text);
  } catch {
    throw new Error('The model returned an unreadable answer. Try again.');
  }
}

/** Registers the customs an answer defined into the plan; returns their types (`custom:<id>`) by the answer's ids. */
function adoptCustoms(p: Plan, raw: Record<string, unknown> | undefined) {
  const types = new Map<string, string>();
  for (const [key, def] of Object.entries(raw ?? {})) {
    const clean = sanitizeCustom(def);
    if (!clean) continue;
    p.customs ??= {};
    const id = customId(clean.name, p.customs);
    p.customs[id] = clean;
    types.set(key, `custom:${id}`);
  }
  registerCustoms(p.customs);
  return types;
}

/**
 * Asks Claude for a layout. Pieces the catalogue lacks may be defined on the way (they join plan.customs).
 * Throws an Error whose message is safe to show.
 */
export async function furnishRoom(
  brain: Brain,
  request: string,
  p: Plan,
  room: Room,
  keep: Item[],
  styleId?: string,
  /** The client's reference photo(s): the room should feel like them. */
  references: Blob[] = [],
) {
  const out = await askJson<Layout>(
    brain,
    systemPrompt(p, room, keep, styleId),
    `The request: ${request}
${references.length ? "\nThe attached photo is the client's reference: match its mood, materials, palette and the kinds of pieces in it (the same sort of sofa, tables, plants, lighting), adapted to this room's size and plan.\n" : ''}
If the request needs something the list doesn't have (a piano, a spiral staircase, an aquarium, a built-in seat…), define it yourself under "customs" and use "custom:<its id>" as the item's type.
${CUSTOM_FORMAT}

Reply with only a JSON object: {"items": [{"type": string, "x": number, "z": number, "rot": 0 | 90 | 180 | 270, "color": string}], "customs"?: {"<id>": <definition>}, "summary": string}.`,
    references,
  );
  if (!out || !Array.isArray(out.items)) throw new Error('The model returned no layout. Try again.');
  const customTypes = adoptCustoms(p, out.customs);
  const items = (out.items ?? [])
    .map((i) => ({ ...i, type: i.type?.startsWith('custom:') ? (customTypes.get(i.type.slice(7)) ?? i.type) : i.type }))
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

/** A clarifying question from Claude, with likely answers to pick from. */
export interface AiQuestion {
  id: string;
  text: string;
  options?: string[];
}

/**
 * Designs one object from a description ("a spiral staircase 1.6 m across", "a grand piano"). Claude may first ask
 * one question when guessing would likely be wrong; `answers` carries what the client said so far.
 */
export async function designObject(
  brain: Brain,
  description: string,
  answers: { q: string; a: string }[],
  styleId?: string,
): Promise<{ question: AiQuestion } | { def: CustomDef }> {
  const st = styleId ? STYLES[styleId] : undefined;
  const out = await askJson<{ question?: string; options?: string[]; object?: unknown }>(
    brain,
    `You are a 3D modeller for an interior design planner. You build objects the planner's catalogue doesn't have, at real size, as a kit of simple parts.
${CUSTOM_FORMAT}
${st ? `The home is in the ${st.name} style: use its materials and palette (timber ${st.wood}, metal ${st.metal}, upholstery ${st.fabric.join(' ')}, accents ${st.accent.join(' ')}).` : ''}
If something essential is unclear and a guess would probably be wrong (for a staircase: how high it rises, its diameter or width; for furniture: its size or how many it seats), ask exactly one short question as {"question": string, "options": [2 to 4 likely answers]}. Ask at most two questions in total; otherwise, or once answered, reply {"object": <definition>}. Use the language of the client's description for questions.`,
    `The client asks for: ${description}${answers.length ? `\n\nAlready answered:\n${answers.map((x) => `- ${x.q} → ${x.a}`).join('\n')}` : ''}`,
  );
  if (out.question && answers.length < 2)
    return {
      question: { id: 'q', text: out.question, options: out.options?.filter((o) => typeof o === 'string').slice(0, 4) },
    };
  const def = sanitizeCustom(out.object);
  if (!def) throw new Error('The model could not build that object. Try describing it differently.');
  return { def };
}

/** What Claude read on the drawing: questions for the client, then the pieces it found. */
export interface DrawingReading {
  questions: AiQuestion[];
  found: { label: string; item: Omit<Item, 'id'>; custom?: boolean }[];
  notes: string;
}

/**
 * Reads the selected area of a drawing (an image of it) against the plan built from it: recognises symbols the
 * detector doesn't (stairs of any shape, sanitary ware, built-ins, furniture, columns) and places them, with
 * catalogue pieces where they fit and new objects where they don't. It may ask questions first; `answers` are the
 * client's replies.
 */
export async function readDrawing(
  brain: Brain,
  image: Blob,
  metresPerPixel: number,
  size: { w: number; h: number },
  p: Plan,
  rooms: Room[],
  answers: { q: string; a: string }[] = [],
): Promise<DrawingReading> {
  const roomList = rooms
    .map((r) => {
      const xs = r.poly.map((q) => q[0]);
      const zs = r.poly.map((q) => q[1]);
      return `- ${roomName(p, r)} ${r.area.toFixed(1)} m², x ${Math.min(...xs).toFixed(2)}–${Math.max(...xs).toFixed(2)}, z ${Math.min(...zs).toFixed(2)}–${Math.max(...zs).toFixed(2)}`;
    })
    .join('\n');
  const catalogue = Object.entries(FURNITURE)
    .filter(([, d]) => !d.custom)
    .map(([t, d]) => `${t} (${d.name}, ${d.w}×${d.d} m)`)
    .join('; ');
  const out = await askJson<{
    questions?: { text?: string; options?: string[] }[];
    items?: { label?: string; type?: string; x?: number; z?: number; rot?: number }[];
    customs?: Record<string, unknown>;
    notes?: string;
  }>(
    brain,
    `You are an architect reading a floor plan drawing for an interior planner. The image is the part of the drawing the client selected; walls, doors and windows have already been turned into the plan. Your job is everything else drawn there: stairs of any shape (straight, L, U, spiral), sanitary ware, kitchen fittings, built-in furniture, loose furniture, columns, planters, lifts, fireplaces.
Coordinates: the image is ${size.w} × ${size.h} px; plan metres are x = px × ${metresPerPixel.toFixed(5)} to the right and z = py × ${metresPerPixel.toFixed(5)} downwards from the image's top-left corner.
Rooms already found:
${roomList || '- none'}
Catalogue types: ${catalogue}.
For each symbol: use a catalogue type when one matches (rot 0/90/180/270; the front faces +z at rot 0, back against the wall above), else define the object under "customs" and use "custom:<id>". A staircase that rises to another floor gets "opensAbove": true.
${CUSTOM_FORMAT}
Ask questions only where the drawing is genuinely ambiguous and the answer changes what you build (is this circle a spiral stair or a round table? does this stair go up or down? how high is the floor above?) — at most 3, each with 2–4 likely answers, in Vietnamese if the drawing's text is Vietnamese, else English. When questions remain unanswered, reply {"questions": [...]} only.
Otherwise reply {"items": [{"label": what it is, "type", "x", "z", "rot"}], "customs"?: {...}, "notes": one sentence on anything you could not place}.`,
    answers.length
      ? `The client's answers:\n${answers.map((x) => `- ${x.q} → ${x.a}`).join('\n')}\nNow place everything; ask nothing more.`
      : 'Read the drawing.',
    [image],
  );
  if (out.questions?.length && !answers.length)
    return {
      questions: out.questions
        .filter((q) => typeof q.text === 'string')
        .slice(0, 3)
        .map((q, i) => ({
          id: `q${i}`,
          text: q.text!,
          options: q.options?.filter((o) => typeof o === 'string').slice(0, 4),
        })),
      found: [],
      notes: '',
    };
  const customTypes = adoptCustoms(p, out.customs);
  const found = (out.items ?? [])
    .map((i) => ({ ...i, type: i.type?.startsWith('custom:') ? (customTypes.get(i.type.slice(7)) ?? i.type) : i.type }))
    .filter((i) => i.type && FURNITURE[i.type] && Number.isFinite(i.x) && Number.isFinite(i.z))
    .map((i) => ({
      label: String(i.label ?? FURNITURE[i.type!]!.name).slice(0, 60),
      custom: i.type!.startsWith('custom:'),
      item: {
        type: i.type!,
        x: i.x!,
        z: i.z!,
        rot: (((Math.round((i.rot ?? 0) / 90) * 90) % 360) + 360) % 360,
      },
    }));
  return { questions: [], found, notes: typeof out.notes === 'string' ? out.notes : '' };
}

const HEX6 = /^#[0-9a-f]{6}$/i;
const LEGS: Legs[] = ['tapered', 'metal', 'plinth', 'turned', 'rattan'];
const hexes = (v: unknown, n: number, dflt: string[]) => {
  const out = Array.isArray(v) ? v.filter((c): c is string => typeof c === 'string' && HEX6.test(c)).slice(0, n) : [];
  return out.length ? out : dflt;
};
const text = (v: unknown, n: number, dflt: string) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : dflt);

/** A style from Claude made safe to use: known finishes and leg types, real colours, catalogue pieces only. */
function cleanStyle(raw: unknown, types: Map<string, string>): DesignStyle | null {
  const o = raw as Partial<DesignStyle> | null;
  if (!o || typeof o !== 'object') return null;
  const base = STYLES.modern!;
  const finishes: DesignStyle['finishes'] = {};
  for (const [room, f] of Object.entries(o.finishes ?? {}).slice(0, 12)) {
    const floor = f?.floor && FLOORS[f.floor] ? f.floor : undefined;
    const wall = f?.wall && WALLS[f.wall] ? f.wall : undefined;
    if (floor || wall)
      finishes[room] = { floor: floor ?? base.finishes['*']!.floor, wall: wall ?? base.finishes['*']!.wall };
  }
  finishes['*'] ??= base.finishes['*']!;
  const signature = (Array.isArray(o.signature) ? o.signature : [])
    .map((t) => (typeof t === 'string' && t.startsWith('custom:') ? (types.get(t.slice(7)) ?? t) : t))
    .filter((t): t is string => typeof t === 'string' && !!FURNITURE[t])
    .slice(0, 8);
  return {
    name: text(o.name, 40, 'From your photo'),
    vi: text(o.vi, 40, 'Theo ảnh mẫu'),
    blurb: text(o.blurb, 140, 'Read from your reference photo.'),
    wood: HEX6.test(o.wood ?? '') ? o.wood! : base.wood,
    metal: HEX6.test(o.metal ?? '') ? o.metal! : base.metal,
    legs: LEGS.includes(o.legs as Legs) ? o.legs! : base.legs,
    round: typeof o.round === 'number' && Number.isFinite(o.round) ? Math.min(1.6, Math.max(0.4, o.round)) : 0.8,
    fabric: hexes(o.fabric, 4, base.fabric),
    cases: hexes(o.cases, 3, base.cases),
    accent: hexes(o.accent, 2, base.accent),
    finishes,
    signature: signature.length ? signature : base.signature,
    brief: text(o.brief, 700, base.brief),
  };
}

/**
 * Reads a client's reference photo of an interior as a design style for their home: its materials, palette, how
 * the furniture stands, the finish of each kind of room and the pieces that make it read. Characteristic pieces the
 * catalogue lacks (a tree-stump stool, a drum coffee table, a steel plant wall) are modelled on the way.
 */
export async function styleFromPhoto(brain: Brain, photo: Blob, note: string, p: Plan) {
  const list = (o: Record<string, { name: string }>) =>
    Object.entries(o)
      .map(([k, f]) => `${k} (${f.name})`)
      .join(', ');
  const out = await askJson<{ style?: unknown; customs?: Record<string, unknown>; summary?: string }>(
    brain,
    `You are a senior interior designer. A client shows you a reference photo of an interior they like; you turn it into a design style for their own home in a 3D planner, the way you would brief your team: what makes the photo read, translated into the planner's materials and furniture.

Look at: the floor and wall materials; the timber tone; metalwork; how furniture stands (slim tapered legs, black metal frames, solid plinths, turned legs, rattan); how soft the shapes are; the upholstery, cabinetry and accent colours (sample real hex colours from the photo); the decor (plants, rugs, lighting); the mood.

The planner has these finishes. Floors: ${list(FLOORS)}. Walls: ${list(WALLS)}.
Leg types: tapered, metal, plinth, turned, rattan.
Catalogue pieces: ${Object.entries(FURNITURE)
      .filter(([, d]) => d.group !== 'Stairs' && !d.custom)
      .map(([t, d]) => `${t} (${d.name})`)
      .join(', ')}.
Pieces in the photo that make the style and that the catalogue lacks (a tree-stump side table, a drum coffee table, a steel shelving wall with plants, a leather sling chair…): define up to 4 of them under "customs" and name them in the signature as "custom:<id>".
${CUSTOM_FORMAT}

Reply {"style": {"name": English name of the style (e.g. "Industrial loft"), "vi": Vietnamese name, "blurb": one line, "wood": hex, "metal": hex, "legs": one leg type, "round": 0.4 crisp … 1.6 pillowy, "fabric": [2–4 hex, main upholstery first], "cases": [1–3 hex], "accent": [1–2 hex], "finishes": {"*": {"floor", "wall"}, "Bedroom": {...}, "Bathroom": {...}, "Kitchen": {...}, "Balcony": {...}} using the finish keys above, "signature": [4–8 piece types], "brief": what a designer furnishing a room in this style must do and avoid, in 2–4 sentences}, "customs"?: {"<id>": <definition>}, "summary": one or two sentences to the client, in Vietnamese, on what you took from the photo}.`,
    note ? `What the client likes about it: ${note}` : 'Read the photo.',
    [photo],
  );
  const types = adoptCustoms(p, out.customs);
  const style = cleanStyle(out.style, types);
  if (!style) throw new Error('Claude could not read a style from that photo. Try another one.');
  return { style, summary: typeof out.summary === 'string' ? out.summary : '' };
}
