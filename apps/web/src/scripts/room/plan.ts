/**
 * Floor plan model, shared by the 2D editor and the 3D builder. Plain JSON so it can be undone, saved and shared.
 * Units are metres; x runs right, z runs down the screen in 2D (south when north is up).
 */

import { DEFAULT_STYLE, FURNITURE, ROOM_DEFAULTS } from './catalog';

export type Vec2 = [number, number];

export interface PlanNode {
  id: string;
  x: number;
  z: number;
}

export interface Wall {
  id: string;
  a: string;
  b: string;
  thick: number;
  /** A balcony railing rather than a wall: glass between a kerb and a handrail, RAIL_HEIGHT high, no openings. */
  rail?: boolean;
}

export type OpeningKind = 'door' | 'window';

export interface Opening {
  id: string;
  wall: string;
  kind: OpeningKind;
  /** Centre along the wall, 0 at node a, 1 at node b. */
  t: number;
  width: number;
  /** Doors: which side the leaf swings to (1 or -1). */
  flip?: number;
  /** Doors: 2 for a double door (two half-width leaves hinged at both jambs). */
  leaves?: 2;
  /** Doors: -1 hinges the leaf at the other jamb (by default flip 1 hinges it at node b, flip -1 at node a). */
  hand?: -1;
  /** Windows: glazed from the floor to door height, a sliding glass door (onto a balcony, say). */
  tall?: boolean;
}

export interface Item {
  id: string;
  type: string;
  x: number;
  z: number;
  /** Rotation in degrees, clockwise when seen from above. */
  rot: number;
  color?: string;
}

export interface RoomStyle {
  floor?: string;
  wall?: string;
  name?: string;
}

export interface Plan {
  nodes: PlanNode[];
  walls: Wall[];
  openings: Opening[];
  items: Item[];
  /** Keyed by roomKey(): the sorted node ids around the room. */
  rooms: Record<string, RoomStyle>;
  /** Compass angle of north, degrees clockwise from "up" in the 2D plan. */
  north: number;
}

export interface Room {
  key: string;
  nodes: string[];
  poly: Vec2[];
  area: number;
  centroid: Vec2;
}

const DEG = Math.PI / 180;
export const WALL_HEIGHT = 2.7;
export const RAIL_HEIGHT = 1.1;
export const DOOR_HEIGHT = 2.1;
export const WINDOW_SILL = 0.9;
export const WINDOW_TOP = 2.1;

let seq = 0;
export const uid = (p: string) => `${p}${Date.now().toString(36).slice(-4)}${(seq++).toString(36)}`;

/* ---------- Lookups and geometry ---------- */

export const nodeMap = (p: Plan) => new Map(p.nodes.map((n) => [n.id, n]));

export function wallEnds(p: Plan, w: Wall, nodes = nodeMap(p)): [Vec2, Vec2] {
  const a = nodes.get(w.a)!;
  const b = nodes.get(w.b)!;
  return [
    [a.x, a.z],
    [b.x, b.z],
  ];
}

export const len = (a: Vec2, b: Vec2) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Closest point on segment ab to p, with its parameter t in [0, 1] and distance. */
export function closestOnSegment(p: Vec2, a: Vec2, b: Vec2) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz || 1e-9;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2));
  const q: Vec2 = [a[0] + dx * t, a[1] + dz * t];
  return { t, q, d: len(p, q) };
}

export function pointInPoly(p: Vec2, poly: Vec2[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]!;
    const [xj, zj] = poly[j]!;
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

const signedArea = (poly: Vec2[]) => {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i]!;
    const [x2, z2] = poly[(i + 1) % poly.length]!;
    s += x1 * z2 - x2 * z1;
  }
  return s / 2;
};

function centroidOf(poly: Vec2[]): Vec2 {
  const a = signedArea(poly);
  if (Math.abs(a) < 1e-6) return poly[0] ?? [0, 0];
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i]!;
    const [x2, z2] = poly[(i + 1) % poly.length]!;
    const f = x1 * z2 - x2 * z1;
    cx += (x1 + x2) * f;
    cz += (z1 + z2) * f;
  }
  const c: Vec2 = [cx / (6 * a), cz / (6 * a)];
  // A concave room's centroid can fall outside it; fall back to a point that is inside.
  if (pointInPoly(c, poly)) return c;
  const avg: Vec2 = [
    poly.reduce((s, p) => s + p[0], 0) / poly.length,
    poly.reduce((s, p) => s + p[1], 0) / poly.length,
  ];
  return avg;
}

