import {
  AmbientLight,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { getQuality } from '../../lib/three/quality';
import { createRenderer, precompile } from '../../lib/three/renderer';
import { RenderLoop } from '../../lib/three/loop';
import { $, toast, usd } from '../../lib/dom/chrome';

const FRAMES = {
  oak: { label: 'Oak', color: '#c8a27a', metalness: 0, roughness: 0.6, price: 0 },
  walnut: { label: 'Walnut', color: '#5b3a29', metalness: 0, roughness: 0.5, price: 40 },
  black: { label: 'Black Metal', color: '#1c1c1e', metalness: 0.8, roughness: 0.35, price: 25 },
  brass: { label: 'Brass', color: '#b8903f', metalness: 1, roughness: 0.25, price: 60 },
};
const FABRICS = {
  linen: { label: 'Linen', roughness: 0.95, sheen: 0, price: 0 },
  velvet: { label: 'Velvet', roughness: 0.75, sheen: 1, price: 30 },
  leather: { label: 'Leather', roughness: 0.35, sheen: 0, price: 80 },
};
const COLORS = [
  { name: 'Sand', hex: '#d9c9b0' },
  { name: 'Sage', hex: '#8a9a7b' },
  { name: 'Terracotta', hex: '#c0603f' },
  { name: 'Navy', hex: '#2b3a55' },
  { name: 'Charcoal', hex: '#3a3a3c' },
];
const LEGS = { straight: { label: 'Straight', price: 0 }, tapered: { label: 'Tapered', price: 15 } };
const BASE_PRICE = 249;
const ARMREST_PRICE = 35;

type FrameKey = keyof typeof FRAMES;
type FabricKey = keyof typeof FABRICS;
type LegKey = keyof typeof LEGS;
const state = {
  frame: 'oak' as FrameKey,
  fabric: 'linen' as FabricKey,
  color: COLORS[0]!.hex,
  legs: 'straight' as LegKey,
  arms: false,
};

export async function startChair() {
  const viewer = $('viewer');
  const canvas = viewer.querySelector('canvas')!;
  const quality = getQuality();
  const renderer = createRenderer(canvas, quality, { alpha: false, shadows: true });
  // Shadows only change when the chair does (legs, armrests), not when the camera orbits.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  const scene = new Scene();
  scene.background = new Color('#f4f1ec');
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.set(2.2, 1.6, 2.4);
  scene.add(new AmbientLight(0xffffff, 0.3));
  const sun = new DirectionalLight(0xffffff, 1.6);
  sun.position.set(3, 5, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
  Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.5, far: 15 });
  scene.add(sun);
  const ground = new Mesh(new PlaneGeometry(12, 12), new ShadowMaterial({ opacity: 0.18 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.6, 0);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minDistance = 1.8;
  controls.maxDistance = 5;
  controls.maxPolarAngle = Math.PI / 2.05;
  controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotateSpeed = 0.6;
  controls.addEventListener('start', () => (controls.autoRotate = false));

  /* ---------- Chair ---------- */
  const frameMat = new MeshPhysicalMaterial({ color: FRAMES.oak.color, roughness: 0.6, metalness: 0 });
  const fabricMat = new MeshPhysicalMaterial({ color: state.color, roughness: 0.95, sheenRoughness: 0.5 });
  const chair = new Group();
  scene.add(chair);
  const add = (parent: Object3D, geo: BufferGeometry, mat: Material, x: number, y: number, z: number) => {
    const m = new Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  add(chair, new BoxGeometry(1, 0.06, 0.9), frameMat, 0, 0.48, 0);
  add(chair, new RoundedBoxGeometry(0.96, 0.14, 0.88, 4, 0.05), fabricMat, 0, 0.58, 0);
  const back = new Group();
  back.position.set(0, 0.51, -0.42);
  back.rotation.x = -0.12;
  chair.add(back);
  const post = new CylinderGeometry(0.025, 0.025, 0.8, 16);
  add(back, post, frameMat, -0.46, 0.4, 0);
  add(back, post, frameMat, 0.46, 0.4, 0);
  add(back, new BoxGeometry(0.97, 0.05, 0.05), frameMat, 0, 0.8, 0);
  add(back, new RoundedBoxGeometry(0.88, 0.55, 0.12, 4, 0.05), fabricMat, 0, 0.48, 0.05);
  const legGeos = {
    straight: new CylinderGeometry(0.035, 0.035, 0.45, 20),
    tapered: new CylinderGeometry(0.04, 0.02, 0.45, 20),
  };
  const legs = (
    [
      [-0.42, -0.38],
      [0.42, -0.38],
      [-0.42, 0.38],
      [0.42, 0.38],
    ] as const
  ).map(([x, z]) => add(chair, legGeos.straight, frameMat, x, 0.225, z));
  const arms = new Group();
  arms.visible = false;
  chair.add(arms);
  const armPost = new CylinderGeometry(0.022, 0.022, 0.3, 16);
  const armPad = new RoundedBoxGeometry(0.08, 0.04, 0.78, 3, 0.015);
  for (const s of [-1, 1]) {
    add(arms, armPost, frameMat, s * 0.5, 0.66, 0.3);
    add(arms, armPad, frameMat, s * 0.5, 0.82, -0.04);
  }

  /* ---------- Render on demand ---------- */
  const target = { frame: new Color(), fabric: new Color(), sheen: new Color() };
  let armScale = 0;
  const settle = (cur: number, to: number, k: number) => (Math.abs(to - cur) < 1e-3 ? to : MathUtils.lerp(cur, to, k));
  const colorDone = (a: Color, b: Color) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < 1e-3;

  const frame = (dt: number) => {
    const k = 1 - Math.exp(-dt * 8);
    const f = FRAMES[state.frame];
    const fb = FABRICS[state.fabric];
    frameMat.color.lerp(target.frame, k);
    frameMat.metalness = settle(frameMat.metalness, f.metalness, k);
    frameMat.roughness = settle(frameMat.roughness, f.roughness, k);
    fabricMat.color.lerp(target.fabric, k);
    fabricMat.sheenColor.lerp(target.sheen, k);
    fabricMat.sheen = settle(fabricMat.sheen, fb.sheen, k);
    fabricMat.roughness = settle(fabricMat.roughness, fb.roughness, k);
    const armTo = state.arms ? 1 : 0;
    const armsMoving = Math.abs(armScale - armTo) > 1e-3;
    armScale = settle(armScale, armTo, k);
    arms.visible = armScale > 0.01;
    arms.scale.set(1, Math.max(armScale, 0.001), 1);
    if (armsMoving) renderer.shadowMap.needsUpdate = true;
    const moving = controls.update(dt);
    renderer.render(scene, camera);
    // Keep drawing only while something is still changing.
    return (
      moving ||
      controls.autoRotate ||
      armsMoving ||
      !colorDone(frameMat.color, target.frame) ||
      !colorDone(fabricMat.color, target.fabric) ||
      frameMat.metalness !== f.metalness ||
      frameMat.roughness !== f.roughness ||
      fabricMat.sheen !== fb.sheen ||
      fabricMat.roughness !== fb.roughness
    );
  };
  const loop = new RenderLoop(frame, { target: viewer, demand: true });
  controls.addEventListener('change', () => loop.invalidate());

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = viewer;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    loop.invalidate();
  };
  new ResizeObserver(resize).observe(viewer);
  resize();

  /* ---------- UI ---------- */
  const extra = (p: number) => (p > 0 ? `<small>+${usd(p)}</small>` : '');
  const buildOptions = <T extends Record<string, { label: string; price: number; color?: string }>>(
    id: string,
    options: T,
    apply: (v: keyof T & string) => void,
    inner: (o: T[keyof T]) => string,
    cls = '',
  ) => {
    for (const [value, opt] of Object.entries(options)) {
      const b = document.createElement('button');
      b.type = 'button';
      if (cls) b.className = cls;
      b.dataset.value = value;
      b.innerHTML = inner(opt as T[keyof T]);
      b.addEventListener('click', () => {
        apply(value);
        refresh();
      });
      $(id).appendChild(b);
    }
  };
  buildOptions(
    'frames',
    FRAMES,
    (v) => (state.frame = v),
    (o) => `<i style="background:${o.color}"></i>${o.label}${extra(o.price)}`,
    'chip',
  );
  buildOptions(
    'fabrics',
    FABRICS,
    (v) => (state.fabric = v),
    (o) => `${o.label}${extra(o.price)}`,
  );
  buildOptions(
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

  const markActive = (id: string, value: string) => {
    for (const b of $(id).children) {
      const on = (b as HTMLElement).dataset.value === value;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    }
  };
  const colorName = () => COLORS.find((c) => c.hex === state.color)?.name ?? '';

  function refresh() {
    markActive('frames', state.frame);
    markActive('fabrics', state.fabric);
    markActive('legs', state.legs);
    markActive('colors', state.color);
    $('frameLabel').textContent = FRAMES[state.frame].label;
    $('fabricLabel').textContent = FABRICS[state.fabric].label;
    $('colorLabel').textContent = colorName();
    $('legLabel').textContent = LEGS[state.legs].label;
    for (const m of legs) m.geometry = legGeos[state.legs];
    target.frame.set(FRAMES[state.frame].color);
    target.fabric.set(state.color);
    target.sheen.set(state.color).offsetHSL(0, 0, 0.25);
    const price =
      BASE_PRICE +
      FRAMES[state.frame].price +
      FABRICS[state.fabric].price +
      LEGS[state.legs].price +
      (state.arms ? ARMREST_PRICE : 0);
    $('price').textContent = usd(price);
    renderer.shadowMap.needsUpdate = true;
    loop.invalidate();
  }
  refresh();

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

  await precompile(renderer, scene, camera);
  loop.start();
  viewer.classList.add('ready');
}
