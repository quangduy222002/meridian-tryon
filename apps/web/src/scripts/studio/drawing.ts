/**
 * A drawing imported from PDF or DXF, reduced to what wall detection and the underlay need: straight segments,
 * arcs (doors), and text (dimensions, room labels). Coordinates are in the file's own units with y pointing up;
 * `mmPerUnit` turns them into millimetres once the scale is known.
 */
import type { Plan } from '../room/plan';

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Came from a curve (door swings, fixtures). */
  curve?: boolean;
  /** CAD layer, when the file has layers (DXF). */
  layer?: string;
}

export interface Text {
  str: string;
  x: number;
  y: number;
  /** Text height in drawing units. */
  h: number;
  /** Rotation in radians (vertical dimension texts are rotated). */
  angle: number;
}

/** A block reference (DXF INSERT): its name and the box of what it drew, so fixtures can be recognised by name. */
export interface BlockRef {
  name: string;
  layer?: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Drawing {
  name: string;
  kind: 'pdf' | 'dxf';
  segs: Segment[];
  texts: Text[];
  bounds: { x0: number; y0: number; x1: number; y1: number };
  /** Millimetres per drawing unit, or null until detected / calibrated. */
  mmPerUnit: number | null;
  /** How the scale was found, for the UI. */
  scaleNote: string;
  /** The plan itself, when the file is a Floorwise export (DXF only). */
  plan?: Plan;
  /** Block references with their extents (DXF only). */
  blocks?: BlockRef[];
  /** Raster of the page for a faithful underlay (PDF only). */
  image?: { url: string; x0: number; y0: number; x1: number; y1: number };
}

export interface Region {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function boundsOf(segs: Segment[]) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const s of segs) {
    x0 = Math.min(x0, s.x1, s.x2);
    y0 = Math.min(y0, s.y1, s.y2);
    x1 = Math.max(x1, s.x1, s.x2);
    y1 = Math.max(y1, s.y1, s.y2);
  }
  return Number.isFinite(x0) ? { x0, y0, x1, y1 } : { x0: 0, y0: 0, x1: 1, y1: 1 };
}

export const segLen = (s: Segment) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1);

export const inRegion = (r: Region, x: number, y: number) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

/**
 * Scale from dimension annotations: each dimension number sits between two tick marks on its dimension line, so
 * value / tick distance gives millimetres per unit. The median over all dimensions is robust to a few misreads.
 */
export function scaleFromDimensions(d: Drawing, region?: Region): { mmPerUnit: number; votes: number } | null {
  const ticks: { x: number; y: number }[] = [];
  for (const s of d.segs) {
    const L = segLen(s);
    const dx = Math.abs(s.x2 - s.x1);
    const dy = Math.abs(s.y2 - s.y1);
    // A tick is a short oblique stroke (architectural ticks are drawn at 45°).
    if (s.curve || L < 0.5 || L > 12 || dx < L * 0.35 || dy < L * 0.35) continue;
    ticks.push({ x: (s.x1 + s.x2) / 2, y: (s.y1 + s.y2) / 2 });
  }
  // Merge the strokes that make up one tick (an architectural tick is often two strokes): keep their centre.
  ticks.sort((a, b) => a.x - b.x || a.y - b.y);
  const merged: { x: number; y: number; n: number }[] = [];
  for (const t of ticks) {
    const m = merged.find((o) => Math.hypot(o.x - t.x, o.y - t.y) < 9);
    if (m) {
      m.x = (m.x * m.n + t.x) / (m.n + 1);
      m.y = (m.y * m.n + t.y) / (m.n + 1);
      m.n++;
    } else merged.push({ ...t, n: 1 });
  }
  const ratios: number[] = [];
  for (const t of d.texts) {
    const v = Number(t.str.trim());
    if (!/^\d{2,5}$/.test(t.str.trim()) || v < 50) continue;
    if (region && !inRegion(region, t.x, t.y)) continue;
    // Text runs along (cos a, sin a); its dimension line lies just "below" it, along (sin a, -cos a).
    const ux = Math.cos(t.angle);
    const uy = Math.sin(t.angle);
    const dx = uy;
    const dy = -ux;
    const width = t.str.length * t.h * 0.5;
    const cx = t.x + (ux * width) / 2;
    const cy = t.y + (uy * width) / 2;
    const cand = merged
      .map((k) => ({ along: (k.x - cx) * ux + (k.y - cy) * uy, off: (k.x - t.x) * dx + (k.y - t.y) * dy }))
      .filter((k) => k.off > -1 && k.off < t.h * 2 && Math.abs(k.along) < 400);
    if (!cand.length) continue;
    // The nearest row of ticks below the text is its own dimension line.
    const row = Math.min(...cand.map((k) => k.off));
    const own = cand.filter((k) => k.off - row < 2);
    const before = own.filter((k) => k.along < 0).sort((p, q) => q.along - p.along)[0];
    const after = own.filter((k) => k.along > 0).sort((p, q) => p.along - q.along)[0];
    if (!before || !after) continue;
    const dist = after.along - before.along;
    if (dist > 1) ratios.push(v / dist);
  }
  if (ratios.length < 2) return null;
  ratios.sort((a, b) => a - b);
  // Keep the largest cluster of agreeing ratios (within 3%).
  let best: number[] = [];
  for (const r of ratios) {
    const group = ratios.filter((q) => Math.abs(q / r - 1) < 0.03);
    if (group.length > best.length) best = group;
  }
  if (best.length < 2) return null;
  return { mmPerUnit: best[Math.floor(best.length / 2)]!, votes: best.length };
}