/** Puts an item against the nearest wall, facing into the room, if it is close to one. */
export function snapToWall(p: Plan, it: Item, reach = 0.6) {
  const def = FURNITURE[it.type];
  if (!def || def.flat) return false;
  const nodes = nodeMap(p);
  let best: { d: number; q: Vec2; n: Vec2; thick: number } | null = null;
  for (const w of p.walls) {
    const [a, b] = wallEnds(p, w, nodes);
    const c = closestOnSegment([it.x, it.z], a, b);
    if (c.t <= 0.01 || c.t >= 0.99) continue;
    if (!best || c.d < best.d) {
      const L = len(a, b);
      let n: Vec2 = [-(b[1] - a[1]) / L, (b[0] - a[0]) / L];
      // Normal pointing from the wall towards the item.
      if ((it.x - c.q[0]) * n[0] + (it.z - c.q[1]) * n[1] < 0) n = [-n[0], -n[1]];
      best = { d: c.d, q: c.q, n, thick: w.thick };
    }
  }
  if (!best || best.d > def.d / 2 + reach) return false;
  // Front (+z when rot is 0) should point along n; rot is clockwise on screen.
  it.rot = (Math.round(Math.atan2(-best.n[0], best.n[1]) / DEG) + 360) % 360;
  const off = best.thick / 2 + def.d / 2 + 0.01;
  it.x = best.q[0] + best.n[0] * off;
  it.z = best.q[1] + best.n[1] * off;
  return true;
}

export const roomKey = (ids: string[]) => [...ids].sort().join('|');

/**
 * Finds the enclosed rooms: the faces of the planar wall graph, walked by always taking the sharpest turn.
 * Interior faces wind one way; the outer boundary of each building winds the other and is dropped.
 */
export function findRooms(p: Plan): Room[] {
  const nodes = nodeMap(p);
  const out = new Map<string, { to: string; angle: number }[]>();
  for (const w of p.walls) {
    const a = nodes.get(w.a);
    const b = nodes.get(w.b);
    if (!a || !b || w.a === w.b) continue;
    const push = (u: PlanNode, v: PlanNode) => {
      const list = out.get(u.id) ?? [];
      if (!list.some((e) => e.to === v.id)) list.push({ to: v.id, angle: Math.atan2(v.z - u.z, v.x - u.x) });
      out.set(u.id, list);
    };
    push(a, b);
    push(b, a);
  }
  for (const list of out.values()) list.sort((m, n) => m.angle - n.angle);
  const used = new Set<string>();
  const rooms: Room[] = [];
  for (const [u, list] of out) {
    for (const e of list) {
      const start = `${u}>${e.to}`;
      if (used.has(start)) continue;
      const ids: string[] = [];
      let from = u;
      let to = e.to;
      let ok = true;
      for (let guard = 0; guard < 500; guard++) {
        const key = `${from}>${to}`;
        if (used.has(key)) {
          ok = key === start;
          break;
        }
        used.add(key);
        ids.push(from);
        const around = out.get(to)!;
        const back = around.findIndex((x) => x.to === from);
        // Next edge: the one just before the way back, in angle order (the tightest turn).
        const next = around[(back - 1 + around.length) % around.length]!;
        from = to;
        to = next.to;
      }
      if (!ok || ids.length < 3) continue;
      const poly = ids.map((id) => [nodes.get(id)!.x, nodes.get(id)!.z] as Vec2);
      const a = signedArea(poly);
      // With this turn rule, interior faces come out with positive signed area; outer boundaries are negative.
      if (a < 0.05) continue;
      rooms.push({ key: roomKey(ids), nodes: ids, poly, area: a, centroid: centroidOf(poly) });
    }
  }
  return rooms;
}

export const roomAt = (rooms: Room[], pt: Vec2) =>
  rooms.filter((r) => pointInPoly(pt, r.poly)).sort((m, n) => m.area - n.area)[0];

/* ---------- Room names and finishes ---------- */

/** Names a room from what's in it (bed → Bedroom, …) unless the user named it. */
export function roomName(p: Plan, r: Room): string {
  const custom = p.rooms[r.key]?.name;
  if (custom) return custom;
  const votes = new Map<string, number>();
  for (const it of p.items) {
    const kind = FURNITURE[it.type]?.room;
    if (kind && pointInPoly([it.x, it.z], r.poly)) votes.set(kind, (votes.get(kind) ?? 0) + 1);
  }
  if (votes.has('Kitchen') && votes.has('Living')) return 'Living & kitchen';
  const best = [...votes].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (best) return best;
  return r.area < 8 ? 'Hall' : 'Room';
}

