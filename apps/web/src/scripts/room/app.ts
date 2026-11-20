/**
 * Roomcraft: a 2D floor-plan editor beside a live 3D model of the same plan. Every edit goes through commit(), which
 * records undo, re-detects rooms and syncs the 3D house; drags call preview() so the 3D view follows the pointer.
 */
import { hostClaude, hostDownloads, saveFile, type HostSample } from '../../lib/claude-host';
import {
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Vector2,
  Vector3,
  type Object3D,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  RenderLoop,
  createRenderer,
  damp,
  generateTextures,
  getQuality,
  precompile,
  smoothstep,
} from '@meridian/three-core';
import { $, toast } from '../../lib/dom/chrome';
import { FLOORS, FURNITURE, GROUPS, WALLS } from './catalog';
import { PHOTO_PREFIX, STYLES, STYLE_MODELS, registerPhotoStyle, styleColor, styleOf, styleSwatches } from './styles';
import { customId, registerCustoms } from './custom';
import type { AiQuestion, Brain, DrawingReading, FloorReview } from './ai';
import { PlanEditor, type EditorHost, type Selection, type Tool } from './editor2d';
import { House } from './house';
import { onModelLoaded } from './furniture';
import { createLook } from './look';
import { designLighting, kelvinColor } from './lighting';
import {
  WALL_HEIGHT,
  addStorey,
  ceilingOpenings,
  findRooms,
  fitIntoRooms,
  floorOpenings,
  len,
  nodeMap,
  pointInPoly,
  roomName,
  roomStyle,
  samplePlan,
  setStoreyHeight,
  splitWall,
  storeyHeight,
  storeysOf,
  switchStorey,
  tidy,
  uid,
  wallEnds,
  type Plan,
  type Room,
  type Vec2,
} from './plan';
import { Walker, solidsOf } from './walk';
import { autosave, clearLinkHash, loadInitial, shareUrl, useStorageKey } from './store';
import { roomSpecs, type RoomTexture } from './textures';

const DEG = Math.PI / 180;
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const HINTS: Record<Tool, string> = {
  select: 'Drag furniture, walls, corners or doors. Click a room to change its floor and paint.',
  wall: 'Click to place corners. Double-click, press Enter or click an existing corner to finish; Esc cancels.',
  door: 'Click a wall to add a door.',
  window: 'Click a wall to add a window.',
  place: 'Click the plan to place it — it snaps against the nearest wall. Esc cancels.',
};

/** Stairs and voids belong to the building: furnishing (by hand-off to the AI) never replaces them. */
const structural = (type: string) => {
  const def = FURNITURE[type];
  return !!def && (def.group === 'Stairs' || !!def.opensAbove);
};

/** An image of the drawing behind the plan, and how its pixels map to plan metres (plus the floor's shift). */
export interface DrawingShot {
  image: Blob;
  metresPerPixel: number;
  w: number;
  h: number;
  dx: number;
  dz: number;
}

export interface RoomcraftOptions {
  /** localStorage key for this page's autosave. */
  storageKey?: string;
  /** Start from this plan instead of a shared link / saved plan / sample. */
  plan?: Plan;
  underlay?: EditorHost['underlay'];
  /** Offered in the floor switcher: bring another floor in from the imported drawing (Floorwise). */
  addFloorFromDrawing?: () => void;
  /** An image of the drawing this floor was built from, for AI furnishing to follow (Floorwise). */
  drawingShot?: () => Promise<DrawingShot | null>;
}

/** What a page embedding the workspace can do with it. */
export interface RoomcraftApi {
  plan(): Plan;
  rooms(): Room[];
  /** Replaces the plan (undoable) and frames it. */
  setPlan(p: Plan, message?: string): void;
  /** Records an edit made to plan() from outside (undo, save, redraw, 3D). */
  commit(message?: string): void;
  /** Opens "Read the drawing with AI" on an image of the drawing the plan was built from. */
  readDrawing(shot: DrawingShot): void;
  /**
   * Reads the current floor's drawing with Claude and adds everything it finds, without asking (its questions get
   * "use your judgement"). Resolves with how many pieces were added; throws a message safe to show.
   */
  readFurniture(shot: DrawingShot): Promise<number>;
  /** The viewer's Claude (in a claude.ai Artifact) or the visitor's API key; null when neither is there. */
  claude(): Brain | null;
  /** Sets the current floor's floor-to-floor height (metres), moving the floors above with it. */
  setFloorHeight(h: number): void;
  /**
   * Applies Claude's check of the current floor (see ai.reviewFloor): `rooms` are the rooms as numbered on the image
   * it saw. Returns what changed, for the report.
   */
  applyReview(
    review: FloorReview,
    shot: DrawingShot,
    rooms: Room[],
  ): { dropped: number; added: number; openings: number; named: number; items: number };
  /** Adds a floor above the others from a plan (undoable) and switches to it. */
  addStorey(p: Plan, name?: string): void;
  redraw(): void;
  select(sel: Selection | null): void;
}

