/**
 * DXF import: lines, polylines, arcs, circles, ellipses, splines, block references (with their transforms) and text, with layer names
 * kept so wall detection can prefer wall layers. Units come from $INSUNITS (millimetres when unset).
 */
import DxfParser from 'dxf-parser';
import type { Plan } from '../room/plan';
import { boundsOf, scaleFromDimensions, type BlockRef, type Drawing, type Segment, type Text } from './drawing';

/** $INSUNITS code → millimetres per unit. */
const UNITS: Record<number, number> = { 1: 25.4, 2: 304.8, 4: 1, 5: 10, 6: 1000 };

interface Ent {
  type: string;
  layer?: string;
  vertices?: { x: number; y: number; bulge?: number }[];
  center?: { x: number; y: number };
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  shape?: boolean;
  name?: string;
  position?: { x: number; y: number };
  startPoint?: { x: number; y: number };
  xScale?: number;
  yScale?: number;
  rotation?: number;
  text?: string;
  textHeight?: number;
  height?: number;
  majorAxisEndPoint?: { x: number; y: number };
  axisRatio?: number;
  controlPoints?: { x: number; y: number }[];
  fitPoints?: { x: number; y: number }[];
}

type Xf = (x: number, y: number) => [number, number];

/** The plan a Floorwise export carries in its DXF comments (see room/export.ts), or null. */
function embeddedPlan(lines: string[]): Plan | null {
  const parts: string[] = [];
  for (let i = 0; i + 1 < lines.length; i++) {
    if (lines[i]!.trim() !== '999') continue;
    const m = /^FLOORWISE-PLAN (\d+)\/(\d+) (\S+)/.exec(lines[i + 1]!.trim());
    if (m) parts[Number(m[1]) - 1] = m[3]!;
  }
  if (!parts.length || parts.includes(undefined as unknown as string)) return null;
  try {
    const bin = atob(parts.join(''));
    const plan = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))) as Plan;
    return Array.isArray(plan?.walls) && Array.isArray(plan?.nodes) ? plan : null;
  } catch {
    return null;
  }
}

