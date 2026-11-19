/**
 * PDF import with pdf.js: walks the page's drawing operators (tracking the transformation matrix through save /
 * restore and form XObjects) to collect every stroke and fill outline as segments, reads the text layer, and renders
 * the page to an image for the underlay. Loaded only when a PDF is opened.
 */
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { boundsOf, markPolylineArcs, scaleFromDimensions, type Drawing, type Segment, type Text } from './drawing';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

type M = [number, number, number, number, number, number];
const mul = (m: M, n: number[]): M => [
  m[0] * n[0]! + m[2] * n[1]!,
  m[1] * n[0]! + m[3] * n[1]!,
  m[0] * n[2]! + m[2] * n[3]!,
  m[1] * n[2]! + m[3] * n[3]!,
  m[0] * n[4]! + m[2] * n[5]! + m[4],
  m[1] * n[4]! + m[3] * n[5]! + m[5],
];

const CURVE_STEPS = 8;
/** Point at t on a quadratic or cubic Bézier (de Casteljau). */
function bezier(pts: [number, number][], t: number): [number, number] {
  let p = pts;
  while (p.length > 1)
    p = p.slice(1).map((q, i) => [p[i]![0] + (q[0] - p[i]![0]) * t, p[i]![1] + (q[1] - p[i]![1]) * t]);
  return p[0]!;
}

export async function openPdf(data: ArrayBuffer) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  return { pages: doc.numPages, doc };
}

/** Small preview of each page so the visitor can pick the sheet with the plan. */
export async function pageThumb(doc: pdfjs.PDFDocumentProxy, n: number, width = 220) {
  const page = await doc.getPage(n);
  const vp = page.getViewport({ scale: 1 });
  const scale = width / vp.width;
  const v = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(v.width);
  canvas.height = Math.round(v.height);
  await page.render({ canvas, viewport: v }).promise;
  return canvas.toDataURL('image/png');
}

export async function readPdfPage(doc: pdfjs.PDFDocumentProxy, n: number, name: string): Promise<Drawing> {
  const page = await doc.getPage(n);
  const { OPS } = pdfjs;
  const ops = await page.getOperatorList();
  // Drawing units are the page as shown (a /Rotate'd sheet turned upright), y up, keeping the page box's origin so an
  // unrotated page reads exactly in its own PDF coordinates.
  const vp = page.getViewport({ scale: 1 });
  const [vx0, vy0] = page.view as [number, number, number, number];
  const shown: M = mul([1, 0, 0, -1, vx0, vp.height + vy0], vp.transform);
  let ctm: M = shown;
  const stack: M[] = [];
  const segs: Segment[] = [];
  const at = (x: number, y: number): [number, number] => [
    ctm[0] * x + ctm[2] * y + ctm[4],
    ctm[1] * x + ctm[3] * y + ctm[5],
  ];
  // Pen width in page units: cut walls are drawn with the heaviest pens, furniture and hatch with fine ones.
  let lw = 1;
  const lwStack: number[] = [];
  const penOf = () => lw * Math.sqrt(Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2]));
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const a = ops.argsArray[i] as unknown[];
    if (fn === OPS.save) {
      stack.push(ctm);
      lwStack.push(lw);
    } else if (fn === OPS.restore) {
      ctm = stack.pop() ?? ctm;
      lw = lwStack.pop() ?? lw;
    } else if (fn === OPS.setLineWidth) lw = Number(a[0]) || 0;
    else if (fn === OPS.setGState) {
      for (const [key, v] of (a[0] as [string, unknown][] | undefined) ?? []) if (key === 'LW') lw = Number(v) || 0;
    } else if (fn === OPS.transform) ctm = mul(ctm, a as number[]);
    else if (fn === OPS.paintFormXObjectBegin) {
      stack.push(ctm);
      if (a[0]) ctm = mul(ctm, a[0] as number[]);
    } else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() ?? ctm;
    else if (fn === OPS.constructPath) {
      const data = (a[1] as ArrayLike<number>[] | undefined)?.[0];
      if (!data) continue;
      let cur: [number, number] | null = null;
      let start: [number, number] | null = null;
      const paint = a[0];
      const fill = paint === OPS.fill || paint === OPS.eoFill;
      const pen = Math.round(penOf() * 1000) / 1000;
      const push = (p: [number, number], curve = false) => {
        if (cur && (p[0] !== cur[0] || p[1] !== cur[1]))
          segs.push({
            x1: cur[0],
            y1: cur[1],
            x2: p[0],
            y2: p[1],
            ...(curve ? { curve } : {}),
            ...(fill ? { fill } : { pen }),
          });
        cur = p;
      };
      for (let k = 0; k < data.length;) {
        const op = data[k++];
        if (op === 0) {
          cur = at(data[k++]!, data[k++]!);
          start = cur;
        } else if (op === 1) push(at(data[k++]!, data[k++]!));
        else if (op === 2 || op === 3) {
          // Curves are flattened into short chords, like DXF arcs, so symbol shapes (a WC bowl, a basin) keep their
          // outline and a door swing's length is its arc length.
          const n = op === 2 ? 3 : 2;
          const pts: [number, number][] = [cur ?? at(0, 0)];
          for (let j = 0; j < n; j++) pts.push(at(data[k++]!, data[k++]!));
          for (let j = 1; j <= CURVE_STEPS; j++) push(bezier(pts, j / CURVE_STEPS), true);
        } else if (op === 4 && start) push(start);
      }
    }
  }
  markPolylineArcs(segs);
  const content = await page.getTextContent();
  const texts: Text[] = [];
  for (const item of content.items) {
    if (!('str' in item) || !item.str.trim()) continue;
    const [a, b, c, d, e, f] = item.transform as number[];
    const [x, y] = [shown[0] * e! + shown[2] * f! + shown[4], shown[1] * e! + shown[3] * f! + shown[5]];
    // The text's baseline direction, turned with the page.
    const dx = shown[0] * a! + shown[2] * b!;
    const dy = shown[1] * a! + shown[3] * b!;
    texts.push({ str: item.str, x, y, h: Math.hypot(c!, d!), angle: Math.atan2(dy, dx) });
  }

  // Raster underlay at a resolution that stays crisp when zoomed in on one flat.
  const scale = Math.min(4, 4096 / Math.max(vp.width, vp.height));
  const v = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(v.width);
  canvas.height = Math.round(v.height);
  await page.render({ canvas, viewport: v }).promise;

  const drawing: Drawing = {
    name,
    kind: 'pdf',
    segs,
    texts,
    bounds: boundsOf(segs),
    mmPerUnit: null,
    scaleNote: '',
    image: { url: canvas.toDataURL('image/png'), x0: vx0, y0: vy0, x1: vx0 + vp.width, y1: vy0 + vp.height },
  };
  const s = scaleFromDimensions(drawing);
  if (s) {
    drawing.mmPerUnit = s.mmPerUnit;
    drawing.scaleNote = `from ${s.votes} dimensions`;
  }
  return drawing;
}