export async function startRoomcraft(gl = true, opts: RoomcraftOptions = {}): Promise<RoomcraftApi> {
  const app = $('app');
  if (opts.storageKey) useStorageKey(opts.storageKey);
  const initial = opts.plan ? { plan: opts.plan, from: 'sample' as const } : await loadInitial();
  let plan: Plan = initial.plan;
  clearLinkHash();
  if (initial.from === 'link') toast('Opened a shared plan');
  let rooms: Room[] = findRooms(plan);

  /* ---------- Undo / redo ---------- */
  const undo: string[] = [];
  const redo: string[] = [];
  let last = JSON.stringify(plan);
  const syncHistory = () => {
    $('undoBtn').setAttribute('aria-disabled', String(!undo.length));
    $('redoBtn').setAttribute('aria-disabled', String(!redo.length));
  };

  /* ---------- 2D editor ---------- */
  let three: Awaited<ReturnType<typeof setupThree>> | null = null;
  const refresh = () => {
    registerCustoms(plan.customs);
    registerPhotoStyle(plan.photoStyle);
    rooms = findRooms(plan);
    three?.sync();
    editor.draw();
    renderInspector();
    renderStoreys();
  };

  /* ---------- Floors ---------- */
  const renderStoreys = () => {
    const list = storeysOf(plan);
    const many = list.length > 1;
    $('storeys').innerHTML = `${
      many
        ? list
            .map(
              (f, i) =>
                `<button type="button" data-storey="${i}" aria-pressed="${f.active}">${esc(f.storey.name)}</button>`,
            )
            .join('')
        : ''
    }<label class="storey-h" title="Floor-to-floor height of this floor, as the section gives it">Height <input type="number" id="storeyH" min="2" max="9" step="0.05" value="${storeyHeight(plan).toFixed(2)}" aria-label="Floor-to-floor height in metres" /> m</label><button type="button" class="add" data-act="floor" title="Add an empty floor above, with this floor's walls">+ Floor</button>${
      opts.addFloorFromDrawing
        ? '<button type="button" class="add" data-act="floor-drawing" title="Select another floor on the imported drawing">+ From drawing</button>'
        : ''
    }`;
  };
  /** Replaces the whole home (all floors) as one undoable step. */
  const replaceHome = (next: Plan, message?: string) => {
    undo.push(JSON.stringify(plan));
    redo.length = 0;
    plan = next;
    last = JSON.stringify(plan);
    editor.select(null);
    syncHistory();
    refresh();
    autosave(plan);
    three?.reframe();
    requestAnimationFrame(() => editor.fit());
    if (message) toast(message);
  };
  $('storeys').addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (input.id !== 'storeyH') return;
    const h = Number(input.value);
    if (!Number.isFinite(h) || h < 2 || h > 9) return void (input.value = storeyHeight(plan).toFixed(2));
    replaceHome(setStoreyHeight(plan, plan.storey ?? 0, h), `Floor height: ${h.toFixed(2)} m`);
  });
  $('storeys').addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('button');
    if (!b) return;
    if (b.dataset.storey) {
      const i = Number(b.dataset.storey);
      if (i !== (plan.storey ?? 0)) replaceHome(switchStorey(plan, i));
    } else if (b.dataset.act === 'floor')
      replaceHome(addStorey(plan), 'Floor added: the walls are copied from the floor below');
    else if (b.dataset.act === 'floor-drawing') opts.addFloorFromDrawing?.();
  });
  const host: EditorHost = {
    underlay: opts.underlay,
    plan: () => plan,
    rooms: () => rooms,
    ghost() {
      const list = storeysOf(plan);
      const i = list.findIndex((f) => f.active);
      return i > 0 ? list[i - 1]!.plan : null;
    },
    commit(message) {
      const now = JSON.stringify(plan);
      if (now !== last) {
        undo.push(last);
        if (undo.length > 100) undo.shift();
        redo.length = 0;
        last = now;
      }
      syncHistory();
      refresh();
      autosave(plan);
      if (message) toast(message);
    },
    preview() {
      rooms = findRooms(plan);
      three?.sync();
    },
    selected(sel) {
      three?.select(sel);
      renderInspector();
    },
    walker: () => three?.walker() ?? null,
    toolChanged(tool) {
      for (const b of document.querySelectorAll<HTMLElement>('.tools [data-tool]'))
        b.setAttribute('aria-pressed', String(b.dataset.tool === tool));
      const name = FURNITURE[editor.placeType]?.name ?? 'item';
      $('hint').textContent = tool === 'place' ? HINTS.place.replace('it', `the ${name.toLowerCase()}`) : HINTS[tool];
    },
  };
  const editor = new PlanEditor($<HTMLCanvasElement>('plan'), host);
  editor.setTool('select');
  requestAnimationFrame(() => editor.fit());

  const history = (from: string[], to: string[]) => {
    const snap = from.pop();
    if (!snap) return;
    to.push(JSON.stringify(plan));
    plan = JSON.parse(snap) as Plan;
    last = snap;
    editor.select(null);
    syncHistory();
    refresh();
    autosave(plan);
  };
  $('undoBtn').addEventListener('click', () => history(undo, redo));
  $('redoBtn').addEventListener('click', () => history(redo, undo));
  syncHistory();
  addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).closest('input, textarea, select')) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) history(redo, undo);
      else history(undo, redo);
    } else if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      history(redo, undo);
    }
  });

  /* ---------- Toolbar ---------- */
  for (const b of document.querySelectorAll<HTMLButtonElement>('.tools [data-tool]'))
    b.addEventListener('click', () => {
      editor.setTool(b.dataset.tool as Tool);
      showPane('plan');
    });
  $('zoomIn').addEventListener('click', () => editor.zoomBy(1.25));
  $('zoomOut').addEventListener('click', () => editor.zoomBy(0.8));
  $('zoomFit').addEventListener('click', () => editor.fit());
  rovingToolbar(document.querySelector<HTMLElement>('[role="toolbar"]')!);

  /* ---------- Furniture catalogue (popover) ---------- */
  const catalog = $('catalog');
  const hasPopover = Object.hasOwn(HTMLElement.prototype, 'popover');
  const hideCatalog = () => (hasPopover ? catalog.hidePopover() : catalog.classList.remove('open'));
  if (!hasPopover) {
    // Manual fallback: the buttons toggle a class instead.
    catalog.classList.add('no-popover');
    for (const b of document.querySelectorAll<HTMLElement>('[popovertarget="catalog"]'))
      b.addEventListener('click', () => catalog.classList.toggle('open'));
  }
  registerCustoms(plan.customs);
  registerPhotoStyle(plan.photoStyle);
  const renderCatalog = () =>
    ($('catGrid').innerHTML = [...GROUPS, 'Custom']
      .map((g) => {
        // Custom pieces: only this home's (FURNITURE keeps every one registered this visit).
        const items = Object.entries(FURNITURE).filter(
          ([t, d]) => d.group === g && (!d.custom || !!plan.customs?.[t.slice(7)]),
        );
        return items.length
          ? `<h3>${esc(g)}</h3>${items
              .map(
                ([type, d]) =>
                  `<button type="button" data-type="${type}"><i style="background:${d.colors[0]}"></i>${esc(d.name)}<small>${(d.w * 100).toFixed(0)} × ${(d.d * 100).toFixed(0)} cm</small></button>`,
              )
              .join('')}`
          : '';
      })
      .join(''));
  renderCatalog();
  $('furnBtn').addEventListener('click', renderCatalog);
  $('catGrid').addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-type]');
    if (!b) return;
    hideCatalog();
    showPane('plan');
    editor.setTool('place', b.dataset.type);
    $('plan').focus();
  });

  /* ---------- Inspector ---------- */
  const inspector = $('inspector');
  function renderInspector() {
    const sel = editor.sel;
    const p = plan;
    let html = '';
    if (sel?.kind === 'item') {
      const it = p.items.find((i) => i.id === sel.id);
      const def = it && FURNITURE[it.type];
      if (it && def) {
        const color = it.color ?? def.colors[0];
        // Other models of the same piece (a 2-seat or corner sofa, a king bed…) and the style's palette.
        const models = Object.entries(FURNITURE).filter(([, d]) => d.group === def.group);
        const swatches = [
          ...new Set([...(p.style ? styleSwatches(styleOf(p.style), def.role) : []), ...def.colors]),
        ].slice(0, 9);
        html = `<h2>${esc(def.name)}<small>${(def.w * 100).toFixed(0)}×${(def.d * 100).toFixed(0)} cm</small></h2>
${
  models.length > 1
    ? `<label>Model<select data-act="model">${models
        .map(([t, d]) => `<option value="${t}"${t === it.type ? ' selected' : ''}>${esc(d.name)}</option>`)
        .join('')}</select></label>`
    : ''
}
<div class="swatches" role="group" aria-label="Colour">${swatches
          .map(
            (c) =>
              `<button type="button" class="swatch" data-color="${c}" style="background:${c}" aria-label="Colour ${c}" aria-pressed="${c === color}"></button>`,
          )
          .join('')}</div>
<div class="row"><button type="button" class="btn" data-act="rotl">↺ Rotate</button><button type="button" class="btn" data-act="rotr">↻ Rotate</button><button type="button" class="btn danger" data-act="del">Delete</button></div>`;
      }
    } else if (sel?.kind === 'opening') {
      const o = p.openings.find((x) => x.id === sel.id);
      if (o)
        html = `<h2>${o.kind === 'door' ? (o.leaves === 2 ? 'Double door' : 'Door') : o.tall ? 'Glass door' : 'Window'}<small>${(o.width * 100).toFixed(0)} cm</small></h2>
<label>Width<input type="range" data-act="width" min="0.6" max="3.6" step="0.05" value="${o.width}" /></label>
<div class="row">${o.kind === 'door' ? `<button type="button" class="btn" data-act="flip">Flip swing</button>${o.leaves === 2 ? '' : '<button type="button" class="btn" data-act="hand">Swap hinge</button>'}<button type="button" class="btn" data-act="leaves">${o.leaves === 2 ? 'Single leaf' : 'Double leaf'}</button>` : `<button type="button" class="btn" data-act="tall">${o.tall ? 'Make it a window' : 'Make it a glass door'}</button>`}<button type="button" class="btn danger" data-act="del">Delete</button></div>`;
    } else if (sel?.kind === 'wall') {
      const w = p.walls.find((x) => x.id === sel.id);
      if (w) {
        const L = len(...wallEnds(p, w));
        html = `<h2>${w.rail ? 'Railing' : 'Wall'}<small>${L.toFixed(2)} m</small></h2>
<div class="row" role="group" aria-label="Thickness">${[0.1, 0.15, 0.2, 0.25]
          .map(
            (t) =>
              `<button type="button" class="btn" data-thick="${t}" aria-pressed="${Math.abs(w.thick - t) < 0.001}">${t * 100} cm</button>`,
          )
          .join('')}</div>
<div class="row"><button type="button" class="btn" data-act="rail">${w.rail ? 'Make it a wall' : 'Make it a railing'}</button><button type="button" class="btn danger" data-act="del">Delete</button></div>`;
      }
    } else if (sel?.kind === 'node') {
      html = `<h2>Corner</h2><div class="row"><button type="button" class="btn danger" data-act="del">Delete corner and its walls</button></div>`;
    } else if (sel?.kind === 'room') {
      const r = rooms.find((x) => x.key === sel.id);
      if (r) {
        const st = roomStyle(p, r);
        const grid = (kind: 'floor' | 'wall', list: typeof FLOORS) =>
          `<div class="finishes" role="group" aria-label="${kind === 'floor' ? 'Floor' : 'Walls'}">${Object.entries(
            list,
          )
            .map(
              ([k, f]) =>
                `<button type="button" class="finish" data-${kind}="${k}" aria-pressed="${st[kind] === k}"><i style="background:${f.color}"></i>${esc(f.name)}</button>`,
            )
            .join('')}</div>`;
        html = `<h2>${esc(roomName(p, r))}<small>${r.area.toFixed(1)} m²</small></h2>
<label>Name<input type="text" data-act="name" maxlength="28" placeholder="${esc(roomName({ ...p, rooms: {} }, r))}" value="${esc(p.rooms[r.key]?.name ?? '')}" /></label>
<label>Floor</label>${grid('floor', FLOORS)}
<label>Walls</label>${grid('wall', WALLS)}`;
      }
    }
    inspector.hidden = !html;
    if (html && inspector.dataset.for !== `${sel?.kind}:${sel?.id}` + html.length) inspector.innerHTML = html;
    inspector.dataset.for = `${sel?.kind}:${sel?.id}` + html.length;
  }
  inspector.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const b = t.closest<HTMLElement>('button');
    const sel = editor.sel;
    if (!b || !sel) return;
    const p = plan;
    const act = b.dataset.act;
    if (act === 'del') return editor.deleteSelection();
    if (act === 'rotl') return editor.rotateSelected(-90);
    if (act === 'rotr') return editor.rotateSelected(90);
    if (act === 'flip') {
      const o = p.openings.find((x) => x.id === sel.id);
      if (o) o.flip = -(o.flip ?? 1);
    } else if (act === 'hand') {
      const o = p.openings.find((x) => x.id === sel.id);
      if (!o) return;
      if (o.hand) delete o.hand;
      else o.hand = -1;
    } else if (act === 'leaves') {
      const o = p.openings.find((x) => x.id === sel.id);
      if (!o) return;
      if (o.leaves) delete o.leaves;
      else o.leaves = 2;
    } else if (act === 'tall') {
      const o = p.openings.find((x) => x.id === sel.id);
      if (!o) return;
      if (o.tall) delete o.tall;
      else o.tall = true;
    } else if (b.dataset.color) {
      const it = p.items.find((i) => i.id === sel.id);
      if (it) it.color = b.dataset.color;
    } else if (act === 'rail') {
      const w = p.walls.find((x) => x.id === sel.id);
      if (!w) return;
      if (w.rail) delete w.rail;
      else {
        w.rail = true;
        // A railing has no doors or windows.
        p.openings = p.openings.filter((o) => o.wall !== w.id);
      }
    } else if (b.dataset.thick) {
      const w = p.walls.find((x) => x.id === sel.id);
      if (w) w.thick = Number(b.dataset.thick);
    } else if (b.dataset.floor || b.dataset.wall) {
      const style = (p.rooms[sel.id] ??= {});
      if (b.dataset.floor) style.floor = b.dataset.floor;
      if (b.dataset.wall) style.wall = b.dataset.wall;
    } else return;
    inspector.dataset.for = '';
    host.commit();
  });
  inspector.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    const sel = editor.sel;
    if (!sel) return;
    if (t.dataset.act === 'width') {
      const o = plan.openings.find((x) => x.id === sel.id);
      const w = o && plan.walls.find((x) => x.id === o.wall);
      if (!o || !w) return;
      const L = len(...wallEnds(plan, w));
      o.width = Math.min(Number(t.value), L - 0.1);
      o.t = Math.min(1 - o.width / 2 / L, Math.max(o.width / 2 / L, o.t));
      rooms = findRooms(plan);
      three?.sync();
      editor.draw();
    } else if (t.dataset.act === 'name') {
      (plan.rooms[sel.id] ??= {}).name = t.value.trim() || undefined;
      editor.draw();
    }
  });
  inspector.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.act === 'model') {
      const it = plan.items.find((i) => i.id === editor.sel?.id);
      if (!it || !FURNITURE[t.value]) return;
      it.type = t.value;
      inspector.dataset.for = '';
      return host.commit(`${FURNITURE[t.value]!.name}`);
    }
    if (t.dataset.act === 'width' || t.dataset.act === 'name') {
      inspector.dataset.for = '';
      host.commit();
    }
  });

  /* ---------- New plan ---------- */
  const newDlg = $<HTMLDialogElement>('newDlg');
  $('newBtn').addEventListener('click', () => newDlg.showModal());
  newDlg.addEventListener('close', () => {
    const choice = newDlg.returnValue;
    newDlg.returnValue = '';
    if (!choice) return;
    undo.push(JSON.stringify(plan));
    redo.length = 0;
    plan =
      choice === 'sample'
        ? samplePlan()
        : { nodes: [], walls: [], openings: [], items: [], rooms: {}, north: plan.north };
    last = JSON.stringify(plan);
    editor.select(null);
    syncHistory();
    refresh();
    autosave(plan);
    three?.reframe();
    requestAnimationFrame(() => editor.fit());
    showPane('plan');
    if (choice === 'blank') editor.setTool('wall');
  });

  /* ---------- Share: native share sheet on phones, else copy the link ---------- */
  const shareTip = document.querySelector<HTMLElement>('.share-tip')!;
  let tipTimer = 0;
  /** The bubble is the visible feedback and the live region, for success and failure alike. */
  const report = (msg: string) => {
    clearTimeout(tipTimer);
    shareTip.textContent = '';
    requestAnimationFrame(() => (shareTip.textContent = msg));
    tipTimer = window.setTimeout(() => (shareTip.textContent = ''), 2200);
  };
  $('shareBtn').addEventListener('click', async () => {
    const url = await shareUrl(plan);
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: 'My Roomcraft plan', url });
        return;
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      report('Link copied');
    } catch {
      report('Copy failed');
    }
  });

  /* ---------- Design style ---------- */
  const styleDlg = $<HTMLDialogElement>('styleDlg');
  const renderStyles = () => {
    $('styleGrid').innerHTML = Object.entries(STYLES)
      .map(
        ([id, st]) =>
          `<button type="button" data-style="${id}" aria-pressed="${plan.style === id}"><span class="chips">${[
            st.wood,
            ...st.fabric.slice(0, 2),
            st.cases[0],
            st.accent[0],
          ]
            .map((c) => `<i style="background:${c}"></i>`)
            .join('')}</span><b>${esc(st.name)}<small>${esc(st.vi)}</small></b><span>${esc(st.blurb)}</span></button>`,
      )
      .join('');
  };
  /** Gives the whole home a style: its finishes per room, and every piece recoloured from its palette. */
  const applyStyle = (id: string) => {
    const st = STYLES[id];
    if (!st) return;
    plan.style = id;
    for (const r of Object.values(plan.rooms)) {
      delete r.floor;
      delete r.wall;
    }
    for (const it of plan.items) {
      // The style's own model for this piece, or back to the planner's when the new style has none.
      const base = it.base ?? it.type;
      const model = STYLE_MODELS[id]?.[base];
      if (model && FURNITURE[model]) {
        it.type = model;
        it.base = base;
      } else {
        it.type = base;
        delete it.base;
      }
      const def = FURNITURE[it.type];
      if (def) it.color = styleColor(st, it.type, def.role, it.color ?? def.colors[0]!);
    }
    host.commit(`Style: ${st.name}`);
  };
  $('styleBtn').addEventListener('click', () => {
    renderStyles();
    styleDlg.showModal();
  });
  // A style from the client's reference photo. The photo stays in memory for this visit, so later AI furnishing in
  // that style can look at it too; the style itself is saved with the plan.
  let refPhoto: Blob | null = null;
  const photoIn = $<HTMLInputElement>('photoIn');
  photoIn.addEventListener('change', async () => {
    const file = photoIn.files?.[0];
    if (!file) return;
    try {
      // Decoded through an <img>, which every browser (and headless test runner) handles for any picture type.
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      try {
        await img.decode();
      } finally {
        URL.revokeObjectURL(url);
      }
      const k = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * k));
      c.height = Math.max(1, Math.round(img.naturalHeight * k));
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      refPhoto =
        (await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', 0.86))) ??
        (await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/png')));
      if (!refPhoto) throw new Error('unreadable');
      const prev = $<HTMLImageElement>('photoPrev');
      prev.src = c.toDataURL('image/jpeg', 0.7);
      prev.hidden = false;
      $('photoPick').textContent = 'Change photo';
      $('photoStatus').textContent = '';
    } catch {
      $('photoStatus').textContent = 'That file could not be read as a picture.';
    }
  });
  $<HTMLFormElement>('photoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = $('photoStatus');
    const go = $<HTMLButtonElement>('photoGo');
    if (!refPhoto) {
      status.textContent = 'Choose a photo first.';
      return;
    }
    const b = needBrain(status);
    if (!b || go.getAttribute('aria-disabled') === 'true') return;
    go.setAttribute('aria-disabled', 'true');
    styleDlg.classList.add('busy');
    status.textContent = 'Claude is looking at the photo…';
    try {
      const { styleFromPhoto, furnishRoom } = await import('./ai');
      const note = $<HTMLInputElement>('photoNote').value.trim();
      const out = await styleFromPhoto(b, refPhoto, note, plan);
      const id = `${PHOTO_PREFIX}${Date.now().toString(36)}`;
      plan.photoStyle = { id, style: out.style };
      registerPhotoStyle(plan.photoStyle);
      applyStyle(id);
      let said = out.summary || `Style: ${out.style.name}`;
      // Then the main room, furnished the way the photo is.
      const main = [...rooms]
        .filter((r) => !/Bathroom|Balcony|Hall|Shaft|Kitchen/.test(roomName(plan, r)))
        .sort((x, y) => y.area - x.area)[0];
      if ($<HTMLInputElement>('photoFurnish').checked && main) {
        status.textContent = `Furnishing the ${roomName(plan, main).toLowerCase()} like the photo…`;
        const inRoom = (it: { x: number; z: number }) => pointInPoly([it.x, it.z], main.poly);
        const laid = await furnishRoom(
          b,
          `Furnish this room like the reference photo${note ? ` (${note})` : ''}.`,
          plan,
          main,
          plan.items.filter((i) => inRoom(i) && structural(i.type)),
          id,
          [refPhoto],
          (await opts.drawingShot?.()) ?? undefined,
        );
        plan.items = plan.items.filter((i) => !inRoom(i) || structural(i.type));
        for (const it of laid.items) plan.items.push({ id: uid('i'), ...it });
        editor.select({ kind: 'room', id: main.key });
        host.commit(laid.summary || `${roomName(plan, main)} furnished like the photo`);
        said = laid.summary || said;
      }
      status.textContent = '';
      styleDlg.close();
      toast(said);
      showPane('three');
    } catch (err) {
      status.textContent = err instanceof Error ? err.message : 'Something went wrong. Try again.';
    } finally {
      go.removeAttribute('aria-disabled');
      styleDlg.classList.remove('busy');
    }
  });
  $('styleGrid').addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-style]');
    if (!b?.dataset.style) return;
    applyStyle(b.dataset.style);
    styleDlg.close();
    showPane('three');
  });

  /* ---------- Lighting ---------- */
  const lightDlg = $<HTMLDialogElement>('lightDlg');
  const syncLightUi = () => {
    const l = plan.lights ?? { on: false, kelvin: 3000 };
    $('lightsOn').setAttribute('aria-pressed', String(l.on));
    for (const b of document.querySelectorAll<HTMLElement>('#kelvins [data-kelvin]'))
      b.setAttribute('aria-pressed', String(Number(b.dataset.kelvin) === l.kelvin));
  };
  const setLighting = (patch: Partial<{ on: boolean; kelvin: number }>) => {
    plan.lights = { on: false, kelvin: 3000, ...plan.lights, ...patch };
    syncLightUi();
    three?.relight();
    autosave(plan);
  };
  $('lightBtn').addEventListener('click', () => {
    syncLightUi();
    $('lightStatus').textContent = '';
    lightDlg.showModal();
  });
  $('lightsOn').addEventListener('click', () => setLighting({ on: !(plan.lights?.on ?? false) }));
  $('kelvins').addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-kelvin]');
    if (b) setLighting({ kelvin: Number(b.dataset.kelvin) });
  });
  $('lightsAuto').addEventListener('click', () => {
    if (!rooms.length) {
      $('lightStatus').textContent = 'Draw or import a plan with closed rooms first.';
      return;
    }
    const n = designLighting(plan, rooms);
    plan.lights = { kelvin: 3000, ...plan.lights, on: true };
    syncLightUi();
    host.commit(`Lighting plan: ${n} fittings`);
    three?.relight();
    lightDlg.close();
    showPane('three');
  });

  /* ---------- Claude: questions, new objects, reading the drawing ---------- */
  const brain = (): Brain | null => hostAi ?? (apiKey || null);
  const needBrain = (status: HTMLElement) => {
    const b = brain();
    if (!b) status.textContent = 'Add your Anthropic API key in the AI dialog first (or open this page in claude.ai).';
    return b;
  };
  /** Shows Claude's questions with its suggested answers (and a box for another); resolves with the replies. */
  const ask = (box: HTMLElement, questions: AiQuestion[]) =>
    new Promise<{ q: string; a: string }[]>((resolve) => {
      box.hidden = false;
      box.innerHTML = `${questions
        .map(
          (q, i) =>
            `<fieldset data-q="${i}"><legend>${esc(q.text)}</legend><div class="opts">${(q.options ?? [])
              .map(
                (o) => `<button type="button" class="btn" data-opt="${esc(o)}" aria-pressed="false">${esc(o)}</button>`,
              )
              .join(
                '',
              )}</div><input type="text" placeholder="Or type your answer" aria-label="Your answer" /></fieldset>`,
        )
        .join('')}<div class="choices"><button type="button" class="primary" data-act="answer">Continue</button></div>`;
      box.onclick = (e) => {
        const b = (e.target as Element).closest<HTMLButtonElement>('button');
        if (!b) return;
        if (b.dataset.opt !== undefined) {
          for (const x of b.parentElement!.querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b));
          return;
        }
        if (b.dataset.act !== 'answer') return;
        const replies = questions.map((q, i) => {
          const fs = box.querySelector<HTMLElement>(`[data-q="${i}"]`)!;
          const typed = fs.querySelector<HTMLInputElement>('input')!.value.trim();
          const picked = fs.querySelector<HTMLElement>('[aria-pressed="true"]')?.dataset.opt ?? '';
          return { q: q.text, a: typed || picked || 'No preference — use your judgement' };
        });
        box.hidden = true;
        box.onclick = null;
        resolve(replies);
      };
    });

  // Create an object the catalogue lacks.
  const createDlg = $<HTMLDialogElement>('createDlg');
  $('createOpen').addEventListener('click', () => {
    hideCatalog();
    $('createStatus').textContent = hostAi ? 'Uses your Claude account.' : '';
    $('createAsk').hidden = true;
    createDlg.showModal();
  });
  $<HTMLFormElement>('createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = $('createStatus');
    const b = needBrain(status);
    const text = $<HTMLTextAreaElement>('createPrompt').value.trim();
    if (!b || !text) return;
    const go = $<HTMLButtonElement>('createGo');
    go.disabled = true;
    createDlg.classList.add('busy');
    const answers: { q: string; a: string }[] = [];
    try {
      const { designObject } = await import('./ai');
      for (;;) {
        status.textContent = 'Designing it…';
        const out = await designObject(b, text, answers, plan.style);
        if ('def' in out) {
          plan.customs ??= {};
          const id = customId(out.def.name, plan.customs);
          plan.customs[id] = out.def;
          registerCustoms(plan.customs);
          host.commit(`${out.def.name} created — click the plan to place it`);
          createDlg.close();
          showPane('plan');
          editor.setTool('place', `custom:${id}`);
          break;
        }
        createDlg.classList.remove('busy');
        status.textContent = 'Claude needs a detail:';
        answers.push(...(await ask($('createAsk'), [out.question])));
        createDlg.classList.add('busy');
      }
    } catch (err) {
      status.textContent = err instanceof Error ? err.message : 'Something went wrong. Try again.';
    } finally {
      go.disabled = false;
      createDlg.classList.remove('busy');
    }
  });

  // Read a drawing (offered by Floorwise): questions first if needed, then a checklist of what was found.
  const readDlg = $<HTMLDialogElement>('readDlg');
  let found: DrawingReading['found'] = [];
  const readDrawingFlow = async (shot: DrawingShot) => {
    const status = $('readStatus');
    $('readList').hidden = true;
    $('readActions').hidden = true;
    $('readAsk').hidden = true;
    readDlg.showModal();
    const b = needBrain(status);
    if (!b) return;
    readDlg.classList.add('busy');
    try {
      const { readDrawing } = await import('./ai');
      status.textContent = 'Reading the drawing…';
      // Claude reads positions off the image, so it is told the rooms in the image's frame: an upper floor is shifted
      // in the plan to sit over the one below, and rooms given with that shift put pieces off the drawing.
      const shift = (q: Vec2): Vec2 => [q[0] - shot.dx, q[1] - shot.dz];
      const seen = rooms.map((r) => ({ ...r, poly: r.poly.map(shift), centroid: shift(r.centroid) }));
      let out = await readDrawing(b, shot.image, shot.metresPerPixel, shot, plan, seen);
      if (out.questions.length) {
        readDlg.classList.remove('busy');
        status.textContent = 'A few questions before placing anything:';
        const answers = await ask($('readAsk'), out.questions);
        readDlg.classList.add('busy');
        status.textContent = 'Placing what it found…';
        out = await readDrawing(b, shot.image, shot.metresPerPixel, shot, plan, seen, answers);
      }
      found = out.found.map((f) => ({ ...f, item: { ...f.item, x: f.item.x + shot.dx, z: f.item.z + shot.dz } }));
      // Every piece must stand in the home: one overhanging a wall is nudged in, one that landed just outside is pulled
      // into the nearest room, and one far outside is left out (and said so).
      const before = found.length;
      found = found.filter((f) => fitIntoRooms(f.item as Parameters<typeof fitIntoRooms>[0], rooms));
      const dropped = before - found.length;
      if (dropped)
        out.notes = `${out.notes ? `${out.notes} ` : ''}${dropped === 1 ? '1 piece' : `${dropped} pieces`} fell outside the home and ${dropped === 1 ? 'was' : 'were'} left out.`;
      registerCustoms(plan.customs);
      if (!found.length) {
        status.textContent = out.notes || 'Nothing more to add from this drawing.';
        return;
      }
      $('readList').innerHTML = found
        .map(
          (f, i) =>
            `<li><label><input type="checkbox" data-i="${i}" checked /> ${esc(f.label)} <small>${f.custom ? 'new object' : esc(FURNITURE[f.item.type]?.name ?? '')}</small></label></li>`,
        )
        .join('');
      $('readList').hidden = false;
      $('readActions').hidden = false;
      status.textContent = out.notes;
    } catch (err) {
      status.textContent = err instanceof Error ? err.message : 'Something went wrong. Try again.';
    } finally {
      readDlg.classList.remove('busy');
    }
  };
  $('readAdd').addEventListener('click', () => {
    const picked = [...document.querySelectorAll<HTMLInputElement>('#readList input:checked')].map(
      (x) => found[Number(x.dataset.i)]!,
    );
    for (const f of picked) plan.items.push({ id: uid('i'), ...f.item });
    readDlg.close();
    host.commit(`${picked.length} pieces added from the drawing`);
    showPane('three');
  });

  /* ---------- Export ---------- */
  const exportDlg = $<HTMLDialogElement>('exportDlg');
  const exportStatus = $('exportStatus');
  $('exportBtn').addEventListener('click', () => {
    exportStatus.textContent = '';
    exportDlg.showModal();
  });
  exportDlg.addEventListener('click', async (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-export]');
    if (!b || b.getAttribute('aria-busy') === 'true') return;
    const kind = b.dataset.export;
    if (!plan.walls.length && kind !== 'view') {
      exportStatus.textContent = 'Draw or import a plan first.';
      return;
    }
    b.setAttribute('aria-busy', 'true');
    exportStatus.textContent = 'Preparing the file…';
    try {
      const name = (document.querySelector('.brand')?.firstChild?.textContent ?? 'plan').trim().toLowerCase() || 'plan';
      const title = `${document.querySelector('.brand')?.firstChild?.textContent?.trim() ?? 'Floor'} plan`;
      let saved: boolean;
      if (kind === 'view') {
        if (!three) throw new Error('The 3D view needs WebGL.');
        showPane('three');
        const blob = await three.snapshot();
        if (!blob) throw new Error('Could not take the picture.');
        saved = await saveFile(`${name}-3d.png`, blob);
      } else {
        const ex = await import('./export');
        if (kind === 'dxf') {
          const dxf = ex.planToDxf(plan);
          // A claude.ai Artifact only lets common file types through: the DXF goes inside a ZIP there.
          saved = (await hostDownloads())
            ? await saveFile(`${name}-plan.zip`, ex.zip([{ name: `${name}-plan.dxf`, data: dxf }]))
            : await saveFile(`${name}-plan.dxf`, new Blob([dxf], { type: 'application/dxf' }));
        } else {
          const svg = ex.planToSvg(plan, title);
          saved =
            kind === 'svg'
              ? await saveFile(`${name}-plan.svg`, new Blob([svg], { type: 'image/svg+xml' }))
              : await saveFile(`${name}-plan.png`, await ex.svgToPng(svg));
        }
      }
      exportStatus.textContent = saved ? 'Saved.' : 'Not saved.';
      if (saved) exportDlg.close();
      if (saved) toast(`${b.querySelector('b')?.textContent ?? 'File'} exported`);
    } catch (err) {
      exportStatus.textContent = err instanceof Error ? err.message : 'Could not export. Try again.';
    } finally {
      b.removeAttribute('aria-busy');
    }
  });

  /* ---------- Furnish with AI ---------- */
  // One key for every demo on this site that talks to Claude (the Forge studio stored it first).
  const KEYS = ['meridian.anthropicKey', 'forge.anthropicKey'];
  const readKey = () => {
    try {
      for (const k of KEYS) {
        const v = localStorage.getItem(k);
        if (v) return v;
      }
    } catch {
      // storage blocked
    }
    return '';
  };
  let apiKey = readKey();
  // Inside a claude.ai Artifact the viewer's own Claude answers: no key to ask for.
  let hostAi: HostSample | null = null;
  void hostClaude().then((s) => {
    hostAi = s;
    if (s) $('aiKeyBtn').hidden = true;
  });
  const aiDlg = $<HTMLDialogElement>('aiDlg');
  const aiStatus = $('aiStatus');
  const keyBox = $<HTMLFormElement>('aiKeyBox');
  const setKeyBox = (open: boolean) => {
    keyBox.hidden = !open;
    $('aiKeyBtn').setAttribute('aria-expanded', String(open));
    $('aiKeyBtn').textContent = apiKey ? 'API key ✓' : 'API key';
    if (open) $<HTMLInputElement>('aiKeyIn').focus();
  };
  $('aiBtn').addEventListener('click', () => {
    if (!rooms.length) return toast('Draw a closed room first');
    const selected = editor.sel?.kind === 'room' ? editor.sel.id : null;
    const byArea = [...rooms].sort((a, b) => b.area - a.area);
    $('aiRoom').innerHTML = byArea
      .map(
        (r) =>
          `<option value="${esc(r.key)}" ${r.key === (selected ?? byArea[0]!.key) ? 'selected' : ''}>${esc(roomName(plan, r))} · ${r.area.toFixed(1)} m²</option>`,
      )
      .join('');
    $('aiStyle').innerHTML = `<option value="">No particular style</option>${Object.entries(STYLES)
      .map(
        ([id, st]) =>
          `<option value="${id}"${plan.style === id ? ' selected' : ''}>${esc(st.name)} · ${esc(st.vi)}</option>`,
      )
      .join('')}`;
    aiStatus.textContent = hostAi ? 'Uses your Claude account.' : '';
    setKeyBox(false);
    aiDlg.showModal();
  });
  $('aiKeyBtn').addEventListener('click', () => setKeyBox(keyBox.hidden));
  keyBox.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $<HTMLInputElement>('aiKeyIn').value.trim();
    if (!v) return;
    apiKey = v;
    try {
      localStorage.setItem(KEYS[0]!, v);
    } catch {
      // Private mode: the key still works for this visit.
    }
    $<HTMLInputElement>('aiKeyIn').value = '';
    setKeyBox(false);
    aiStatus.textContent = 'Key saved in this browser.';
  });
  $('aiKeyForget').addEventListener('click', () => {
    apiKey = '';
    try {
      for (const k of KEYS) localStorage.removeItem(k);
    } catch {
      // nothing stored
    }
    setKeyBox(false);
    aiStatus.textContent = 'Key removed.';
  });
  $<HTMLFormElement>('aiForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const request = $<HTMLTextAreaElement>('aiPrompt').value.trim();
    const room = rooms.find((r) => r.key === $<HTMLSelectElement>('aiRoom').value);
    const go = $<HTMLButtonElement>('aiGo');
    if (!request || !room || go.getAttribute('aria-disabled') === 'true') return;
    if (!hostAi && !apiKey) {
      aiStatus.textContent = 'Add your Anthropic API key to use the AI.';
      return setKeyBox(true);
    }
    const replace = $<HTMLInputElement>('aiReplace').checked;
    const inRoom = (x: number, z: number) => pointInPoly([x, z], room.poly);
    const keep = plan.items.filter((i) => inRoom(i.x, i.z) && (!replace || structural(i.type)));
    go.setAttribute('aria-disabled', 'true');
    aiDlg.classList.add('busy');
    aiStatus.textContent = 'Arranging the room…';
    try {
      const { furnishRoom } = await import('./ai');
      const styleId = $<HTMLSelectElement>('aiStyle').value;
      // The style is the home's: choosing one here gives the whole home its finishes, as the Style dialog does.
      if (styleId && styleId !== plan.style) {
        plan.style = styleId;
        for (const r of Object.values(plan.rooms)) {
          delete r.floor;
          delete r.wall;
        }
      }
      const photo = styleId.startsWith(PHOTO_PREFIX) && refPhoto ? [refPhoto] : [];
      const drawing = (await opts.drawingShot?.()) ?? undefined;
      const out = await furnishRoom(hostAi ?? apiKey, request, plan, room, keep, styleId || undefined, photo, drawing);
      if (replace) plan.items = plan.items.filter((i) => !inRoom(i.x, i.z) || structural(i.type));
      for (const it of out.items) plan.items.push({ id: uid('i'), ...it });
      aiDlg.close();
      editor.select({ kind: 'room', id: room.key });
      host.commit(out.summary || `${roomName(plan, room)} furnished`);
      showPane('three');
    } catch (err) {
      aiStatus.textContent = err instanceof Error ? err.message : 'Something went wrong. Try again.';
    } finally {
      go.removeAttribute('aria-disabled');
      aiDlg.classList.remove('busy');
    }
  });

  /* ---------- Phones: one pane at a time ---------- */
  const showPane = (pane: 'plan' | 'three') => {
    if (app.dataset.pane === pane) return;
    app.dataset.pane = pane;
    for (const b of document.querySelectorAll<HTMLElement>('[data-show]'))
      b.setAttribute('aria-pressed', String(b.dataset.show === pane));
  };
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-show]'))
    b.addEventListener('click', () => showPane(b.dataset.show as 'plan' | 'three'));

  /* ---------- 3D ---------- */
  if (gl) {
    three = await setupThree(
      () => plan,
      () => rooms,
      (sel) => editor.select(sel),
      () => editor.draw(),
    );
    three.sync();
    three.select(editor.sel);
    await three.start();
  }
  renderInspector();
  renderStoreys();

  return {
    plan: () => plan,
    rooms: () => rooms,
    setPlan(p, message) {
      undo.push(JSON.stringify(plan));
      redo.length = 0;
      plan = p;
      last = JSON.stringify(plan);
      editor.select(null);
      syncHistory();
      refresh();
      autosave(plan);
      three?.reframe();
      requestAnimationFrame(() => editor.fit());
      if (message) toast(message);
    },
    commit: (message) => host.commit(message),
    readDrawing: (shot) => void readDrawingFlow(shot),
    claude: () => brain(),
    setFloorHeight(h) {
      if (Number.isFinite(h) && h >= 2 && h <= 9) replaceHome(setStoreyHeight(plan, plan.storey ?? 0, h));
    },
    applyReview(review, shot, seenRooms) {
      const at = (q: [number, number]): Vec2 => [
        q[0] * shot.metresPerPixel + shot.dx,
        q[1] * shot.metresPerPixel + shot.dz,
      ];
      // Room names are tied to where the rooms were, since wall changes give rooms new keys.
      const names = review.rooms.flatMap((r) => {
        const room = seenRooms[r.index];
        return room ? [{ at: room.centroid, name: r.name }] : [];
      });
      const drop = new Set(review.dropWalls.map((i) => plan.walls[i]?.id).filter((id): id is string => !!id));
      plan.walls = plan.walls.filter((w) => !drop.has(w.id));
      plan.openings = plan.openings.filter((o) => !drop.has(o.wall));
      tidy(plan);
      const ends = (w: (typeof plan.walls)[number]) => wallEnds(plan, w);
      /** A point on the plan as a node: an existing corner close by, a point along a wall close by, or a new one. */
      const nodeAt = (q: Vec2) => {
        let best: { id: string; d: number } | null = null;
        for (const n of plan.nodes) {
          const d = Math.hypot(n.x - q[0], n.z - q[1]);
          if (d < 0.4 && (!best || d < best.d)) best = { id: n.id, d };
        }
        if (best) return best.id;
        for (const w of plan.walls) {
          const [a, b] = ends(w);
          const ex = b[0] - a[0];
          const ez = b[1] - a[1];
          const t = ((q[0] - a[0]) * ex + (q[1] - a[1]) * ez) / (ex * ex + ez * ez || 1);
          if (t <= 0.02 || t >= 0.98) continue;
          if (Math.hypot(a[0] + ex * t - q[0], a[1] + ez * t - q[1]) < 0.3) return splitWall(plan, w, t).id;
        }
        const n = { id: uid('n'), x: Math.round(q[0] * 1000) / 1000, z: Math.round(q[1] * 1000) / 1000 };
        plan.nodes.push(n);
        return n.id;
      };
      let added = 0;
      for (const w of review.addWalls) {
        const a = nodeAt(at(w.from));
        const b = nodeAt(at(w.to));
        if (a === b) continue;
        plan.walls.push({ id: uid('w'), a, b, thick: Math.round(w.thick * 100) / 100 });
        added++;
      }
      let openings = 0;
      for (const o of review.openings) {
        const q = at(o.at);
        let best: { w: (typeof plan.walls)[number]; t: number; d: number; L: number } | null = null;
        for (const w of plan.walls) {
          const [a, b] = ends(w);
          const ex = b[0] - a[0];
          const ez = b[1] - a[1];
          const L = Math.hypot(ex, ez);
          const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * ex + (q[1] - a[1]) * ez) / (L * L || 1)));
          const d = Math.hypot(a[0] + ex * t - q[0], a[1] + ez * t - q[1]);
          if (d < Math.max(0.35, (w.thick ?? 0.15) + 0.1) && L > 0.4 && (!best || d < best.d)) best = { w, t, d, L };
        }
        if (!best) continue;
        const width = Math.min(o.width, best.L - 0.1);
        const t = Math.min(1 - width / 2 / best.L, Math.max(width / 2 / best.L, best.t));
        const shape =
          o.kind === 'window'
            ? { kind: 'window' as const }
            : o.kind === 'sliding'
              ? { kind: 'window' as const, tall: true }
              : o.kind === 'double' || o.kind === 'folding'
                ? { kind: 'door' as const, leaves: 2 as const }
                : { kind: 'door' as const };
        // An opening already there is re-typed (a door drawn as a curved slider); else a new one is cut.
        const there = plan.openings.find((x) => x.wall === best.w.id && Math.abs(x.t - t) * best.L < width / 2 + 0.2);
        if (there) {
          delete there.leaves;
          delete there.tall;
          Object.assign(there, shape, { width });
        } else plan.openings.push({ id: uid('o'), wall: best.w.id, t, width, flip: 1, ...shape });
        openings++;
      }
      tidy(plan);
      const now = findRooms(plan);
      let named = 0;
      for (const n of names) {
        const r = now.find((x) => pointInPoly(n.at, x.poly));
        if (!r) continue;
        plan.rooms[r.key] = { ...plan.rooms[r.key], name: n.name };
        named++;
      }
      registerCustoms(plan.customs);
      let items = 0;
      for (const f of review.found) {
        const it = { id: uid('i'), ...f.item, x: f.item.x + shot.dx, z: f.item.z + shot.dz };
        if (!fitIntoRooms(it, now)) continue;
        plan.items.push(it);
        items++;
      }
      host.commit('Claude checked this floor against the drawing');
      return { dropped: drop.size, added, openings, named, items };
    },
    async readFurniture(shot) {
      const b = brain();
      if (!b) throw new Error('Claude is not available here: open the page in claude.ai or add an API key.');
      const { readDrawing } = await import('./ai');
      const shift = (q: Vec2): Vec2 => [q[0] - shot.dx, q[1] - shot.dz];
      const seen = rooms.map((r) => ({ ...r, poly: r.poly.map(shift), centroid: shift(r.centroid) }));
      let out = await readDrawing(b, shot.image, shot.metresPerPixel, shot, plan, seen);
      if (out.questions.length)
        out = await readDrawing(
          b,
          shot.image,
          shot.metresPerPixel,
          shot,
          plan,
          seen,
          out.questions.map((q) => ({ q: q.text, a: 'No preference — use your judgement' })),
        );
      registerCustoms(plan.customs);
      let added = 0;
      for (const f of out.found) {
        const it = { id: uid('i'), ...f.item, x: f.item.x + shot.dx, z: f.item.z + shot.dz };
        if (!fitIntoRooms(it, rooms)) continue;
        plan.items.push(it);
        added++;
      }
      if (added) host.commit(`${added} pieces read from the drawing`);
      return added;
    },
    addStorey(p, name) {
      replaceHome(addStorey(plan, p, name), `${name ?? 'New floor'} added`);
    },
    redraw: () => editor.draw(),
    select: (sel) => editor.select(sel),
  };
}

