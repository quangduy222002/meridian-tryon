/**
 * Wall detection: turns the lines inside the chosen region into a Roomcraft plan.
 *
 * 1. Keep horizontal and vertical lines; merge pieces that continue each other.
 * 2. A wall is two parallel lines 6–65 cm apart with nothing parallel between them, whose band is hatched
 *    (cut walls are hatched on architectural plans; dimension and extension lines aren't). Concrete, drawn with
 *    sparse hatch, counts when the band is a closed block. DXF files carry no hatch strokes, so there wall layers
 *    ("WALL", "TUONG", …) count instead.
 * 3. Pieces on one line join up; gaps of a door's or window's width become openings: an arc nearby means a door
 *    (two half-width swings a double door), offset panel lines a sliding door, glazing lines a window. Short
 *    cross-cuts inside a wall's body, and frame lines along one, are dropped.
 * 4. Ends snap to the walls they run into, so corners and T-junctions share nodes and rooms close; where a facade
 *    changes thickness, the offset centre lines are joined by a short cross piece.
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
  const curves: { x: number; y: number; L: number }[] = [];
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
      curves.push({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, L });
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

  /**
   * Cast concrete is drawn with sparse diagonals and aggregate marks, far below brick hatch density. Such a band
   * still counts as wall when it is a closed block — both ends capped by a line straight across — holding a real
   * pattern (several strokes). A rectangle with one or two diagonals (a beam, a shaft, a shower tray) is not.
   */
  const concreteBlock = (o: 'H' | 'V', c0: number, c1: number, a: number, b: number) => {
    let n = 0;
    for (const h of hatch) {
      const along = o === 'H' ? h.x : h.y;
      const across = o === 'H' ? h.y : h.x;
      if (along > a && along < b && across > c0 && across < c1) n++;
    }
    if (n < 4 || hatchDensity(o, c0, c1, a, b) < 0.002) return false;
    const cross = o === 'H' ? VM : HM;
    const capped = (at: number) => cross.some((r) => Math.abs(r.c - at) < 20 && r.a <= c0 + 20 && r.b >= c1 - 20);
    return capped(a) && capped(b);
  };

  const pair = (list: Line[], o: 'H' | 'V') => {
    const out: WallPiece[] = [];
    // Hatched blocks up to 1 m thick are columns and service shafts: keep them as thick walls. On a wall layer, short
    // piers between windows count too.
    const maxT = hatched ? 1000 : 320;
    const minLen = hatched || layered ? 100 : 250;
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
          if (hatchDensity(o, p.c, q.c, a, b) < 0.01 && !concreteBlock(o, p.c, q.c, a, b)) continue;
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
    holes: {
      a: number;
      b: number;
      kind: Opening['kind'];
      flip: number;
      hingeHi?: boolean;
      leaves?: 2;
      tall?: boolean;
    }[];
    /** A short connector added where a wall changes thickness; kept however short it is. */
    joint?: boolean;
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
      const alongOf = (cv: { x: number; y: number }) => (p.o === 'H' ? cv.x : cv.y);
      const acrossOf = (cv: { x: number; y: number }) => (p.o === 'H' ? cv.y : cv.x) - p.c;
      // A swing is a quarter circle about a jamb, as wide as the gap (half as wide for each leaf of a double door),
      // cut into short chords on import. Only curve pieces on such a circle count, so a basin or a bathtub drawn
      // near the doorway doesn't.
      const onSwing = (cv: { x: number; y: number }) =>
        [lo, hi].some((j) =>
          [gap, gap / 2].some((rad) => {
            const d = Math.hypot(alongOf(cv) - j, Math.abs(acrossOf(cv)) - p.t / 2);
            return Math.abs(d - rad) < rad * 0.15 + 40;
          }),
        );
      const arcs = curves.filter((cv) => inGap(cv.x, cv.y, gap + 100) && onSwing(cv));
      // The side with the most swing is the side the door opens to; its length tells it is a door at all.
      const sideLen = (sgn: number) => arcs.filter((cv) => acrossOf(cv) * sgn > 0).reduce((s, cv) => s + cv.L, 0);
      const side = sideLen(1) >= sideLen(-1) ? 1 : -1;
      const swing = arcs.filter((cv) => acrossOf(cv) * side > 0);
      const door = sideLen(side) >= gap * 0.8;
      // A double door: two swings half as wide, one from each jamb, so they reach only half the gap out from the wall.
      const reachOut = Math.max(0, ...swing.map((cv) => Math.abs(acrossOf(cv))));
      const double =
        door &&
        reachOut < gap * 0.7 &&
        swing.some((cv) => alongOf(cv) < lo + gap * 0.4) &&
        swing.some((cv) => alongOf(cv) > hi - gap * 0.4);
      // The hinge is the jamb farther from the middle of the swing (a quarter circle's centroid lies about two
      // thirds of the way across, towards the jamb the leaf closes against).
      const mid = swing.reduce((s, cv) => s + alongOf(cv) * cv.L, 0) / Math.max(1e-6, sideLen(side));
      const hingeHi = hi - mid > mid - lo;
      const lines = (p.o === 'H' ? HM : VM).filter((l) => Math.abs(l.c - p.c) < p.t / 2 && l.a < hi && l.b > lo);
      // A sliding door: two panels, each part of the width, on offset tracks — one from each jamb, overlapping in the
      // middle. (A window's pane lines run the full width.)
      const cover = (l: Line) => Math.min(l.b, hi) - Math.max(l.a, lo);
      // A panel lies within the opening, between the wall faces (a face line running on from the next wall isn't one).
      const panel = (l: Line) =>
        cover(l) > gap * 0.3 &&
        cover(l) < gap * 0.8 &&
        l.a >= lo - 60 &&
        l.b <= hi + 60 &&
        Math.abs(l.c - p.c) < p.t / 2 - 10;
      const left = lines.find((l) => panel(l) && l.a <= lo + 60);
      const right = lines.find((l) => panel(l) && l.b >= hi - 60 && l !== left);
      // A sliding window looks the same but has sill lines across the full width; a door reaches the floor.
      const sliding =
        !door &&
        !!left &&
        !!right &&
        Math.abs(left.c - right.c) > 15 &&
        left.b > right.a &&
        !lines.some((l) => cover(l) >= gap * 0.9);
      // Only a gap with evidence becomes an opening: a swing arc (door), panels (sliding door) or glazing (window).
      if (!door && !sliding && lines.length < 2) {
        runs.push({ ...p, holes: [] });
        continue;
      }
      r.holes.push({
        a: lo,
        b: hi,
        kind: door ? 'door' : 'window',
        // Plan walls run left to right (H) or up the drawing (V), with the normal to their left: for an H wall that
        // is down the drawing, so a swing up the drawing (+y) is flip -1; for a V wall it is +x, flip 1.
        flip: p.o === 'H' ? -side : side,
        hingeHi,
        ...(double ? { leaves: 2 as const } : {}),
        ...(sliding ? { tall: true } : {}),
      });
    }
    r.b = Math.max(r.b, p.b);
    r.c = (r.c + p.c) / 2;
  }
  /*
   * Cross lines inside a hatched wall (block ends, joints between materials) pair up into short "walls" running
   * across it. They sit wholly inside a longer perpendicular wall's body: drop them, or the walls that meet there
   * snap to them instead of to each other and the room doesn't close.
   */
  const inside = (p: Run, q: Run) =>
    p.o !== q.o &&
    q.b - q.a > Math.max(1000, (p.b - p.a) * 2) &&
    p.a >= q.c - q.t / 2 - 20 &&
    p.b <= q.c + q.t / 2 + 20 &&
    p.c - p.t / 2 >= q.a - 20 &&
    p.c + p.t / 2 <= q.b + 20;
  const crossCuts = runs.filter((p) => !p.holes.length && runs.some((q) => inside(p, q)));
  for (const p of crossCuts) runs.splice(runs.indexOf(p), 1);

  // A glazing band continuing a wall line (or bridging to it) becomes wall with a window across the band.
  // Attaching one band lengthens the wall, which can bring the next band within reach: repeat until nothing changes,
  // so the result doesn't depend on the order the bands were found in.
  const pending = new Set(glazing);
  for (let changed = true; changed;) {
    changed = false;
    for (const g of pending) {
      const covered = runs.some((r) => r.o === g.o && Math.abs(r.c - g.c) < 60 && g.a >= r.a - 50 && g.b <= r.b + 50);
      if (covered) {
        pending.delete(g);
        continue;
      }
      const near = runs.find(
        (r) => r.o === g.o && Math.abs(r.c - g.c) < 60 && (Math.abs(g.a - r.b) < 400 || Math.abs(r.a - g.b) < 400),
      );
      // A band on its own is usually dimension or extension lines, not a window: leave it.
      if (!near) continue;
      near.holes.push({ a: Math.max(g.a, near.b), b: g.b <= near.a ? near.a : g.b, kind: 'window', flip: 1 });
      if (g.b <= near.a) near.holes[near.holes.length - 1]!.a = g.a;
      near.a = Math.min(near.a, g.a);
      near.b = Math.max(near.b, g.b);
      pending.delete(g);
      changed = true;
    }
  }

  // A door or window frame drawn just inside a wall pairs up into a thin "wall" lying along it (it would stand in the
  // opening and flicker against the wall's face): drop a plain run that lies within a longer parallel wall's body.
  const along = (p: Run, q: Run) =>
    p !== q &&
    p.o === q.o &&
    !p.joint &&
    q.b - q.a > p.b - p.a &&
    Math.abs(p.c - q.c) < (p.t + q.t) / 2 &&
    Math.min(p.b, q.b) - Math.max(p.a, q.a) >= (p.b - p.a) * 0.8;
  const frames = runs.filter((p) => !p.holes.length && runs.some((q) => along(p, q)));
  for (const p of frames) runs.splice(runs.indexOf(p), 1);

  /* ---------- Snap ends onto the walls they meet ---------- */
  const reach = (r: Run, s: Run) => r.t / 2 + s.t / 2 + 150;
  /** Ends already landed on a wall; the gap-closing pass below must not drag them onto another one. */
  const snapped = new Set<string>();
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
      if (best) {
        r[end] = best.v;
        snapped.add(`${runs.indexOf(r)}${end}`);
      }
    }
  }
  // Perpendicular walls whose spans stop short of each other's lines (an L corner drawn with a gap): extend.
  for (const r of runs)
    for (const s of runs) {
      if (r.o === s.o) continue;
      for (const e of ['a', 'b'] as const)
        if (
          !snapped.has(`${runs.indexOf(s)}${e}`) &&
          Math.abs(s[e] - r.c) < reach(r, s) &&
          s.c >= r.a - reach(r, s) &&
          s.c <= r.b + reach(r, s)
        ) {
          s[e] = r.c;
          if (s.c < r.a) r.a = s.c;
          if (s.c > r.b) r.b = s.c;
        }
    }
  // Where a facade changes thickness (a concrete block meeting a brick wall), the two pieces' centre lines are offset.
  // Meet them at a common point and join the lines with a short cross piece, so the outline stays one closed loop.
  const joints: Run[] = [];
  for (const r of runs)
    for (const s of runs) {
      if (r === s || r.o !== s.o || r.joint || s.joint) continue;
      const off = Math.abs(r.c - s.c);
      if (off < 10 || off > (r.t + s.t) / 2 + 30 || Math.abs(r.b - s.a) > 150) continue;
      const at = (r.b + s.a) / 2;
      const lo = Math.min(r.c, s.c);
      const hi = Math.max(r.c, s.c);
      // Already joined by a perpendicular wall through that point.
      const joined = runs.some((x) => x.o !== r.o && Math.abs(x.c - at) < 60 && x.a <= lo + 20 && x.b >= hi - 20);
      if (joined) continue;
      r.b = at;
      s.a = at;
      joints.push({ o: r.o === 'H' ? 'V' : 'H', c: at, a: lo, b: hi, t: Math.min(r.t, s.t), holes: [], joint: true });
    }
  runs.push(...joints);

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
    if (L < (r.joint ? 10 : 250)) continue;
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
        // Node b is at the high end of the run; flip 1 hinges there by default.
        ...(h.kind === 'door' && !h.leaves && h.hingeHi !== h.flip > 0 ? { hand: -1 as const } : {}),
        ...(h.leaves ? { leaves: h.leaves } : {}),
        ...(h.tall ? { tall: true } : {}),
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
