/**
 * Export of the plan, drawn the way an architect's plan is: walls as solid poché with openings cut out, door swings,
 * window panes, railings, room names with areas, and furniture outlines.
 * - DXF (millimetres, y up) for AutoCAD and other CAD programs, on named layers (A-WALL, A-WALL-RAIL, A-DOOR,
 *   A-GLAZ, A-ROOM, A-FURN). The plan itself rides along in DXF comments (group 999, which CAD programs skip), so
 *   Floorwise opens its own export exactly as it was.
 * - SVG: the same drawing as vector graphics, with a scale bar; PNG is rendered from it.
 * Pure geometry, no three.js: loaded only when someone exports.
 */
import { FURNITURE } from './catalog';
import { findRooms, nodeMap, roomName, wallReach, type Opening, type Plan, type Room, type Vec2 } from './plan';

type Seg = [Vec2, Vec2];
interface Arc {
  c: Vec2;
  r: number;
  /** Start and end of the swing, as unit directions from the centre. */
  from: Vec2;
  to: Vec2;
}
interface Drawing {
  walls: Vec2[][];
  wallLines: Seg[];
  doors: Seg[];
  arcs: Arc[];
  glazing: Seg[];
  rails: Vec2[][];
  railLines: Seg[];
  rooms: { room: Room; name: string }[];
  furniture: { corners: Vec2[]; name: string; c: Vec2 }[];
  bounds: { x0: number; z0: number; x1: number; z1: number };
}

const add = (a: Vec2, b: Vec2, k = 1): Vec2 => [a[0] + b[0] * k, a[1] + b[1] * k];