export function readDxf(text: string, name: string): Drawing {
  // Comments (group 999) are dropped before parsing; a Floorwise export's plan is read from them first.
  const lines = text.split(/\r?\n/);
  const plan = embeddedPlan(lines);
  const kept: string[] = [];
  for (let i = 0; i < lines.length; i += 2) if (lines[i]!.trim() !== '999') kept.push(lines[i]!, lines[i + 1] ?? '');
  text = kept.join('\n');
  const dxf = new DxfParser().parseSync(text) as unknown as {
    entities: Ent[];
    blocks?: Record<string, { entities?: Ent[]; position?: { x: number; y: number } }>;
    header?: Record<string, unknown>;
  } | null;
  if (!dxf) throw new Error('This DXF could not be read.');
  const segs: Segment[] = [];
  const texts: Text[] = [];
  const blocks: BlockRef[] = [];
  const add = (a: [number, number], b: [number, number], layer?: string, curve = false) => {
    if (a[0] !== b[0] || a[1] !== b[1])
      segs.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1], ...(layer ? { layer } : {}), ...(curve ? { curve } : {}) });
  };
  const arc = (xf: Xf, cx: number, cy: number, r: number, a0: number, a1: number, layer?: string) => {
    let end = a1;
    while (end <= a0) end += Math.PI * 2;
    const n = Math.max(6, Math.ceil(((end - a0) / (Math.PI * 2)) * 32));
    let prev = xf(cx + r * Math.cos(a0), cy + r * Math.sin(a0));
    for (let i = 1; i <= n; i++) {
      const t = a0 + ((end - a0) * i) / n;
      const p = xf(cx + r * Math.cos(t), cy + r * Math.sin(t));
      add(prev, p, layer, true);
      prev = p;
    }
  };
  const walk = (ents: Ent[], xf: Xf, depth: number, inherited?: string) => {
    for (const e of ents) {
      const layer = e.layer && e.layer !== '0' ? e.layer : inherited;
      if (e.type === 'LINE' && e.vertices?.length === 2)
        add(xf(e.vertices[0]!.x, e.vertices[0]!.y), xf(e.vertices[1]!.x, e.vertices[1]!.y), layer);
      else if ((e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.vertices) {
        const vs = e.vertices;
        const n = e.shape ? vs.length : vs.length - 1;
        for (let i = 0; i < n; i++) {
          const a = vs[i]!;
          const b = vs[(i + 1) % vs.length]!;
          if (a.bulge) {
            // A bulge is an arc between the two vertices: tan(θ/4) = bulge.
            const theta = 4 * Math.atan(a.bulge);
            const chord = Math.hypot(b.x - a.x, b.y - a.y);
            const r = chord / (2 * Math.sin(theta / 2));
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const h = r * Math.cos(theta / 2);
            const nx = -(b.y - a.y) / chord;
            const ny = (b.x - a.x) / chord;
            const cx = mx + nx * h;
            const cy = my + ny * h;
            const s0 = Math.atan2(a.y - cy, a.x - cx);
            const s1 = Math.atan2(b.y - cy, b.x - cx);
            if (theta > 0) arc(xf, cx, cy, Math.abs(r), s0, s1, layer);
            else arc(xf, cx, cy, Math.abs(r), s1, s0, layer);
          } else add(xf(a.x, a.y), xf(b.x, b.y), layer);
        }
      } else if (e.type === 'ARC' && e.center && e.radius)
        arc(xf, e.center.x, e.center.y, e.radius, e.startAngle ?? 0, e.endAngle ?? Math.PI * 2, layer);
      else if (e.type === 'CIRCLE' && e.center && e.radius)
        arc(xf, e.center.x, e.center.y, e.radius, 0, Math.PI * 2 - 1e-6, layer);
      else if (e.type === 'ELLIPSE' && e.center && e.majorAxisEndPoint) {
        // WC bowls and basins are usually ellipses: centre, major axis vector, minor/major ratio, parameter range.
        const { x: mx, y: my } = e.majorAxisEndPoint;
        const ratio = e.axisRatio ?? 1;
        const t0 = e.startAngle ?? 0;
        let t1 = e.endAngle ?? Math.PI * 2;
        while (t1 <= t0) t1 += Math.PI * 2;
        const n = Math.max(8, Math.ceil(((t1 - t0) / (Math.PI * 2)) * 32));
        const pt = (t: number) =>
          xf(
            e.center!.x + mx * Math.cos(t) - my * ratio * Math.sin(t),
            e.center!.y + my * Math.cos(t) + mx * ratio * Math.sin(t),
          );
        for (let i = 1; i <= n; i++) add(pt(t0 + ((t1 - t0) * (i - 1)) / n), pt(t0 + ((t1 - t0) * i) / n), layer, true);
      } else if (e.type === 'SPLINE') {
        // Close enough for symbols: the polygon through the fit points, else the control points.
        const pts = e.fitPoints?.length ? e.fitPoints : (e.controlPoints ?? []);
        for (let i = 1; i < pts.length; i++)
          add(xf(pts[i - 1]!.x, pts[i - 1]!.y), xf(pts[i]!.x, pts[i]!.y), layer, true);
      } else if ((e.type === 'TEXT' || e.type === 'MTEXT') && e.text) {
        const p = e.startPoint ?? e.position;
        if (!p) continue;
        const [x, y] = xf(p.x, p.y);
        const str = e.text
          .replace(/\\[A-Za-z][^;]*;|[{}]/g, '')
          .replace(/\\P/g, ' ')
          .trim();
        if (str)
          texts.push({ str, x, y, h: e.textHeight ?? e.height ?? 100, angle: ((e.rotation ?? 0) * Math.PI) / 180 });
      } else if (e.type === 'INSERT' && e.name && dxf.blocks?.[e.name]?.entities && depth < 6) {
        const blk = dxf.blocks[e.name]!;
        const bx = blk.position?.x ?? 0;
        const by = blk.position?.y ?? 0;
        const sx = e.xScale ?? 1;
        const sy = e.yScale ?? 1;
        const rot = ((e.rotation ?? 0) * Math.PI) / 180;
        const c = Math.cos(rot);
        const s = Math.sin(rot);
        const px = e.position?.x ?? 0;
        const py = e.position?.y ?? 0;
        const inner: Xf = (x, y) => {
          const lx = (x - bx) * sx;
          const ly = (y - by) * sy;
          return xf(px + lx * c - ly * s, py + lx * s + ly * c);
        };
        const first = segs.length;
        walk(blk.entities!, inner, depth + 1, layer);
        if (segs.length > first) {
          const b = boundsOf(segs.slice(first));
          blocks.push({ name: e.name, ...(layer ? { layer } : {}), ...b });
        }
      }
    }
  };
  walk(dxf.entities ?? [], (x, y) => [x, y], 0);
  const units = Number(dxf.header?.$INSUNITS ?? 4);
  const drawing: Drawing = {
    name,
    kind: 'dxf',
    segs,
    texts,
    blocks,
    ...(plan ? { plan } : {}),
    bounds: boundsOf(segs),
    mmPerUnit: UNITS[units] ?? 1,
    scaleNote: UNITS[units] ? `from the file's units` : 'assumed millimetres',
  };
  // A DXF drawn at a scale other than 1:1 (rare) shows up as dimensions that disagree with the units.
  const dims = scaleFromDimensions(drawing);
  if (dims && Math.abs(dims.mmPerUnit / drawing.mmPerUnit! - 1) > 0.1) {
    drawing.mmPerUnit = dims.mmPerUnit;
    drawing.scaleNote = `from ${dims.votes} dimensions`;
  }
  return drawing;
}
