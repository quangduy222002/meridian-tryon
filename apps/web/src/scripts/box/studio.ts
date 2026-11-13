import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  NeutralToneMapping,
  PMREMGenerator,
  PerspectiveCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  ShadowMaterial,
  Vector3,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { getQuality } from '../../lib/three/quality';
import { createRenderer, precompile } from '../../lib/three/renderer';
import { RenderLoop } from '../../lib/three/loop';
import { $, toast, usd } from '../../lib/dom/chrome';
import { smoothstep } from '../../lib/math';

const MATERIALS = {
  kraft: { label: 'Kraft', out: '#c79b6a', in: '#d8b88f', rough: 0.95, ink: '#3b2a1a', add: 0 },
  white: { label: 'White', out: '#f4f1ea', in: '#e9e4d9', rough: 0.8, ink: '#1f1d1a', add: 0.05 },
  black: { label: 'Matte Black', out: '#232220', in: '#3a3835', rough: 0.85, ink: '#e8d3a8', add: 0.15 },
  coral: { label: 'Coral', out: '#e0745a', in: '#f2e6da', rough: 0.6, ink: '#ffffff', add: 0.25 },
  teal: { label: 'Teal', out: '#2f7a78', in: '#e7efe9', rough: 0.6, ink: '#ffffff', add: 0.25 },
  lilac: { label: 'Lilac', out: '#b9a6d6', in: '#f1ecf6', rough: 0.6, ink: '#2b2140', add: 0.25 },
};
type MaterialKey = keyof typeof MATERIALS;
const QTY = [100, 500, 1000, 2500] as const;
const DISCOUNT: Record<(typeof QTY)[number], number> = { 100: 1, 500: 0.72, 1000: 0.6, 2500: 0.5 };
const TH = 0.02; // board thickness (1 unit = 10 cm)

const state = {
  w: 24,
  h: 10,
  d: 18,
  mat: 'kraft' as MaterialKey,
  brand: 'AURORA',
  logo: null as HTMLImageElement | null,
  qty: 500 as (typeof QTY)[number],
  folded: false,
  lidOpen: false,
};