export function roomStyle(p: Plan, r: Room): { floor: string; wall: string } {
  const own = p.rooms[r.key];
  const auto = ROOM_DEFAULTS[roomName(p, r)] ?? DEFAULT_STYLE;
  return { floor: own?.floor ?? auto.floor, wall: own?.wall ?? auto.wall };
}

/* ---------- Editing ---------- */

export const clone = (p: Plan): Plan => structuredClone(p);

/** Splits a wall at parameter t, moving its openings to whichever half holds them. Returns the new node. */
export function splitWall(p: Plan, wall: Wall, t: number): PlanNode {
  const [a, b] = wallEnds(p, wall);
  const n: PlanNode = { id: uid('n'), x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t };
  p.nodes.push(n);
  const second: Wall = { id: uid('w'), a: n.id, b: wall.b, thick: wall.thick };
  wall.b = n.id;
  p.walls.push(second);
  for (const o of p.openings) {
    if (o.wall !== wall.id) continue;
    if (o.t <= t) o.t = o.t / t;
    else {
      o.wall = second.id;
      o.t = (o.t - t) / (1 - t);
    }
  }
  return n;
}

/** Removes nodes no wall uses and openings whose wall is gone. */
export function tidy(p: Plan) {
  const ids = new Set(p.walls.flatMap((w) => [w.a, w.b]));
  p.nodes = p.nodes.filter((n) => ids.has(n.id));
  const walls = new Set(p.walls.map((w) => w.id));
  p.openings = p.openings.filter((o) => walls.has(o.wall));
}

/* ---------- Sample apartment ---------- */

/** A two-room apartment with a kitchen-living space, a bedroom and a bathroom: something to explore at once. */
export function samplePlan(): Plan {
  const N = (id: string, x: number, z: number): PlanNode => ({ id, x, z });
  const nodes = [
    N('n1', 0, 0),
    N('n2', 6.4, 0),
    N('n3', 10, 0),
    N('n4', 10, 4.2),
    N('n5', 10, 7.6),
    N('n6', 6.4, 7.6),
    N('n7', 0, 7.6),
    N('n8', 6.4, 4.2),
    N('n9', 6.4, 5.6),
    N('n10', 0, 5.6),
    N('n11', 3.4, 5.6),
    N('n12', 3.4, 7.6),
  ];
  const W = (id: string, a: string, b: string, thick = 0.2): Wall => ({ id, a, b, thick });
  const walls = [
    W('w1', 'n1', 'n2'),
    W('w2', 'n2', 'n3'),
    W('w3', 'n3', 'n4'),
    W('w4', 'n4', 'n5'),
    W('w5', 'n5', 'n6'),
    W('w6', 'n6', 'n12'),
    W('w7', 'n12', 'n7'),
    W('w8', 'n7', 'n10'),
    W('w9', 'n10', 'n1'),
    W('w10', 'n2', 'n8', 0.12),
    W('w11', 'n8', 'n4', 0.12),
    W('w12', 'n8', 'n9', 0.12),
    W('w13', 'n9', 'n6', 0.12),
    W('w14', 'n10', 'n11', 0.12),
    W('w15', 'n11', 'n9', 0.12),
    W('w16', 'n11', 'n12', 0.12),
  ];
  const O = (id: string, wall: string, kind: OpeningKind, t: number, width: number, flip = 1): Opening => ({
    id,
    wall,
    kind,
    t,
    width,
    flip,
  });
  const openings = [
    O('o1', 'w1', 'window', 0.3, 1.6),
    O('o2', 'w1', 'window', 0.74, 1.6),
    O('o3', 'w2', 'window', 0.5, 1.4),
    O('o4', 'w4', 'window', 0.5, 1.2),
    O('o5', 'w9', 'window', 0.5, 1.8),
    O('o6', 'w7', 'door', 0.5, 0.9),
    O('o7', 'w10', 'door', 0.7, 0.8, -1),
    O('o8', 'w12', 'door', 0.5, 0.8),
    O('o9', 'w15', 'door', 0.8, 0.8, -1),
    O('o10', 'w16', 'door', 0.5, 0.8),
  ];
  const I = (id: string, type: string, x: number, z: number, rot = 0, color?: string): Item => ({
    id,
    type,
    x,
    z,
    rot,
    ...(color ? { color } : {}),
  });
  // rot 0: the item's front faces +z (down the plan), so its back sits against a wall above it.
  const items = [
    I('i1', 'sofa', 2.6, 3.7, 180),
    I('i2', 'rug', 2.6, 2.3, 0),
    I('i3', 'coffee', 2.6, 2.4, 0),
    I('i4', 'tv', 2.6, 0.3, 0),
    I('i5', 'armchair', 4.4, 2.2, 90),
    I('i6', 'dining', 4.9, 4.6, 90),
    I('i7', 'kitchen', 0.32, 2.4, -90),
    I('i8', 'fridge', 0.38, 0.45, -90),
    I('i9', 'plant', 6.0, 0.45, 0),
    I('i10', 'bed', 8.2, 1.15, 0),
    I('i11', 'nightstand', 6.95, 0.3, 0),
    I('i12', 'nightstand', 9.45, 0.3, 0),
    I('i13', 'wardrobe', 8.6, 3.85, 180),
    I('i14', 'desk', 9.62, 2.6, 90),
    I('i15', 'chair', 9.15, 2.6, -90),
    I('i16', 'bathtub', 8.9, 7.18, 180),
    I('i17', 'toilet', 9.62, 5.0, 90),
    I('i18', 'sink', 7.9, 4.5, 0),
    I('i19', 'bookshelf', 0.25, 6.6, -90),
    I('i20', 'lamp', 3.0, 5.95, 0),
    I('i21', 'plant', 6.0, 7.2, 0),
  ];

  return { nodes, walls, openings, items, rooms: {}, north: 0 };
}

