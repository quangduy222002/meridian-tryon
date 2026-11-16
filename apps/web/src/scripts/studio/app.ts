/**
 * Floorwise: import a PDF/DXF floor plan, box the flat you want out of the sheet, detect walls, doors and windows,
 * then fix and furnish it in the Roomcraft workspace with the original drawing faintly underneath.
 */
import { $, toast } from '../../lib/dom/chrome';
import { startRoomcraft, type RoomcraftApi, type RoomcraftOptions } from '../room/app';
import { findRooms, type Plan } from '../room/plan';
import { inRegion, scaleFromDimensions, type Drawing, type Region } from './drawing';
import { detectWalls } from './detect';

type Stage = 'import' | 'select' | 'workspace';
const STORE = 'floorwise.plan';
const emptyPlan = (): Plan => ({ nodes: [], walls: [], openings: [], items: [], rooms: {}, north: 0 });

export async function startStudio(gl: boolean) {
  const app = $('app');
  let drawing: Drawing | null = null;
  let region: Region | null = null;
  /** The region and scale the current plan was built from, for the underlay. */
  let built: { d: Drawing; r: Region; k: number } | null = null;
  let underlayOn = true;
  let underlayImg: HTMLImageElement | null = null;

  const underlay: RoomcraftOptions['underlay'] = (c, X, Z) => {
    if (!built || !underlayOn) return;
    const { d, r, k } = built;
    const mx = (x: number) => ((x - r.x0) * k) / 1000;
    const mz = (y: number) => ((r.y1 - y) * k) / 1000;
    c.save();
    c.globalAlpha = 0.32;
    if (d.image && underlayImg?.complete) {
      const left = X(mx(d.image.x0));
      const top = Z(mz(d.image.y1));
      c.drawImage(underlayImg, left, top, X(mx(d.image.x1)) - left, Z(mz(d.image.y0)) - top);
    } else {
      c.strokeStyle = '#5b544c';
      c.lineWidth = 0.7;
      c.beginPath();
      for (const s of d.segs) {
        if (!inRegion(r, s.x1, s.y1) && !inRegion(r, s.x2, s.y2)) continue;
        c.moveTo(X(mx(s.x1)), Z(mz(s.y1)));
        c.lineTo(X(mx(s.x2)), Z(mz(s.y2)));
      }
      c.stroke();
    }
    c.restore();
  };

  const api: RoomcraftApi = await startRoomcraft(gl, { storageKey: STORE, plan: emptyPlan(), underlay });

  /* ---------- Steps ---------- */
  const setStage = (s: Stage) => {
    app.dataset.stage = s;
    $('stepImport').hidden = s !== 'import';
    $('stepSelect').hidden = s !== 'select';
    for (const li of document.querySelectorAll<HTMLElement>('.wiz-steps li')) {
      const order: Stage[] = ['import', 'select', 'workspace'];
      const i = order.indexOf(li.dataset.step as Stage);
      li.classList.toggle('done', i < order.indexOf(s));
      if (li.dataset.step === s) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    }
    if (s === 'select') requestAnimationFrame(() => sheet.fit());
  };

  // A plan from last time can be picked up again (the drawing itself isn't kept).
  try {
    if (localStorage.getItem(STORE)) $('resumeBtn').hidden = false;
  } catch {
    // storage blocked
  }
  $('resumeBtn').addEventListener('click', () => {
    try {
      const p = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Plan | null;
      if (p?.walls) {
        built = null;
        api.setPlan(p, 'Your last plan');
        setStage('workspace');
      }
    } catch {
      toast('Could not read the saved plan');
    }
  });
  $('reimportBtn').addEventListener('click', () => setStage('import'));
  $('drawingBtn').addEventListener('click', () => {
    underlayOn = !underlayOn;
    $('drawingBtn').setAttribute('aria-pressed', String(underlayOn));
    api.redraw();
  });

  /* ---------- Import ---------- */
  const status = $('importStatus');
  let pdfDoc: Awaited<ReturnType<typeof import('./import-pdf').openPdf>>['doc'] | null = null;
  const openFile = async (name: string, data: ArrayBuffer) => {
    status.textContent = `Reading ${name}…`;
    $('pages').hidden = true;
    try {
      if (/\.dxf$/i.test(name)) {
        const { readDxf } = await import('./import-dxf');
        useDrawing(readDxf(new TextDecoder().decode(data), name));
      } else {
        const pdf = await import('./import-pdf');
        const { pages, doc } = await pdf.openPdf(data);
        pdfDoc = doc;
        if (pages === 1) return useDrawing(await pdf.readPdfPage(doc, 1, name));
        // Several sheets: let the visitor pick the one with the plan.
        status.textContent = `${pages} sheets — pick the one with your floor plan.`;
        const box = $('pages');
        box.innerHTML = '';
        box.hidden = false;
        for (let n = 1; n <= pages; n++) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'page';
          b.innerHTML = `<span>Sheet ${n}</span>`;
          b.addEventListener('click', async () => {
            status.textContent = `Reading sheet ${n}…`;
            useDrawing(await pdf.readPdfPage(pdfDoc!, n, `${name} · sheet ${n}`));
          });
          box.append(b);
          void pdf.pageThumb(doc, n).then((url) => {
            const img = new Image();
            img.src = url;
            img.alt = '';
            b.prepend(img);
          });
        }
      }
    } catch (err) {
      console.error(err);
      status.textContent = 'This file could not be read. Is it a vector PDF or a DXF?';
    }
  };
  const useDrawing = (d: Drawing) => {
    sheet.unfit();
    drawing = d;
    region = null;
    status.textContent = '';
    if (!d.segs.length) {
      status.textContent = 'No lines found — this looks like a scanned PDF. Vector PDFs and DXF files work.';
      return;
    }
    if (d.image) {
      underlayImg = new Image();
      underlayImg.src = d.image.url;
      underlayImg.onload = () => {
        sheet.draw();
        api.redraw();
      };
    } else underlayImg = null;
    updateScale();
    syncDetect();
    setStage('select');
  };
  $<HTMLInputElement>('file').addEventListener('change', async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) await openFile(f.name, await f.arrayBuffer());
  });
  const drop = $('drop');
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', async (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    const f = e.dataTransfer?.files[0];
    if (f) await openFile(f.name, await f.arrayBuffer());
  });
  $('sampleBtn').addEventListener('click', async () => {
    status.textContent = 'Downloading the sample…';
    const res = await fetch(new URL('A26.pdf', location.href.replace(/[^/]*$/, '')));
    await openFile('A.26.pdf', await res.arrayBuffer());
  });
  $('backImport').addEventListener('click', () => setStage('import'));

  /* ---------- Select: sheet viewer with a selection box ---------- */
  const updateScale = () => {
    const out = $('scaleOut');
    if (!drawing?.mmPerUnit) {
      out.textContent = 'Unknown — set it from a known length';
      return;
    }
    // For a PDF, 1 unit is 1/72 inch on paper: show it as the familiar 1 : N.
    out.textContent =
      drawing.kind === 'pdf'
        ? `1 : ${Math.round(drawing.mmPerUnit / (25.4 / 72))} · ${drawing.scaleNote}`
        : `${drawing.mmPerUnit === 1 ? 'millimetres' : `${drawing.mmPerUnit} mm per unit`} · ${drawing.scaleNote}`;
  };
  const syncDetect = () => {
    const ready = !!drawing?.mmPerUnit && !!region;
    $('detectBtn').setAttribute('aria-disabled', String(!ready));
    $('selectStatus').textContent = !region
      ? 'Drag a box around your flat.'
      : !drawing?.mmPerUnit
        ? 'Set the scale first.'
        : 'Ready — build the plan.';
  };

  const sheet = new SheetView($<HTMLCanvasElement>('sheet'), {
    drawing: () => drawing,
    image: () => underlayImg,
    region: () => region,
    setRegion(r) {
      region = r;
      // Scale from the dimensions inside the box is the most reliable when the sheet mixes several scales.
      if (drawing && r) {
        const local = scaleFromDimensions(drawing, r);
        if (local) {
          drawing.mmPerUnit = local.mmPerUnit;
          drawing.scaleNote = `from ${local.votes} dimensions in your box`;
          updateScale();
        }
      }
      syncDetect();
    },
    calibrated(dist) {
      const dlg = $<HTMLDialogElement>('calDlg');
      dlg.returnValue = '';
      $<HTMLInputElement>('calMm').value = '';
      dlg.showModal();
      dlg.addEventListener(
        'close',
        () => {
          const mm = Number($<HTMLInputElement>('calMm').value);
          if (dlg.returnValue === 'ok' && mm > 0 && drawing) {
            drawing.mmPerUnit = mm / dist;
            drawing.scaleNote = 'set by you';
            updateScale();
            syncDetect();
          }
        },
        { once: true },
      );
    },
  });
  $('sheetIn').addEventListener('click', () => sheet.zoom(1.25));
  $('sheetOut').addEventListener('click', () => sheet.zoom(0.8));
  $('sheetFit').addEventListener('click', () => sheet.fit());
  $('calibrateBtn').addEventListener('click', () => {
    sheet.calibrating = true;
    $('selectStatus').textContent = 'Click the two ends of a line whose length you know (e.g. a dimension).';
  });

  $('detectBtn').addEventListener('click', () => {
    if ($('detectBtn').getAttribute('aria-disabled') === 'true' || !drawing || !region || !drawing.mmPerUnit) return;
    const res = detectWalls(drawing, region);
    if (!res.walls) {
      $('selectStatus').textContent = 'No walls found in that box. Try a slightly larger box, or check the scale.';
      return;
    }
    built = { d: drawing, r: region, k: drawing.mmPerUnit };
    api.setPlan(res.plan);
    const rooms = findRooms(res.plan).length;
    setStage('workspace');
    toast(
      `Found ${res.walls} walls, ${res.openings} doors and windows${rooms ? `, ${rooms} closed rooms` : ''} — check them against the drawing.`,
      5000,
    );
  });

  setStage('import');
}

