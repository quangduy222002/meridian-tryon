/**
 * Wall detection: turns the lines inside the chosen region into a Roomcraft plan.
 *
 * 1. Keep horizontal and vertical lines; merge pieces that continue each other.
 * 2. A wall is two parallel lines 6–65 cm apart with nothing parallel between them, whose band is hatched
 *    (cut walls are hatched on architectural plans; dimension and extension lines aren't). DXF files carry no
 *    hatch strokes, so there wall layers ("WALL", "TUONG", …) count instead.
 * 3. Pieces on one line join up; gaps of a door's or window's width become openings (an arc nearby means a door,
 *    glazing lines inside the gap a window).
 * 4. Ends snap to the walls they run into, so corners and T-junctions share nodes and rooms close.
 * It is a heuristic: the result is meant to be checked and fixed in the plan editor (or by the AI clean-up).
 */
import { splitWall, tidy, uid, type Opening, type Plan, type PlanNode, type Wall } from '../room/plan';
import { inRegion, type Drawing, type Region, type Segment } from './drawing';

interface Line {
  /** Constant coordinate (y for horizontal, x for vertical) and the span along it, in millimetres. */
  c: number;
  a: number;
  b: number;
  layer?: string;
}
interface WallPiece {
  o: 'H' | 'V';
  c: number;
  a: number;
  b: number;
  t: number;
}

const WALL_LAYER = /wall|tuong|tường|a-wall|mur|wand/i;

export interface DetectResult {
  plan: Plan;
  walls: number;
  openings: number;
}

