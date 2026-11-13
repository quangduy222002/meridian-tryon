import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  ShadowMaterial,
  Vector3,
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
import { $, toast, usd } from '../../lib/dom/chrome';
import { boxSpecs, type BoxTexture } from './textures';
import { createDieline } from './dieline';
import { createPallet } from './pallet';

const MATERIALS = {
  kraft: { label: 'Kraft', out: '#c79b6a', in: '#d8b88f', rough: 0.95, ink: '#3b2a1a', add: 0 },
  white: { label: 'White', out: '#f4f1ea', in: '#e9e4d9', rough: 0.8, ink: '#1f1d1a', add: 0.05 },
  black: { label: 'Matte Black', out: '#2a2927', in: '#3a3835', rough: 0.85, ink: '#e8d3a8', add: 0.15 },
  coral: { label: 'Coral', out: '#e0745a', in: '#f2e6da', rough: 0.6, ink: '#ffffff', add: 0.25 },
  teal: { label: 'Teal', out: '#2f7a78', in: '#e7efe9', rough: 0.6, ink: '#ffffff', add: 0.25 },
  lilac: { label: 'Lilac', out: '#b9a6d6', in: '#f1ecf6', rough: 0.6, ink: '#2b2140', add: 0.25 },
};
type MaterialKey = keyof typeof MATERIALS;
const QTY = [100, 500, 1000, 2500] as const;
const DISCOUNT: Record<(typeof QTY)[number], number> = { 100: 1, 500: 0.72, 1000: 0.6, 2500: 0.5 };
const TH = 0.02; // board thickness (1 unit = 10 cm)

/** Camera directions for the view presets. */
const VIEWS = {
  three: new Vector3(0.62, 0.55, 0.72).normalize(),
  top: new Vector3(0.001, 1, 0.08).normalize(),
  front: new Vector3(0.0, 0.32, 1).normalize(),
};
type View = keyof typeof VIEWS;

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
  mode: 'box' as 'box' | 'order',
  view: 'three' as View,
};