export async function startBoxStudio() {
  const viewer = $('viewer');
  const canvas = viewer.querySelector('canvas')!;
  const quality = getQuality();
  const renderer = createRenderer(canvas, quality, { shadows: true, toneMapping: NeutralToneMapping, exposure: 0.9 });
  renderer.shadowMap.autoUpdate = false;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environmentIntensity = 0.45;
  const camera = new PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(4.2, 3.6, 5.2);
  scene.add(new AmbientLight(0xffffff, 0.25));
  const sun = new DirectionalLight(0xfff4e2, 2.2);
  sun.position.set(3, 7, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 20 });
  scene.add(sun);
  const ground = new Mesh(new PlaneGeometry(30, 30), new ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minDistance = 2.5;
  controls.maxDistance = 14;
  controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotateSpeed = 0.5;
  let userZoom = false;
  controls.addEventListener('start', () => (controls.autoRotate = false));
  renderer.domElement.addEventListener('wheel', () => (userZoom = true), { passive: true });

  /* ---------- Materials & print textures ---------- */
  const outMat = new MeshStandardMaterial({ color: MATERIALS.kraft.out, roughness: 0.95 });
  const inMat = new MeshStandardMaterial({ color: MATERIALS.kraft.in, roughness: 0.95 });
  // BoxGeometry groups: +x, -x, +y, -y, +z, -z. Every panel's +y face is the inside of the box.
  const panelMats = [outMat, outMat, inMat, outMat, outMat, outMat];
  const lidCanvas = document.createElement('canvas');
  const frontCanvas = document.createElement('canvas');
  const lidTex = new CanvasTexture(lidCanvas);
  const frontTex = new CanvasTexture(frontCanvas);
  for (const t of [lidTex, frontTex]) {
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
  }
  const decalMat = (map: CanvasTexture) =>
    new MeshStandardMaterial({ map, transparent: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -4 });
  const lidDecalMat = decalMat(lidTex);
  const frontDecalMat = decalMat(frontTex);

  const drawPrints = () => {
    const m = MATERIALS[state.mat];
    const brand = state.brand.toUpperCase();
    const lw = 1024;
    const lh = Math.round((1024 * state.d) / state.w);
    lidCanvas.width = lw;
    lidCanvas.height = lh;
    let c = lidCanvas.getContext('2d')!;
    c.fillStyle = c.strokeStyle = m.ink;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    if (state.logo) {
      const s = Math.min((lw * 0.42) / state.logo.width, (lh * 0.42) / state.logo.height);
      const iw = state.logo.width * s;
      const ih = state.logo.height * s;
      c.drawImage(state.logo, (lw - iw) / 2, lh * 0.44 - ih / 2, iw, ih);
      c.font = `700 ${Math.round(lw * 0.06)}px "Inter Variable", sans-serif`;
      c.letterSpacing = `${Math.round(lw * 0.018)}px`;
      c.fillText(brand, lw / 2, lh * 0.44 + ih / 2 + lw * 0.07);
    } else {
      const r = Math.min(lw, lh) * 0.15;
      c.lineWidth = lw * 0.008;
      c.beginPath();
      c.arc(lw / 2, lh * 0.4, r, 0, Math.PI * 2);
      c.stroke();
      c.font = `600 ${Math.round(r * 1.1)}px "Inter Variable", sans-serif`;
      c.fillText(brand.charAt(0) || '★', lw / 2, lh * 0.4 + r * 0.05);
      c.font = `700 ${Math.round(lw * 0.075)}px "Inter Variable", sans-serif`;
      c.letterSpacing = `${Math.round(lw * 0.02)}px`;
      c.fillText(brand, lw / 2, lh * 0.4 + r + lw * 0.085);
    }
    lidTex.needsUpdate = true;
    const fw = 1024;
    const fh = Math.round((1024 * state.h) / state.w);
    frontCanvas.width = fw;
    frontCanvas.height = fh;
    c = frontCanvas.getContext('2d')!;
    c.fillStyle = m.ink;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 ${Math.round(Math.min(fw * 0.045, fh * 0.2))}px "Inter Variable", sans-serif`;
    c.letterSpacing = `${Math.round(fw * 0.02)}px`;
    c.fillText(brand, fw / 2, fh / 2);
    frontTex.needsUpdate = true;
  };

  /* ---------- Box built as hinged panels so it can fold ---------- */
  let box: Group | null = null;
  let hinges!: Record<'pFront' | 'pBack' | 'pLeft' | 'pRight' | 'pLid' | 'pTuck', Group>;
  const panel = (w: number, l: number, parent: Group, x: number, z: number) => {
    const m = new Mesh(new BoxGeometry(w, TH, l), panelMats);
    m.position.set(x, 0, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const decal = (parent: Mesh, w: number, l: number, mat: MeshStandardMaterial) => {
    const p = new Mesh(new PlaneGeometry(w, l), mat);
    p.rotation.x = Math.PI / 2; // face the outside (-y)
    p.position.y = -TH / 2 - 0.002;
    parent.add(p);
  };
  const hinge = (parent: Group, axis: 'x' | 'z', at: number) => {
    const g = new Group();
    g.position[axis] = at;
    parent.add(g);
    return g;
  };

  const buildBox = () => {
    if (box) {
      box.traverse((o) => (o as Mesh).geometry?.dispose());
      scene.remove(box);
    }
    const W = state.w / 10;
    const H = state.h / 10;
    const D = state.d / 10;
    const tuck = Math.min(H * 0.6, 0.5);
    box = new Group();
    box.position.y = TH / 2;
    scene.add(box);
    panel(W, D, box, 0, 0);
    const pFront = hinge(box, 'z', D / 2);
    decal(panel(W, H, pFront, 0, H / 2), W * 0.92, H * 0.9, frontDecalMat);
    const pBack = hinge(box, 'z', -D / 2);
    panel(W, H, pBack, 0, -H / 2);
    const side = (sx: number) => {
      const g = hinge(box!, 'x', (sx * W) / 2);
      const m = new Mesh(new BoxGeometry(H, TH, D - TH * 2), panelMats);
      m.position.x = (sx * H) / 2;
      m.castShadow = true;
      g.add(m);
      return g;
    };
    const pLeft = side(-1);
    const pRight = side(1);
    const pLid = hinge(pBack, 'z', -H);
    decal(panel(W, D, pLid, 0, -D / 2), W * 0.9, D * 0.9, lidDecalMat);
    const pTuck = hinge(pLid, 'z', -D);
    panel(W - TH * 2, tuck, pTuck, 0, -tuck / 2);
    hinges = { pFront, pBack, pLeft, pRight, pLid, pTuck };
    drawPrints();
    $('dimsBadge').textContent = `${state.w} × ${state.h} × ${state.d} cm`;
    renderer.shadowMap.needsUpdate = true;
  };

  /* ---------- Fold animation ---------- */
  let fold = 0;
  let open = 0;
  const stage = (f: number, a: number, b: number) => smoothstep(a, b, f);
  const applyFold = () => {
    const sides = (stage(fold, 0, 0.5) * Math.PI) / 2;
    hinges.pFront.rotation.x = -sides;
    hinges.pBack.rotation.x = sides;
    hinges.pLeft.rotation.z = (-stage(fold, 0.1, 0.55) * Math.PI) / 2;
    hinges.pRight.rotation.z = (stage(fold, 0.1, 0.55) * Math.PI) / 2;
    hinges.pLid.rotation.x = (stage(fold, 0.55, 0.85) * (1 - 0.6 * open) * Math.PI) / 2;
    hinges.pTuck.rotation.x = (stage(fold, 0.8, 1) * (1 - open) * Math.PI) / 2;
  };

  /* ---------- Render on demand ---------- */
  const focus = new Vector3();
  const dir = new Vector3();
  const frame = (dt: number) => {
    const foldTo = state.folded ? 1 : 0;
    const openTo = state.lidOpen && state.folded ? 1 : 0;
    const folding = fold !== foldTo || open !== openTo;
    fold += Math.sign(foldTo - fold) * Math.min(Math.abs(foldTo - fold), dt * 0.55);
    open += Math.sign(openTo - open) * Math.min(Math.abs(openTo - open), dt * 1.4);
    applyFold();
    if (folding) renderer.shadowMap.needsUpdate = true;

    // Keep the box framed whatever its size.
    const H = state.h / 10;
    const R = Math.hypot(state.w, state.d, state.h) / 10;
    focus.set(0, fold * H * 0.45, 0);
    controls.target.lerp(focus, 1 - Math.exp(-dt * 4));
    const want = Math.max(R * 1.9, 3.2);
    const cur = camera.position.distanceTo(controls.target);
    const reframing = !userZoom && Math.abs(want - cur) > 0.01;
    if (reframing) {
      dir.copy(camera.position).sub(controls.target).normalize();
      camera.position.copy(controls.target).addScaledVector(dir, cur + (want - cur) * (1 - Math.exp(-dt * 3)));
    }
    const moving = controls.update(dt);
    renderer.render(scene, camera);
    return folding || reframing || moving || controls.autoRotate || controls.target.distanceTo(focus) > 1e-3;
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

  /* ---------- UI ---------- */
  for (const k of ['w', 'h', 'd'] as const) {
    const input = $<HTMLInputElement>(k);
    const out = $(`${k}Out`);
    out.textContent = input.value;
    input.addEventListener('input', () => {
      state[k] = Number(input.value);
      out.textContent = input.value;
      buildBox();
      applyFold();
      updatePrice();
      loop.invalidate();
    });
  }
  for (const [key, m] of Object.entries(MATERIALS) as [MaterialKey, (typeof MATERIALS)[MaterialKey]][]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mat';
    b.dataset.value = key;
    b.innerHTML = `<i style="background:${m.out}"></i>${m.label}<small>${m.add ? `+${usd(m.add, 2)}/pc` : 'Included'}</small>`;
    b.addEventListener('click', () => {
      state.mat = key;
      applyMaterial();
      updatePrice();
    });
    $('mats').appendChild(b);
  }
  function applyMaterial() {
    const m = MATERIALS[state.mat];
    outMat.color.set(m.out);
    outMat.roughness = m.rough;
    inMat.color.set(m.in);
    inMat.roughness = m.rough;
    for (const b of $('mats').children) b.classList.toggle('on', (b as HTMLElement).dataset.value === state.mat);
    $('matLabel').textContent = m.label;
    drawPrints();
    loop.invalidate();
  }
  for (const q of QTY) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = q.toLocaleString('en-US');
    b.dataset.value = String(q);
    b.addEventListener('click', () => {
      state.qty = q;
      updatePrice();
    });
    $('qty').appendChild(b);
  }
  $<HTMLInputElement>('brandIn').addEventListener('input', (e) => {
    state.brand = (e.target as HTMLInputElement).value;
    drawPrints();
    updatePrice();
    loop.invalidate();
  });
  $<HTMLInputElement>('logoIn').addEventListener('change', (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      state.logo = img;
      $('logoName').textContent = f.name;
      drawPrints();
      updatePrice();
      loop.invalidate();
    };
    img.src = URL.createObjectURL(f);
  });

  const unitPrice = () => {
    const area = 2 * (state.w * state.h + state.w * state.d + state.h * state.d); // cm²
    return (0.55 + area * 0.00042 + MATERIALS[state.mat].add + (state.logo ? 0.1 : 0)) * DISCOUNT[state.qty];
  };
  function updatePrice() {
    const u = unitPrice();
    $('total').textContent = usd(u * state.qty);
    $('perUnit').textContent = `${usd(u, 2)} / box`;
    $('unitLabel').textContent = `${Math.round((1 - DISCOUNT[state.qty]) * 100)}% off`;
    for (const b of $('qty').children) b.classList.toggle('on', Number((b as HTMLElement).dataset.value) === state.qty);
  }
  const setMode = (folded: boolean) => {
    state.folded = folded;
    if (!folded) state.lidOpen = false;
    $('foldBtn').classList.toggle('on', folded);
    $('flatBtn').classList.toggle('on', !folded);
    $('lidBtn').classList.toggle('on', state.lidOpen);
    $('lidBtn').textContent = state.lidOpen ? 'Close lid' : 'Open lid';
    loop.invalidate();
  };
  $('foldBtn').addEventListener('click', () => setMode(true));
  $('flatBtn').addEventListener('click', () => setMode(false));
  $('lidBtn').addEventListener('click', () => {
    state.lidOpen = !state.lidOpen;
    setMode(true);
  });
  $('quote').addEventListener('click', () =>
    toast(
      `Quote requested: ${state.qty.toLocaleString('en-US')} × ${state.w}×${state.h}×${state.d} cm ${MATERIALS[state.mat].label} boxes`,
    ),
  );

  /* ---------- Start: show the flat dieline, then fold it up ---------- */
  buildBox();
  applyMaterial();
  updatePrice();
  resize();
  document.fonts?.ready.then(() => {
    drawPrints();
    loop.invalidate();
  });
  await precompile(renderer, scene, camera);
  loop.start();
  viewer.classList.add('ready');
  setTimeout(() => setMode(true), 900);
}
