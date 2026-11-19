/**
 * The plans on a sheet. A permit set or a villa's general arrangement puts several drawings on one sheet — each
 * floor, the roof, the foundation, sections, elevations, a site plan — each titled underneath ("MẶT BẰNG TẦNG 2
 * TL 1/100", "GENERAL ARRANGEMENT PLAN - LEVEL 1"). This finds the floor plans among them, so the visitor can pick
 * one or build them all instead of boxing each by hand:
 * 1. Drawings are clusters of ink: the sheet is cut into small cells, cells with lines in them (frame and title-block
 *    rules left out) are joined to their neighbours, and each connected group is one drawing with its dimensions.
 * 2. Each floor-plan title claims the drawing standing just above it (and pieces of it within reach).
 * 3. Floors are ordered from the bottom up: basement, ground or floor 1, mezzanine, floor 2…
 */
import type { Drawing, Region } from './drawing';

export interface PlanView {
  /** Short name for the chip ("Tầng 1", "Lửng", "Level 2"). */
  name: string;
  /** Storey order: 1 for the ground floor, 1.5 for a mezzanine, 2 for the next floor… */
  order: number;
  region: Region;
  /** The scale written in the title (1 : n), when there is one. It is only shown: dimensions set the real scale. */
  scale: number | null;
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

const PLAN_TITLE = /mat bang|floor plan|arrangement plan|plan\s*-?\s*level|^\s*level\s*\d/;
/** Titled drawings that are not floors to build. */
const NOT_A_FLOOR =
  /mong|mai|roof|foundation|hien trang|vi tri|site|cat|section|dung|elevation|tong the|chi tiet|detail/;

/** Where a title puts its floor in the stack, and its short name; null when it names no floor. */
function floorOf(title: string): { order: number; name: string } | null {
  const t = fold(title);
  let m: RegExpExecArray | null;
  if (/tang\s*ham|basement/.test(t)) return { order: 0, name: 'Hầm' };
  if (/tret|ground/.test(t)) return { order: 1, name: 'Trệt' };
  if (/lung|mezzanine/.test(t)) return { order: 1.5, name: 'Lửng' };
  if ((m = /lau\s*(\d+)/.exec(t))) return { order: Number(m[1]) + 1, name: `Lầu ${m[1]}` };
  if ((m = /tang\s*(\d+)/.exec(t))) return { order: Number(m[1]), name: `Tầng ${m[1]}` };
  if ((m = /level\s*(\d+)/.exec(t))) return { order: Number(m[1]), name: `Level ${m[1]}` };
  return null;
}

const SCALE = /(?:\btl\b|scale|ti le)[^0-9]*1\s*[:/]\s*(\d{2,4})/;

export function findViews(d: Drawing): PlanView[] {
  const b = d.bounds;
  const W = b.x1 - b.x0;
  const H = b.y1 - b.y0;
  if (W <= 0 || H <= 0) return [];
  const heights = d.texts.map((t) => t.h).sort((p, q) => p - q);
  const medianH = heights[Math.floor(heights.length / 2)] ?? 0;

  // Floor-plan titles: large text naming a floor.
  const titles = d.texts
    .filter((t) => t.h >= medianH * 1.5 && PLAN_TITLE.test(fold(t.str)) && !NOT_A_FLOOR.test(fold(t.str)))
    .map((t) => ({ t, floor: floorOf(t.str) }))
    .filter((x): x is { t: (typeof d.texts)[number]; floor: { order: number; name: string } } => !!x.floor);
  if (!titles.length) return [];

  // Ink clusters on a grid of about 200 cells across the sheet.
  const cell = Math.max(W, H) / 200;
  const cols = Math.ceil(W / cell) + 1;
  const rows = Math.ceil(H / cell) + 1;
  const ink = new Uint8Array(cols * rows);
  const mark = (x: number, y: number) => {
    const i = Math.floor((x - b.x0) / cell);
    const j = Math.floor((y - b.y0) / cell);
    if (i >= 0 && j >= 0 && i < cols && j < rows) ink[j * cols + i] = 1;
  };
  for (const s of d.segs) {
    const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    // Sheet frame, title-block rules and long setback or grid lines would join every drawing into one.
    if (L > Math.max(W, H) * 0.25) continue;
    const n = Math.max(1, Math.ceil(L / (cell / 2)));
    for (let k = 0; k <= n; k++) mark(s.x1 + ((s.x2 - s.x1) * k) / n, s.y1 + ((s.y2 - s.y1) * k) / n);
  }
  // Join cells one apart (a dimension chain standing off its plan), then label connected groups.
  const grown = new Uint8Array(ink);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++)
      if (ink[j * cols + i])
        for (let dj = -1; dj <= 1; dj++)
          for (let di = -1; di <= 1; di++) {
            const ii = i + di;
            const jj = j + dj;
            if (ii >= 0 && jj >= 0 && ii < cols && jj < rows) grown[jj * cols + ii] = 1;
          }
  const label = new Int32Array(cols * rows).fill(-1);
  const boxes: Region[] = [];
  for (let start = 0; start < grown.length; start++) {
    if (!grown[start] || label[start] !== -1) continue;
    const id = boxes.length;
    const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const stack = [start];
    label[start] = id;
    while (stack.length) {
      const c = stack.pop()!;
      const i = c % cols;
      const j = (c - i) / cols;
      box.x0 = Math.min(box.x0, b.x0 + i * cell);
      box.x1 = Math.max(box.x1, b.x0 + (i + 1) * cell);
      box.y0 = Math.min(box.y0, b.y0 + j * cell);
      box.y1 = Math.max(box.y1, b.y0 + (j + 1) * cell);
      for (const [ii, jj] of [
        [i + 1, j],
        [i - 1, j],
        [i, j + 1],
        [i, j - 1],
      ] as const) {
        if (ii < 0 || jj < 0 || ii >= cols || jj >= rows) continue;
        const n = jj * cols + ii;
        if (grown[n] && label[n] === -1) {
          label[n] = id;
          stack.push(n);
        }
      }
    }
    boxes.push(box);
  }

