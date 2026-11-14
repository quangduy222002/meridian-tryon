/**
 * Forge build guide: plays a step-by-step PC assembly in 3D and hosts the studio that edits it.
 * The whole guide is one timeline t in [0, steps]: step i plays while t goes from i to i + 1, so scrubbing,
 * autoplay and the studio preview all share the same pose function.
 */
import {
  AmbientLight,
  Color,
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  ShaderMaterial,
  ShadowMaterial,
  NeutralToneMapping,
  Vector2,
  Vector3,
  type Object3D,
  type WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  RenderLoop,
  bakeStudio,
  clamp,
  createRenderer,
  damp,
  generateTextures,
  getQuality,
  precompile,
  type LightCard,
} from '@meridian/three-core';
import { $ } from '../../lib/dom/chrome';
import { assemblySpecs, type AssemblyTexture } from './textures';
import { buildParts, type Kit, type Part } from './parts';
import { globals } from './look';
import { DEFAULT_VIEW, SAMPLE_GUIDE, TOOLS, cloneGuide, type Guide, type StepView } from './guide';

export interface AssemblyApi {
  kit: Kit;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  renderer: WebGLRenderer;
  viewer: HTMLElement;
  guide(): Guide;
  /** Replace the whole guide (new / sample). */
  setGuide(g: Guide): void;
  /** Call after mutating the guide in place. */
  changed(): void;
  current(): number;
  /** Studio pose: earlier steps installed, step i's parts waiting at their start position. */
  edit(i: number): void;
  isEditing(): boolean;
  /** Play step i once, then return to its edit pose. */
  preview(i: number): void;
  /** Camera view to store on a step, normalised for the current layout. */
  captureView(): StepView;
  /** Fly the camera to the current step's view. */
  reframe(): void;
  pick(clientX: number, clientY: number): Part | null;
  invalidate(): void;
  setMode(m: 'guide' | 'studio'): Promise<void>;
  /** Autoplay the guide from step i. */
  playFrom(i: number): void;
  onStep: ((i: number) => void) | null;
}

interface Studio {
  open(): void;
  close(): void;
}

const STEP_SECONDS = 1.8;
const HOLD_MS = 1500;
/** Aspect ratio the stored step views were framed for. */
const REF_ASPECT = 1.25;
const ease = (q: number) => (q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2);
const pad = (n: number) => String(n).padStart(2, '0');
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Bright, soft product studio (same family as the chair and box demos). */
const STUDIO: LightCard[] = [
  { size: [10, 6], color: '#ffffff', intensity: 2.6, position: [0, 7, 3] },
  { size: [3, 6], color: '#fff4e8', intensity: 2.2, position: [-6, 2.5, 4] },
  { size: [3, 6], color: '#eef2fb', intensity: 1.3, position: [6, 2, -2] },
  { size: [16, 16], color: '#e8e0d4', intensity: 0.9, position: [0, -5, 0] },
  { size: [12, 6], color: '#f4efe7', intensity: 0.8, position: [0, 2, -8] },
];