/**
 * How far each wall reaches past its two nodes, so joints are closed without two walls sharing a face (overlapping
 * coplanar faces flicker). At each node one wall runs through: a straight continuation (both stop flush at the node)
 * or, at a corner, the thickest wall, which reaches across the others. The other walls stop at its face.
 */
export function wallReach(p: Plan, nodes: Map<string, { x: number; z: number }>): Map<string, [number, number]> {
  type End = { id: string; end: 0 | 1; t: number; dx: number; dz: number; L: number };
  const at = new Map<string, End[]>();
  const out = new Map<string, [number, number]>();
  for (const w of p.walls) {
    const a = nodes.get(w.a);
    const b = nodes.get(w.b);
    if (!a || !b) continue;
    const L = Math.hypot(b.x - a.x, b.z - a.z);
    if (L < 0.005) continue;
    const dx = (b.x - a.x) / L;
    const dz = (b.z - a.z) / L;
    out.set(w.id, [0, 0]);
    const add = (n: string, e: End) => at.set(n, [...(at.get(n) ?? []), e]);
    add(w.a, { id: w.id, end: 0, t: w.thick, dx, dz, L });
    add(w.b, { id: w.id, end: 1, t: w.thick, dx: -dx, dz: -dz, L });
  }
  const set = (e: End, v: number) => (out.get(e.id)![e.end] = Math.max(v, -e.L / 2));
  for (const list of at.values()) {
    if (list.length < 2) continue;
    const dot = (e: End, f: End) => e.dx * f.dx + e.dz * f.dz;
    // A straight run through the node (the thickest such pair), else the thickest (then longest) wall.
    let through: End[] = [];
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++)
        if (dot(list[i]!, list[j]!) < -0.97) {
          const pair = [list[i]!, list[j]!];
          if (!through.length || Math.min(...pair.map((e) => e.t)) > Math.min(...through.map((e) => e.t)))
            through = pair;
        }
    if (!through.length) {
      const main = [...list].sort((e, f) => f.t - e.t || f.L - e.L)[0]!;
      let reach = 0;
      for (const e of list)
        if (e !== main) reach = Math.max(reach, e.t / 2 / Math.max(0.5, Math.abs(main.dx * e.dz - main.dz * e.dx)));
      set(main, Math.min(reach, 0.6));
      through = [main];
    }
    const face = Math.min(...through.map((e) => e.t)) / 2;
    const ref = through[0]!;
    for (const e of list) {
      if (through.includes(e)) continue;
      const sin = Math.max(0.2, Math.abs(ref.dx * e.dz - ref.dz * e.dx));
      const cos = Math.abs(dot(ref, e));
      set(e, Math.min(0, -face / sin + (e.t / 2) * (cos / sin)));
    }
  }
  return out;
}
