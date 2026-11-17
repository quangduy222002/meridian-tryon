/**
 * Fixture and furniture symbols on a floor plan, so the imported plan comes furnished and its rooms named:
 * 1. By block name (DXF): CAD libraries name their blocks — "WC", "LAVABO", "GIUONG DOI", "SOFA 3", "Bathtub"…
 * 2. By shape (PDF or DXF without useful names), for the symbols drawn the same way on almost every plan:
 *    - WC: an oval bowl (about 36 × 50 cm) with the cistern, a straight edge across its narrow end, just behind it.
 *    - Bathtub: a closed rounded outline about 1.0–1.9 m × 0.45–0.9 m (the tub's inner rim).
 *    - Shower tray: a square 0.7–1.2 m crossed by both diagonals, with the drain (a small circle) in the middle.
 *    - Hob: three or more burner circles (10–30 cm) within a 75 cm square.
 * Each symbol becomes a Roomcraft item placed where it is drawn, its back to the nearest wall, and votes for its
 * room's name (a WC makes a bathroom, a hob a kitchen).
 */
import { FURNITURE } from '../room/catalog';
import { closestOnSegment, nodeMap, snapToWall, uid, wallEnds, type Item, type Plan, type Vec2 } from '../room/plan';
import { inRegion, type Drawing, type Region } from './drawing';

export type SymbolKind =
  | 'toilet'
  | 'sink'
  | 'bathtub'
  | 'shower'
  | 'hob'
  | 'kitchen'
  | 'fridge'
  | 'bed'
  | 'sofa'
  | 'armchair'
  | 'dining'
  | 'desk'
  | 'wardrobe'
  | 'tv';

export interface FoundSymbol {
  kind: SymbolKind;
  /** Box in plan metres (x right, z down). */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Direction its back faces, in plan space, when the drawing shows it (a WC's cistern). */
  back?: Vec2;
  via: 'name' | 'shape';
}

/** The room each symbol says it is in. */
export const SYMBOL_ROOM: Record<SymbolKind, string> = {
  toilet: 'Bathroom',
  sink: 'Bathroom',
  bathtub: 'Bathroom',
  shower: 'Bathroom',
  hob: 'Kitchen',
  kitchen: 'Kitchen',
  fridge: 'Kitchen',
  bed: 'Bedroom',
  wardrobe: 'Bedroom',
  sofa: 'Living',
  armchair: 'Living',
  tv: 'Living',
  dining: 'Dining',
  desk: 'Study',
};

/** Symbols that become a piece of furniture (the rest only name the room). */
const ITEM: Partial<Record<SymbolKind, string>> = {
  toilet: 'toilet',
  sink: 'sink',
  bathtub: 'bathtub',
  kitchen: 'kitchen',
  fridge: 'fridge',
  bed: 'bed',
  sofa: 'sofa',
  armchair: 'armchair',
  dining: 'dining',
  desk: 'desk',
  wardrobe: 'wardrobe',
  tv: 'tv',
};

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[_\-.$|]+/g, ' ')
    .toLowerCase();

/** Block names, Vietnamese and English. Order matters: "water closet" before "closet", "hob" before "kitchen". */
const NAMES: [RegExp, SymbolKind][] = [
  [/\b(wc|toilet|xi ?bet|bon cau|bet|water ?closet|urinal|bon tieu|tieu nam)\b/, 'toilet'],
  [/\b(bon tam|bath ?tub|bathtub|tub|bon ngam|jacuzzi)\b/, 'bathtub'],
  [/\b(shower|voi sen|sen tam|khay tam|cabin tam)\b/, 'shower'],
  [/\b(lavabo|lavabol|basin|wash ?basin|sink|chau rua|chau|vanity)\b/, 'sink'],
  [/\b(tu lanh|fridge|refrigerator)\b/, 'fridge'],
  [/\b(bep (tu|ga|dien|nau)|hob|cooktop|stove|cooker)\b/, 'hob'],
  [/\b(tu bep|kitchen|counter|bep)\b/, 'kitchen'],
  [/\b(giuong|bed|bed ?(double|single|queen|king))\b/, 'bed'],
  [/\b(sofa|couch|ghe dai|sopha)\b/, 'sofa'],
  [/\b(arm ?chair|ghe don|ghe banh)\b/, 'armchair'],
  [/\b(ban an|dining|ban ghe an)\b/, 'dining'],
  [/\b(ban (lam viec|hoc)|desk|work ?table)\b/, 'desk'],
  [/\b(tu (ao|quan ao|do)|wardrobe|closet)\b/, 'wardrobe'],
  [/\b(tv|tivi|television|ke tv|ke ti vi)\b/, 'tv'],
];

