/**
 * Studio: author a build guide on top of the same scene. Steps are an ordered list; in each step some parts travel
 * from A to B, and a part can travel again in a later step (take the panel off, put it back). The selected part
 * shows a move gizmo at the end being edited, so dragging it sets A or B. An AI builder can write a whole step from
 * a sentence. Loaded only when the studio tab is opened (it brings TransformControls in its own chunk).
 */
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { DEG } from '@meridian/three-core/math';
import { $, toast } from '../../lib/dom/chrome';
import type { AssemblyApi } from './app';
import type { AiStep, Place } from './ai';
import {
  DEFAULT_OFFSETS,
  DEFAULT_VIEW,
  INSTALLED,
  SAMPLE_GUIDE,
  TOOLS,
  cloneGuide,
  defaultMove,
  endOf,
  lastPosition,
  newId,
  partsOf,
  type EndState,
  type Guide,
  type Move,
  type Step,
  type StepView,
  type ToolId,
  type Vec3,
} from './guide';
import type { Part } from './parts';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const pad = (n: number) => String(n).padStart(2, '0');
const round = (n: number) => Math.round(n * 100) / 100;
const KEY_STORE = 'forge.anthropicKey';
/** Roomcraft saves the same key under the site-wide name; either works here. */
const SHARED_KEY = 'meridian.anthropicKey';

/** Side presets for either end of a move (directions from the installed position). */
const SIDES: { id: string; label: string; v: Vec3 }[] = [
  { id: 'open side', label: 'Open side', v: [0, 0, 1] },
  { id: 'above', label: 'Above', v: [0, 1, 0] },
  { id: 'front', label: 'Front', v: [-1, 0, 0] },
  { id: 'rear', label: 'Rear', v: [1, 0, 0] },
];

const TEMPLATE = `
<div class="st-scroll">
  <header class="st-head">
    <label class="st-label" for="stGuideTitle">Guide</label>
    <input id="stGuideTitle" class="st-title" maxlength="60" />
    <div class="st-row">
      <button type="button" id="stNew">New guide</button>
      <button type="button" id="stSample">Load sample</button>
      <button type="button" id="stPlay" class="primary">Play guide</button>
    </div>
  </header>
  <section class="st-ai">
    <h2>AI step builder</h2>
    <textarea id="aiPrompt" rows="3" placeholder="Describe a step, e.g. “Slide the graphics card in from the open side. Warn that it is heavy. Needs a screwdriver.”"></textarea>
    <div class="st-row">
      <button type="button" id="aiGo" class="primary">Generate step</button>
      <button type="button" id="aiKeyBtn" aria-expanded="false" aria-controls="aiKeyBox">API key</button>
    </div>
    <form id="aiKeyBox" class="st-key" hidden>
      <input id="aiKeyIn" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" aria-label="Anthropic API key" />
      <div class="st-row">
        <button type="submit" id="aiKeySave">Save key</button>
        <button type="button" id="aiKeyForget">Forget</button>
      </div>
      <small>Your Anthropic API key stays in this browser and goes straight to Anthropic; usage is billed to it.</small>
    </form>
    <p id="aiStatus" class="st-ai-status" aria-live="polite"></p>
  </section>
  <section>
    <h2>Steps <span id="stCount"></span></h2>
    <ol id="stSteps" class="st-steps"></ol>
    <button type="button" id="stAdd" class="st-add">+ Add step</button>
  </section>
  <section id="stEditor" class="st-editor">
    <h2>Step <span id="stEdNo"></span></h2>
    <label class="st-field">Title<input id="stTitle" maxlength="60" /></label>
    <label class="st-field">Instructions<textarea id="stBody" rows="4"></textarea></label>
    <label class="st-field">Warning <small>optional</small><input id="stWarn" maxlength="160" /></label>
    <div class="st-field"><span>Tools</span><div id="stTools" class="st-chips"></div></div>
    <div class="st-field">
      <span>Parts that move in this step</span>
      <div id="stParts" class="st-chips"></div>
      <select id="stAddPart" aria-label="Add a part to this step"></select>
    </div>
    <div id="stPart" class="st-part" hidden>
      <p><b id="stPartName"></b> moves from A to B</p>
      <div class="st-ab" role="group" aria-label="End to edit">
        <button type="button" data-end="A">A · start</button>
        <button type="button" data-end="B">B · end</button>
      </div>
      <div class="st-ab" role="group" aria-label="Gizmo">
        <button type="button" data-gizmo="translate">Move</button>
        <button type="button" data-gizmo="rotate">Rotate</button>
        <button type="button" data-gizmo="scale">Scale</button>
      </div>
      <div class="st-dirs" id="stDirs"></div>
      <div class="st-dirs">
        <button type="button" data-turn="0">Turn 90° X</button>
        <button type="button" data-turn="1">Turn 90° Y</button>
        <button type="button" data-turn="2">Turn 90° Z</button>
        <button type="button" data-reset="rot">Reset rotation</button>
        <button type="button" data-reset="scale">Reset scale</button>
      </div>
      <label class="st-check"><input type="checkbox" id="stHidden" /> Hidden at this end <small>(fades in or out)</small></label>
      <output id="stOffset"></output>
      <small>Or drag the gizmo on the part in the 3D view.</small>
    </div>
    <div class="st-row">
      <button type="button" id="stView">Use current camera</button>
      <button type="button" id="stPreview" class="primary">Preview step</button>
    </div>
  </section>
  <p class="st-hint">Click a part in 3D to select it. Outlined parts aren't in the guide yet — click one to add it to the current step.</p>
</div>`;