/* ---------- Sheet viewer ---------- */

interface SheetHost {
  drawing(): Drawing | null;
  image(): HTMLImageElement | null;
  region(): Region | null;
  setRegion(r: Region | null): void;
  /** Two calibration points picked: their distance in drawing units. */
  calibrated(dist: number): void;
}

/** Shows the whole sheet (PDF raster or DXF lines); drag draws the selection box, wheel / pinch zooms. */
class SheetView {
  calibrating = false;
  /** Set once the current drawing has been framed, so the exposed view transform is meaningful. */
  private fitted = false;
  private s = 1;
  private ox = 0;
  private oy = 0;
  private raf = 0;
  private drag: { id: number; x: number; y: number; mode: 'box' | 'pan' } | null = null;
  private box: { x0: number; y0: number; x1: number; y1: number } | null = null;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinch: { d: number; mx: number; my: number } | null = null;
  private cal: { x: number; y: number }[] = [];
  private ctx: CanvasRenderingContext2D;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly host: SheetHost,
  ) {
    this.ctx = canvas.getContext('2d')!;
    new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      this.draw();
    }).observe(canvas);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', (e) => {
      this.pointers.delete(e.pointerId);
      this.drag = null;
      this.pinch = null;
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const r = canvas.getBoundingClientRect();
        this.zoom(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
      },
      { passive: false },
    );
    canvas.addEventListener('keydown', (e) => {
      const step = 40;
      const keys: Record<string, [number, number]> = {
        ArrowLeft: [step, 0],
        ArrowRight: [-step, 0],
        ArrowUp: [0, step],
        ArrowDown: [0, -step],
      };
      const d = keys[e.key];
      if (d) {
        e.preventDefault();
        this.ox += d[0];
        this.oy += d[1];
        this.draw();
      } else if (e.key === '+' || e.key === '=') this.zoom(1.25);
      else if (e.key === '-') this.zoom(0.8);
    });
  }

  /** Drawing units → canvas pixels (y flips: drawings have y up). */
  private X = (x: number) => x * this.s + this.ox;
  private Y = (y: number) => -y * this.s + this.oy;
  private toDrawing = (px: number, py: number) => ({ x: (px - this.ox) / this.s, y: -(py - this.oy) / this.s });

  fit() {
    const d = this.host.drawing();
    const r = this.canvas.getBoundingClientRect();
    if (!d || !r.width) return;
    this.fitted = true;
    const b = d.image ?? d.bounds;
    const pad = 20;
    this.s = Math.min((r.width - pad * 2) / (b.x1 - b.x0), (r.height - pad * 2) / (b.y1 - b.y0));
    this.ox = r.width / 2 - ((b.x0 + b.x1) / 2) * this.s;
    this.oy = r.height / 2 + ((b.y0 + b.y1) / 2) * this.s;
    this.draw();
  }

  /** A new drawing is coming: the old framing no longer applies. */
  unfit() {
    this.fitted = false;
    delete this.canvas.dataset.view;
  }

  zoom(f: number, cx?: number, cy?: number) {
    const r = this.canvas.getBoundingClientRect();
    const x = cx ?? r.width / 2;
    const y = cy ?? r.height / 2;
    this.ox = x - (x - this.ox) * f;
    this.oy = y - (y - this.oy) * f;
    this.s *= f;
    this.draw();
  }

  private local(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private down = (e: PointerEvent) => {
    const p = this.local(e);
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, p);
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinch = { d: Math.hypot(a!.x - b!.x, a!.y - b!.y), mx: (a!.x + b!.x) / 2, my: (a!.y + b!.y) / 2 };
      this.drag = null;
      this.box = null;
      return;
    }
    if (this.calibrating && e.button === 0) {
      const q = this.toDrawing(p.x, p.y);
      this.cal.push(q);
      if (this.cal.length === 2) {
        const [a, b] = this.cal as [{ x: number; y: number }, { x: number; y: number }];
        this.cal = [];
        this.calibrating = false;
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        if (dist > 0) this.host.calibrated(dist);
      }
      this.draw();
      return;
    }
    const mode = e.button === 1 || e.button === 2 ? 'pan' : 'box';
    this.drag = { id: e.pointerId, ...p, mode };
  };

  private move = (e: PointerEvent) => {
    const p = this.local(e);
    const prev = this.pointers.get(e.pointerId);
    if (prev) this.pointers.set(e.pointerId, p);
    if (this.pinch && this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const mx = (a!.x + b!.x) / 2;
      const my = (a!.y + b!.y) / 2;
      this.ox += mx - this.pinch.mx;
      this.oy += my - this.pinch.my;
      this.zoom(d / this.pinch.d, mx, my);
      this.pinch = { d, mx, my };
      return;
    }
    const dr = this.drag;
    if (!dr || dr.id !== e.pointerId) return;
    if (dr.mode === 'pan') {
      this.ox += p.x - (prev?.x ?? p.x);
      this.oy += p.y - (prev?.y ?? p.y);
    } else if (Math.hypot(p.x - dr.x, p.y - dr.y) > 4) {
      const a = this.toDrawing(dr.x, dr.y);
      const b = this.toDrawing(p.x, p.y);
      this.box = { x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) };
    }
    this.draw();
  };

  private up = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    if (this.pinch) {
      if (this.pointers.size < 2) this.pinch = null;
      return;
    }
    if (this.drag?.mode === 'box' && this.box) this.host.setRegion(this.box);
    this.drag = null;
    this.box = null;
    this.draw();
  };

  draw() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.paint();
    });
  }

  private paint() {
    const c = this.ctx;
    const dpr = this.canvas.width / Math.max(1, this.canvas.getBoundingClientRect().width);
    const W = this.canvas.width / dpr;
    const H = this.canvas.height / dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Exposes the view transform (drawing units → CSS px) for tests and tooling.
    if (this.fitted) this.canvas.dataset.view = `${this.s} ${this.ox} ${this.oy}`;
    c.fillStyle = '#ece6dc';
    c.fillRect(0, 0, W, H);
    const d = this.host.drawing();
    if (!d) return;
    const img = this.host.image();
    if (d.image && img?.complete) {
      c.fillStyle = '#fff';
      const x = this.X(d.image.x0);
      const y = this.Y(d.image.y1);
      const w = this.X(d.image.x1) - x;
      const h = this.Y(d.image.y0) - y;
      c.fillRect(x, y, w, h);
      c.drawImage(img, x, y, w, h);
    } else {
      c.fillStyle = '#fff';
      const b = d.bounds;
      c.fillRect(this.X(b.x0), this.Y(b.y1), (b.x1 - b.x0) * this.s, (b.y1 - b.y0) * this.s);
      c.strokeStyle = '#2a2622';
      c.lineWidth = 0.6;
      c.beginPath();
      for (const s of d.segs) {
        c.moveTo(this.X(s.x1), this.Y(s.y1));
        c.lineTo(this.X(s.x2), this.Y(s.y2));
      }
      c.stroke();
    }
    // Selection: dim everything outside the box.
    const r = this.box ?? this.host.region();
    if (r) {
      const x = this.X(r.x0);
      const y = this.Y(r.y1);
      const w = (r.x1 - r.x0) * this.s;
      const h = (r.y1 - r.y0) * this.s;
      c.fillStyle = 'rgba(29, 29, 31, 0.42)';
      c.beginPath();
      c.rect(0, 0, W, H);
      c.rect(x, y, w, h);
      c.fill('evenodd');
      c.strokeStyle = '#e2622b';
      c.lineWidth = 2;
      c.setLineDash([6, 4]);
      c.strokeRect(x, y, w, h);
      c.setLineDash([]);
    }
    for (const q of this.cal) {
      c.fillStyle = '#e2622b';
      c.beginPath();
      c.arc(this.X(q.x), this.Y(q.y), 5, 0, Math.PI * 2);
      c.fill();
    }
  }
}
