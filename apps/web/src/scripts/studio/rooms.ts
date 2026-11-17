/**
 * Names the rooms of a freshly detected plan, so they don't all come out as "Room" / "Hall":
 * 1. A room label in the drawing (Vietnamese or English: "BAN CÔNG", "P. NGỦ", "WC", "Kitchen", …) names the room
 *    it sits in.
 * 2. Without a label, a balcony is recognised by how it is reached: a small space on the outside of the flat that
 *    you step onto through glazing (a sliding door or a glass wall), never through a hinged door. Bedrooms, baths and
 *    stores always have a hinged door; shafts have no opening at all. The glazing onto a balcony becomes a glass door.
 * Names are written to plan.rooms like a name the visitor typed, so they can be changed in the room inspector.
 */
import { findRooms, nodeMap, pointInPoly, type Plan, type Room } from '../room/plan';
import type { Drawing, Region } from './drawing';

/** Plain lower-case ASCII, so "BAN CÔNG", "Ban công" and "ban cong" all match. */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

const LABELS: [RegExp, string][] = [
  [/\b(ban cong|lo ?gia|loggia|balcon(y|ies)?|terrace|san phoi)\b/, 'Balcony'],
  [/\b(wc|ve sinh|toilet|bath(room)?|(phong|p\.?) ?tam|shower)\b/, 'Bathroom'],
  [/\b(bep|kitchen)\b/, 'Kitchen'],
  [/\b((phong|p\.?) ?an|dining)\b/, 'Dining'],
  [/\b((phong|p\.?) ?ngu|bed ?room|master)\b/, 'Bedroom'],
  [/\b((phong|p\.?) ?khach|sinh hoat|living|lounge)\b/, 'Living'],
  [/\b((phong|p\.?) ?lam viec|study|office)\b/, 'Study'],
  [/\b(giat|laundry|utility)\b/, 'Laundry'],
  [/\b(kho|store ?room|storage)\b/, 'Storage'],
  [/\b(sanh|hanh lang|hall(way)?|corridor|foyer|entry)\b/, 'Hall'],
];

export function labelOf(text: string): string | null {
  const t = fold(text);
  for (const [re, name] of LABELS) if (re.test(t)) return name;
  return null;
}

/** Fills plan.rooms names from labels and the balcony rule. Returns the names it gave, by room key. */
export function nameRooms(plan: Plan, d: Drawing, region: Region): Map<string, string> {
  const k = d.mmPerUnit ?? 1;
  const rooms = findRooms(plan);
  const names = new Map<string, string>();

  // 1. Labels: the text's middle, in plan metres (same mapping as detectWalls: origin at the region's top-left).
  for (const t of d.texts) {
    const name = labelOf(t.str);
    if (!name) continue;
    const half = (t.str.length * t.h * 0.5) / 2;
    const x = t.x + Math.cos(t.angle) * half;
    const y = t.y + Math.sin(t.angle) * half;
    const pt: [number, number] = [((x - region.x0) * k) / 1000, ((region.y1 - y) * k) / 1000];
    const room = rooms.filter((r) => pointInPoly(pt, r.poly)).sort((a, b) => a.area - b.area)[0];
    if (room && !names.has(room.key)) names.set(room.key, name);
  }

  // 2. Balconies by how they are reached.
  const nodes = nodeMap(plan);
  const wallOf = (u: string, v: string) => plan.walls.find((w) => (w.a === u && w.b === v) || (w.a === v && w.b === u));
  const wallsOf = (r: Room) => r.nodes.map((u, i) => wallOf(u, r.nodes[(i + 1) % r.nodes.length]!)).filter((w) => !!w);
  const uses = new Map<string, number>();
  for (const r of rooms) for (const w of wallsOf(r)) uses.set(w.id, (uses.get(w.id) ?? 0) + 1);
  const length = (id: string) => {
    const w = plan.walls.find((x) => x.id === id)!;
    const a = nodes.get(w.a)!;
    const b = nodes.get(w.b)!;
    return Math.hypot(b.x - a.x, b.z - a.z);
  };
  for (const r of rooms) {
    if (names.has(r.key) || r.area < 1.5 || r.area > 15) continue;
    const walls = wallsOf(r);
    const outside = walls.filter((w) => uses.get(w.id) === 1).reduce((s, w) => s + length(w.id), 0);
    const ids = new Set(walls.map((w) => w.id));
    const openings = plan.openings.filter((o) => ids.has(o.wall));
    const fromInside = openings.filter((o) => uses.get(o.wall) === 2);
    const glazed = fromInside.filter((o) => o.kind === 'window').reduce((s, o) => s + o.width, 0);
    const hinged = openings.some((o) => o.kind === 'door');
    if (outside >= 1 && glazed >= 0.6 && !hinged) names.set(r.key, 'Balcony');
  }

  for (const [key, name] of names) plan.rooms[key] = { ...plan.rooms[key], name };

  // You walk onto a balcony: the glazing between it and the flat is a glass door from the floor, not a window.
  for (const r of rooms) {
    if (names.get(r.key) !== 'Balcony') continue;
    const ids = new Set(
      wallsOf(r)
        .filter((w) => uses.get(w.id) === 2)
        .map((w) => w.id),
    );
    for (const o of plan.openings) if (o.kind === 'window' && ids.has(o.wall) && o.width >= 0.6) o.tall = true;
  }
  return names;
}