export function detectWalls(d: Drawing, region: Region): DetectResult {
  const k = d.mmPerUnit ?? 1;
  // Work in millimetres with y up; the plan later flips to z down and starts near the origin.
  const clip = (s: Segment): Segment | null => {
    const a = inRegion(region, s.x1, s.y1);
    const b = inRegion(region, s.x2, s.y2);
    if (!a && !b) return null;
    if (a && b) return s;
    // Clip axis-aligned lines that leave the region; drop anything else that crosses it.
    const cl = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    if (Math.abs(s.y1 - s.y2) < 1e-6 || Math.abs(s.x1 - s.x2) < 1e-6)
      return {
        ...s,
        x1: cl(s.x1, region.x0, region.x1),
        x2: cl(s.x2, region.x0, region.x1),
        y1: cl(s.y1, region.y0, region.y1),
        y2: cl(s.y2, region.y0, region.y1),
      };
    return null;
  };
  const segs = d.segs.map(clip).filter((s): s is Segment => !!s);

  const H: Line[] = [];
  const V: Line[] = [];
  const hatch: { x: number; y: number; L: number }[] = [];
  const curves: { x: number; y: number }[] = [];
  const angTol = Math.tan((1.5 * Math.PI) / 180);
  for (const s of segs) {
    const x1 = s.x1 * k;
    const y1 = s.y1 * k;
    const x2 = s.x2 * k;
    const y2 = s.y2 * k;
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const L = Math.hypot(dx, dy);
    if (s.curve) {
      curves.push({ x: (x1 + x2) / 2, y: (y1 + y2) / 2 });
      continue;
    }
    if (L < 30) continue;
    if (dy <= dx * angTol) H.push({ c: (y1 + y2) / 2, a: Math.min(x1, x2), b: Math.max(x1, x2), layer: s.layer });
    else if (dx <= dy * angTol) V.push({ c: (x1 + x2) / 2, a: Math.min(y1, y2), b: Math.max(y1, y2), layer: s.layer });
    else hatch.push({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, L });
  }
  const area = Math.max(1, (region.x1 - region.x0) * (region.y1 - region.y0) * k * k);
  const hatched = hatch.reduce((s, h) => s + h.L, 0) / area > 0.0005;
  const layered = [...H, ...V].some((l) => l.layer && WALL_LAYER.test(l.layer));

  const merge = (list: Line[]) => {
    list.sort((p, q) => p.c - q.c || p.a - q.a);
    const out: Line[] = [];
    for (const l of list) {
      const m = out.find((o) => Math.abs(o.c - l.c) < 6 && l.a <= o.b + 15 && l.b >= o.a - 15 && o.layer === l.layer);
      if (m) {
        m.a = Math.min(m.a, l.a);
        m.b = Math.max(m.b, l.b);
      } else out.push({ ...l });
    }
    return out;
  };
  const HM = merge(H);
  const VM = merge(V);

  const hatchDensity = (o: 'H' | 'V', c0: number, c1: number, a: number, b: number) => {
    let L = 0;
    for (const h of hatch) {
      const along = o === 'H' ? h.x : h.y;
      const across = o === 'H' ? h.y : h.x;
      if (along > a && along < b && across > c0 && across < c1) L += h.L;
    }
    return L / ((b - a) * (c1 - c0));
  };

  const pair = (list: Line[], o: 'H' | 'V') => {
    const out: WallPiece[] = [];
    // Hatched blocks up to 1 m thick are columns and service shafts: keep them as thick walls.
    const maxT = hatched ? 1000 : 320;
    const minLen = hatched ? 100 : 250;
    for (let i = 0; i < list.length; i++) {
      const p = list[i]!;
      for (let j = i + 1; j < list.length; j++) {
        const q = list[j]!;
        const gap = q.c - p.c;
        if (gap < 60) continue;
        if (gap > maxT) break;
        const a = Math.max(p.a, q.a);
        const b = Math.min(p.b, q.b);
        if (b - a < minLen) continue;
        const between = list.some(
          (r) =>
            r !== p &&
            r !== q &&
            r.c > p.c + 6 &&
            r.c < q.c - 6 &&
            r.a < b - 25 &&
            r.b > a + 25 &&
            r.b - r.a > (b - a) * 0.6,
        );
        if (between) continue;
        if (hatched) {
          if (hatchDensity(o, p.c, q.c, a, b) < 0.01) continue;
        } else if (layered && !(WALL_LAYER.test(p.layer ?? '') && WALL_LAYER.test(q.layer ?? ''))) continue;
        out.push({ o, c: (p.c + q.c) / 2, a, b, t: gap });
      }
    }
    return out;
  };
  const pieces = [...pair(HM, 'H'), ...pair(VM, 'V')];

  /** Window symbols: an outer pair 6–32 cm apart with at least one more parallel line between and no hatch. */
  const glazingBands = (list: Line[], o: 'H' | 'V') => {
    const out: WallPiece[] = [];
    for (let i = 0; i < list.length; i++) {
      const p = list[i]!;
      for (let j = i + 1; j < list.length; j++) {
        const q = list[j]!;
        const gap = q.c - p.c;
        if (gap < 60) continue;
        if (gap > 320) break;
        const a = Math.max(p.a, q.a);
        const b = Math.min(p.b, q.b);
        if (b - a < 450) continue;
        const inner = list.filter((r) => r.c > p.c + 6 && r.c < q.c - 6 && r.a < b - 25 && r.b > a + 25).length;
        if (inner < 1 || (hatched && hatchDensity(o, p.c, q.c, a, b) > 0.004)) continue;
        out.push({ o, c: (p.c + q.c) / 2, a, b, t: gap });
      }
    }
    return out;
  };
  const glazing = [...glazingBands(HM, 'H'), ...glazingBands(VM, 'V')];

  /* ---------- Join pieces on the same line; gaps of door/window size become openings ---------- */
  interface Run {
    o: 'H' | 'V';
    c: number;
    a: number;
    b: number;
    t: number;
    holes: { a: number; b: number; kind: Opening['kind']; flip: number }[];
  }
  const runs: Run[] = [];
  pieces.sort((p, q) => (p.o === q.o ? p.c - q.c || p.a - q.a : p.o < q.o ? -1 : 1));
  for (const p of pieces) {
    const r = runs.find(
      (x) => x.o === p.o && Math.abs(x.c - p.c) < 40 && Math.abs(x.t - p.t) < 60 && p.a <= x.b + 3000 && p.a >= x.a,
    );
    if (!r) {
      runs.push({ ...p, holes: [] });
      continue;
    }
    const gap = p.a - r.b;
    if (gap > 60) {
      if (gap < 450 || gap > 3000) {
        // Too short or too long for an opening: a separate wall.
        runs.push({ ...p, holes: [] });
        continue;
      }
      const lo = r.b;
      const hi = p.a;
      const inGap = (x: number, y: number, reach: number) => {
        const along = p.o === 'H' ? x : y;
        const across = p.o === 'H' ? y : x;
        return along > lo - 50 && along < hi + 50 && Math.abs(across - p.c) < reach;
      };
      const arcs = curves.filter((cv) => inGap(cv.x, cv.y, gap + 100));
      const door = arcs.length >= 3;
      // Which side the swing is on decides the leaf's flip.
      const side = arcs.reduce((s, cv) => s + ((p.o === 'H' ? cv.y : cv.x) - p.c), 0);
      const panes = (p.o === 'H' ? HM : VM).filter((l) => Math.abs(l.c - p.c) < p.t / 2 && l.a < hi && l.b > lo).length;
      // Only a gap with evidence becomes an opening: a swing arc (door) or glazing lines (window).
      if (!door && panes < 2) {
        runs.push({ ...p, holes: [] });
        continue;
      }
      r.holes.push({ a: lo, b: hi, kind: door ? 'door' : 'window', flip: side >= 0 ? 1 : -1 });
    }
    r.b = Math.max(r.b, p.b);
    r.c = (r.c + p.c) / 2;
  }
  // A glazing band continuing a wall line (or bridging to it) becomes wall with a window across the band.
  for (const g of glazing) {
    const covered = runs.some((r) => r.o === g.o && Math.abs(r.c - g.c) < 60 && g.a >= r.a - 50 && g.b <= r.b + 50);
    if (covered) continue;
    const near = runs.find(
      (r) => r.o === g.o && Math.abs(r.c - g.c) < 60 && (Math.abs(g.a - r.b) < 400 || Math.abs(r.a - g.b) < 400),
    );
    if (near) {
      near.holes.push({ a: Math.max(g.a, near.b), b: g.b <= near.a ? near.a : g.b, kind: 'window', flip: 1 });
      if (g.b <= near.a) near.holes[near.holes.length - 1]!.a = g.a;
      near.a = Math.min(near.a, g.a);
      near.b = Math.max(near.b, g.b);
    }
    // A band on its own is usually dimension or extension lines, not a window: skip it.
  }

  /* ---------- Snap ends onto the walls they meet ---------- */
  const reach = (r: Run, s: Run) => r.t / 2 + s.t / 2 + 150;
  for (const r of runs) {
    for (const end of ['a', 'b'] as const) {
      const pos = r[end];
      let best: { v: number; d: number } | null = null;
      for (const s of runs) {
        if (s === r || s.o === r.o) continue;
        // s is perpendicular: its line is at s.c (along r's axis); r's line must fall within s's span.
        if (r.c < s.a - reach(r, s) || r.c > s.b + reach(r, s)) continue;
        const d = Math.abs(s.c - pos);
        if (d < reach(r, s) && (!best || d < best.d)) best = { v: s.c, d };
      }
      if (best) r[end] = best.v;
    }
  }
  // Perpendicular walls whose spans stop short of each other's lines (an L corner drawn with a gap): extend.
  for (const r of runs)
    for (const s of runs) {
      if (r.o === s.o) continue;
      for (const e of ['a', 'b'] as const)
        if (Math.abs(s[e] - r.c) < reach(r, s) && s.c >= r.a - reach(r, s) && s.c <= r.b + reach(r, s)) {
          s[e] = r.c;
          if (s.c < r.a) r.a = s.c;
          if (s.c > r.b) r.b = s.c;
        }
    }

  /* ---------- Build the plan (metres, z down, origin at the region's top-left) ---------- */
  const ox = region.x0 * k;
  const oy = region.y1 * k;
  const toPlan = (o: 'H' | 'V', c: number, along: number): [number, number] =>
    o === 'H' ? [(along - ox) / 1000, (oy - c) / 1000] : [(c - ox) / 1000, (oy - along) / 1000];
  const plan: Plan = { nodes: [], walls: [], openings: [], items: [], rooms: {}, north: 0 };
  const nodeAt = (x: number, z: number): PlanNode => {
    const found = plan.nodes.find((n) => Math.hypot(n.x - x, n.z - z) < 0.03);
    if (found) return found;
    const n = { id: uid('n'), x: Math.round(x * 1000) / 1000, z: Math.round(z * 1000) / 1000 };
    plan.nodes.push(n);
    return n;
  };
  for (const r of runs) {
    const L = r.b - r.a;
    if (L < 250) continue;
    const [ax, az] = toPlan(r.o, r.c, r.a);
    const [bx, bz] = toPlan(r.o, r.c, r.b);
    const w: Wall = { id: uid('w'), a: nodeAt(ax, az).id, b: nodeAt(bx, bz).id, thick: Math.round(r.t / 10) / 100 };
    plan.walls.push(w);
    for (const h of r.holes) {
      const a = Math.max(r.a + 30, h.a);
      const b = Math.min(r.b - 30, h.b);
      if (b - a < 300) continue;
      plan.openings.push({
        id: uid('o'),
        wall: w.id,
        kind: h.kind,
        t: ((a + b) / 2 - r.a) / L,
        width: (b - a) / 1000,
        flip: h.flip,
      });
    }
  }
  // T-junctions: an end landing on another wall's middle splits that wall there, so rooms close.
  for (const n of [...plan.nodes]) {
    for (const w of [...plan.walls]) {
      if (w.a === n.id || w.b === n.id) continue;
      const a = plan.nodes.find((m) => m.id === w.a)!;
      const b = plan.nodes.find((m) => m.id === w.b)!;
      const L = Math.hypot(b.x - a.x, b.z - a.z);
      const t = ((n.x - a.x) * (b.x - a.x) + (n.z - a.z) * (b.z - a.z)) / (L * L);
      if (t <= 0.01 || t >= 0.99) continue;
      const px = a.x + (b.x - a.x) * t;
      const pz = a.z + (b.z - a.z) * t;
      if (Math.hypot(px - n.x, pz - n.z) > 0.03) continue;
      const mid = splitWall(plan, w, t);
      // Re-point the new node to the existing one.
      for (const x of plan.walls) {
        if (x.a === mid.id) x.a = n.id;
        if (x.b === mid.id) x.b = n.id;
      }
    }
  }
  // Short walls touching nothing are leftovers (dimension ticks, labels): drop them.
  const degree = new Map<string, number>();
  for (const w of plan.walls) for (const id of [w.a, w.b]) degree.set(id, (degree.get(id) ?? 0) + 1);
  plan.walls = plan.walls.filter((w) => {
    const a = plan.nodes.find((n) => n.id === w.a)!;
    const b = plan.nodes.find((n) => n.id === w.b)!;
    const isolated = degree.get(w.a) === 1 && degree.get(w.b) === 1;
    return !(isolated && Math.hypot(b.x - a.x, b.z - a.z) < 1);
  });
  tidy(plan);
  return { plan, walls: plan.walls.length, openings: plan.openings.length };
}
