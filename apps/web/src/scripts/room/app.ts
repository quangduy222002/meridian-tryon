/**
 * Roomcraft: a 2D floor-plan editor beside a live 3D model of the same plan. Every edit goes through commit(), which
 * records undo, re-detects rooms and syncs the 3D house; drags call preview() so the 3D view follows the pointer.
 */
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
  Scene,
  Vector2,
  Vector3,
  type Object3D,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  LIGHT_STUDIO,
  RenderLoop,
  bakeStudio,
  createRenderer,
  damp,
  generateTextures,
  getQuality,
  precompile,
  smoothstep,
} from '@meridian/three-core';
import { $, toast } from '../../lib/dom/chrome';
import { FLOORS, FURNITURE, WALLS } from './catalog';
import { PlanEditor, type EditorHost, type Selection, type Tool } from './editor2d';
import { House } from './house';
import {
  findRooms,
  len,
  pointInPoly,
  roomName,
  roomStyle,
  samplePlan,
  uid,
  wallEnds,
  type Plan,
  type Room,
} from './plan';
import { estimate } from './estimate';
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

export interface RoomcraftOptions {
  /** localStorage key for this page's autosave. */
  storageKey?: string;
  /** Start from this plan instead of a shared link / saved plan / sample. */
  plan?: Plan;
  underlay?: EditorHost['underlay'];
}