/** The 3D side: sun, dollhouse cut-away, picking. */
async function setupThree(
  getPlan: () => Plan,
  getRooms: () => Room[],
  onPick: (sel: Selection | null) => void,
  redraw2d: () => void,
) {
  const viewer = $('viewer');
  const canvas = $<HTMLCanvasElement>('gl');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const quality = getQuality();
  const renderer = createRenderer(canvas, quality, { shadows: true, toneMapping: NeutralToneMapping, exposure: 1.0 });
  renderer.shadowMap.autoUpdate = false;
  const tex = await generateTextures<{ size: number }, RoomTexture>({
    build: (p) => roomSpecs(p.size),
    params: { size: Math.min(1024, quality.textureSize) },
    worker: () => new Worker(new URL('./textures.worker.ts', import.meta.url), { type: 'module' }),
    anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()),
    renderer,
  });

  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.1, 400);
  // Sky light, tone mapping and (on capable devices) ambient occlusion: see look.ts.
  const look = createLook(renderer, scene, camera, quality, () => loop.invalidate());
  scene.environmentIntensity = 0.06;
  const hemi = new HemisphereLight('#f6f2ea', '#cdb89b', 0.6);
  const sun = new DirectionalLight('#fff4e5', 2.6);
  sun.castShadow = true;
  const shadowSize = quality.tier === 'high' ? 4096 : quality.shadowMapSize;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  // The invisible roof (layer 1) only casts shadows: the main camera and ambient occlusion never see it.
  sun.shadow.camera.layers.enable(1);
  scene.add(hemi, sun, sun.target);
  const ground = new Mesh(new PlaneGeometry(240, 240), new MeshStandardMaterial({ color: '#dde1e6', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.002;
  ground.receiveShadow = true;
  scene.add(ground);

  const house = new House(tex);
  /**
   * The other floors of a multi-storey home, each its own House: floors below the one being edited stand under it
   * (the active floor stays at y = 0, so walking and framing work as for a single floor); floors above are hidden so
   * the active floor can be seen into.
   */
  const others = new Map<number, House>();
  const syncStoreys = (p: Plan) => {
    const list = storeysOf(p);
    const base = list.find((f) => f.active)!.storey.elevation;
    const lowest = Math.min(...list.map((f) => f.storey.elevation));
    ground.position.y = lowest - base - 0.002;
    list.forEach((f, i) => {
      if (f.active) return;
      let h = others.get(i);
      if (f.storey.elevation >= base) {
        if (h) h.root.visible = false;
        return;
      }
      if (!h) {
        h = new House(tex);
        others.set(i, h);
        scene.add(h.root);
      }
      // Walls run up to the floor above, so the storeys read as one building.
      const above = list.filter((g) => g.storey.elevation > f.storey.elevation).map((g) => g.storey.elevation);
      h.wallHeight = above.length ? Math.min(...above) - f.storey.elevation : (f.storey.height ?? WALL_HEIGHT);
      h.syncStructure(f.plan, findRooms(f.plan), floorOpenings(list, i), ceilingOpenings(list, i));
      h.syncItems(f.plan);
      h.root.position.y = f.storey.elevation - base;
      h.root.visible = true;
    });
    for (const [i, h] of others)
      if (i >= list.length) {
        scene.remove(h.root);
        others.delete(i);
      }
  };
  scene.add(house.root);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = 1.45;
  controls.minDistance = 2;
  controls.maxDistance = 60;
  let framed = false;
  /** Frames the whole building, whatever the pane's shape. */
  const frame = () => {
    const { cx, cz, r } = house.bounds;
    if (![cx, cz, r].every(Number.isFinite)) return;
    const v = (camera.fov * DEG) / 2;
    const hz = Math.atan(Math.tan(v) * camera.aspect);
    const dist = (r * 1.05) / Math.sin(Math.min(v, hz));
    const dir = new Vector3(0.42, 0.72, 0.56).normalize();
    controls.target.set(cx, 0.6, cz);
    camera.position.copy(controls.target).addScaledVector(dir, dist);
    controls.update();
  };

  /* ---------- Sun ---------- */
  const hourIn = $<HTMLInputElement>('hour');
  const northIn = $<HTMLInputElement>('north');
  const sunDir = new Vector3();
  const daySky = new Color('#f6f2ea');
  const nightSky = new Color('#5a6a8a');
  const lampColor = new Color();
  const white0 = new Color('#ffffff');
  // How many fittings may emit at once (each light adds shading cost to every pixel).
  const lightCap = quality.tier === 'high' ? 24 : quality.tier === 'mid' ? 12 : 6;
  const warm = new Color('#ffb067');
  const white = new Color('#fff0dc');
  /**
   * Which way the home faces, for the orientation readout: the balcony's open side when there is a balcony (what
   * people describe a flat by), else the front of the plan (its bottom edge).
   */
  const facing = (p: Plan): { label: string; dir: Vec2 } => {
    const nodes = nodeMap(p);
    for (const r of getRooms()) {
      if (roomName(p, r) !== 'Balcony') continue;
      let sum: Vec2 = [0, 0];
      r.nodes.forEach((id, i) => {
        const a = nodes.get(id)!;
        const b = nodes.get(r.nodes[(i + 1) % r.nodes.length]!)!;
        const w = p.walls.find((x) => (x.a === a.id && x.b === b.id) || (x.a === b.id && x.b === a.id));
        if (!w?.rail) return;
        const L = Math.hypot(b.x - a.x, b.z - a.z);
        let n: Vec2 = [-(b.z - a.z) / L, (b.x - a.x) / L];
        if (pointInPoly([(a.x + b.x) / 2 + n[0] * 0.3, (a.z + b.z) / 2 + n[1] * 0.3], r.poly)) n = [-n[0], -n[1]];
        sum = [sum[0] + n[0] * L, sum[1] + n[1] * L];
      });
      if (Math.hypot(...sum) > 0.01) return { label: 'Balcony', dir: sum };
    }
    return { label: 'Front', dir: [0, 1] };
  };
  const updateSun = () => {
    const p = getPlan();
    const h = Number(hourIn.value);
    const hh = Math.floor(h);
    $('hourOut').textContent = `${String(hh).padStart(2, '0')}:${String(Math.round((h - hh) * 60)).padStart(2, '0')}`;
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    // A direction at plan bearing β (clockwise from "up") points to compass bearing β − north.
    const f = facing(p);
    const bearingOf = (Math.atan2(f.dir[0], -f.dir[1]) / DEG - p.north + 720) % 360;
    $('northLabel').textContent = f.label;
    $('northOut').textContent = dirs[Math.round(bearingOf / 45) % 8]!;
    const azimuth = 90 + ((h - 6) / 12) * 180; // east at 6:00, south at noon, west at 18:00
    const elev = Math.max(4, Math.sin((Math.PI * (h - 6)) / 12) * 72) * DEG;
    const bearing = (azimuth + p.north) * DEG; // clockwise from "up" on the plan
    const { cx, cz, r } = house.bounds;
    const d = 40;
    sun.position.set(
      cx + Math.sin(bearing) * Math.cos(elev) * d,
      Math.sin(elev) * d,
      cz - Math.cos(bearing) * Math.cos(elev) * d,
    );
    sun.target.position.set(cx, 0, cz);
    const k = smoothstep(4 * DEG, 40 * DEG, elev);
    // Daylight fades out between 17:40 and 19:15; after that only the light fittings light the home.
    const day = 1 - smoothstep(17.65, 19.25, h);
    sun.color.copy(warm).lerp(white, k);
    sun.intensity = (1 + 3 * k) * day;
    hemi.intensity = (0.5 + 0.25 * k) * Math.max(day, 0.08);
    hemi.color.copy(nightSky).lerp(daySky, day);
    scene.environmentIntensity = 0.06 * Math.max(day, 0.12);
    renderer.toneMappingExposure = 1 + (1 - day) * 0.35;
    const lights = p.lights ?? { on: false, kelvin: 3000 };
    const [lr, lg, lb] = kelvinColor(lights.kelvin);
    // The eye adapts to warm light: tint white towards the colour temperature instead of using it raw.
    lampColor.setRGB(lr, lg, lb, SRGBColorSpace).lerp(white0, 0.45);
    house.setLights(lights.on || day < 0.5, lampColor, lightCap);
    look.setDaylight(day);
    look.setSun(sunDir.copy(sun.position).sub(sun.target.position).normalize(), elev);
    Object.assign(sun.shadow.camera, { left: -r - 3, right: r + 3, top: r + 3, bottom: -r - 3, near: 1, far: 90 });
    sun.shadow.camera.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
    loop.invalidate();
  };
  hourIn.addEventListener('input', updateSun);
  northIn.addEventListener('input', () => {
    getPlan().north = Number(northIn.value);
    updateSun();
    redraw2d(); // the plan's north arrow
  });

  /* ---------- Walking ---------- */
  let solids = solidsOf(getPlan());
  const walker = new Walker(
    camera,
    canvas,
    $('joy'),
    () => solids,
    () => loop.invalidate(),
    () => setMode('dollhouse'),
  );
  let walkerMoved = false; // looking around without walking still turns the 2D marker
  canvas.addEventListener('pointermove', () => mode === 'walk' && (walkerMoved = true));
  /** Starts in the largest room, looking towards the middle of the home. */
  const enterWalk = () => {
    const rooms = getRooms();
    const big = [...rooms].sort((a, b) => b.area - a.area)[0];
    const [x, z] = big?.centroid ?? [house.bounds.cx, house.bounds.cz];
    const { cx, cz } = house.bounds;
    const yaw = Math.atan2(-(cx - x), -(cz - z) || -1);
    walker.enter(x, z, Number.isFinite(yaw) ? yaw : 0);
  };

  /* ---------- View modes: orbit, dollhouse cut-away, walk ---------- */
  let mode: 'orbit' | 'dollhouse' | 'walk' = 'dollhouse';
  const setMode = (m: typeof mode) => {
    const was = mode;
    mode = m;
    for (const b of document.querySelectorAll<HTMLElement>('[data-view]'))
      b.setAttribute('aria-pressed', String(b.dataset.view === m));
    viewer.classList.toggle('walking', m === 'walk');
    house.setCeilings(m === 'walk');
    // Ceiling and wall fittings would float over the cut-away walls of the dollhouse: show them in orbit and walk.
    house.setFixturesShown(m !== 'dollhouse');
    if (m === 'walk' && was !== 'walk') {
      controls.enabled = false;
      camera.fov = 68;
      camera.updateProjectionMatrix();
      solids = solidsOf(getPlan());
      enterWalk();
      redraw2d();
      canvas.focus({ preventScroll: true });
    } else if (m !== 'walk' && was === 'walk') {
      walker.exit();
      redraw2d();
      controls.enabled = true;
      camera.fov = 38;
      camera.updateProjectionMatrix();
      frame();
    }
    renderer.shadowMap.needsUpdate = true;
    loop.invalidate();
  };
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]'))
    b.addEventListener('click', () => setMode(b.dataset.view as typeof mode));
  const view = new Vector3();
  const cutWalls = (dt: number) => {
    const { cx, cz, r } = house.bounds;
    view.set(camera.position.x - cx, 0, camera.position.z - cz).normalize();
    let moving = false;
    for (const w of house.walls) {
      const front = (w.mid[0] - cx) * view.x + (w.mid[1] - cz) * view.z > r * 0.08;
      const facing = Math.abs(w.normal[0] * view.x + w.normal[1] * view.z) > 0.3;
      // Railings are already low enough to see over.
      const goal = mode === 'dollhouse' && front && facing && !w.rail ? 1 : 0;
      const next = reduce ? goal : damp(w.cut, goal, 8, dt);
      if (Math.abs(next - w.cut) > 1e-4) {
        w.cut = Math.abs(next - goal) < 0.002 ? goal : next;
        w.group.scale.y = 1 - 0.86 * w.cut;
        for (const o of w.openings) o.visible = w.cut < 0.5;
        moving = true;
      }
    }
    if (moving) renderer.shadowMap.needsUpdate = true;
    return moving;
  };

  /* ---------- Loop ---------- */
  const loop = new RenderLoop(
    (dt) => {
      const cutting = cutWalls(dt);
      const moving = mode === 'walk' ? walker.update(dt) : controls.update(dt);
      if (mode === 'walk' && (moving || walkerMoved)) redraw2d();
      walkerMoved = false;
      try {
        look.render();
      } catch (err) {
        console.error('3D frame failed', err);
      }
      return cutting || moving;
    },
    { target: viewer, demand: true },
  );
  controls.addEventListener('change', () => loop.invalidate());
  // The GPU can drop the 3D view (memory pressure, a driver reset): say so rather than leave a blank panel.
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    toast('The 3D view lost its graphics context. Reload the page to bring it back.', 8000);
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => loop.invalidate());
  // Library models arrive after their placeholders: draw them (and their shadows) as they come.
  onModelLoaded(() => {
    renderer.shadowMap.needsUpdate = true;
    loop.invalidate();
  });
  let touched = false; // stop re-framing on resize once the visitor has moved the camera
  controls.addEventListener('start', () => (touched = true));
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = viewer;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    look.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!touched) frame();
    loop.invalidate();
  };
  new ResizeObserver(resize).observe(viewer);

  /* ---------- Picking: click furniture or a floor in 3D ---------- */
  const ray = new Raycaster();
  const ndc = new Vector2();
  let down: { x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => (down = e.button === 0 ? { x: e.clientX, y: e.clientY } : null));
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
    down = null;
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const shown = (o: Object3D | null): boolean => !o || (o.visible && shown(o.parent));
    for (const hit of ray.intersectObject(house.root, true)) {
      if (!shown(hit.object)) continue;
      const m = hit.object as Mesh;
      if ((m.material as MeshStandardMaterial).colorWrite === false) continue;
      if (hit.object.userData.item) return onPick({ kind: 'item', id: hit.object.userData.item as string });
      if (hit.object.userData.room) return onPick({ kind: 'room', id: hit.object.userData.room as string });
      return;
    }
    onPick(null);
  });

  return {
    sync() {
      const p = getPlan();
      // The slider follows the plan (a new or reopened plan brings its own orientation).
      if (Number(northIn.value) !== (p.north ?? 0)) northIn.value = String(p.north ?? 0);
      const floors = storeysOf(p);
      const here = floors.findIndex((f) => f.active);
      // Walls rise to the floor above (or the top floor's own height), so a 2.6 m mezzanine reads lower than a 3.45 m
      // top floor.
      house.wallHeight = storeyHeight(p, here);
      const rebuilt = house.syncStructure(p, getRooms(), floorOpenings(floors, here), ceilingOpenings(floors, here));
      // Furniture and the other floors are drawn on their own: a failure there leaves the walls and floors standing.
      try {
        house.syncItems(p);
        syncStoreys(p);
      } catch (err) {
        console.error('3D furniture or floors failed', err);
      }
      if (rebuilt && !framed && house.walls.length) {
        frame();
        framed = true;
      }
      if (rebuilt) {
        updateSun();
        solids = solidsOf(p);
      }
      renderer.shadowMap.needsUpdate = true;
      loop.invalidate();
    },
    walker: () => walker.pose,
    /** Re-applies the sun and the lighting after the plan's lighting settings change. */
    relight: () => updateSun(),
    /** Frame the whole home again after the plan is replaced. */
    reframe() {
      touched = false;
      framed = false;
      if (mode === 'walk') setMode('dollhouse');
    },
    /** Renders a frame and reads it back as a PNG (in the same task, before the buffer is cleared). */
    snapshot() {
      return new Promise<Blob | null>((resolve) => {
        look.render();
        canvas.toBlob(resolve, 'image/png');
      });
    },
    select(sel: Selection | null) {
      house.select(getPlan(), sel?.kind === 'item' ? sel.id : null);
      loop.invalidate();
    },
    async start() {
      setMode(mode);
      resize();
      updateSun();
      await precompile(renderer, scene, camera);
      loop.start();
      viewer.classList.add('ready');
    },
  };
}

/**
 * Arrow-key navigation for the toolbar: native `focusgroup` where the browser has it (set here because Astro's
 * attribute types don't know it yet), otherwise a roving tab stop.
 */
function rovingToolbar(bar: HTMLElement) {
  bar.setAttribute('focusgroup', 'toolbar wrap');
  if ('focusGroup' in HTMLElement.prototype) return;
  const items = [...bar.querySelectorAll<HTMLButtonElement>('button')];
  items.forEach((b, i) => (b.tabIndex = i ? -1 : 0));
  bar.addEventListener('focusin', ({ target }) => {
    if (items.includes(target as HTMLButtonElement)) items.forEach((b) => (b.tabIndex = b === target ? 0 : -1));
  });
  bar.addEventListener('keydown', (e) => {
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const rtl = getComputedStyle(bar).direction === 'rtl';
    const steps: Record<string, number> = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 };
    let next = -1;
    if (e.key in steps) next = (i + steps[e.key]! + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    items[next]!.focus();
  });
}
