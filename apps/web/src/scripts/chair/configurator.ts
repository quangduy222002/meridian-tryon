import {
  AmbientLight,
  Color,
  DirectionalLight,
  MathUtils,
  PerspectiveCamera,
  Scene,
  Vector3,
  type Texture,
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
} from '@meridian/three-core';
import { $, toast, usd } from '../../lib/dom/chrome';
import { ARMREST_PRICE, COLORS, FABRICS, FRAMES, LEGS, priceOf, type ChairConfig } from './catalog';
import { chairSpecs, type ChairTexture } from './textures';
import { buildChair, createMaterials } from './model';
import { buildBackdrops } from './backdrop';

/** Camera presets: position and look-at target. */
const VIEWS = {
  three: { pos: new Vector3(1.85, 1.2, 2.05), target: new Vector3(0, 0.5, 0) },
  front: { pos: new Vector3(0, 0.85, 2.7), target: new Vector3(0, 0.5, 0) },
  side: { pos: new Vector3(2.7, 0.85, 0.05), target: new Vector3(0, 0.5, 0) },
  detail: { pos: new Vector3(0.95, 0.62, 1.05), target: new Vector3(0.3, 0.38, 0.25) },
};
type View = keyof typeof VIEWS;

export async function startChair() {
  const viewer = $('viewer');
  const canvas = viewer.querySelector('canvas')!;
  const status = viewer.querySelector('.loading')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const quality = getQuality();
  const renderer = createRenderer(canvas, quality, { alpha: false, shadows: true, exposure: 1.0 });
  renderer.shadowMap.autoUpdate = false; // static set: shadows are re-rendered only when the chair changes

  const tex = await generateTextures<{ size: number }, ChairTexture>({
    build: (p) => chairSpecs(p.size),
    params: { size: Math.min(1024, quality.textureSize) },
    worker: () => new Worker(new URL('./textures.worker.ts', import.meta.url), { type: 'module' }),
    anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()),
    renderer,
    onProgress: (p) => (status.textContent = `Preparing materials ${Math.round(p * 100)}%`),
  });

  /* ---------- Scene ---------- */
  const scene = new Scene();
  scene.environment = bakeStudio(renderer, LIGHT_STUDIO, '#d9d2c6');
  scene.environmentIntensity = 0.85;
  const backdrops = buildBackdrops(tex);
  scene.add(backdrops.studio, backdrops.room, backdrops.contact);
  scene.background = backdrops.backgrounds.studio.clone();
  scene.add(new AmbientLight(0xffffff, 0.15));
  const sun = new DirectionalLight(0xfff3e4, 2.0);
  sun.position.set(2.5, 4.5, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 0.5, far: 12 });
  scene.add(sun);

  const mats = createMaterials(tex);
  const chair = buildChair(mats);
  scene.add(chair.root);

  const camera = new PerspectiveCamera(32, 1, 0.05, 40);
  camera.position.copy(VIEWS.three.pos);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(VIEWS.three.target);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minDistance = 1.1;
  controls.maxDistance = 4.5;
  controls.maxPolarAngle = Math.PI / 2.05;
  controls.autoRotate = !reduce;
  controls.autoRotateSpeed = 0.5;

  /* ---------- State ---------- */
  const state: ChairConfig = { frame: 'oak', fabric: 'linen', color: COLORS[0]!.hex, legs: 'straight', arms: false };
  const target = { wood: new Color(), fabric: new Color(), sheen: new Color() };
  let armScale = 0;
  let fly: { pos: Vector3; target: Vector3 } | null = null;
  let showPins = true;

  /* ---------- Annotation pins ---------- */
  const pinLayer = $('pins');
  const pins = (Object.keys(chair.anchors) as (keyof typeof chair.anchors)[]).map((key) => {
    const el = document.createElement('div');
    el.className = 'pin';
    el.innerHTML = '<i></i><span></span>';
    pinLayer.appendChild(el);
    return { key, el, label: el.querySelector('span')! };
  });
  const tmp = new Vector3();
  const placePins = () => {
    pinLayer.classList.toggle('on', showPins);
    if (!showPins) return;
    const w = viewer.clientWidth;
    const h = viewer.clientHeight;
    for (const p of pins) {
      tmp.copy(chair.anchors[p.key]);
      chair.root.localToWorld(tmp);
      tmp.project(camera);
      p.el.style.transform = `translate3d(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * h}px, 0)`;
    }
  };

  /* ---------- Frame (demand rendering) ---------- */
  const settle = (cur: number, to: number, k: number) => (Math.abs(to - cur) < 1e-3 ? to : MathUtils.lerp(cur, to, k));
  const near = (a: Color, b: Color) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < 1e-3;
  const frame = (dt: number) => {
    const k = 1 - Math.exp(-dt * 8);
    const f = FRAMES[state.frame];
    const fb = FABRICS[state.fabric];
    mats.wood.color.lerp(target.wood, k);
    mats.wood.metalness = settle(mats.wood.metalness, f.metalness, k);
    mats.wood.roughness = settle(mats.wood.roughness, f.roughness, k);
    mats.fabric.color.lerp(target.fabric, k);
    mats.fabric.sheenColor.lerp(target.sheen, k);
    mats.fabric.sheen = settle(mats.fabric.sheen, fb.sheen, k);
    mats.fabric.roughness = settle(mats.fabric.roughness, fb.roughness, k);
    mats.fabric.clearcoat = settle(mats.fabric.clearcoat, fb.clearcoat, k);

    const armTo = state.arms ? 1 : 0;
    const armsMoving = armScale !== armTo;
    armScale = settle(armScale, armTo, k);
    chair.arms.visible = armScale > 0.01;
    chair.arms.scale.set(1, Math.max(armScale, 0.001), 1);
    if (armsMoving) renderer.shadowMap.needsUpdate = true;

    let flying = false;
    if (fly) {
      const r = reduce ? Infinity : 4;
      camera.position.set(
        damp(camera.position.x, fly.pos.x, r, dt),
        damp(camera.position.y, fly.pos.y, r, dt),
        damp(camera.position.z, fly.pos.z, r, dt),
      );
      controls.target.set(
        damp(controls.target.x, fly.target.x, r, dt),
        damp(controls.target.y, fly.target.y, r, dt),
        damp(controls.target.z, fly.target.z, r, dt),
      );
      flying = camera.position.distanceTo(fly.pos) > 0.002;
      if (!flying) fly = null;
    }
    const moving = controls.update(dt);
    renderer.render(scene, camera);
    placePins();
    return (
      flying ||
      moving ||
      controls.autoRotate ||
      armsMoving ||
      !near(mats.wood.color, target.wood) ||
      !near(mats.fabric.color, target.fabric) ||
      mats.wood.metalness !== f.metalness ||
      mats.wood.roughness !== f.roughness ||
      mats.fabric.sheen !== fb.sheen ||
      mats.fabric.roughness !== fb.roughness ||
      mats.fabric.clearcoat !== fb.clearcoat
    );
  };
  const loop = new RenderLoop(frame, { target: viewer, demand: true });
  controls.addEventListener('change', () => loop.invalidate());
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    fly = null;
  });

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = viewer;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Narrow viewers need the camera further back to keep the whole chair in frame.
    camera.fov = w / h < 0.9 ? 40 : 32;
    camera.updateProjectionMatrix();
    loop.invalidate();
  };
  new ResizeObserver(resize).observe(viewer);
  resize();

  /* ---------- Apply configuration ---------- */
  const setTexture = (slot: 'map' | 'roughnessMap' | 'normalMap', mat: typeof mats.wood, t: Texture | null) => {
    if (mat[slot] === t) return;
    mat[slot] = t;
    mat.needsUpdate = true;
  };
  const colorName = () => COLORS.find((c) => c.hex === state.color)?.name ?? '';
  const markActive = (id: string, value: string) => {
    for (const b of $(id).children) {
      const on = (b as HTMLElement).dataset.value === value;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    }
  };
  function refresh() {
    const f = FRAMES[state.frame];
    const fb = FABRICS[state.fabric];
    markActive('frames', state.frame);
    markActive('fabrics', state.fabric);
    markActive('legs', state.legs);
    markActive('colors', state.color);
    $('frameLabel').textContent = f.label;
    $('fabricLabel').textContent = fb.label;
    $('colorLabel').textContent = colorName();
    $('legLabel').textContent = LEGS[state.legs].label;
    $('price').textContent = usd(priceOf(state));

    chair.setLegs(state.legs);
    chair.buttons.visible = state.fabric !== 'linen';
    setTexture('map', mats.wood, f.grain ? tex.wood : null);
    setTexture('roughnessMap', mats.wood, f.grain ? tex.wood : null);
    mats.wood.clearcoat = f.grain ? 0.25 : 0;
    setTexture('normalMap', mats.fabric, fb.normal === 'leather' ? tex.leather : tex.weave);
    mats.fabric.normalScale.setScalar(fb.normalScale);
    target.wood.set(f.color);
    target.fabric.set(state.color);
    target.sheen.set(state.color).offsetHSL(0, 0, 0.3);

    pins.find((p) => p.key === 'frame')!.label.textContent = f.note;
    pins.find((p) => p.key === 'fabric')!.label.textContent = fb.note;
    pins.find((p) => p.key === 'legs')!.label.textContent = LEGS[state.legs].note;

    renderer.shadowMap.needsUpdate = true;
    loop.invalidate();
  }

  /* ---------- UI ---------- */
  const extra = (p: number) => (p > 0 ? `<small>+${usd(p)}</small>` : '');
  const options = <T extends Record<string, { label: string; price: number }>>(
    id: string,
    opts: T,
    apply: (v: keyof T & string) => void,
    inner: (o: T[keyof T]) => string,
    cls = '',
  ) => {
    for (const [value, o] of Object.entries(opts)) {
      const b = document.createElement('button');
      b.type = 'button';
      if (cls) b.className = cls;
      b.dataset.value = value;
      b.innerHTML = inner(o as T[keyof T]);
      b.addEventListener('click', () => {
        apply(value);
        refresh();
      });
      $(id).appendChild(b);
    }
  };
  options(
    'frames',
    FRAMES,
    (v) => (state.frame = v),
    (o) => `<i style="background:${o.color}"></i>${o.label}${extra(o.price)}`,
    'chip',
  );
  options(
    'fabrics',
    FABRICS,
    (v) => (state.fabric = v),
    (o) => `${o.label}${extra(o.price)}`,
  );
  options(
    'legs',
    LEGS,
    (v) => (state.legs = v),
    (o) => `${o.label}${extra(o.price)}`,
  );
  for (const c of COLORS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.style.background = c.hex;
    b.dataset.value = c.hex;
    b.setAttribute('aria-label', c.name);
    b.addEventListener('click', () => {
      state.color = c.hex;
      refresh();
    });
    $('colors').appendChild(b);
  }
  $('armPrice').textContent = `+${usd(ARMREST_PRICE)}`;
  $<HTMLInputElement>('arms').addEventListener('change', (e) => {
    state.arms = (e.target as HTMLInputElement).checked;
    refresh();
  });

  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) {
    b.addEventListener('click', () => {
      const v = VIEWS[b.dataset.view as View];
      controls.autoRotate = false;
      fly = { pos: v.pos.clone(), target: v.target.clone() };
      document.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('on', x === b));
      loop.invalidate();
    });
  }
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-scene]')) {
    b.addEventListener('click', () => {
      const room = b.dataset.scene === 'room';
      backdrops.room.visible = room;
      backdrops.studio.visible = !room;
      scene.background = (room ? backdrops.backgrounds.room : backdrops.backgrounds.studio).clone();
      // The room needs the key light's shadow to reach the wall; the studio keeps a tighter, sharper map.
      const s = room ? 3.2 : 1.6;
      Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s });
      sun.shadow.camera.updateProjectionMatrix();
      document.querySelectorAll('[data-scene]').forEach((x) => x.classList.toggle('on', x === b));
      renderer.shadowMap.needsUpdate = true;
      loop.invalidate();
    });
  }
  $('detailsBtn').addEventListener('click', (e) => {
    showPins = !showPins;
    (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(showPins));
    loop.invalidate();
  });

  $('cart').addEventListener('click', () =>
    toast(
      `Added: ${FRAMES[state.frame].label} · ${FABRICS[state.fabric].label} ${colorName()}${state.arms ? ' · Armrests' : ''}`,
      2200,
    ),
  );
  $('snap').addEventListener('click', () => {
    renderer.render(scene, camera);
    $<HTMLImageElement>('snapImg').src = renderer.domElement.toDataURL('image/png');
    $<HTMLDialogElement>('modal').showModal();
  });
  $('closeModal').addEventListener('click', () => $<HTMLDialogElement>('modal').close());

  refresh();
  renderer.shadowMap.needsUpdate = true;
  await precompile(renderer, scene, camera);
  loop.start();
  viewer.classList.add('ready');
}