  // Each title claims the biggest drawing standing just above it that its left edge falls under.
  const claimed = new Set<number>();
  const views: PlanView[] = [];
  for (const { t, floor } of titles.sort((p, q) => q.t.h - p.t.h)) {
    const area = (r: Region) => (r.x1 - r.x0) * (r.y1 - r.y0);
    const above = boxes
      .map((r, i) => ({ r, i }))
      .filter(
        ({ r, i }) =>
          !claimed.has(i) &&
          t.x >= r.x0 - (r.x1 - r.x0) * 0.25 &&
          t.x <= r.x1 &&
          // Standing above the title (its bottom row of dimensions may reach down beside it).
          (r.y0 + r.y1) / 2 > t.y + t.h &&
          r.y0 >= t.y - t.h * 3 &&
          r.y0 - t.y <= H * 0.3 &&
          area(r) >= W * H * 0.015,
      )
      .sort((p, q) => p.r.y0 - t.y - (q.r.y0 - t.y) || area(q.r) - area(p.r));
    const first = above[0];
    if (!first) continue;
    // Only drawings starting about as low as the nearest one (the plan, not one stacked above it).
    const band = first.r.y0 + (first.r.y1 - first.r.y0) * 0.3;
    const pick = above.filter((x) => x.r.y0 <= band).sort((p, q) => area(q.r) - area(p.r))[0]!;
    claimed.add(pick.i);
    const region = { ...pick.r };
    // Pieces of the same drawing a little apart (a dimension chain, a grid bubble row): take them in.
    for (const [i, r] of boxes.entries()) {
      if (claimed.has(i)) continue;
      const near =
        r.x0 >= region.x0 - cell * 4 &&
        r.x1 <= region.x1 + cell * 4 &&
        r.y0 >= region.y0 - cell * 4 &&
        r.y1 <= region.y1 + cell * 4;
      if (!near) continue;
      claimed.add(i);
      region.x0 = Math.min(region.x0, r.x0);
      region.x1 = Math.max(region.x1, r.x1);
      region.y0 = Math.min(region.y0, r.y0);
      region.y1 = Math.max(region.y1, r.y1);
    }
    // Two drawings side by side can touch (a shared grid line, a long note): a drawing titled further along the same
    // row starts where its title does, so this one ends before it.
    for (const o of d.texts) {
      if (o === t || o.h < medianH * 1.5 || Math.abs(o.y - t.y) > t.h * 3 || o.x <= t.x + t.h * 4) continue;
      if (!/mat |plan|section|elevation|level|mai|mong/.test(fold(o.str))) continue;
      // Cut at the emptiest column of ink between the two titles (the gap between the drawings).
      const lo = Math.floor((Math.max(region.x0 + (region.x1 - region.x0) * 0.3, t.x) - b.x0) / cell);
      const hi = Math.floor((o.x - b.x0) / cell);
      const j0 = Math.max(0, Math.floor((region.y0 - b.y0) / cell));
      const j1 = Math.min(rows - 1, Math.floor((region.y1 - b.y0) / cell));
      let cut = hi;
      let least = Infinity;
      for (let i = lo; i <= hi && i < cols; i++) {
        let n = 0;
        for (let j = j0; j <= j1; j++) n += ink[j * cols + i]!;
        if (n < least) {
          least = n;
          cut = i;
        }
      }
      region.x1 = Math.min(region.x1, b.x0 + cut * cell);
    }
    // The scale: in the title, or in a line of text just under it.
    const near = d.texts.filter(
      (x) => x === t || (Math.abs(x.y - t.y) < t.h * 4 && x.x >= t.x - t.h * 2 && x.x <= t.x + t.h * 40),
    );
    const sm = near.map((x) => SCALE.exec(fold(x.str))).find((m) => m);
    views.push({ name: floor.name, order: floor.order, region, scale: sm ? Number(sm[1]) : null });
  }
  // One view per floor (a repeated title is a detail of it), bottom up.
  const seen = new Set<number>();
  return views.sort((p, q) => p.order - q.order).filter((v) => !seen.has(v.order) && !!seen.add(v.order));
}
