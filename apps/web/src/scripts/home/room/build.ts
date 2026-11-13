import {
  BoxGeometry,
  CanvasTexture,
  CapsuleGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Scene,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createCodeScreen, createShipScreen } from './screens';
import { createDust } from './dust';
import { createLightShafts, createFloorShadow } from './atmosphere';
import type { Quality } from '../../../lib/three/quality';

export interface Hotspot {
  id: string;
  label: string;
  short: string;
  group: Object3D;
  anchor: Vector3;
}

const mat = (color: string, o: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {}) =>
  new MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...o });

const rbox = (w: number, h: number, d: number, r = 0.02) =>
  new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));

/** Builds the isometric studio room. Every project in the portfolio is an object in it. */
export function buildRoom(quality: Quality) {
  const scene = new Scene();
  const hotspots: Hotspot[] = [];

  const add = (geo: BufferGeometry, m: Material, x = 0, y = 0, z = 0, parent: Object3D = scene, cast = true) => {
    const mesh = new Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const hotspot = (id: string, label: string, short: string, group: Object3D, anchor: Vector3) => {
    hotspots.push({ id, label, short, group, anchor });
    group.traverse((o) => {
      if ((o as Mesh).isMesh) o.userData.hot = id;
    });
  };

  /* ---------- Room shell ---------- */
  const S = 3;
  const wood = mat('#7a5638', { roughness: 0.62 });
  add(rbox(S * 2, 0.24, S * 2, 0.04), wood, 0, -0.12, 0);
  const plank = new BoxGeometry(0.008, 0.002, S * 2);
  const plankMat = mat('#5d4029');
  for (let i = -S + 0.5; i < S; i += 0.5) add(plank, plankMat, i, 0.001, 0, scene, false);
  add(rbox(0.18, 3.2, S * 2 + 0.18, 0.03), mat('#2c2723', { roughness: 0.95 }), -S - 0.09, 1.6, -0.09);
  add(rbox(S * 2, 3.2, 0.18, 0.03), mat('#332d28', { roughness: 0.95 }), 0, 1.6, -S - 0.09);
  const skirting = mat('#1e1a17');
  add(new BoxGeometry(0.03, 0.1, S * 2), skirting, -S + 0.015, 0.05, 0);
  add(new BoxGeometry(S * 2, 0.1, 0.03), skirting, 0, 0.05, -S + 0.015);
  const rug = add(new CylinderGeometry(1.45, 1.45, 0.02, 64), mat('#3d4b49', { roughness: 1 }), 0.55, 0.012, -0.6);
  rug.scale.z = 0.72;

  const win = new Group();
  win.position.set(2.05, 1.85, -S + 0.02);
  scene.add(win);
  add(rbox(1.3, 1.25, 0.06, 0.02), mat('#1c1815'), 0, 0, 0, win);
  const sky = new MeshBasicMaterial({ color: '#f4c48a' });
  const pane = new PlaneGeometry(0.54, 0.52);
  for (const [x, y] of [
    [-0.3, 0.29],
    [0.3, 0.29],
    [-0.3, -0.29],
    [0.3, -0.29],
  ] as const)
    add(pane, sky, x, y, 0.035, win, false);

  /* ---------- Desk, monitors, lamp ---------- */
  const desk = new Group();
  desk.position.set(-0.35, 0, -S + 0.62);
  scene.add(desk);
  const oak = mat('#b98a5a', { roughness: 0.55 });
  const black = mat('#1b1a19', { roughness: 0.5 });
  add(rbox(2.5, 0.06, 1.05, 0.02), oak, 0, 0.76, 0, desk);
  for (const sx of [-1, 1]) add(rbox(0.06, 0.73, 0.9, 0.01), black, sx * 1.15, 0.365, 0, desk);

  const code = createCodeScreen();
  const ship = createShipScreen();
  const screens = new Group();
  desk.add(screens);
  const monitor = (x: number, ry: number, tex: CanvasTexture) => {
    const m = new Group();
    m.position.set(x, 0.79, -0.18);
    m.rotation.y = ry;
    screens.add(m);
    add(rbox(0.3, 0.02, 0.2, 0.01), black, 0, 0.01, 0, m);
    add(rbox(0.05, 0.36, 0.04, 0.01), black, 0, 0.19, -0.02, m);
    add(rbox(1.0, 0.64, 0.05, 0.02), black, 0, 0.62, 0.02, m);
    add(
      new PlaneGeometry(0.94, 0.58),
      new MeshBasicMaterial({ map: tex, toneMapped: false }),
      0,
      0.62,
      0.047,
      m,
      false,
    );
  };
  monitor(-0.5, 0.18, code.texture);
  monitor(0.55, -0.18, ship);
  add(rbox(0.62, 0.025, 0.2, 0.01), mat('#2b2a28'), 0.02, 0.8, 0.2, desk);
  add(rbox(0.08, 0.025, 0.12, 0.03), mat('#2b2a28'), 0.48, 0.8, 0.22, desk);
  const screenGlow = new PointLight('#66d3c5', 2.2, 2.6, 2);
  screenGlow.position.set(0, 1.4, 0.4);
  desk.add(screenGlow);
  hotspot('viewers', '3D engineering viewers', 'Viewers', screens, new Vector3(0.3, 1.78, -0.18));

  const lamp = new Group();
  lamp.position.set(1.05, 0.79, -0.25);
  desk.add(lamp);
  add(new CylinderGeometry(0.1, 0.11, 0.03, 24), black, 0, 0.015, 0, lamp);
  add(new CylinderGeometry(0.012, 0.012, 0.5, 8), black, 0, 0.26, 0.05, lamp).rotation.x = 0.25;
  add(new CylinderGeometry(0.012, 0.012, 0.42, 8), black, 0, 0.56, 0.2, lamp).rotation.x = 1.0;
  add(
    new ConeGeometry(0.1, 0.16, 24, 1, true),
    mat('#e3a95c', { side: DoubleSide, roughness: 0.4 }),
    0,
    0.62,
    0.4,
    lamp,
  ).rotation.x = -0.5;
  const bulb = new PointLight('#ffc98a', 3.2, 3.2, 2);
  bulb.position.set(0, 0.52, 0.45);
  lamp.add(bulb);

  /* ---------- Watch on a stand (watch story) ---------- */
  const watch = new Group();
  watch.position.set(-1.0, 0.79, 0.22);
  desk.add(watch);
  add(new CylinderGeometry(0.11, 0.13, 0.03, 32), mat('#2a2420'), 0, 0.015, 0, watch);
  add(new CapsuleGeometry(0.055, 0.12, 6, 16), mat('#3a2f27', { roughness: 0.9 }), 0, 0.09, 0, watch).rotation.z =
    Math.PI / 2;
  const strap = add(new TorusGeometry(0.075, 0.022, 10, 40), mat('#8b5a35', { roughness: 0.6 }), 0, 0.09, 0, watch);
  strap.scale.set(1, 1, 1.1);
  strap.rotation.y = Math.PI / 2;
  const face = new Group();
  face.position.set(0, 0.098, 0.088);
  watch.add(face);
  add(
    new CylinderGeometry(0.068, 0.068, 0.025, 40).rotateX(Math.PI / 2),
    mat('#c9ccd1', { metalness: 1, roughness: 0.3 }),
    0,
    0,
    0,
    face,
  );
  add(new CircleGeometry(0.058, 40), mat('#18233f', { roughness: 0.35 }), 0, 0, 0.0131, face, false);
  const handMat = new MeshBasicMaterial({ color: '#f2ede5' });
  const hand = (w: number, l: number, z: number, m: Material) => {
    const h = new Mesh(new PlaneGeometry(w, l).translate(0, l * 0.45, 0), m);
    h.position.z = z;
    face.add(h);
    return h;
  };
  const hands = {
    hour: hand(0.008, 0.03, 0.014, handMat),
    minute: hand(0.005, 0.045, 0.0145, handMat),
    second: hand(0.0025, 0.05, 0.015, new MeshBasicMaterial({ color: '#e3a95c' })),
  };
  hotspot('watch', '3D watch story', 'Watch', watch, new Vector3(-0.15, 0.12, 0.1));

  /* ---------- Chair (configurator) ---------- */
  const chair = new Group();
  chair.position.set(0.85, 0, -0.55);
  chair.rotation.y = -0.6;
  scene.add(chair);
  const linen = mat('#cdbfa8', { roughness: 0.95 });
  const legM = mat('#a87a4c', { roughness: 0.5 });
  add(rbox(0.62, 0.1, 0.58, 0.05), linen, 0, 0.47, 0, chair);
  add(rbox(0.64, 0.04, 0.6, 0.02), legM, 0, 0.405, 0, chair);
  const legGeo = new CylinderGeometry(0.022, 0.016, 0.4, 12);
  for (const [x, z] of [
    [-0.26, -0.24],
    [0.26, -0.24],
    [-0.26, 0.24],
    [0.26, 0.24],
  ] as const) {
    const l = add(legGeo, legM, x, 0.2, z, chair);
    l.rotation.z = x * 0.15;
    l.rotation.x = -z * 0.15;
  }
  const back = new Group();
  back.position.set(0, 0.5, 0.27);
  back.rotation.x = 0.18;
  chair.add(back);
  add(rbox(0.62, 0.5, 0.08, 0.04), linen, 0, 0.3, 0, back);
  add(rbox(0.035, 0.5, 0.035, 0.01), legM, -0.29, 0.22, 0.03, back);
  add(rbox(0.035, 0.5, 0.035, 0.01), legM, 0.29, 0.22, 0.03, back);
  hotspot('chair', 'Furniture configurator', 'Configurator', chair, new Vector3(0, 1.05, 0.1));

  /* ---------- Shipping boxes (packaging studio) ---------- */
  const boxes = new Group();
  boxes.position.set(2.15, 0, 1.3);
  boxes.rotation.y = 0.35;
  scene.add(boxes);
  const kraft = mat('#c49a6c', { roughness: 0.9 });
  const tape = mat('#e9dcc6', { roughness: 0.6 });
  const logoTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = g.strokeStyle = '#2b2420';
    g.font = 'bold 44px Georgia';
    g.textAlign = 'center';
    g.fillText('P', 64, 82);
    g.lineWidth = 5;
    g.beginPath();
    g.arc(64, 66, 44, 0, 7);
    g.stroke();
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  })();
  const logoMat = new MeshStandardMaterial({ map: logoTex, transparent: true, roughness: 0.9 });
  const carton = (w: number, h: number, d: number, x: number, y: number, z: number, ry: number) => {
    const g = new Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    boxes.add(g);
    add(rbox(w, h, d, 0.015), kraft, 0, h / 2, 0, g);
    add(new BoxGeometry(w + 0.004, 0.004, 0.08), tape, 0, h + 0.001, 0, g, false);
    const s = Math.min(w, h) * 0.45;
    add(new PlaneGeometry(s, s), logoMat, 0, h * 0.5, d / 2 + 0.002, g, false);
  };
  carton(0.7, 0.45, 0.55, 0, 0, 0, 0);
  carton(0.5, 0.32, 0.42, 0.04, 0.45, 0.02, 0.25);
  carton(0.32, 0.22, 0.3, -0.62, 0, 0.18, -0.3);
  hotspot('box', 'Packaging box studio', 'Box studio', boxes, new Vector3(0, 1.0, 0));

  /* ---------- Wall shelf with ship model ---------- */
  const shelf = new Group();
  shelf.position.set(-S + 0.18, 1.95, 0.55);
  scene.add(shelf);
  add(rbox(0.34, 0.04, 1.5, 0.01), oak, 0, 0, 0, shelf);
  for (const z of [-0.6, 0.6]) add(rbox(0.2, 0.12, 0.03, 0.005), black, -0.06, -0.07, z, shelf);
  const model = new Group();
  model.position.set(0.02, 0.03, -0.15);
  model.rotation.y = Math.PI / 2;
  shelf.add(model);
  {
    const hull = new Shape();
    hull.moveTo(-0.5, 0.1);
    hull.lineTo(0.48, 0.1);
    hull.lineTo(0.56, 0.17);
    hull.lineTo(0.56, 0.2);
    hull.lineTo(-0.5, 0.2);
    hull.lineTo(-0.5, 0.1);
    const hg = new ExtrudeGeometry(hull, { depth: 0.14, bevelEnabled: false });
    hg.translate(0, -0.1, -0.07);
    add(hg, mat('#1f3a40', { roughness: 0.6 }), 0, 0, 0, model);
    add(new BoxGeometry(1.04, 0.012, 0.142), mat('#b5543d'), 0.02, 0.006, 0, model);
    const sup = mat('#e8e3da', { roughness: 0.7 });
    add(rbox(0.16, 0.1, 0.12, 0.01), sup, -0.36, 0.15, 0, model);
    add(rbox(0.1, 0.07, 0.1, 0.01), sup, -0.36, 0.235, 0, model);
    add(new CylinderGeometry(0.018, 0.022, 0.09, 12), mat('#e3a95c'), -0.3, 0.3, 0, model);
    const wire = new LineSegments(
      new EdgesGeometry(new BoxGeometry(0.6, 0.08, 0.12, 4, 1, 1)),
      new LineBasicMaterial({ color: '#66d3c5' }),
    );
    wire.position.set(0.12, 0.14, 0);
    model.add(wire);
  }
  for (const [z, h, c] of [
    [0.35, 0.26, '#6b3b2e'],
    [0.42, 0.3, '#2f4a52'],
    [0.49, 0.24, '#c49a6c'],
    [0.56, 0.28, '#3a3230'],
  ] as const)
    add(rbox(0.2, h, 0.06, 0.008), mat(c), 0, 0.02 + h / 2, z, shelf);
  hotspot('viewers', 'Ship & offshore viewers', 'Ship viewer', model, new Vector3(0, 0.45, 0));

  /* ---------- Framed ink drawing ---------- */
  const art = new Group();
  art.position.set(-S + 0.02, 1.55, -1.45);
  art.rotation.y = Math.PI / 2;
  scene.add(art);
  {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 340;
    const g = c.getContext('2d')!;
    g.fillStyle = '#efe8dc';
    g.fillRect(0, 0, 256, 340);
    g.strokeStyle = '#1b1a19';
    g.lineCap = 'round';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(128, 40);
    g.bezierCurveTo(40, 90, 210, 150, 128, 200);
    g.bezierCurveTo(60, 240, 190, 280, 128, 310);
    g.stroke();
    g.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) {
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.moveTo(128, 70 + i * 50);
        g.bezierCurveTo(128 + sx * (58 - i * 6), 60 + i * 50, 128 + sx * 68, 110 + i * 40, 128 + sx * 36, 120 + i * 45);
        g.stroke();
      }
    }
    g.fillStyle = '#b5543d';
    g.beginPath();
    g.arc(128, 200, 9, 0, 7);
    g.fill();
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    add(rbox(0.78, 1.02, 0.04, 0.01), black, 0, 0, 0, art);
    add(new PlaneGeometry(0.7, 0.94), new MeshStandardMaterial({ map: t, roughness: 0.9 }), 0, 0, 0.021, art, false);
  }

  /* ---------- Plant ---------- */
  const plant = new Group();
  plant.position.set(-2.4, 0, -2.35);
  scene.add(plant);
  add(new CylinderGeometry(0.22, 0.17, 0.42, 24), mat('#d9d2c5', { roughness: 0.8 }), 0, 0.21, 0, plant);
  const leafM = mat('#3f6b4a', { roughness: 0.8, side: DoubleSide });
  const leafGeo = new SphereGeometry(0.16, 12, 8).scale(0.5, 1.6, 0.12);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const h = 0.7 + (i % 3) * 0.18;
    const leaf = add(leafGeo, leafM, Math.cos(a) * 0.12, 0.42 + h * 0.4, Math.sin(a) * 0.12, plant);
    leaf.rotation.set(Math.sin(a) * 0.5, -a, Math.cos(a) * 0.5);
  }

  /* ---------- Garment rail (Halde storefront) ---------- */
  const rack = new Group();
  rack.position.set(-S + 0.02, 0, 2.05);
  scene.add(rack);
  {
    const steel = mat('#2a2826', { metalness: 0.8, roughness: 0.35 });
    add(new CylinderGeometry(0.014, 0.014, 1.05, 10), steel, 0.3, 1.78, 0, rack).rotation.x = Math.PI / 2;
    for (const z of [-0.5, 0.5])
      add(new CylinderGeometry(0.012, 0.012, 0.3, 8), steel, 0.15, 1.78, z, rack).rotation.z = Math.PI / 2;
    const tee = new Shape();
    tee.moveTo(-0.12, 0.37);
    for (const [x, y] of [
      [-0.35, 0.3],
      [-0.5, 0.1],
      [-0.4, 0.02],
      [-0.27, 0.14],
      [-0.27, -0.38],
      [0.27, -0.38],
      [0.27, 0.14],
      [0.4, 0.02],
      [0.5, 0.1],
      [0.35, 0.3],
      [0.12, 0.37],
    ] as const)
      tee.lineTo(x, y);
    tee.quadraticCurveTo(0, 0.27, -0.12, 0.37);
    const teeGeo = new ExtrudeGeometry(tee, {
      depth: 0.04,
      bevelEnabled: true,
      bevelSize: 0.015,
      bevelThickness: 0.015,
      bevelSegments: 2,
      curveSegments: 8,
    }).translate(0, 0, -0.02);
    const hookGeo = new TorusGeometry(0.035, 0.006, 6, 16, Math.PI * 1.4);
    const barGeo = new CylinderGeometry(0.006, 0.006, 0.6, 6);
    const barMat = mat('#8a6a48');
    for (const [c, z, ry] of [
      ['#1f4a3c', -0.24, 0.02],
      ['#d9cdb8', 0.06, -0.05],
      ['#3b3f4a', 0.34, 0.04],
    ] as const) {
      const h = new Group();
      h.position.set(0.3, 1.78, z);
      h.rotation.y = Math.PI / 2 + ry;
      rack.add(h);
      add(hookGeo, steel, 0, 0.02, 0, h).rotation.z = -0.2;
      add(barGeo, barMat, 0, -0.1, 0, h).rotation.z = Math.PI / 2;
      add(teeGeo, mat(c, { roughness: 0.95 }), 0, -0.47, 0, h).scale.setScalar(0.9);
    }
  }
  hotspot('store', 'Headless Shopify store', 'Store', rack, new Vector3(0.3, 2.05, 0));

  /* ---------- Atmosphere ---------- */
  scene.add(createFloorShadow());
  scene.add(createLightShafts(S));
  const dust = createDust(Math.round(260 * quality.particles), S);
  scene.add(dust.points);

  /* ---------- Lights (the sun's shadow map is rendered once: the room does not move) ---------- */
  scene.add(new HemisphereLight('#fff3e2', '#2a2420', 0.9));
  const sun = new DirectionalLight('#ffd7a8', 2.2);
  sun.position.set(4, 7, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 });
  scene.add(sun);
  const fill = new DirectionalLight('#9fc7ff', 0.35);
  fill.position.set(-3, 4, 6);
  scene.add(fill);

  // Small objects never cast a visible shadow at this scale; skipping them shortens the shadow pass.
  for (const g of [face, win, art]) g.traverse((o) => (o.castShadow = false));

  return { scene, hotspots, face, hands, chair, boxes, rack, screens, bulb, code, dust, half: S };
}
