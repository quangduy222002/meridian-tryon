/**
 * Studio: author a build guide on top of the same scene. Steps are an ordered list; each step moves some parts home.
 * The selected part sits at its start position with a move gizmo, so dragging it sets where it flies in from.
 * Loaded only when the studio tab is opened (it brings TransformControls in its own chunk).
 */
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { $, toast } from '../../lib/dom/chrome';
import type { AssemblyApi } from './app';
import {
  DEFAULT_OFFSETS,
  SAMPLE_GUIDE,
  TOOLS,
  cloneGuide,
  newId,
  type Guide,
  type Step,
  type ToolId,
  type Vec3,
} from './guide';
import type { Part } from './parts';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const pad = (n: number) => String(n).padStart(2, '0');
const round = (n: number) => Math.round(n * 100) / 100;

const DIRS: { id: string; label: string; v: Vec3 }[] = [
  { id: 'side', label: 'Open side', v: [0, 0, 1] },
  { id: 'top', label: 'Above', v: [0, 1, 0] },
  { id: 'front', label: 'Front', v: [-1, 0, 0] },
  { id: 'rear', label: 'Rear', v: [1, 0, 0] },
  { id: 'home', label: 'In place', v: [0, 0, 0] },
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
      <span>Parts in this step</span>
      <div id="stParts" class="st-chips"></div>
      <select id="stAddPart" aria-label="Add a part to this step"></select>
    </div>
    <div id="stPart" class="st-part" hidden>
      <p><b id="stPartName"></b> flies in from</p>
      <div class="st-dirs" id="stDirs"></div>
      <output id="stOffset"></output>
      <small>Or drag the arrows on the part in the 3D view.</small>
    </div>
    <div class="st-row">
      <button type="button" id="stView">Use current camera</button>
      <button type="button" id="stPreview" class="primary">Preview step</button>
    </div>
  </section>
  <p class="st-hint">Click a part in 3D to select it. Glowing outlines are parts that aren't in any step yet — click one to add it to the current step.</p>
</div>`;

export function startStudio(api: AssemblyApi) {
  const panel = $('studio');
  panel.innerHTML = TEMPLATE;
  const g = () => api.guide();
  const step = (): Step | undefined => g().steps[api.current()];
  let selected: Part | null = null;
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
    if (!selected) return;
    const p = selected.group.position;
    g().offsets[selected.id] = [
      round(p.x - selected.home.x),
      round(p.y - selected.home.y),
      round(p.z - selected.home.z),
    ];
    renderOffset();
  });

  const attach = () => {
    const s = step();
    if (isOpen && selected && s?.parts.includes(selected.id) && api.isEditing()) gizmo.attach(selected.group);
    else gizmo.detach();
    api.invalidate();
  };

  /* ---------- Rendering ---------- */
  const renderSteps = () => {
    const cur = api.current();
    $('stCount').textContent = String(g().steps.length);
    $('stSteps').innerHTML = g()
      .steps.map(
        (s, i) => `<li class="${i === cur ? 'on' : ''}">
  <button type="button" class="st-sel" data-i="${i}"><span>${pad(i + 1)}</span><b>${esc(s.title || 'Untitled step')}</b><small>${s.parts.length} part${s.parts.length === 1 ? '' : 's'}</small></button>
  <div class="st-ops">
    <button type="button" data-op="up" data-i="${i}" aria-label="Move step ${i + 1} up" ${i === 0 ? 'disabled' : ''}>↑</button>
    <button type="button" data-op="down" data-i="${i}" aria-label="Move step ${i + 1} down" ${i === g().steps.length - 1 ? 'disabled' : ''}>↓</button>
    <button type="button" data-op="del" data-i="${i}" aria-label="Delete step ${i + 1}">✕</button>
  </div>
</li>`,
      )
      .join('');
  };
  const renderOffset = () => {
    if (!selected) return;
    const o = g().offsets[selected.id] ?? [0, 0, 0];
    $('stOffset').textContent = `x ${o[0].toFixed(2)} · y ${o[1].toFixed(2)} · z ${o[2].toFixed(2)}`;
  };
  const renderEditor = () => {
    const s = step();
    $('stEditor').hidden = !s;
    $<HTMLInputElement>('stGuideTitle').value = g().title;
    if (!s) return;
    $('stEdNo').textContent = `${pad(api.current() + 1)} / ${pad(g().steps.length)}`;
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
      s.parts
        .map((id) => api.kit.byId.get(id))
        .filter((p): p is Part => !!p)
        .map(
          (p) =>
            `<span class="chip part${p === selected ? ' on' : ''}"><button type="button" data-part="${p.id}">${esc(p.name)}</button><button type="button" data-remove="${p.id}" aria-label="Remove ${esc(p.name)} from this step">✕</button></span>`,
        )
        .join('') || '<small class="st-empty">No parts yet — pick one below or click a ghost part.</small>';
    const stepOf = new Map<string, number>();
    g().steps.forEach((st, i) => st.parts.forEach((id) => stepOf.set(id, i)));
    $('stAddPart').innerHTML =
      '<option value="">+ Add a part…</option>' +
      api.kit.parts
        .filter((p) => !s.parts.includes(p.id))
        .map((p) => {
          const at = stepOf.get(p.id);
          return `<option value="${p.id}">${esc(p.name)}${at === undefined ? '' : ` (move from step ${at + 1})`}</option>`;
        })
        .join('');
    const inStep = !!selected && s.parts.includes(selected.id);
    $('stPart').hidden = !inStep;
    if (inStep && selected) {
      $('stPartName').textContent = selected.name;
      $('stDirs').innerHTML = DIRS.map((d) => `<button type="button" data-dir="${d.id}">${d.label}</button>`).join('');
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
  const assign = (p: Part, i: number) => {
    for (const s of g().steps) s.parts = s.parts.filter((id) => id !== p.id);
    g().steps[i]!.parts.push(p.id);
    g().offsets[p.id] ??= [...(DEFAULT_OFFSETS[p.id] ?? [0, 0, 2.4])];
    api.changed();
  };
  const select = (p: Part | null) => {
    selected = p;
    if (p) {
      const i = g().steps.findIndex((s) => s.parts.includes(p.id));
      if (i >= 0 && (i !== api.current() || !api.isEditing())) api.edit(i);
    }
    render();
  };
  const newStep = (title: string): Step => ({
    id: newId(),
    title,
    body: '',
    warning: '',
    tools: [],
    parts: [],
    view: api.captureView(),
  });

  /* ---------- Events ---------- */
  api.onStep = () => {
    if (selected && !step()?.parts.includes(selected.id)) selected = null;
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
    if (p && !g().steps.some((s) => s.parts.includes(p.id))) {
      if (!g().steps.length) {
        g().steps.push(newStep('Step 1'));
        api.changed();
      }
      assign(p, api.current());
      api.edit(api.current());
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
      s.parts = s.parts.filter((id) => id !== rm);
      if (selected?.id === rm) selected = null;
      edited();
      api.edit(api.current());
    } else if (pick) select(api.kit.byId.get(pick) ?? null);
  });
  $('stAddPart').addEventListener('change', (e) => {
    const sel = e.target as HTMLSelectElement;
    const p = api.kit.byId.get(sel.value);
    if (!p || !step()) return;
    assign(p, api.current());
    selected = p;
    api.edit(api.current());
  });
  $('stPart').addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-dir]');
    if (!b || !selected) return;
    const d = DIRS.find((x) => x.id === b.dataset.dir)!;
    const o = g().offsets[selected.id] ?? [0, 0, 0];
    const dist = Math.max(1.6, Math.hypot(...o));
    g().offsets[selected.id] = d.v.map((n) => round(n * dist)) as Vec3;
    api.edit(api.current());
    renderOffset();
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
    const fresh: Guide = { title: 'My build guide', offsets: { ...DEFAULT_OFFSETS }, steps: [] };
    fresh.steps.push(newStep('Step 1'));
    api.setGuide(fresh);
    toast('Blank guide — click the ghost parts to add them to steps');
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