/** What a page embedding the workspace can do with it. */
export interface RoomcraftApi {
  plan(): Plan;
  rooms(): Room[];
  /** Replaces the plan (undoable) and frames it. */
  setPlan(p: Plan, message?: string): void;
  /** Records an edit made to plan() from outside (undo, save, redraw, 3D). */
  commit(message?: string): void;
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
    rooms = findRooms(plan);
    three?.sync();
    editor.draw();
    renderInspector();
  };
  const host: EditorHost = {
    underlay: opts.underlay,
    plan: () => plan,
    rooms: () => rooms,
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
  $('catGrid').innerHTML = Object.entries(FURNITURE)
    .map(
      ([type, d]) =>
        `<button type="button" data-type="${type}"><i style="background:${d.colors[0]}"></i>${esc(d.name)}<small>${(d.w * 100).toFixed(0)} × ${(d.d * 100).toFixed(0)} cm</small></button>`,
    )
    .join('');
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
        html = `<h2>${esc(def.name)}<small>${(def.w * 100).toFixed(0)}×${(def.d * 100).toFixed(0)} cm</small></h2>
<div class="swatches" role="group" aria-label="Colour">${def.colors
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
        html = `<h2>${o.kind === 'door' ? 'Door' : 'Window'}<small>${(o.width * 100).toFixed(0)} cm</small></h2>
<label>Width<input type="range" data-act="width" min="0.6" max="2.4" step="0.05" value="${o.width}" /></label>
<div class="row">${o.kind === 'door' ? '<button type="button" class="btn" data-act="flip">Flip swing</button>' : ''}<button type="button" class="btn danger" data-act="del">Delete</button></div>`;
    } else if (sel?.kind === 'wall') {
      const w = p.walls.find((x) => x.id === sel.id);
      if (w) {
        const L = len(...wallEnds(p, w));
        html = `<h2>Wall<small>${L.toFixed(2)} m</small></h2>
<div class="row" role="group" aria-label="Thickness">${[0.1, 0.15, 0.2, 0.25]
          .map(
            (t) =>
              `<button type="button" class="btn" data-thick="${t}" aria-pressed="${Math.abs(w.thick - t) < 0.001}">${t * 100} cm</button>`,
          )
          .join('')}</div>
<div class="row"><button type="button" class="btn danger" data-act="del">Delete wall</button></div>`;
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
                `<button type="button" class="finish" data-${kind}="${k}" aria-pressed="${st[kind] === k}"><i style="background:${f.color}"></i>${esc(f.name)}<small>$${f.price}/m²</small></button>`,
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
    } else if (b.dataset.color) {
      const it = p.items.find((i) => i.id === sel.id);
      if (it) it.color = b.dataset.color;
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

  /* ---------- Estimate ---------- */
  const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
  $('estimateBtn').addEventListener('click', () => {
    const e = estimate(plan, rooms);
    $('estBody').innerHTML = `<div class="est-totals">
  <div><small>Floor area</small><b>${e.totalArea.toFixed(1)} m²</b></div>
  <div><small>Finishes</small><b>${usd(e.finishes)}</b></div>
  <div><small>Furniture</small><b>${usd(e.furnitureTotal)}</b></div>
  <div><small>Total</small><b>${usd(e.total)}</b></div>
</div>
<div class="est-scroll"><table class="est">
  <caption class="sr-only">Rooms, finishes and costs</caption>
  <thead><tr><th scope="col">Room</th><th scope="col" class="n">Area</th><th scope="col">Floor</th><th scope="col">Walls</th><th scope="col" class="n">Cost</th></tr></thead>
  <tbody>${e.rooms
    .map(
      (r) =>
        `<tr><th scope="row">${esc(r.name)}</th><td class="n">${r.area.toFixed(1)} m²</td><td>${esc(r.floor.name)}<small>${usd(r.floor.cost)}</small></td><td>${esc(r.wall.name)}<small>${r.wallArea.toFixed(0)} m² · ${usd(r.wall.cost)}</small></td><td class="n">${usd(r.floor.cost + r.wall.cost)}</td></tr>`,
    )
    .join('')}</tbody>
</table></div>
<h3>Furniture, doors and windows</h3>
<div class="est-scroll"><table class="est">
  <tbody>${e.furniture
    .map(
      (f) =>
        `<tr><th scope="row">${esc(f.name)}</th><td class="n">× ${f.qty}</td><td class="n">${usd(f.cost)}</td></tr>`,
    )
    .join('')}
  <tr><th scope="row">Doors and windows</th><td class="n">${e.openings.doors} + ${e.openings.windows}</td><td class="n">${usd(e.openings.cost)}</td></tr></tbody>
  <tfoot><tr><td>Total</td><td></td><td class="n">${usd(e.total)}</td></tr></tfoot>
</table></div>`;
    $<HTMLDialogElement>('estimate').showModal();
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

  /* ---------- Snapshot ---------- */
  $('snapBtn').addEventListener('click', async () => {
    if (!three) return toast('3D needs WebGL');
    showPane('three');
    const blob = await three.snapshot();
    if (!blob) return toast('Could not take the picture');
    const file = new File([blob], 'roomcraft.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ files: [file], title: 'Roomcraft' });
        return;
      } catch {
        // Cancelled or unsupported: download instead.
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'roomcraft.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Snapshot saved');
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
    aiStatus.textContent = '';
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
    if (!apiKey) {
      aiStatus.textContent = 'Add your Anthropic API key to use the AI.';
      return setKeyBox(true);
    }
    const replace = $<HTMLInputElement>('aiReplace').checked;
    const inRoom = (x: number, z: number) => pointInPoly([x, z], room.poly);
    const keep = replace ? [] : plan.items.filter((i) => inRoom(i.x, i.z));
    go.setAttribute('aria-disabled', 'true');
    aiDlg.classList.add('busy');
    aiStatus.textContent = 'Arranging the room…';
    try {
      const { furnishRoom } = await import('./ai');
      const out = await furnishRoom(apiKey, request, plan, room, keep);
      if (replace) plan.items = plan.items.filter((i) => !inRoom(i.x, i.z));
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
  scene.environment = bakeStudio(renderer, LIGHT_STUDIO, '#ddd5c8');
  scene.environmentIntensity = 0.55;
  const hemi = new HemisphereLight('#fff6ea', '#b9ab98', 0.7);
  const sun = new DirectionalLight('#fff4e5', 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(hemi, sun, sun.target);
  const ground = new Mesh(new PlaneGeometry(200, 200), new MeshStandardMaterial({ color: '#e7e0d4', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.002;
  ground.receiveShadow = true;
  scene.add(ground);

  const house = new House(tex);
  scene.add(house.root);

  const camera = new PerspectiveCamera(38, 1, 0.1, 400);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = 1.45;
  controls.minDistance = 2;
  controls.maxDistance = 60;
  let framed = false;
  /** Frames the whole building, whatever the pane's shape. */
  const frame = () => {
    const { cx, cz, r } = house.bounds;
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
  const warm = new Color('#ffb067');
  const white = new Color('#fff4e5');
  const updateSun = () => {
    const p = getPlan();
    p.north = Number(northIn.value);
    const h = Number(hourIn.value);
    const hh = Math.floor(h);
    $('hourOut').textContent = `${String(hh).padStart(2, '0')}:${String(Math.round((h - hh) * 60)).padStart(2, '0')}`;
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    // The front of the plan (its bottom edge) faces the compass point opposite north.
    $('northOut').textContent = `${dirs[Math.round(((p.north + 180) % 360) / 45) % 8]}`;
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
    sun.color.copy(warm).lerp(white, k);
    sun.intensity = 0.6 + 2.4 * k;
    hemi.intensity = 0.35 + 0.45 * k;
    Object.assign(sun.shadow.camera, { left: -r - 3, right: r + 3, top: r + 3, bottom: -r - 3, near: 1, far: 90 });
    sun.shadow.camera.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
    loop.invalidate();
  };
  hourIn.addEventListener('input', updateSun);
  northIn.addEventListener('input', () => {
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
      const goal = mode === 'dollhouse' && front && facing ? 1 : 0;
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
      renderer.render(scene, camera);
      return cutting || moving;
    },
    { target: viewer, demand: true },
  );
  controls.addEventListener('change', () => loop.invalidate());
  let touched = false; // stop re-framing on resize once the visitor has moved the camera
  controls.addEventListener('start', () => (touched = true));
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = viewer;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
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
      const rebuilt = house.syncStructure(p, getRooms());
      house.syncItems(p);
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
    /** Frame the whole home again after the plan is replaced. */
    reframe() {
      touched = false;
      framed = false;
      if (mode === 'walk') setMode('dollhouse');
    },
    /** Renders a frame and reads it back as a PNG (in the same task, before the buffer is cleared). */
    snapshot() {
      return new Promise<Blob | null>((resolve) => {
        renderer.render(scene, camera);
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