export function startStudio(api: AssemblyApi) {
  const panel = $('studio');
  panel.innerHTML = TEMPLATE;
  const g = () => api.guide();
  const step = (): Step | undefined => g().steps[api.current()];
  const moveOf = (s: Step | undefined, id: string | undefined) => s?.moves.find((m) => m.part === id);
  let selected: Part | null = null;
  let end: 'A' | 'B' = 'A';
  /** Writes part of the state of the end being edited (A or B) into a move. */
  const setEnd = (m: Move, v: Partial<EndState>) => {
    const a = end === 'A';
    if (v.pos) m[a ? 'from' : 'to'] = v.pos;
    if (v.rot) {
      if (v.rot.some((n) => n)) m[a ? 'fromRot' : 'toRot'] = v.rot;
      else delete m[a ? 'fromRot' : 'toRot'];
    }
    if (v.scale !== undefined) {
      if (v.scale !== 1) m[a ? 'fromScale' : 'toScale'] = v.scale;
      else delete m[a ? 'fromScale' : 'toScale'];
    }
    if (v.hidden !== undefined) {
      if (v.hidden) m[a ? 'fromHidden' : 'toHidden'] = true;
      else delete m[a ? 'fromHidden' : 'toHidden'];
    }
  };
  let isOpen = false;

  /* ---------- Gizmo ---------- */
  const gizmo = new TransformControls(api.camera, api.renderer.domElement);
  gizmo.setSpace('world');
  gizmo.setSize(0.85);
  const helper = gizmo.getHelper();
  api.scene.add(helper);
  gizmo.addEventListener('change', () => api.invalidate());
  gizmo.addEventListener('dragging-changed', (e) => {
    api.controls.enabled = !e.value;
  });
  gizmo.addEventListener('objectChange', () => {
    const m = moveOf(step(), selected?.id);
    if (!m || !selected) return;
    const grp = selected.group;
    const prev = endOf(m, end);
    if (gizmo.mode === 'translate') {
      const p = grp.position;
      setEnd(m, { pos: [round(p.x - selected.home.x), round(p.y - selected.home.y), round(p.z - selected.home.z)] });
    } else if (gizmo.mode === 'rotate') {
      const r = grp.rotation;
      setEnd(m, { rot: [r.x, r.y, r.z].map((n) => Math.round((n / DEG) * 10) / 10) as Vec3 });
    } else {
      // Keep scale uniform: follow whichever axis was dragged furthest.
      const axes = [grp.scale.x, grp.scale.y, grp.scale.z];
      const k = axes.reduce(
        (best, v) => (Math.abs(v - prev.scale) > Math.abs(best - prev.scale) ? v : best),
        prev.scale,
      );
      const sc = Math.min(5, Math.max(0.05, round(k)));
      grp.scale.setScalar(sc);
      setEnd(m, { scale: sc });
    }
    renderOffset();
  });

  const attach = () => {
    const ok = isOpen && selected && moveOf(step(), selected.id) && api.editing() === end;
    if (ok) gizmo.attach(selected!.group);
    else gizmo.detach();
    api.invalidate();
  };

  /* ---------- Rendering ---------- */
  const renderSteps = () => {
    const cur = api.current();
    $('stCount').textContent = String(g().steps.length);
    $('stSteps').innerHTML = g()
      .steps.map((s, i) => {
        const n = s.moves.length;
        return `<li class="${i === cur ? 'on' : ''}">
  <button type="button" class="st-sel" data-i="${i}"><span>${pad(i + 1)}</span><b>${esc(s.title || 'Untitled step')}</b><small>${n} part${n === 1 ? '' : 's'}</small></button>
  <div class="st-ops">
    <button type="button" data-op="up" data-i="${i}" aria-label="Move step ${i + 1} up" ${i === 0 ? 'disabled' : ''}>↑</button>
    <button type="button" data-op="down" data-i="${i}" aria-label="Move step ${i + 1} down" ${i === g().steps.length - 1 ? 'disabled' : ''}>↓</button>
    <button type="button" data-op="del" data-i="${i}" aria-label="Delete step ${i + 1}">✕</button>
  </div>
</li>`;
      })
      .join('');
  };
  const fmt = (e: EndState) => {
    const out = [e.pos.every((n) => n === 0) ? 'installed' : `at ${e.pos.map((n) => n.toFixed(1)).join(', ')}`];
    if (e.rot.some((n) => n)) out.push(`turned ${e.rot.map((n) => `${Math.round(n)}°`).join(' / ')}`);
    if (e.scale !== 1) out.push(`×${e.scale.toFixed(2)}`);
    if (e.hidden) out.push('hidden');
    return out.join(' · ');
  };
  const renderOffset = () => {
    const m = moveOf(step(), selected?.id);
    if (!m) return;
    $('stOffset').textContent = `A: ${fmt(endOf(m, 'A'))}\nB: ${fmt(endOf(m, 'B'))}`;
    $<HTMLInputElement>('stHidden').checked = endOf(m, end).hidden;
    for (const b of $('stPart').querySelectorAll<HTMLElement>('[data-gizmo]'))
      b.classList.toggle('on', b.dataset.gizmo === gizmo.mode);
  };
  const renderEditor = () => {
    const s = step();
    $('stEditor').hidden = !s;
    $<HTMLInputElement>('stGuideTitle').value = g().title;
    if (!s) return;
    const cur = api.current();
    $('stEdNo').textContent = `${pad(cur + 1)} / ${pad(g().steps.length)}`;
    $<HTMLInputElement>('stTitle').value = s.title;
    $<HTMLTextAreaElement>('stBody').value = s.body;
    $<HTMLInputElement>('stWarn').value = s.warning;
    $('stTools').innerHTML = (Object.keys(TOOLS) as ToolId[])
      .map(
        (id) =>
          `<button type="button" class="chip${s.tools.includes(id) ? ' on' : ''}" data-tool="${id}" aria-pressed="${s.tools.includes(id)}">${TOOLS[id].label}</button>`,
      )
      .join('');
    $('stParts').innerHTML =
      s.moves
        .map((m) => api.kit.byId.get(m.part))
        .filter((p): p is Part => !!p)
        .map(
          (p) =>
            `<span class="chip part${p === selected ? ' on' : ''}"><button type="button" data-part="${p.id}">${esc(p.name)}</button><button type="button" data-remove="${p.id}" aria-label="Remove ${esc(p.name)} from this step">✕</button></span>`,
        )
        .join('') || '<small class="st-empty">No parts yet — pick one below or click an outlined part.</small>';
    const stepsOf = (id: string) =>
      g()
        .steps.map((st, i) => (partsOf(st).includes(id) ? i + 1 : 0))
        .filter(Boolean);
    $('stAddPart').innerHTML =
      '<option value="">+ Add a part…</option>' +
      api.kit.parts
        .filter((p) => !moveOf(s, p.id))
        .map((p) => {
          const at = stepsOf(p.id);
          return `<option value="${p.id}">${esc(p.name)}${at.length ? ` (also in step ${at.join(', ')})` : ''}</option>`;
        })
        .join('');
    const m = moveOf(s, selected?.id);
    $('stPart').hidden = !m;
    if (m && selected) {
      $('stPartName').textContent = selected.name;
      for (const b of $('stPart').querySelectorAll<HTMLElement>('[data-end]')) {
        b.classList.toggle('on', b.dataset.end === end);
        b.setAttribute('aria-pressed', String(b.dataset.end === end));
      }
      const extra =
        end === 'A'
          ? `<button type="button" data-dir="previous">Where it was</button>`
          : `<button type="button" data-dir="aside">Set aside</button>`;
      $('stDirs').innerHTML =
        `<button type="button" data-dir="installed">Installed</button>` +
        SIDES.map((d) => `<button type="button" data-dir="${d.id}">${d.label}</button>`).join('') +
        extra;
      renderOffset();
    }
  };
  const render = () => {
    renderSteps();
    renderEditor();
    attach();
  };

  /* ---------- Editing helpers ---------- */
  const edited = () => {
    api.changed();
    renderSteps();
  };
  const addToStep = (p: Part, i: number) => {
    const s = g().steps[i]!;
    if (!moveOf(s, p.id)) s.moves.push(defaultMove(g(), p.id, i));
    api.changed();
  };
  /** Offset for a named place, relative to the part's installed position. */
  const placeOffset = (p: Part, place: Place | string, at: number, dist?: number): Vec3 => {
    if (place === 'installed') return [...INSTALLED];
    if (place === 'previous' || place === 'previous position')
      return [...(lastPosition(g(), p.id, at) ?? DEFAULT_OFFSETS[p.id] ?? [0, 0, 2.4])];
    if (place === 'aside' || place === 'set aside') return [round(5.4 - p.home.x), 0, round(0.8 + 1.17 - p.home.z)];
    const side = SIDES.find((d) => d.id === place) ?? SIDES[0]!;
    const d = dist ?? Math.max(1.6, Math.hypot(...(DEFAULT_OFFSETS[p.id] ?? [0, 0, 2.4])));
    return side.v.map((n) => round(n * d)) as Vec3;
  };
  const select = (p: Part | null) => {
    selected = p;
    if (p && !moveOf(step(), p.id)) {
      // Jump to the latest step up to here that moves this part, else its first step.
      const steps = g().steps;
      let i = -1;
      for (let k = Math.min(api.current(), steps.length - 1); k >= 0 && i < 0; k--) if (moveOf(steps[k], p.id)) i = k;
      if (i < 0) i = steps.findIndex((s) => moveOf(s, p.id));
      if (i >= 0) api.edit(i, end);
    } else if (p && api.editing() !== end) api.edit(api.current(), end);
    render();
  };
  const newStep = (title: string, view: StepView = api.captureView()): Step => ({
    id: newId(),
    title,
    body: '',
    warning: '',
    tools: [],
    moves: [],
    view,
  });

  /* ---------- Events ---------- */
  api.onStep = () => {
    if (selected && !moveOf(step(), selected.id)) selected = null;
    end = api.editing() ?? end; // e.g. a preview hands back at A
    if (isOpen) render();
  };

  // Click to select (ignored when the pointer moved, i.e. an orbit, or when grabbing the gizmo).
  const canvas = api.renderer.domElement;
  let down: { x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    down = isOpen && !gizmo.dragging && gizmo.axis === null ? { x: e.clientX, y: e.clientY } : null;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    down = null;
    const p = api.pick(e.clientX, e.clientY);
    if (p && !g().steps.some((s) => moveOf(s, p.id))) {
      if (!g().steps.length) {
        g().steps.push(newStep('Step 1'));
        api.changed();
      }
      addToStep(p, api.current());
      end = 'A';
      api.edit(api.current(), end);
      toast(`${p.name} added to step ${api.current() + 1}`);
    }
    select(p);
  });

  $('stSteps').addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button[data-i]');
    if (!b) return;
    const i = Number(b.dataset.i);
    const steps = g().steps;
    const op = b.dataset.op;
    if (!op) {
      selected = null;
      api.edit(i);
      return;
    }
    if (op === 'del') {
      steps.splice(i, 1);
      api.changed();
      api.edit(Math.min(i, steps.length - 1));
    } else {
      const j = op === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= steps.length) return;
      [steps[i], steps[j]] = [steps[j]!, steps[i]!];
      api.changed();
      api.edit(j);
    }
    render();
  });
  $('stAdd').addEventListener('click', () => {
    const at = g().steps.length ? api.current() + 1 : 0;
    g().steps.splice(at, 0, newStep(`Step ${at + 1}`));
    selected = null;
    api.changed();
    api.edit(at);
    $<HTMLInputElement>('stTitle').select();
  });
  $('stGuideTitle').addEventListener('input', (e) => {
    g().title = (e.target as HTMLInputElement).value;
    api.changed();
  });
  $('stTitle').addEventListener('input', (e) => {
    const s = step();
    if (!s) return;
    s.title = (e.target as HTMLInputElement).value;
    edited();
  });
  $('stBody').addEventListener('input', (e) => {
    const s = step();
    if (s) s.body = (e.target as HTMLTextAreaElement).value;
    api.changed();
  });
  $('stWarn').addEventListener('input', (e) => {
    const s = step();
    if (s) s.warning = (e.target as HTMLInputElement).value;
    api.changed();
  });
  $('stTools').addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-tool]');
    const s = step();
    if (!b || !s) return;
    const id = b.dataset.tool as ToolId;
    s.tools = s.tools.includes(id) ? s.tools.filter((x) => x !== id) : [...s.tools, id];
    api.changed();
    renderEditor();
  });
  $('stParts').addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const s = step();
    if (!s) return;
    const rm = t.closest<HTMLElement>('[data-remove]')?.dataset.remove;
    const pick = t.closest<HTMLElement>('[data-part]')?.dataset.part;
    if (rm) {
      s.moves = s.moves.filter((m) => m.part !== rm);
      if (selected?.id === rm) selected = null;
      edited();
      api.edit(api.current(), end);
    } else if (pick) select(api.kit.byId.get(pick) ?? null);
  });
  $('stAddPart').addEventListener('change', (e) => {
    const sel = e.target as HTMLSelectElement;
    const p = api.kit.byId.get(sel.value);
    if (!p || !step()) return;
    addToStep(p, api.current());
    selected = p;
    end = 'A';
    api.edit(api.current(), end);
  });
  $('stPart').addEventListener('click', (e) => {
    const t = e.target as Element;
    const m = moveOf(step(), selected?.id);
    if (!m || !selected) return;
    const endBtn = t.closest<HTMLElement>('[data-end]');
    if (endBtn) {
      end = endBtn.dataset.end as 'A' | 'B';
      api.edit(api.current(), end);
      return;
    }
    const gz = t.closest<HTMLElement>('[data-gizmo]')?.dataset.gizmo;
    if (gz) {
      gizmo.setMode(gz as 'translate' | 'rotate' | 'scale');
      gizmo.setSpace(gz === 'scale' ? 'local' : 'world');
      renderOffset();
      return;
    }
    const state = endOf(m, end);
    const turn = t.closest<HTMLElement>('[data-turn]')?.dataset.turn;
    const reset = t.closest<HTMLElement>('[data-reset]')?.dataset.reset;
    const dir = t.closest<HTMLElement>('[data-dir]')?.dataset.dir;
    if (turn !== undefined) {
      const rot = [...state.rot] as Vec3;
      rot[Number(turn)] = ((rot[Number(turn)]! + 90 + 180) % 360) - 180;
      setEnd(m, { rot });
    } else if (reset === 'rot') setEnd(m, { rot: [0, 0, 0] });
    else if (reset === 'scale') setEnd(m, { scale: 1 });
    else if (dir) {
      const dist = Math.hypot(...state.pos) > 0.3 ? Math.hypot(...state.pos) : undefined;
      setEnd(m, { pos: placeOffset(selected, dir, api.current(), dist) });
    } else return;
    api.edit(api.current(), end);
  });
  $('stHidden').addEventListener('change', (e) => {
    const m = moveOf(step(), selected?.id);
    if (!m) return;
    setEnd(m, { hidden: (e.target as HTMLInputElement).checked });
    api.edit(api.current(), end);
  });
  $('stView').addEventListener('click', () => {
    const s = step();
    if (!s) return;
    s.view = api.captureView();
    toast(`Camera saved for step ${api.current() + 1}`);
  });
  $('stPreview').addEventListener('click', () => {
    if (!step()) return;
    gizmo.detach();
    api.preview(api.current());
  });
  $('stNew').addEventListener('click', () => {
    selected = null;
    const fresh: Guide = { title: 'My build guide', steps: [] };
    fresh.steps.push(newStep('Step 1'));
    api.setGuide(fresh);
    toast('Blank guide — click the outlined parts, or describe a step to the AI');
  });
  $('stSample').addEventListener('click', () => {
    selected = null;
    api.setGuide(cloneGuide(SAMPLE_GUIDE));
    toast('Sample guide loaded');
  });
  $('stPlay').addEventListener('click', () => {
    if (!g().steps.length) return toast('Add a step first');
    void api.setMode('guide').then(() => api.playFrom(0));
  });

  /* ---------- AI step builder ---------- */
  const readKey = () => {
    try {
      return localStorage.getItem(KEY_STORE) ?? localStorage.getItem(SHARED_KEY) ?? '';
    } catch {
      return '';
    }
  };
  let apiKey = readKey();
  const keyBox = $('aiKeyBox');
  const status = $('aiStatus');
  const setKeyBox = (open: boolean) => {
    keyBox.hidden = !open;
    $('aiKeyBtn').setAttribute('aria-expanded', String(open));
    $('aiKeyBtn').textContent = apiKey ? 'API key ✓' : 'API key';
    if (open) $<HTMLInputElement>('aiKeyIn').focus();
  };
  setKeyBox(false);
  $('aiKeyBtn').addEventListener('click', () => setKeyBox(keyBox.hidden));
  // A form, so Enter in the key field saves it too.
  keyBox.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $<HTMLInputElement>('aiKeyIn').value.trim();
    if (!v) return;
    apiKey = v;
    try {
      localStorage.setItem(KEY_STORE, v);
    } catch {
      // Private mode: the key still works for this visit.
    }
    $<HTMLInputElement>('aiKeyIn').value = '';
    setKeyBox(false);
    status.textContent = 'Key saved in this browser.';
  });
  $('aiKeyForget').addEventListener('click', () => {
    apiKey = '';
    try {
      localStorage.removeItem(KEY_STORE);
    } catch {
      // nothing stored
    }
    setKeyBox(false);
    status.textContent = 'Key removed.';
  });

  /** Camera for an AI step: wide shot, or a close-up on where the moved parts end up. */
  const aiView = (moves: Move[], kind: AiStep['camera']): StepView => {
    if (kind === 'wide' || !moves.length) return structuredClone(DEFAULT_VIEW);
    const c = [0, 0, 0];
    for (const m of moves) {
      const p = api.kit.byId.get(m.part)!;
      c[0] += p.home.x + p.center.x + m.to[0];
      c[1] += p.home.y + p.center.y + m.to[1];
      c[2] += p.home.z + p.center.z + m.to[2];
    }
    const target = c.map((n) => round(n / moves.length)) as Vec3;
    const dir = [0.45, 0.38, 0.81];
    return { target, pos: target.map((n, i) => round(n + dir[i]! * 4.6)) as Vec3 };
  };

  const go = $<HTMLButtonElement>('aiGo');
  go.addEventListener('click', async () => {
    const request = $<HTMLTextAreaElement>('aiPrompt').value.trim();
    if (!request) {
      status.textContent = 'Describe the step first.';
      return;
    }
    if (!apiKey) {
      status.textContent = 'Add your Anthropic API key to use the AI builder.';
      setKeyBox(true);
      return;
    }
    const at = g().steps.length ? api.current() + 1 : 0;
    go.disabled = true;
    status.textContent = 'Writing the step…';
    panel.classList.add('ai-busy');
    try {
      const { generateStep } = await import('./ai');
      const where = (id: string) => {
        const v = lastPosition(g(), id, at);
        if (!v) return 'not in the build yet';
        return v.every((n) => n === 0) ? 'installed' : 'off its installed position (taken off or set aside)';
      };
      const ai = await generateStep(apiKey, request, {
        parts: api.kit.parts.map((p) => ({ id: p.id, name: p.name, spec: p.spec, qty: p.qty, where: where(p.id) })),
        tools: (Object.keys(TOOLS) as ToolId[]).map((id) => ({ id, label: TOOLS[id].label })),
        steps: g().steps.map((s) => ({ title: s.title, parts: partsOf(s) })),
        at,
      });
      const moves: Move[] = [];
      for (const m of ai.moves) {
        const p = api.kit.byId.get(m.part);
        if (!p || moves.some((x) => x.part === m.part)) continue;
        const dist = m.distance_cm > 0 ? Math.min(6, Math.max(0.5, m.distance_cm / 10)) : undefined;
        const mv: Move = {
          part: p.id,
          from: placeOffset(p, m.from, at, dist),
          to: placeOffset(p, m.to, at, dist),
        };
        // Continuing from where it was keeps the turn, size and visibility it ended the last step with.
        const carried = m.from === 'previous position' ? defaultMove(g(), p.id, at) : undefined;
        const turn = m.turn_at_start_deg ?? { x: 0, y: 0, z: 0 };
        const rot: Vec3 = [turn.x, turn.y, turn.z].map((n) => Math.round(Number(n) || 0)) as Vec3;
        if (rot.some((n) => n)) mv.fromRot = rot;
        else if (carried?.fromRot) mv.fromRot = carried.fromRot;
        const sc = Number(m.scale_at_start);
        if (sc > 0 && sc !== 1) mv.fromScale = Math.min(5, Math.max(0.05, sc));
        else if (carried?.fromScale) mv.fromScale = carried.fromScale;
        if (m.hidden_at_start || carried?.fromHidden) mv.fromHidden = true;
        if (m.hidden_at_end) mv.toHidden = true;
        moves.push(mv);
      }
      const s: Step = {
        ...newStep(ai.title, aiView(moves, ai.camera)),
        body: ai.body,
        warning: ai.warning,
        tools: ai.tools,
        moves,
      };
      g().steps.splice(at, 0, s);
      selected = null;
      end = 'A';
      api.changed();
      api.edit(at);
      api.reframe();
      api.preview(at);
      $<HTMLTextAreaElement>('aiPrompt').value = '';
      status.textContent = `Added step ${at + 1}: ${ai.title}. Fine-tune it below.`;
    } catch (err) {
      status.textContent = err instanceof Error ? err.message : 'Something went wrong. Try again.';
    } finally {
      go.disabled = false;
      panel.classList.remove('ai-busy');
    }
  });

  return {
    open() {
      isOpen = true;
      panel.hidden = false;
      helper.visible = true;
      render();
    },
    close() {
      isOpen = false;
      panel.hidden = true;
      gizmo.detach();
      helper.visible = false;
      api.controls.enabled = true;
    },
  };
}
