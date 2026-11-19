/**
 * Lighting design in layers, the way an interior lighting plan is drawn:
 * - General (ambient): recessed downlights on a grid about 1.8–2.1 m apart and 0.7 m in from the walls; one
 *   ceiling light in small rooms (bathrooms, halls); a chandelier at the centre of a classic living room.
 * - Task: a pendant 0.75 m over each dining table, a light over the vanity mirror.
 * - Accent and bedside: wall lights either side of a bed's headboard.
 * Fittings already chosen by hand stay; previous automatic ones are replaced. Pure plan data, no three.js.
 */
import { FURNITURE } from './catalog';
import { pointInPoly, roomName, snapToWall, uid, type Item, type Plan, type Room, type Vec2 } from './plan';

/** Types this module places (and replaces when it runs again). */
const AUTO = new Set(['downlight', 'ceilingLight', 'pendant', 'chandelier', 'wallLight']);
const BACK: Record<number, Vec2> = { 0: [0, -1], 90: [1, 0], 180: [0, 1], 270: [-1, 0] };

/** Shortest distance from a point to the room's outline. */
function edgeDistance(pt: Vec2, poly: Vec2[]) {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(pt[0] - (a[0] + dx * t), pt[1] - (a[1] + dz * t)));
  }
  return best;
}

/** Adds a lighting plan to every room. Returns how many fittings it placed. */
export function designLighting(p: Plan, rooms: Room[]): number {
  p.items = p.items.filter((it) => !(AUTO.has(it.type) && it.auto));
  const added: Item[] = [];
  const put = (type: string, x: number, z: number, rot = 0) => {
    const it: Item = { id: uid('i'), type, x, z, rot, auto: true };
    added.push(it);
    return it;
  };
  for (const r of rooms) {
    const name = roomName(p, r);
    if (name === 'Balcony' || name === 'Shaft') continue;
    const inRoom = p.items.filter((it) => pointInPoly([it.x, it.z], r.poly));
    const has = (t: string) => inRoom.some((it) => it.type === t || it.type.startsWith(t));
    const xs = r.poly.map((q) => q[0]);
    const zs = r.poly.map((q) => q[1]);
    const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];

    // Task: pendants over dining tables, a light over the vanity.
    const tables = inRoom.filter((it) => it.type.startsWith('dining'));
    for (const t of tables) put('pendant', t.x, t.z);
    for (const v of inRoom.filter((it) => it.type === 'sink')) {
      const back = BACK[v.rot] ?? [0, -1];
      const wl = put('wallLight', v.x + back[0] * 0.3, v.z + back[1] * 0.3, v.rot);
      snapToWall(p, wl, 0.4);
    }
    // Bedside: wall lights either side of the headboard.
    for (const b of inRoom.filter((it) => it.type.startsWith('bed'))) {
      const def = FURNITURE[b.type]!;
      const back = BACK[b.rot] ?? [0, -1];
      const side: Vec2 = [-back[1], back[0]];
      for (const s of [-1, 1]) {
        const x = b.x + back[0] * (def.d / 2) + side[0] * s * (def.w / 2 + 0.32);
        const z = b.z + back[1] * (def.d / 2) + side[1] * s * (def.w / 2 + 0.32);
        if (pointInPoly([x, z], r.poly)) snapToWall(p, put('wallLight', x, z, b.rot), 0.4);
      }
    }

    // General light.
    if (r.area < 7 || x1 - x0 < 2 || z1 - z0 < 2) {
      if (!tables.length) put('ceilingLight', r.centroid[0], r.centroid[1]);
      continue;
    }
    if (p.style === 'classic' && /Living|Room/.test(name) && !has('chandelier')) {
      put('chandelier', r.centroid[0], r.centroid[1]);
      continue;
    }
    const step = r.area > 30 ? 2.1 : 1.8;
    const nx = Math.max(1, Math.round((x1 - x0 - 1.4) / step) + 1);
    const nz = Math.max(1, Math.round((z1 - z0 - 1.4) / step) + 1);
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x = nx === 1 ? (x0 + x1) / 2 : x0 + 0.7 + ((x1 - x0 - 1.4) * i) / (nx - 1);
        const z = nz === 1 ? (z0 + z1) / 2 : z0 + 0.7 + ((z1 - z0 - 1.4) * j) / (nz - 1);
        if (!pointInPoly([x, z], r.poly) || edgeDistance([x, z], r.poly) < 0.5) continue;
        // Leave the space over a dining table to its pendant.
        if (tables.some((t) => Math.hypot(t.x - x, t.z - z) < 0.9)) continue;
        put('downlight', x, z);
      }
  }
  p.items.push(...added);
  return added.length;
}

/** Light colour for a colour temperature (Tanner Helland's fit, good from 1000 K to 10000 K). */
export function kelvinColor(k: number): [number, number, number] {
  const t = k / 100;
  const r = t <= 66 ? 255 : 329.7 * (t - 60) ** -0.1332;
  const g = t <= 66 ? 99.47 * Math.log(t) - 161.12 : 288.12 * (t - 60) ** -0.0755;
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
  const c = (v: number) => Math.max(0, Math.min(255, v)) / 255;
  return [c(r), c(g), c(b)];
}