export async function startAssembly() {
  const app = $('app');
  const viewer = $('viewer');
  const canvas = viewer.querySelector('canvas')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const quality = getQuality();
  const renderer = createRenderer(canvas, quality, {
    shadows: true,
    toneMapping: NeutralToneMapping,
    exposure: 1.0,
  });
  renderer.shadowMap.autoUpdate = false; // refreshed only when a part moves

  const tex = await generateTextures<{ size: number }, AssemblyTexture>({
    build: (p) => assemblySpecs(p.size),
    params: { size: Math.min(1024, quality.textureSize) },
    worker: () => new Worker(new URL('./textures.worker.ts', import.meta.url), { type: 'module' }),
    anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()),
    renderer,
  });

  /* ---------- Scene ---------- */
  const scene = new Scene();
  scene.environment = bakeStudio(renderer, STUDIO, '#ddd5c8');
  scene.environmentIntensity = 0.85;
  scene.add(new AmbientLight(0xffffff, 0.25));
  const sun = new DirectionalLight(0xfff2e2, 2.2);
  sun.position.set(4, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
  const fill = new DirectionalLight(0xdfe8ff, 0.5);
  fill.position.set(-6, 3, 4);
  scene.add(sun, fill);

  // Cutting-mat grid that fades out, plus the shadows the parts cast.
  const floor = new Mesh(
    new PlaneGeometry(60, 60),
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uColor: { value: new Color('#8a857c') } },
      vertexShader: `varying vec2 vW;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `varying vec2 vW;
uniform vec3 uColor;
void main() {
  vec2 p = vW * 1.25;
  vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  vec2 q = vW * 0.25;
  vec2 g5 = abs(fract(q - 0.5) - 0.5) / fwidth(q);
  float major = 1.0 - min(min(g5.x, g5.y), 1.0);
  float fade = 1.0 - smoothstep(3.0, 16.0, length(vW));
  gl_FragColor = vec4(uColor, max(line * 0.18, major * 0.35) * fade);
}`,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const shadowFloor = new Mesh(new PlaneGeometry(40, 40), new ShadowMaterial({ opacity: 0.14 }));
  shadowFloor.rotation.x = -Math.PI / 2;
  shadowFloor.position.y = 0.001;
  shadowFloor.receiveShadow = true;
  scene.add(shadowFloor);
  const contact = new Mesh(
    new PlaneGeometry(6.6, 3.8),
    new MeshBasicMaterial({
      color: '#3a2f22',
      alphaMap: tex.contact,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.003;
  scene.add(contact);

  const kit = buildParts(tex);
  scene.add(kit.root);
  for (const p of kit.parts)
    p.group.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh || p.id === 'glass') return;
      m.castShadow = true;
      m.receiveShadow = true;
    });

  const camera = new PerspectiveCamera(30, 1, 0.1, 200);
  camera.position.set(...DEFAULT_VIEW.pos);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...DEFAULT_VIEW.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;
  controls.minDistance = 1.2;
  controls.maxDistance = 40;
  let autoFrame = true;
  controls.addEventListener('start', () => (autoFrame = false));

  /* ---------- Guide state ---------- */
  let guide = cloneGuide(SAMPLE_GUIDE);
  let mode: 'guide' | 'studio' = 'guide';
  let t = 0;
  let goal = 0;
  let cur = 0;
  let playing = false;
  let xray = false;
  let holdTimer = 0;
  let previewOf: number | null = null;
  let studio: Studio | null = null;
  const stepOf = new Map<string, number>();
  const reindex = () => {
    stepOf.clear();
    guide.steps.forEach((s, i) => s.parts.forEach((id) => stepOf.set(id, i)));
  };
  const N = () => guide.steps.length;
  const isDone = () => N() > 0 && t >= N() - 1e-4;
  reindex();

  /* ---------- Pose: where every part is at time t and how it looks ---------- */
  const looks = new Map(kit.parts.map((p) => [p, { dim: 0, fade: 0, alpha: 1 }]));
  const pose = (dt: number) => {
    let settling = false;
    const done = isDone();
    const rate = reduce ? Infinity : 7;
    const eCur = ease(clamp(t - cur, 0, 1));
    kit.ghostLook.uAlpha.value = 0.9 * (1 - eCur);
    for (const p of kit.parts) {
      const s = stepOf.get(p.id);
      let dim = 0;
      let fade = 0;
      let alpha = 1;
      let glow = 0;
      let ghost = false;
      if (s === undefined) {
        // Not in the guide yet: only the studio shows it, as a clickable ghost.
        p.group.visible = mode === 'studio';
        p.group.position.copy(p.home);
        fade = 1;
        alpha = 0.7;
      } else {
        const e = ease(clamp(t - s, 0, 1));
        const off = guide.offsets[p.id] ?? [0, 0, 0];
        // A step's parts appear once it starts playing; the studio also shows them waiting at their start.
        p.group.visible = t > s + 1e-4 || (mode === 'studio' && s === cur && t >= s);
        p.group.position.set(p.home.x + off[0] * (1 - e), p.home.y + off[1] * (1 - e), p.home.z + off[2] * (1 - e));
        if (!done && s === cur) {
          glow = 1 - 0.7 * e;
          ghost = e < 0.999;
        } else if (!done && s < cur) {
          if (xray) {
            fade = 1;
            alpha = 0.9;
          } else dim = 0.5;
        }
      }
      const l = looks.get(p)!;
      l.dim = damp(l.dim, dim, rate, dt);
      l.alpha = damp(l.alpha, alpha, rate, dt);
      l.fade = fade; // blending switches at once; fading it would pop anyway
      if (Math.abs(l.dim - dim) > 0.004 || Math.abs(l.alpha - alpha) > 0.004) settling = true;
      const wasXray = p.xray;
      kit.setXray(p, l.fade > 0);
      if (wasXray !== p.xray) {
        // See-through parts don't cast shadows.
        p.group.traverse((o) => {
          if ((o as Mesh).isMesh && p.id !== 'glass') o.castShadow = !p.xray;
        });
        renderer.shadowMap.needsUpdate = true;
      }
      p.look.uDim.value = l.dim;
      p.look.uFade.value = l.fade;
      p.look.uAlpha.value = l.alpha;
      p.look.uGlow.value = glow;
      p.ghost.visible = ghost && p.group.visible;
      const at = p.group.position;
      const key = `${+p.group.visible},${at.x.toFixed(3)},${at.y.toFixed(3)},${at.z.toFixed(3)}`;
      if (p.group.userData.shadowKey !== key) {
        p.group.userData.shadowKey = key;
        renderer.shadowMap.needsUpdate = true;
      }
    }
    return settling;
  };

  /* ---------- Camera framing ---------- */
  const goalPos = new Vector3();
  const goalTarget = new Vector3();
  /** How much further the camera must sit for the free part of the viewer to hold the reference framing. */
  let fitScale = 1;
  const setViewGoal = () => {
    const v = guide.steps[cur]?.view ?? DEFAULT_VIEW;
    goalTarget.set(...v.target);
    goalPos
      .set(...v.pos)
      .sub(goalTarget)
      .multiplyScalar(fitScale)
      .add(goalTarget);
    autoFrame = true;
  };

  /** Shifts the projection so the model is centred in the part of the viewer the panels don't cover. */
  const layout = () => {
    const w = viewer.clientWidth;
    const h = viewer.clientHeight;
    if (!w || !h) return;
    const wide = matchMedia('(min-width: 900px)').matches;
    const panel = mode === 'studio' ? $('studio') : $('card');
    const r = panel.getBoundingClientRect();
    const top = wide ? 0 : 64;
    let x = 0;
    let y = 0;
    let visW = w;
    let visH = h - top;
    const hidden = !r.width || !r.height;
    if (hidden) {
      // Panel not shown: use the whole viewer.
    } else if (wide) {
      const covered = mode === 'studio' ? w - r.left : r.right;
      x = mode === 'studio' ? covered / 2 : -covered / 2;
      visW = w - covered;
    } else {
      const covered = Math.max(0, h - r.top);
      visH = h - covered - top;
      y = (covered - top) / 2;
    }
    visH = Math.max(visH, h * 0.3);
    camera.aspect = w / h;
    camera.setViewOffset(w, h, x, y, w, h);
    camera.updateProjectionMatrix();
    fitScale = (h / visH) * Math.max(1, REF_ASPECT / (visW / visH));
    if (autoFrame) setViewGoal();
  };

  /* ---------- Labels on the parts being installed ---------- */
  const pins = $('pins');
  let pinParts: Part[] = [];
  const tmp = new Vector3();
  const placePins = () => {
    const show = mode === 'guide' && !isDone();
    pins.classList.toggle('on', show);
    if (!show) return;
    const w = viewer.clientWidth;
    const h = viewer.clientHeight;
    pinParts.forEach((p, i) => {
      const el = pins.children[i] as HTMLElement | undefined;
      if (!el) return;
      tmp.copy(p.center).add(p.group.position).project(camera);
      const hidden = tmp.z > 1 || !p.group.visible;
      el.style.opacity = hidden ? '0' : '1';
      el.style.transform = `translate3d(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * h}px, 0) translate(-50%, calc(-100% - 16px))`;
    });
  };

  /* ---------- UI: step card, parts list, dock ---------- */
  const scrub = $<HTMLInputElement>('scrub');
  let scrubbing = false;
  const renderCard = () => {
    const s = guide.steps[cur];
    $('stepNo').textContent = pad(N() ? cur + 1 : 0);
    $('stepTotal').textContent = pad(N());
    $('guideName').textContent = guide.title;
    $('stepTitle').textContent = s?.title || (N() ? 'Untitled step' : 'No steps yet');
    $('stepBody').textContent = s?.body ?? 'Open the studio to add the first step.';
    $('stepTools').innerHTML = (s?.tools ?? [])
      .map((id) => `<li><svg viewBox="0 0 24 24" aria-hidden="true">${TOOLS[id].icon}</svg>${TOOLS[id].label}</li>`)
      .join('');
    const warn = $('stepWarn');
    warn.hidden = !s?.warning;
    $('stepWarnText').textContent = s?.warning ?? '';
    pinParts = (s?.parts ?? []).map((id) => kit.byId.get(id)).filter((p): p is Part => !!p);
    $('stepParts').innerHTML = pinParts
      .map((p) => `<li>${p.qty > 1 ? `<b>${p.qty}×</b> ` : ''}${esc(p.name)}</li>`)
      .join('');
    pins.innerHTML = pinParts
      .map((p) => `<span class="pin"><i></i>${p.qty > 1 ? `${p.qty}× ` : ''}${esc(p.name)}</span>`)
      .join('');
    $('card').style.setProperty('--p', String(N() ? (cur + 1) / N() : 0));
    for (const li of $('bomList').children) {
      const id = (li as HTMLElement).dataset.part!;
      li.classList.toggle('on', stepOf.get(id) === cur);
    }
    $('prevBtn').toggleAttribute('disabled', cur <= 0);
    $('nextBtn').toggleAttribute('disabled', cur >= N() - 1);
  };
  const renderBom = () => {
    $('bomCount').textContent = String(kit.parts.reduce((n, p) => n + p.qty, 0));
    $('bomList').innerHTML = kit.parts
      .map((p) => {
        const s = stepOf.get(p.id);
        return `<li data-part="${p.id}"><button type="button" ${s === undefined ? 'disabled' : ''}>