export async function startBoxStudio() {
  const viewer = $('viewer');
  const canvas = viewer.querySelector('canvas')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const quality = getQuality();
  const renderer = createRenderer(canvas, quality, { shadows: true, toneMapping: NeutralToneMapping, exposure: 0.95 });
  renderer.shadowMap.autoUpdate = false; // shadows refresh only while the box folds or changes

  const tex = await generateTextures<{ size: number }, BoxTexture>({
    build: (p) => boxSpecs(p.size),
    params: { size: Math.min(1024, quality.textureSize) },
    worker: () => new Worker(new URL('./textures.worker.ts', import.meta.url), { type: 'module' }),
    anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()),
    renderer,
  });

  /* ---------- Studio ---------- */
  const scene = new Scene();
  scene.environment = bakeStudio(renderer, LIGHT_STUDIO, '#ddd5c8');
  scene.environmentIntensity = 0.7;
  scene.add(new AmbientLight(0xffffff, 0.15));
  const sun = new DirectionalLight(0xfff4e2, 2.1);
  sun.position.set(3, 7, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
  sun.shadow.bias = -0.0005;
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 30 });
  scene.add(sun);
  const ground = new Mesh(new PlaneGeometry(60, 60), new ShadowMaterial({ opacity: 0.14 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const contact = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({ color: '#000', alphaMap: tex.contact, transparent: true, opacity: 0.3, depthWrite: false }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.002;
  scene.add(contact);

  const camera = new PerspectiveCamera(32, 1, 0.1, 200);
  camera.position.set(4.2, 3.6, 5.2);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minDistance = 2;
  controls.maxDistance = 60;
  controls.autoRotate = !reduce;
  controls.autoRotateSpeed = 0.5;
  let autoFrame = true; // camera follows size/mode changes until the user takes over
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    autoFrame = false;
  });

  /* ---------- Board materials ---------- */
  // BoxGeometry groups: +x, -x, +y, -y, +z, -z. A panel's ±x/±z faces are its cut edges, +y is the inside.
  const outMat = new MeshStandardMaterial({ color: MATERIALS.kraft.out, roughness: 0.95, map: tex.fibre });
  const inMat = new MeshStandardMaterial({ color: MATERIALS.kraft.in, roughness: 0.95, map: tex.fibre });
  const edgeMat = new MeshStandardMaterial({ map: tex.flute, roughness: 1 });
  const panelMats = [edgeMat, edgeMat, inMat, outMat, edgeMat, edgeMat];
  const lidCanvas = document.createElement('canvas');
  const frontCanvas = document.createElement('canvas');
  const lidTex = new CanvasTexture(lidCanvas);
  const frontTex = new CanvasTexture(frontCanvas);
  for (const t of [lidTex, frontTex]) {
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
  }
  const decalMat = (map: CanvasTexture) =>
    new MeshStandardMaterial({ map, transparent: true, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -4 });
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
  const dieline = createDieline();
  scene.add(dieline.group);
  const pallet = createPallet([outMat, outMat, outMat, outMat, outMat, outMat]);
  scene.add(pallet.group);

  const tuckOf = () => Math.min((state.h / 10) * 0.6, 0.5);
  const buildBox = () => {
    if (box) {
      box.traverse((o) => (o as Mesh).geometry?.dispose());
      scene.remove(box);
    }
    const W = state.w / 10;
    const H = state.h / 10;
    const D = state.d / 10;
    const tuck = tuckOf();
    box = new Group();
    box.position.y = TH / 2;
    box.visible = state.mode === 'box';
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
    dieline.rebuild(W, H, D, tuck, TH);
    drawPrints();
    $('dimsBadge').textContent = `${state.w} × ${state.h} × ${state.d} cm`;
    $('dimW').textContent = `W ${state.w} cm`;
    $('dimD').textContent = `D ${state.d} cm`;
    $('dimH').textContent = `H ${state.h} cm`;
    autoFrame = true;
    renderer.shadowMap.needsUpdate = true;
  };

  /* ---------- Fold animation ---------- */
  let fold = 0;
  let open = 0;
  const applyFold = () => {
    const sides = (smoothstep(0, 0.5, fold) * Math.PI) / 2;
    hinges.pFront.rotation.x = -sides;
    hinges.pBack.rotation.x = sides;
    hinges.pLeft.rotation.z = (-smoothstep(0.1, 0.55, fold) * Math.PI) / 2;
    hinges.pRight.rotation.z = (smoothstep(0.1, 0.55, fold) * Math.PI) / 2;
    hinges.pLid.rotation.x = (smoothstep(0.55, 0.85, fold) * (1 - 0.6 * open) * Math.PI) / 2;
    hinges.pTuck.rotation.x = (smoothstep(0.8, 1, fold) * (1 - open) * Math.PI) / 2;
  };

  /* ---------- Dimension labels (dieline) ---------- */
  const labels = {
    width: $('dimW'),
    depth: $('dimD'),
    height: $('dimH'),
  };
  const tmp = new Vector3();
  const placeLabels = (alpha: number) => {
    $('dims').style.opacity = alpha.toFixed(2);
    if (alpha < 0.01) return;
    const w = viewer.clientWidth;
    const h = viewer.clientHeight;
    for (const k of ['width', 'depth', 'height'] as const) {
      tmp.copy(dieline.anchors[k]).project(camera);
      labels[k].style.transform =
        `translate3d(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * h}px, 0) translate(-50%, -50%)`;
    }
  };

  /* ---------- Camera framing ---------- */
  const goalTarget = new Vector3();
  const goalPos = new Vector3();
  /** Distance at which a sphere of radius r fills the view, whatever the viewer's shape. */
  const fitDistance = (r: number) => {
    const v = (camera.fov * Math.PI) / 180;
    const h = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
    return (r / Math.sin(Math.min(v, h) / 2)) * 1.08;
  };
  const frameGoal = () => {
    if (state.mode === 'order') {
      const top = pallet.height();
      goalTarget.set(0, top * 0.45, 0);
      return fitDistance(Math.hypot(12, 8, top) / 2);
    }
    const W = state.w / 10;
    const H = state.h / 10;
    const D = state.d / 10;
    if (fold > 0.5) {
      goalTarget.set(0, H * 0.5, 0);
      return Math.max(fitDistance(Math.hypot(W, H + open * D, D) / 2), 2.6);
    }
    // Flat blank: front flap, base, back, lid and tuck laid end to end.
    const zMax = D / 2 + H;
    const zMin = -(D / 2 + H + D + tuckOf());
    goalTarget.set(0, 0, (zMax + zMin) / 2);
    return fitDistance(Math.hypot(W + 2 * H, zMax - zMin) / 2);
  };

  /* ---------- Render on demand ---------- */
  const frame = (dt: number) => {
    const foldTo = state.folded ? 1 : 0;
    const openTo = state.lidOpen && state.folded ? 1 : 0;
    const folding = fold !== foldTo || open !== openTo;
    const speed = reduce ? 100 : 1;
    fold += Math.sign(foldTo - fold) * Math.min(Math.abs(foldTo - fold), dt * 0.55 * speed);
    open += Math.sign(openTo - open) * Math.min(Math.abs(openTo - open), dt * 1.4 * speed);
    applyFold();
    if (folding) renderer.shadowMap.needsUpdate = true;
    const flatness = state.mode === 'box' ? 1 - smoothstep(0, 0.12, fold) : 0;
    dieline.setOpacity(flatness);

    let framing = false;
    if (autoFrame) {
      const dist = frameGoal();
      const dir =
        state.view === 'three' && controls.autoRotate
          ? camera.position.clone().sub(controls.target).normalize()
          : VIEWS[state.view];
      goalPos.copy(goalTarget).addScaledVector(dir, dist);
      const r = reduce ? Infinity : 3;
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
      framing = camera.position.distanceTo(goalPos) > 0.01 || controls.target.distanceTo(goalTarget) > 0.005;
    }
    const moving = controls.update(dt);
    renderer.render(scene, camera);
    placeLabels(flatness);
    return folding || framing || moving || controls.autoRotate;
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

  /* ---------- Order (pallet) view ---------- */
  const updatePallet = () => {
    const plan = pallet.layout(state.w / 10, state.h / 10, state.d / 10, state.qty);
    $('palletInfo').textContent =
      `${state.qty.toLocaleString('en-US')} boxes · ${plan.perPallet} per pallet · ${plan.pallets} pallet${plan.pallets > 1 ? 's' : ''}`;
    const W = state.w / 10;
    const D = state.d / 10;
    const s = state.mode === 'order' ? 14 : Math.max(W, D) * 1.6;
    contact.scale.set(s, s, 1);
    renderer.shadowMap.needsUpdate = true;
  };
  const setView = (v: View) => {
    state.view = v;
    document
      .querySelectorAll('[data-view]')
      .forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.view === v));
  };
  const setMode = (mode: 'box' | 'order') => {
    state.mode = mode;
    if (mode === 'order') setView('three');
    if (box) box.visible = mode === 'box';
    pallet.group.visible = mode === 'order';
    viewer.classList.toggle('order', mode === 'order');
    document
      .querySelectorAll('[data-mode]')
      .forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.mode === mode));
    updatePallet();
    autoFrame = true;
    loop.invalidate();
  };

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
      updatePallet();
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
      updatePallet();
      loop.invalidate();
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
  const setFold = (folded: boolean) => {
    if (state.mode !== 'box') setMode('box');
    state.folded = folded;
    if (!folded) state.lidOpen = false;
    $('foldBtn').classList.toggle('on', folded && !state.lidOpen);
    $('flatBtn').classList.toggle('on', !folded);
    $('lidBtn').classList.toggle('on', state.lidOpen);
    $('lidBtn').textContent = state.lidOpen ? 'Close lid' : 'Open lid';
    autoFrame = true;
    loop.invalidate();
  };
  $('foldBtn').addEventListener('click', () => {
    state.lidOpen = false;
    if (state.view === 'top') setView('three');
    setFold(true);
  });
  $('flatBtn').addEventListener('click', () => {
    setView('top');
    setFold(false);
  });
  $('lidBtn').addEventListener('click', () => {
    state.lidOpen = !state.lidOpen;
    if (state.view === 'top') setView('three');
    setFold(true);
  });
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]'))
    b.addEventListener('click', () => setMode(b.dataset.mode as 'box' | 'order'));
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) {
    b.addEventListener('click', () => {
      setView(b.dataset.view as View);
      controls.autoRotate = false;
      autoFrame = true;
      loop.invalidate();
    });
  }
  $('quote').addEventListener('click', () =>
    toast(
      `Quote requested: ${state.qty.toLocaleString('en-US')} × ${state.w}×${state.h}×${state.d} cm ${MATERIALS[state.mat].label} boxes`,
    ),
  );

  /* ---------- Start: show the flat dieline, then fold it up ---------- */
  buildBox();
  applyMaterial();
  updatePrice();
  updatePallet();
  resize();
  document.fonts?.ready.then(() => {
    drawPrints();
    loop.invalidate();
  });
  await precompile(renderer, scene, camera);
  loop.start();
  viewer.classList.add('ready');
  setTimeout(() => setFold(true), 1100);
}
