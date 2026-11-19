/**
 * Multi-storey drawings: a villa's sheet holds one plan per floor ("MẶT BẰNG TẦNG 1", "LẦU 1", "TRỆT", "MÁI").
 * Each floor is selected and built in turn; these helpers name it from its title and line it up with the others.
 */
import type { Plan } from '../room/plan';
import { inRegion, type Drawing, type Region } from './drawing';

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

const FLOOR =
  /\b(tang\s*ham|ham|tang\s*\d+|lau\s*\d+|tret|mai|tum|basement|ground floor|(first|second|third) floor|level\s*\d+|roof)\b/;

/**
 * The floor's name from a title in or just under the selected box ("Tầng 2", "Lầu 1", "Trệt"), as written on the
 * sheet; null when there is none.
 */
export function floorLabel(d: Drawing, r: Region): string | null {
  const pad = (r.y1 - r.y0) * 0.15;
  const near: Region = { x0: r.x0, x1: r.x1, y0: r.y0 - pad, y1: r.y1 };
  // Titles sit under the plan: prefer the lowest match, then the largest text.
  const hits = d.texts
    .filter((t) => inRegion(near, t.x, t.y))
    .map((t) => ({ t, m: FLOOR.exec(fold(t.str)) }))
    .filter((h) => h.m)
    .sort((a, b) => a.t.y - b.t.y || b.t.h - a.t.h);
  const hit = hits[0];
  if (!hit?.m) return null;
  // Cut the same span out of the original (accented) text.
  const folded = fold(hit.t.str);
  const start = folded.indexOf(hit.m[0]);
  const raw = hit.t.str.slice(start, start + hit.m[0].length).trim();
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function bounds(p: Plan) {
  const xs = p.nodes.map((n) => n.x);
  const zs = p.nodes.map((n) => n.z);
  return { x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs) };
}

/**
 * The shift that puts a new floor over the current one: their outlines' top-left corners together (floors of one
 * house share their footprint; where an upper floor is smaller the walls can be nudged in the editor).
 */
export function alignTo(current: Plan, next: Plan): [number, number] {
  if (!current.nodes.length || !next.nodes.length) return [0, 0];
  const a = bounds(current);
  const b = bounds(next);
  return [a.x0 - b.x0, a.z0 - b.z0];
}