<span class="q">${p.qty}×</span><span class="n"><b>${esc(p.name)}</b><small>${esc(p.spec)}</small></span>
<em>${s === undefined ? '—' : `Step ${pad(s + 1)}`}</em></button></li>`;
      })
      .join('');
  };
  const renderTicks = () => {
    scrub.max = String(Math.max(1, N()));
    $('ticks').innerHTML = guide.steps
      .map((_, i) => `<i style="left:${((i + 1) / Math.max(1, N())) * 100}%"></i>`)
      .join('');
  };
  let shownT = -1;
  const syncDock = () => {
    if (!scrubbing && shownT !== t) {
      scrub.value = String(t);
      shownT = t;
    }
    scrub.style.setProperty('--fill', `${(t / Math.max(1, N())) * 100}%`);
  };
  const setPlaying = (on: boolean) => {
    playing = on;
    clearTimeout(holdTimer);
    $('playBtn').classList.toggle('on', on);
    $('playBtn').setAttribute('aria-label', on ? 'Pause' : 'Play');
  };
  const emitStep = () => api.onStep?.(cur);

  /* ---------- Navigation ---------- */
  const goto = (i: number, animate = true) => {
    if (!N()) return;
    const next = clamp(i, 0, N() - 1);
    previewOf = null;
    clearTimeout(holdTimer);
    const changed = next !== cur;
    cur = next;
    t = animate && !reduce ? cur : cur + 1;
    goal = cur + 1;
    if (changed || mode === 'guide') setViewGoal();
    renderCard();
    if (changed) emitStep();
    loop.invalidate();
  };
  const arrived = () => {
    if (previewOf !== null) {
      const i = previewOf;
      holdTimer = window.setTimeout(() => api.edit(i), 700);
      return;
    }
    if (!playing) return;
    holdTimer = window.setTimeout(() => {
      if (!playing) return;
      if (cur < N() - 1) goto(cur + 1);
      else setPlaying(false);
    }, HOLD_MS);
  };

  /* ---------- Fans and RGB once the build is complete ---------- */
  let power = 0;
  let spin = 0;
  let poweredFor = 0;
  const animatePower = (dt: number) => {
    const done = isDone() && mode === 'guide';
    poweredFor = done ? poweredFor + dt : 0;
    const powerTo = done ? 1 : 0;
    const spinTo = done && poweredFor < 14 ? 1 : 0;
    power = reduce ? powerTo : damp(power, powerTo, 1.6, dt);
    spin = damp(spin, spinTo, spinTo ? 1.2 : 0.5, dt);
    globals.uPower.value = power * power;
    if (spin > 0.003) {
      globals.uTime.value += dt;
      for (const r of kit.rotors) r.rotation.z += dt * spin * 16;
    }
    return Math.abs(power - powerTo) > 0.003 || spin > 0.003;
  };

  /* ---------- Frame ---------- */
  const frame = (dt: number) => {
    let busy = false;
    if (t !== goal) {
      const step = reduce ? Infinity : dt / STEP_SECONDS;
      t += Math.sign(goal - t) * Math.min(Math.abs(goal - t), step);
      if (t === goal) arrived();
      busy = true;
    }
    busy = pose(dt) || busy;
    busy = animatePower(dt) || busy;
    let framing = false;
    if (autoFrame) {
      const r = reduce ? Infinity : 2.6;
      controls.target.set(
        damp(controls.target.x, goalTarget.x, r, dt),
        damp(controls.target.y, goalTarget.y, r, dt),
        damp(controls.target.z, goalTarget.z, r, dt),
      );
      camera.position.set(
        damp(camera.position.x, goalPos.x, r, dt),
        damp(camera.position.y, goalPos.y, r, dt),
        damp(camera.position.z, goalPos.z, r, dt),
      );
      framing = camera.position.distanceTo(goalPos) > 0.005 || controls.target.distanceTo(goalTarget) > 0.003;
    }
    const moving = controls.update(dt);
    renderer.render(scene, camera);
    placePins();
    syncDock();
    return busy || framing || moving;
  };
  const loop = new RenderLoop(frame, { target: viewer, demand: true });
  controls.addEventListener('change', () => loop.invalidate());

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = viewer;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    layout();
    loop.invalidate();
  };
  new ResizeObserver(resize).observe(viewer);

  /* ---------- Picking (studio) ---------- */
  const ray = new Raycaster();
  const ndc = new Vector2();
  const shown = (o: Object3D | null): boolean => !o || (o.visible && shown(o.parent));
  const pick = (cx: number, cy: number) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const groups = kit.parts.filter((p) => p.group.visible).map((p) => p.group);
    for (const hit of ray.intersectObjects(groups, true)) {
      if (!shown(hit.object)) continue;
      let o: Object3D | null = hit.object;
      while (o && !o.userData.partId) o = o.parent;
      if (o) return kit.byId.get(o.userData.partId as string) ?? null;
    }
    return null;
  };

  /* ---------- API for the studio ---------- */
  const api: AssemblyApi = {
    kit,
    scene,
    camera,
    controls,
    renderer,
    viewer,
    guide: () => guide,
    setGuide(g) {
      guide = g;
      cur = clamp(cur, 0, Math.max(0, N() - 1));
      api.changed();
      api.edit(0);
      setViewGoal();
    },
    changed() {
      reindex();
      cur = clamp(cur, 0, Math.max(0, N() - 1));
      renderBom();
      renderTicks();
      renderCard();
      loop.invalidate();
    },
    current: () => cur,
    edit(i) {
      setPlaying(false);
      previewOf = null;
      clearTimeout(holdTimer);
      const changed = clamp(i, 0, Math.max(0, N() - 1)) !== cur;
      cur = clamp(i, 0, Math.max(0, N() - 1));
      t = goal = N() ? cur : 0;
      renderCard();
      if (changed) setViewGoal();
      emitStep();
      loop.invalidate();
    },
    isEditing: () => t === cur && goal === cur && previewOf === null,
    preview(i) {
      api.edit(i);
      previewOf = cur;
      goal = cur + 1;
      loop.invalidate();
    },
    captureView() {
      const target = controls.target.clone();
      const pos = camera.position.clone().sub(target).divideScalar(fitScale).add(target);
      const r = (v: Vector3): [number, number, number] =>
        [v.x, v.y, v.z].map((n) => Math.round(n * 100) / 100) as never;
      return { pos: r(pos), target: r(target) };
    },
    reframe() {
      setViewGoal();
      loop.invalidate();
    },
    pick,
    invalidate: () => loop.invalidate(),
    setMode: (m) => setMode(m),
    playFrom(i) {
      setPlaying(true);
      goto(i);
    },
    onStep: null,
  };

  /* ---------- Controls ---------- */
  $('prevBtn').addEventListener('click', () => {
    setPlaying(false);
    goto(cur - 1);
  });
  $('nextBtn').addEventListener('click', () => {
    setPlaying(false);
    goto(cur + 1);
  });
  $('replayBtn').addEventListener('click', () => {
    setPlaying(false);
    goto(cur);
  });
  $('playBtn').addEventListener('click', () => {
    if (playing) return setPlaying(false);
    setPlaying(true);
    if (isDone() || mode === 'studio') goto(isDone() ? 0 : cur);
    else if (t === goal) goto(cur + 1);
  });
  scrub.addEventListener('input', () => {
    scrubbing = true;
    setPlaying(false);
    previewOf = null;
    t = goal = Number(scrub.value);
    const next = clamp(Math.ceil(t) - 1, 0, Math.max(0, N() - 1));
    if (next !== cur) {
      cur = next;
      setViewGoal();
      renderCard();
      emitStep();
    }
    loop.invalidate();
  });
  scrub.addEventListener('change', () => (scrubbing = false));
  $('xrayBtn').addEventListener('click', () => {
    xray = !xray;
    $('xrayBtn').setAttribute('aria-pressed', String(xray));
    loop.invalidate();
  });
  const bom = $('bom');
  const setBom = (open: boolean) => {
    bom.classList.toggle('open', open);
    bom.setAttribute('aria-hidden', String(!open));
    $('bomBtn').setAttribute('aria-expanded', String(open));
  };
  $('bomBtn').addEventListener('click', () => setBom(!bom.classList.contains('open')));
  $('bomClose').addEventListener('click', () => setBom(false));
  $('bomList').addEventListener('click', (e) => {
    const li = (e.target as Element).closest<HTMLElement>('li[data-part]');
    const s = li && stepOf.get(li.dataset.part!);
    if (s === undefined || s === null) return;
    setPlaying(false);
    if (mode === 'studio') api.edit(s);
    else goto(s);
    if (!matchMedia('(min-width: 900px)').matches) setBom(false);
  });
  addEventListener('keydown', (e) => {
    const el = e.target as HTMLElement;
    if (el.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'ArrowRight') $('nextBtn').click();
    else if (e.key === 'ArrowLeft') $('prevBtn').click();
    else if (e.key === ' ' && mode === 'guide') {
      e.preventDefault();
      $('playBtn').click();
    } else if (e.key === 'Escape') setBom(false);
  });

  /* ---------- Guide / studio mode ---------- */
  const setMode = async (m: 'guide' | 'studio') => {
    if (m === mode) return;
    mode = m;
    app.dataset.mode = m;
    for (const b of document.querySelectorAll<HTMLElement>('[data-mode]')) {
      const on = b.dataset.mode === m;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    }
    setPlaying(false);
    if (m === 'studio') {
      if (!studio) {
        app.classList.add('loading-studio');
        const { startStudio } = await import('./studio');
        studio = startStudio(api);
        app.classList.remove('loading-studio');
      }
      studio.open();
      api.edit(cur);
    } else {
      studio?.close();
      goto(cur, false);
    }
    layout();
    setViewGoal();
    loop.invalidate();
  };
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]'))
    b.addEventListener('click', () => void setMode(b.dataset.mode as 'guide' | 'studio'));

  /* ---------- Start: drop the case in ---------- */
  renderBom();
  renderTicks();
  renderCard();
  resize();
  setViewGoal();
  camera.position.copy(goalPos);
  controls.target.copy(goalTarget);
  // Compile with every part visible so the first steps don't stall on shaders.
  for (const p of kit.parts) p.ghost.visible = true;
  await precompile(renderer, scene, camera);
  pose(0);
  loop.start();
  viewer.classList.add('ready');
  if (new URLSearchParams(location.search).has('studio')) void setMode('studio');
  else setTimeout(() => goto(0), 500);
}