/**
 * Some CAD programs write arcs to PDF as chains of short straight lines instead of curves. Finds runs of four or more
 * short, similar chords that keep turning the same way by a few degrees each (a door swing, a basin's rim) and marks
 * them as curve pieces, as if they had been drawn as curves.
 */
export function markPolylineArcs(segs: Segment[]) {
  const key = (x: number, y: number) => `${Math.round(x * 20)},${Math.round(y * 20)}`;
  const at = new Map<string, number[]>();
  const seen = new Set<string>();
  segs.forEach((s, i) => {
    const L = segLen(s);
    if (s.curve || L === 0 || L > 40) return;
    // The same stroke drawn twice (outline and fill) counts once.
    const a = key(s.x1, s.y1);
    const b = key(s.x2, s.y2);
    const id = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(id)) return;
    seen.add(id);
    for (const k of [a, b]) at.set(k, [...(at.get(k) ?? []), i]);
  });
  const done = new Set<number>();
  // Walk chains from their ends (or junctions) first, then what is left: closed loops (a round basin).
  for (const loops of [false, true])
    for (const [start, list] of at) {
      if (!loops && list.length === 2) continue;
      for (const first of list) {
        if (done.has(first)) continue;
        // Points along the chain, following segments through nodes where exactly two meet.
        const chain: number[] = [];
        const pts: [number, number][] = [];
        let node = start;
        let i: number | undefined = first;
        while (i !== undefined && !done.has(i)) {
          done.add(i);
          chain.push(i);
          const s = segs[i]!;
          const fwd = key(s.x1, s.y1) === node;
          if (!pts.length) pts.push(fwd ? [s.x1, s.y1] : [s.x2, s.y2]);
          pts.push(fwd ? [s.x2, s.y2] : [s.x1, s.y1]);
          node = fwd ? key(s.x2, s.y2) : key(s.x1, s.y1);
          const next: number[] = at.get(node) ?? [];
          i = next.length === 2 ? next.find((j) => j !== i) : undefined;
        }
        markArcRuns(segs, chain, pts);
      }
    }
}

function markArcRuns(segs: Segment[], chain: number[], pts: [number, number][]) {
  if (chain.length < 4) return;
  const dir = (k: number) => Math.atan2(pts[k + 1]![1] - pts[k]![1], pts[k + 1]![0] - pts[k]![0]);
  const turn = (k: number) => {
    let t = dir(k + 1) - dir(k);
    while (t > Math.PI) t -= 2 * Math.PI;
    while (t < -Math.PI) t += 2 * Math.PI;
    return t;
  };
  const DEG = Math.PI / 180;
  let runStart = 0;
  const close = (end: number) => {
    // Segments runStart..end-1 form a run with consistent small turns.
    const n = end - runStart;
    if (n < 4) return;
    const lens = chain.slice(runStart, end).map((i) => segLen(segs[i]!));
    const sorted = [...lens].sort((a, b) => a - b);
    const med = sorted[n >> 1]!;
    let total = 0;
    for (let k = runStart; k < end - 1; k++) total += Math.abs(turn(k));
    if (sorted[0]! < med / 3 || sorted[n - 1]! > med * 3 || total < 30 * DEG) return;
    for (let k = runStart; k < end; k++) segs[chain[k]!]!.curve = true;
  };
  for (let k = 0; k < chain.length - 1; k++) {
    const t = turn(k);
    const prev = k > runStart ? turn(k - 1) : t;
    const ok = Math.abs(t) > 1 * DEG && Math.abs(t) < 40 * DEG && Math.sign(t) === Math.sign(prev);
    if (!ok) {
      close(k + 1);
      runStart = k + 1;
    }
  }
  close(chain.length);
}