export function symbolOf(name: string): SymbolKind | null {
  const t = fold(name);
  for (const [re, kind] of NAMES) if (re.test(t)) return kind;
  return null;
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Finds symbols inside the region. Boxes come back in plan metres (same mapping as detectWalls). */
export function findSymbols(d: Drawing, region: Region): FoundSymbol[] {
  const k = d.mmPerUnit ?? 1;
  const toPlan = (b: Box): Pick<FoundSymbol, 'x0' | 'z0' | 'x1' | 'z1'> => ({
    x0: ((b.x0 - region.x0) * k) / 1000,
    x1: ((b.x1 - region.x0) * k) / 1000,
    z0: ((region.y1 - b.y1) * k) / 1000,
    z1: ((region.y1 - b.y0) * k) / 1000,
  });
  const out: FoundSymbol[] = [];
  const inside = (b: Box) => inRegion(region, (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2);
  const size = (b: Box) => [((b.x1 - b.x0) * k) / 1000, ((b.y1 - b.y0) * k) / 1000] as const;

  // 1. Named blocks. Nested blocks repeat their parent's box: keep the first (outermost) match per place.
  for (const b of d.blocks ?? []) {
    const kind = symbolOf(b.name) ?? (b.layer ? symbolOf(b.layer) : null);
    if (!kind || !inside(b)) continue;
    const [w, h] = size(b);
    if (Math.max(w, h) > 3.5 || Math.max(w, h) < 0.15) continue;
    out.push({ kind, ...toPlan(b), via: 'name' });
  }

  // 2. Shapes.
  for (const { box, ...s } of shapes(d, region, k)) out.push({ ...s, ...toPlan(box), via: 'shape' });

  // One symbol per place: a named block wins over a shape found in the same spot.
  const overlap = (a: FoundSymbol, b: FoundSymbol) => {
    const ix = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
    const iz = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
    const area = (s: FoundSymbol) => (s.x1 - s.x0) * (s.z1 - s.z0);
    return ix > 0 && iz > 0 && ix * iz > 0.5 * Math.min(area(a), area(b));
  };
  return out.filter((s, i) => !out.some((t, j) => j < i && t.kind === s.kind && overlap(s, t)));
}

/* ---------- Shape recognition ---------- */

interface Part {
  box: Box;
  curve: number;
  straight: number;
  closed: boolean;
  segs: { x1: number; y1: number; x2: number; y2: number; curve: boolean }[];
}

/** Groups the region's short segments into connected outlines (shared end points), in millimetres. */
function parts(d: Drawing, region: Region, k: number): Part[] {
  const segs = d.segs
    .filter((s) => inRegion(region, s.x1, s.y1) && inRegion(region, s.x2, s.y2))
    .map((s) => ({ x1: s.x1 * k, y1: s.y1 * k, x2: s.x2 * k, y2: s.y2 * k, curve: !!s.curve }))
    .filter((s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1) < 2500);
  const parent = segs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  // End points on a 6 mm grid; neighbouring cells are checked so points either side of a cell edge still meet.
  const cell = 6;
  const grid = new Map<string, number[]>();
  const ends = new Map<string, number>();
  const key = (x: number, y: number) => `${Math.round(x / cell)},${Math.round(y / cell)}`;
  segs.forEach((s, i) => {
    for (const [x, y] of [
      [s.x1, s.y1],
      [s.x2, s.y2],
    ] as const) {
      const gx = Math.round(x / cell);
      const gy = Math.round(y / cell);
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (const j of grid.get(`${gx + dx},${gy + dy}`) ?? []) parent[find(j)] = find(i);
      const kk = `${gx},${gy}`;
      grid.set(kk, [...(grid.get(kk) ?? []), i]);
      ends.set(key(x, y), (ends.get(key(x, y)) ?? 0) + 1);
    }
  });
  const groups = new Map<number, Part>();
  segs.forEach((s, i) => {
    const r = find(i);
    let p = groups.get(r);
    if (!p) {
      p = {
        box: { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
        curve: 0,
        straight: 0,
        closed: true,
        segs: [],
      };
      groups.set(r, p);
    }
    p.segs.push(s);
    p.box.x0 = Math.min(p.box.x0, s.x1, s.x2);
    p.box.y0 = Math.min(p.box.y0, s.y1, s.y2);
    p.box.x1 = Math.max(p.box.x1, s.x1, s.x2);
    p.box.y1 = Math.max(p.box.y1, s.y1, s.y2);
    const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    if (s.curve) p.curve += L;
    else p.straight += L;
  });
  // Closed: no end point used only once (allowing for points that landed in a neighbouring cell).
  const openAt = (x: number, y: number) => {
    const gx = Math.round(x / cell);
    const gy = Math.round(y / cell);
    let n = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) n += ends.get(`${gx + dx},${gy + dy}`) ?? 0;
    return n < 2;
  };
  for (const p of groups.values()) p.closed = p.segs.every((s) => !openAt(s.x1, s.y1) && !openAt(s.x2, s.y2));
  return [...groups.values()];
}

type Shape = { kind: SymbolKind; box: Box; back?: Vec2 };

function shapes(d: Drawing, region: Region, k: number): Shape[] {
  const out: Shape[] = [];
  const all = parts(d, region, k);
  const W = (b: Box) => b.x1 - b.x0;
  const Hh = (b: Box) => b.y1 - b.y0;
  const toDrawing = (b: Box): Box => ({ x0: b.x0 / k, y0: b.y0 / k, x1: b.x1 / k, y1: b.y1 / k });
  const round = all.filter((p) => p.closed && p.curve > 0.85 * (p.curve + p.straight));
  const straightSegs = all.flatMap((p) => p.segs.filter((s) => !s.curve));

  // WC: oval bowl + cistern edge behind its narrow end.
  for (const p of round) {
    const w = W(p.box);
    const h = Hh(p.box);
    const short = Math.min(w, h);
    const long = Math.max(w, h);
    if (short < 280 || short > 470 || long < 380 || long > 680 || long / short < 1.15) continue;
    const alongY = h > w;
    const cx = (p.box.x0 + p.box.x1) / 2;
    const cy = (p.box.y0 + p.box.y1) / 2;
    for (const dir of [1, -1]) {
      const end = alongY ? (dir > 0 ? p.box.y1 : p.box.y0) : dir > 0 ? p.box.x1 : p.box.x0;
      const tank = straightSegs.find((s) => {
        const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
        if (L < 300 || L > 650) return false;
        // Across the bowl's axis, centred on it, 0–35 cm beyond its end.
        const across = alongY ? Math.abs(s.y2 - s.y1) < L * 0.05 : Math.abs(s.x2 - s.x1) < L * 0.05;
        const mid = alongY ? (s.x1 + s.x2) / 2 : (s.y1 + s.y2) / 2;
        const at = alongY ? (s.y1 + s.y2) / 2 : (s.x1 + s.x2) / 2;
        const beyond = (at - end) * dir;
        return across && Math.abs(mid - (alongY ? cx : cy)) < 120 && beyond >= -20 && beyond <= 350;
      });
      if (!tank) continue;
      const box: Box = {
        x0: Math.min(p.box.x0, tank.x1, tank.x2),
        y0: Math.min(p.box.y0, tank.y1, tank.y2),
        x1: Math.max(p.box.x1, tank.x1, tank.x2),
        y1: Math.max(p.box.y1, tank.y1, tank.y2),
      };
      // Plan z runs down the drawing's y.
      const back: Vec2 = alongY ? [0, -dir] : [dir, 0];
      out.push({ kind: 'toilet', box: toDrawing(box), back });
      break;
    }
  }

  // Bathtub: a closed outline mixing curves and straight runs (a rounded rectangle or a stadium).
  for (const p of all) {
    if (!p.closed) continue;
    const frac = p.curve / (p.curve + p.straight);
    const w = W(p.box);
    const h = Hh(p.box);
    const short = Math.min(w, h);
    const long = Math.max(w, h);
    if (frac < 0.12 || frac > 0.85 || long < 1000 || long > 1900 || short < 450 || short > 900) continue;
    out.push({ kind: 'bathtub', box: toDrawing(p.box) });
  }

  // Shower tray: square, both diagonals, a drain in the middle.
  for (const p of all) {
    const w = W(p.box);
    const h = Hh(p.box);
    if (p.curve > 0 || w < 700 || w > 1200 || h < 700 || h > 1200 || Math.max(w, h) / Math.min(w, h) > 1.25) continue;
    const diag = Math.hypot(w, h);
    const diagonals = p.segs.filter((s) => {
      const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
      return L > diag * 0.85 && L < diag * 1.1;
    }).length;
    if (diagonals < 2) continue;
    const cx = (p.box.x0 + p.box.x1) / 2;
    const cy = (p.box.y0 + p.box.y1) / 2;
    const drain = round.some((r) => {
      const dw = W(r.box);
      return dw > 40 && dw < 220 && Math.hypot((r.box.x0 + r.box.x1) / 2 - cx, (r.box.y0 + r.box.y1) / 2 - cy) < 120;
    });
    if (drain) out.push({ kind: 'shower', box: toDrawing(p.box) });
  }

  // Hob: three or more burners close together.
  const burners = round.filter((p) => {
    const w = W(p.box);
    const h = Hh(p.box);
    return w > 100 && w < 300 && Math.max(w, h) / Math.min(w, h) < 1.2;
  });
  const used = new Set<Part>();
  for (const b of burners) {
    if (used.has(b)) continue;
    const c = (p: Part): Vec2 => [(p.box.x0 + p.box.x1) / 2, (p.box.y0 + p.box.y1) / 2];
    const near = burners.filter(
      (o) => !used.has(o) && Math.abs(c(o)[0] - c(b)[0]) < 750 && Math.abs(c(o)[1] - c(b)[1]) < 750,
    );
    if (near.length < 3) continue;
    for (const o of near) used.add(o);
    const box: Box = {
      x0: Math.min(...near.map((o) => o.box.x0)),
      y0: Math.min(...near.map((o) => o.box.y0)),
      x1: Math.max(...near.map((o) => o.box.x1)),
      y1: Math.max(...near.map((o) => o.box.y1)),
    };
    if (W(box) < 800 && Hh(box) < 800) out.push({ kind: 'hob', box: toDrawing(box) });
  }
  return out;
}

/* ---------- Furnishing ---------- */

/**
 * Adds an item for each furniture symbol, centred where it is drawn and turned so its back is to the wall it stands
 * against (or the side the drawing shows, for a WC's cistern). Returns how many it added.
 */
export function furnish(plan: Plan, found: FoundSymbol[]): number {
  const nodes = nodeMap(plan);
  const wallDist = (pt: Vec2) =>
    Math.min(Infinity, ...plan.walls.map((w) => closestOnSegment(pt, ...wallEnds(plan, w, nodes)).d - w.thick / 2));
  // Back direction for each rotation (front faces +z at rot 0, rot clockwise on screen).
  const BACK: Record<number, Vec2> = { 0: [0, -1], 90: [1, 0], 180: [0, 1], 270: [-1, 0] };
  let added = 0;
  for (const s of found) {
    const type = ITEM[s.kind];
    const def = type ? FURNITURE[type] : undefined;
    if (!type || !def) continue;
    const x = (s.x0 + s.x1) / 2;
    const z = (s.z0 + s.z1) / 2;
    if (plan.items.some((it) => it.type === type && Math.hypot(it.x - x, it.z - z) < 0.3)) continue;
    const bw = s.x1 - s.x0;
    const bd = s.z1 - s.z0;
    // Which way round: the catalog's width along the box's longer side when the catalog's is the longer too.
    const wideX = bw >= bd === def.w >= def.d;
    let rot: number;
    if (s.back) rot = Number(Object.entries(BACK).find(([, v]) => v[0] === s.back![0] && v[1] === s.back![1])![0]);
    else {
      const options = wideX ? [0, 180] : [90, 270];
      const half = (wideX ? bd : bw) / 2;
      // Back towards the nearer wall.
      rot = options
        .map((r) => ({ r, d: wallDist([x + BACK[r]![0] * (half + 0.15), z + BACK[r]![1] * (half + 0.15)]) }))
        .sort((a, b) => a.d - b.d)[0]!.r;
    }
    const it: Item = { id: uid('i'), type, x, z, rot };
    // Pull it flush to that wall when the drawing has it a little off (the catalog piece may be a different size).
    const before = { ...it };
    if (snapToWall(plan, it, 0.25) && it.rot !== before.rot) Object.assign(it, before);
    plan.items.push(it);
    added++;
  }
  return added;
}