/** The plan as 2D linework, in plan metres (x right, z down). */
function draw(p: Plan): Drawing {
  const nodes = nodeMap(p);
  const reach = wallReach(p, nodes);
  const degree = new Map<string, number>();
  for (const w of p.walls) for (const id of [w.a, w.b]) degree.set(id, (degree.get(id) ?? 0) + 1);
  const d: Drawing = {
    walls: [],
    wallLines: [],
    doors: [],
    arcs: [],
    glazing: [],
    rails: [],
    railLines: [],
    rooms: [],
    furniture: [],
    bounds: { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity },
  };
  const grow = (q: Vec2) => {
    d.bounds.x0 = Math.min(d.bounds.x0, q[0]);
    d.bounds.z0 = Math.min(d.bounds.z0, q[1]);
    d.bounds.x1 = Math.max(d.bounds.x1, q[0]);
    d.bounds.z1 = Math.max(d.bounds.z1, q[1]);
  };

  for (const w of p.walls) {
    const na = nodes.get(w.a);
    const nb = nodes.get(w.b);
    if (!na || !nb) continue;
    const a: Vec2 = [na.x, na.z];
    const L = Math.hypot(nb.x - na.x, nb.z - na.z);
    if (L < 0.005) continue;
    const u: Vec2 = [(nb.x - na.x) / L, (nb.z - na.z) / L];
    const n: Vec2 = [-u[1], u[0]];
    const t = w.thick / 2;
    const [ea, eb] = reach.get(w.id) ?? [0, 0];
    const at = (s: number, k = 0): Vec2 => add(add(a, u, s), n, t * k);
    const box = (s0: number, s1: number): Vec2[] => [at(s0, -1), at(s1, -1), at(s1, 1), at(s0, 1)];
    if (w.rail) {
      d.rails.push(box(-ea, L + eb));
      d.railLines.push([at(-ea), at(L + eb)]);
      box(-ea, L + eb).forEach(grow);
      continue;
    }
    const ops = p.openings
      .filter((o) => o.wall === w.id)
      .map((o) => ({ o, s: o.t * L - o.width / 2, e: o.t * L + o.width / 2 }))
      .sort((x, y) => x.s - y.s);
    // Solid stretches between openings: filled poché plus their outline (faces, jambs and free ends).
    let cursor = -ea;
    const piece = (s0: number, s1: number, cap0: boolean, cap1: boolean) => {
      if (s1 - s0 < 0.002) return;
      d.walls.push(box(s0, s1));
      box(s0, s1).forEach(grow);
      d.wallLines.push([at(s0, -1), at(s1, -1)], [at(s0, 1), at(s1, 1)]);
      if (cap0) d.wallLines.push([at(s0, -1), at(s0, 1)]);
      if (cap1) d.wallLines.push([at(s1, -1), at(s1, 1)]);
    };
    for (let i = 0; i < ops.length; i++) {
      const { o, s, e } = ops[i]!;
      piece(cursor, s, i === 0 ? degree.get(w.a) === 1 : true, true);
      opening(d, o, at, u, n, s, e);
      cursor = e;
    }
    piece(cursor, L + eb, ops.length ? true : degree.get(w.a) === 1, degree.get(w.b) === 1);
  }

  const rooms = findRooms(p);
  d.rooms = rooms.map((room) => ({ room, name: roomName(p, room) }));
  for (const it of p.items) {
    const def = FURNITURE[it.type];
    if (!def) continue;
    const r = (it.rot * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    const corners = (
      [
        [-def.w / 2, -def.d / 2],
        [def.w / 2, -def.d / 2],
        [def.w / 2, def.d / 2],
        [-def.w / 2, def.d / 2],
      ] as Vec2[]
    ).map(([x, z]) => [it.x + x * c - z * s, it.z + x * s + z * c] as Vec2);
    d.furniture.push({ corners, name: def.name, c: [it.x, it.z] });
  }
  return d;
}

/** Door swings and window panes across an opening from s to e along the wall. */
function opening(d: Drawing, o: Opening, at: (s: number, k?: number) => Vec2, u: Vec2, n: Vec2, s: number, e: number) {
  if (o.kind === 'window') {
    if (o.tall) {
      // Sliding glass door: two panels on offset tracks, overlapping in the middle.
      const m = (s + e) / 2;
      const lap = Math.min(0.08, (e - s) / 6);
      d.glazing.push([at(s, -0.3), at(m + lap, -0.3)], [at(m - lap, 0.3), at(e, 0.3)]);
    } else for (const k of [-0.35, 0, 0.35]) d.glazing.push([at(s, k), at(e, k)]);
    // Sill lines across the wall faces.
    d.glazing.push([at(s, -1), at(e, -1)], [at(s, 1), at(e, 1)]);
    return;
  }
  const f = o.flip ?? 1;
  const leaf = (pos: number, dir: number, r: number) => {
    const h = at(pos, f);
    const along: Vec2 = [u[0] * dir, u[1] * dir];
    const out: Vec2 = [n[0] * f, n[1] * f];
    d.doors.push([h, add(h, out, r)]);
    d.arcs.push({ c: h, r, from: along, to: out });
  };
  if (o.leaves === 2) {
    leaf(s, 1, (e - s) / 2);
    leaf(e, -1, (e - s) / 2);
  } else if (f * (o.hand ?? 1) > 0) leaf(e, -1, e - s);
  else leaf(s, 1, e - s);
}

/* ---------- DXF ---------- */

/** Marks the comment lines that carry the plan as JSON (base64) inside an exported DXF. */
export const PLAN_TAG = 'FLOORWISE-PLAN';

function toBase64(bytes: Uint8Array) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const LAYERS: [string, number][] = [
  ['A-WALL', 7],
  ['A-DOOR', 1],
  ['A-GLAZ', 4],
  ['A-WALL-RAIL', 8],
  ['A-ROOM', 3],
  ['A-FURN', 9],
];

/** An ASCII DXF (R12 entities) in millimetres with y up, readable by AutoCAD, LibreCAD and Floorwise itself. */
export function planToDxf(p: Plan): string {
  const d = draw(p);
  const out: (string | number)[] = [];
  const mm = (v: number) => Math.round(v * 10000) / 10;
  const X = (q: Vec2) => mm(q[0]);
  const Y = (q: Vec2) => mm(-q[1]);
  const line = (layer: string, [a, b]: Seg) =>
    out.push(0, 'LINE', 8, layer, 10, X(a), 20, Y(a), 30, 0, 11, X(b), 21, Y(b), 31, 0);
  const text = (layer: string, q: Vec2, h: number, str: string) =>
    out.push(0, 'TEXT', 8, layer, 10, X(q), 20, Y(q), 30, 0, 40, h, 1, str, 72, 1, 11, X(q), 21, Y(q), 31, 0);
  const deg = (v: Vec2) => ((((Math.atan2(-v[1], v[0]) * 180) / Math.PI) % 360) + 360) % 360;

  out.push(999, 'Floor plan exported by Floorwise (millimetres).');
  const packed = toBase64(new TextEncoder().encode(JSON.stringify(p)));
  const chunks = packed.match(/.{1,200}/g) ?? [];
  chunks.forEach((c, i) => out.push(999, `${PLAN_TAG} ${i + 1}/${chunks.length} ${c}`));
  out.push(0, 'SECTION', 2, 'HEADER', 9, '$ACADVER', 1, 'AC1009', 9, '$INSUNITS', 70, 4, 0, 'ENDSEC');
  out.push(0, 'SECTION', 2, 'TABLES', 0, 'TABLE', 2, 'LAYER', 70, LAYERS.length);
  for (const [name, color] of LAYERS) out.push(0, 'LAYER', 2, name, 70, 0, 62, color, 6, 'CONTINUOUS');
  out.push(0, 'ENDTAB', 0, 'ENDSEC', 0, 'SECTION', 2, 'ENTITIES');
  for (const s of d.wallLines) line('A-WALL', s);
  for (const s of d.doors) line('A-DOOR', s);
  for (const a of d.arcs) {
    // DXF arcs run counter-clockwise (y up): start from whichever end makes the 90° turn positive.
    const ccw = a.from[0] * -a.to[1] - -a.from[1] * a.to[0] > 0;
    const [s0, s1] = ccw ? [deg(a.from), deg(a.to)] : [deg(a.to), deg(a.from)];
    out.push(0, 'ARC', 8, 'A-DOOR', 10, X(a.c), 20, Y(a.c), 30, 0, 40, mm(a.r), 50, s0, 51, s1);
  }
  for (const s of d.glazing) line('A-GLAZ', s);
  // Railings on a wall sub-layer, so a re-import closes the balcony (and turns its front back into a railing).
  for (const r of d.rails) for (let i = 0; i < r.length; i++) line('A-WALL-RAIL', [r[i]!, r[(i + 1) % r.length]!]);
  for (const { room, name } of d.rooms) {
    text('A-ROOM', [room.centroid[0], room.centroid[1] - 0.12], 180, name);
    text('A-ROOM', [room.centroid[0], room.centroid[1] + 0.18], 120, `${room.area.toFixed(1)} m2`);
  }
  for (const it of d.furniture) {
    for (let i = 0; i < 4; i++) line('A-FURN', [it.corners[i]!, it.corners[(i + 1) % 4]!]);
    text('A-FURN', it.c, 70, it.name);
  }
  out.push(0, 'ENDSEC', 0, 'EOF');
  return out.join('\n') + '\n';
}

/* ---------- SVG / PNG ---------- */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** The plan as a standalone SVG drawing (1 unit = 1 cm), with a title line and a 1 m scale bar. */
export function planToSvg(p: Plan, title = 'Floor plan'): string {
  const d = draw(p);
  const m = 0.8;
  const { x0, z0, x1, z1 } = Number.isFinite(d.bounds.x0) ? d.bounds : { x0: 0, z0: 0, x1: 4, z1: 3 };
  const vx = (x0 - m) * 100;
  const vz = (z0 - m) * 100;
  const vw = (x1 - x0 + 2 * m) * 100;
  const vh = (z1 - z0 + 2 * m + 0.6) * 100;
  const P = (q: Vec2) => `${(q[0] * 100).toFixed(1)},${(q[1] * 100).toFixed(1)}`;
  const poly = (pts: Vec2[], attrs: string) => `<polygon points="${pts.map(P).join(' ')}" ${attrs}/>`;
  const seg = ([a, b]: Seg) => `M${P(a)}L${P(b)}`;
  const arc = (a: Arc) => {
    const p0 = add(a.c, a.from, a.r);
    const p1 = add(a.c, a.to, a.r);
    const sweep = a.from[0] * a.to[1] - a.from[1] * a.to[0] > 0 ? 1 : 0;
    return `M${P(p0)}A${(a.r * 100).toFixed(1)},${(a.r * 100).toFixed(1)} 0 0 ${sweep} ${P(p1)}`;
  };
  const area = d.rooms.reduce((s, r) => s + r.room.area, 0);
  const foot = (z1 + m + 0.25) * 100;
  const o: string[] = [];
  o.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx.toFixed(1)} ${vz.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}" width="${Math.round(vw * 3)}" height="${Math.round(vh * 3)}" font-family="Inter, 'Helvetica Neue', Arial, sans-serif">`,
    `<rect x="${vx.toFixed(1)}" y="${vz.toFixed(1)}" width="${vw.toFixed(1)}" height="${vh.toFixed(1)}" fill="#ffffff"/>`,
  );
  for (const { room } of d.rooms) o.push(poly(room.poly, 'fill="#f4f6f9"'));
  for (const it of d.furniture) o.push(poly(it.corners, 'fill="#ffffff" stroke="#98a2b3" stroke-width="1"'));
  for (const r of d.rails) o.push(poly(r, 'fill="#e4e8ee" stroke="#98a2b3" stroke-width="0.8"'));
  o.push(`<path d="${d.railLines.map(seg).join('')}" stroke="#475467" stroke-width="1.6" fill="none"/>`);
  for (const w of d.walls) o.push(poly(w, 'fill="#1d2433" stroke="#1d2433" stroke-width="0.4"'));
  o.push(`<path d="${d.glazing.map(seg).join('')}" stroke="#1d2433" stroke-width="1" fill="none"/>`);
  o.push(`<path d="${d.doors.map(seg).join('')}" stroke="#1d2433" stroke-width="1.6" fill="none"/>`);
  o.push(
    `<path d="${d.arcs.map(arc).join('')}" stroke="#667085" stroke-width="0.9" stroke-dasharray="4 3" fill="none"/>`,
  );
  for (const it of d.furniture)
    o.push(
      `<text x="${(it.c[0] * 100).toFixed(1)}" y="${(it.c[1] * 100 + 3).toFixed(1)}" font-size="9" fill="#667085" text-anchor="middle">${esc(it.name)}</text>`,
    );
  for (const { room, name } of d.rooms) {
    const [cx, cz] = room.centroid;
    o.push(
      `<text x="${(cx * 100).toFixed(1)}" y="${(cz * 100 - 4).toFixed(1)}" font-size="${room.area < 3 ? 11 : 16}" font-weight="600" fill="#101828" text-anchor="middle">${esc(name)}</text>`,
      `<text x="${(cx * 100).toFixed(1)}" y="${(cz * 100 + 14).toFixed(1)}" font-size="${room.area < 3 ? 9 : 11}" fill="#667085" text-anchor="middle">${room.area.toFixed(1)} m²</text>`,
    );
  }
  // Title line and a 1 m scale bar along the foot of the sheet.
  const left = (x0 - m + 0.3) * 100;
  o.push(
    `<text x="${left.toFixed(1)}" y="${foot.toFixed(1)}" font-size="14" font-weight="600" fill="#101828">${esc(title)}</text>`,
    `<text x="${left.toFixed(1)}" y="${(foot + 18).toFixed(1)}" font-size="10" fill="#667085">${d.rooms.length} rooms · ${area.toFixed(1)} m² net floor area</text>`,
  );
  const bar = (x1 + m - 0.3) * 100 - 100;
  o.push(
    `<rect x="${bar.toFixed(1)}" y="${(foot - 6).toFixed(1)}" width="50" height="6" fill="#1d2433"/>`,
    `<rect x="${(bar + 50).toFixed(1)}" y="${(foot - 6).toFixed(1)}" width="50" height="6" fill="#ffffff" stroke="#1d2433" stroke-width="1"/>`,
    `<text x="${bar.toFixed(1)}" y="${(foot + 10).toFixed(1)}" font-size="9" fill="#667085">0</text>`,
    `<text x="${(bar + 100).toFixed(1)}" y="${(foot + 10).toFixed(1)}" font-size="9" fill="#667085" text-anchor="end">1 m</text>`,
  );
  o.push('</svg>');
  return o.join('\n');
}

/** Renders the SVG to a PNG at its own pixel size (3 px per cm). */
export async function svgToPng(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext('2d')!.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
    if (!blob) throw new Error('Could not render the picture.');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ---------- ZIP (stored) ---------- */

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();
const crc32 = (b: Uint8Array) => {
  let c = 0xffffffff;
  for (const x of b) c = CRC[(c ^ x) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/** A ZIP with the files stored uncompressed: for formats a host only lets through inside an archive (DXF). */
export function zip(files: { name: string; data: string | Uint8Array }[]): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    const name = enc.encode(f.name);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(8, 0, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    const head = new Uint8Array(local.buffer);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, data.length, true);
    cd.setUint32(24, data.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), name);
    parts.push(head, name, data);
    offset += head.length + name.length + data.length;
  }
  const size = central.reduce((s, b) => s + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, size, true);
  end.setUint32(16, offset, true);
  return new Blob(
    [...parts, ...central, new Uint8Array(end.buffer)].map((b) => b.slice().buffer),
    {
      type: 'application/zip',
    },
  );
}
