/**
 * Furniture built from rounded boxes and cylinders. Each builder returns a group whose origin is the centre of its
 * footprint on the floor, front facing +z, matching FURNITURE sizes. The "main" material takes the item's colour;
 * the design style (styles.ts) decides the timber, the metal, how pieces stand (tapered legs, slim metal legs, a
 * recessed plinth, turned legs or rattan) and how soft their edges are.
 */
import {
  Box3,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
  type Object3D,
  type Material,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { FURNITURE } from './catalog';
import { LIBRARY, bundled, modelUrl } from './library';
import { CUSTOM_PARTS, type CustomPart } from './custom';
import { styleOf, type DesignStyle } from './styles';

const geoCache = new Map<string, BufferGeometry>();
/** Edge softness of the style being built (set per build). */
let soft = 1;
const rbox = (w: number, h: number, d: number, r = 0.02) => {
  const rr = Math.min(r * soft, w / 2, h / 2, d / 2);
  const k = `${w},${h},${d},${rr}`;
  let g = geoCache.get(k);
  if (!g) geoCache.set(k, (g = new RoundedBoxGeometry(w, h, d, 2, rr)));
  return g;
};
const cyl = (rt: number, rb: number, h: number, seg = 16) => {
  const k = `c${rt},${rb},${h},${seg}`;
  let g = geoCache.get(k);
  if (!g) geoCache.set(k, (g = new CylinderGeometry(rt, rb, h, seg)));
  return g;
};
const ring = (r: number, t: number) => {
  const k = `t${r},${t}`;
  let g = geoCache.get(k);
  if (!g) geoCache.set(k, (g = new TorusGeometry(r, t, 8, 24)));
  return g;
};

let leafGeo: SphereGeometry | null = null;
let frondGeo: SphereGeometry | null = null;
const std = (color: string, roughness = 0.6, metalness = 0) =>
  new MeshStandardMaterial({ color, roughness, metalness });
const shared = {
  dark: std('#2f3135', 0.5),
  white: std('#f4f3f0', 0.25),
  linen: std('#efe9de', 0.9),
  glass: new MeshStandardMaterial({ color: '#dfeaee', roughness: 0.05, transparent: true, opacity: 0.25 }),
  water: std('#cfe0e6', 0.05, 0.2),
  leaf: std('#5f7f4f', 0.7),
  palm: std('#4f7a45', 0.65),
  soil: std('#4a3a2c', 0.95),
  screen: std('#16181c', 0.2, 0.3),
  canvas: std('#e9e3d8', 0.9),
  rattan: std('#c9a26b', 0.85),
  shade: new MeshStandardMaterial({ color: '#fff1d6', emissive: '#ffd9a0', emissiveIntensity: 0.15, roughness: 0.9 }),
};

/** The glowing parts of light fittings (diffusers, bulbs): bright while the lights are on. */
const glow = new MeshStandardMaterial({
  color: '#fff7ea',
  emissive: '#ffdcaa',
  emissiveIntensity: 0.05,
  roughness: 0.5,
});

/** Lights the glowing parts of every fitting (and the lamp shades) in the light's colour. */
export function setFixtureGlow(on: boolean, color: Color) {
  glow.emissive.copy(color);
  glow.emissiveIntensity = on ? 2.4 : 0.05;
  shared.shade.emissive.copy(color);
  shared.shade.emissiveIntensity = on ? 1.4 : 0.15;
}

const matCache = new Map<string, MeshStandardMaterial>();
const cached = (k: string, make: () => MeshStandardMaterial) => {
  let m = matCache.get(k);
  if (!m) matCache.set(k, (m = make()));
  return m;
};
const mainMat = (color: string, type: string) => {
  const fabric = FURNITURE[type]?.role === 'fabric' || type === 'book';
  return cached(`${fabric ? 'f' : 'c'}:${color}`, () => std(color, fabric ? 0.92 : 0.5));
};

/** The style's materials and leg treatment, for the builders. */
interface Look {
  style: DesignStyle;
  wood: MeshStandardMaterial;
  metal: MeshStandardMaterial;
  /** Four legs (or a plinth, per the style) under a w × d top, h tall, inset from the edges. */
  legs(w: number, d: number, h: number, inset?: number): void;
  /** An adder for a sub-assembly placed at (x, z) and turned by rot (a chair round a table). */
  sub(x: number, z: number, rot: number): Add;
}

type Add = (g: BufferGeometry, m: Material, x: number, y: number, z: number) => Mesh;
type Build = (add: Add, m: MeshStandardMaterial, w: number, d: number, h: number, look: Look) => void;

/** A piece of art for the wall: abstract colour fields in the style's accents. */
function artwork(add: Add, look: Look, m: Material, w: number, y0: number, h: number) {
  add(rbox(w, h, 0.035, 0.004), m, 0, y0 + h / 2, -0.005);
  add(rbox(w - 0.1, h - 0.1, 0.01, 0.002), shared.canvas, 0, y0 + h / 2, 0.015);
  const [a, b] = [look.style.accent[0] ?? '#b0674c', look.style.fabric[1] ?? '#8a9a8c'];
  add(
    rbox(w * 0.42, h * 0.5, 0.004, 0.001),
    cached(`p:${a}`, () => std(a, 0.9)),
    -w * 0.12,
    y0 + h * 0.55,
    0.022,
  );
  add(
    rbox(w * 0.3, h * 0.3, 0.004, 0.001),
    cached(`p:${b}`, () => std(b, 0.9)),
    w * 0.18,
    y0 + h * 0.38,
    0.023,
  );
}

const builders: Record<string, Build> = {
  sofa(add, m, w, d, _h, look) {
    add(rbox(w, 0.36, d, 0.06), m, 0, 0.27, 0);
    add(rbox(w, 0.5, 0.22, 0.08), m, 0, 0.62, -d / 2 + 0.11);
    for (const s of [-1, 1]) add(rbox(0.2, 0.6, d, 0.08), m, s * (w / 2 - 0.1), 0.4, 0);
    const seats = w > 1.9 ? 3 : 2;
    const sw = (w - 0.44) / seats;
    for (let i = 0; i < seats; i++)
      add(rbox(sw - 0.02, 0.14, d - 0.3, 0.06), m, -w / 2 + 0.22 + sw * (i + 0.5), 0.52, 0.08);
    for (let i = 0; i < seats; i++)
      add(rbox(sw - 0.1, 0.36, 0.14, 0.07), m, -w / 2 + 0.22 + sw * (i + 0.5), 0.74, -d / 2 + 0.28);
    look.legs(w - 0.1, d - 0.1, 0.09, 0.08);
  },
  sofa2(add, m, w, d, h, look) {
    builders.sofa!(add, m, w, d, h, look);
  },
  sofaL(add, m, w, d, _h, look) {
    const depth = 0.95;
    // Long run along the back, chaise returning towards the front on the right.
    add(rbox(w, 0.36, depth, 0.06), m, 0, 0.27, -d / 2 + depth / 2);
    add(rbox(depth, 0.36, d - depth + 0.02, 0.06), m, w / 2 - depth / 2, 0.27, depth / 2 - 0.01);
    add(rbox(w, 0.5, 0.22, 0.08), m, 0, 0.62, -d / 2 + 0.11);
    add(rbox(0.2, 0.6, depth, 0.08), m, -w / 2 + 0.1, 0.4, -d / 2 + depth / 2);
    const seats = 3;
    const sw = (w - depth - 0.2) / seats;
    for (let i = 0; i < seats; i++) {
      const x = -w / 2 + 0.2 + sw * (i + 0.5);
      add(rbox(sw - 0.02, 0.14, depth - 0.3, 0.06), m, x, 0.52, -d / 2 + depth / 2 + 0.08);
      add(rbox(sw - 0.1, 0.36, 0.14, 0.07), m, x, 0.74, -d / 2 + 0.28);
    }
    add(rbox(depth - 0.06, 0.14, d - 0.3, 0.06), m, w / 2 - depth / 2, 0.52, 0.12);
    look.legs(w - 0.1, d - 0.1, 0.09, 0.08);
  },
  armchair(add, m, w, d, _h, look) {
    add(rbox(w, 0.36, d, 0.06), m, 0, 0.3, 0);
    add(rbox(w, 0.45, 0.2, 0.08), m, 0, 0.64, -d / 2 + 0.1);
    for (const s of [-1, 1]) add(rbox(0.16, 0.55, d, 0.06), m, s * (w / 2 - 0.08), 0.39, 0);
    add(rbox(w - 0.36, 0.12, d - 0.28, 0.06), m, 0, 0.53, 0.06);
    look.legs(w - 0.06, d - 0.06, 0.12, 0.08);
  },
  armchairWing(add, m, w, d, h, look) {
    add(rbox(w, 0.32, d, 0.05), m, 0, 0.36, 0);
    add(rbox(w, h - 0.3, 0.2, 0.08), m, 0, 0.3 + (h - 0.3) / 2, -d / 2 + 0.1);
    // Wings either side of the head, rolled arms below.
    for (const s of [-1, 1]) {
      add(rbox(0.14, 0.45, d * 0.55, 0.06), m, s * (w / 2 - 0.07), h - 0.3, -d / 2 + d * 0.28);
      add(rbox(0.14, 0.32, d, 0.07), m, s * (w / 2 - 0.07), 0.6, 0);
    }
    add(rbox(w - 0.32, 0.12, d - 0.26, 0.06), m, 0, 0.57, 0.05);
    look.legs(w - 0.06, d - 0.06, 0.2, 0.06);
  },
  armchairRattan(add, m, w, d, h) {
    // A woven tub on a woven base, a loose cushion.
    add(cyl(w / 2, w / 2 - 0.05, h - 0.38, 24), m, 0, 0.38 + (h - 0.38) / 2, -0.04);
    add(cyl(w / 2 - 0.08, w / 2 - 0.1, h - 0.36, 24), shared.linen, 0, 0.42 + (h - 0.38) / 2, 0.02);
    add(cyl(w / 2 - 0.06, w / 2 - 0.06, 0.1, 24), shared.linen, 0, 0.43, 0.04);
    add(cyl(w / 2 - 0.12, w / 2 - 0.04, 0.36, 24), m, 0, 0.18, 0);
    for (let i = 0; i < 4; i++)
      add(ring(w / 2 - 0.06 + i * 0.008, 0.008), m, 0, 0.06 + i * 0.09, 0).rotation.x = Math.PI / 2;
    void d;
  },
  ottoman(add, m, w, _d, h) {
    add(cyl(w / 2, w / 2, h, 24), m, 0, h / 2, 0);
    add(cyl(w / 2 - 0.02, w / 2 - 0.02, 0.01, 24), shared.dark, 0, 0.005, 0);
  },
  bench(add, m, w, d, h, look) {
    add(rbox(w, 0.05, d, 0.015), m, 0, h - 0.025, 0);
    look.legs(w - 0.1, d - 0.08, h - 0.05, 0.02);
  },
  coffee(add, m, w, d, h, look) {
    add(rbox(w, 0.04, d, 0.02), m, 0, h - 0.02, 0);
    add(rbox(w - 0.1, 0.02, d - 0.1, 0.01), m, 0, 0.14, 0);
    look.legs(w, d, h - 0.04, 0.06);
  },
  coffeeRound(add, m, w, _d, h, look) {
    add(cyl(w / 2, w / 2, 0.04, 40), m, 0, h - 0.02, 0);
    if (look.style.legs === 'plinth' || look.style.legs === 'rattan')
      add(
        cyl(w / 2 - 0.14, w / 2 - 0.1, h - 0.04, 32),
        look.style.legs === 'rattan' ? shared.rattan : m,
        0,
        (h - 0.04) / 2,
        0,
      );
    else look.legs(w * 0.62, w * 0.62, h - 0.04, 0);
  },
  sideTable(add, m, w, _d, h, look) {
    add(cyl(w / 2, w / 2, 0.03, 32), m, 0, h - 0.015, 0);
    add(cyl(0.02, 0.02, h - 0.03), look.metal, 0, (h - 0.03) / 2, 0);
    add(cyl(w / 2 - 0.06, w / 2 - 0.04, 0.02, 32), look.metal, 0, 0.01, 0);
  },
  teaTable(add, m, w, d, h, look) {
    // Low square tea table (bàn trà) with four drum stools.
    add(rbox(0.8, 0.05, 0.8, 0.01), m, 0, h - 0.025, 0);
    add(rbox(0.7, 0.06, 0.7, 0.01), m, 0, h - 0.08, 0);
    look.legs(0.78, 0.78, h - 0.05, 0.04);
    for (const [x, z] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ] as const) {
      add(cyl(0.16, 0.15, 0.38, 20), m, (x * w) / 2.6, 0.19, (z * d) / 2.6);
      add(cyl(0.165, 0.165, 0.02, 20), shared.rattan, (x * w) / 2.6, 0.38, (z * d) / 2.6);
    }
    add(cyl(0.05, 0.04, 0.08, 16), shared.white, 0.12, h + 0.04, 0.05);
  },
  rug(add, m, w, d, h) {
    add(rbox(w, h, d, 0.005), m, 0, h / 2, 0);
    add(
      rbox(w - 0.12, h + 0.001, d - 0.12, 0.004),
      cached(`rb:${m.color.getHexString()}`, () => {
        const c = m.color.clone().multiplyScalar(0.88);
        return std(`#${c.getHexString()}`, 0.95);
      }),
      0,
      h / 2 + 0.0005,
      0,
    );
  },
  rugRound(add, m, w, _d, h) {
    add(cyl(w / 2, w / 2, h, 48), m, 0, h / 2, 0);
    add(
      ring(w / 2 - 0.1, 0.012),
      cached(`rr:${m.color.getHexString()}`, () => {
        const c = m.color.clone().multiplyScalar(0.85);
        return std(`#${c.getHexString()}`, 0.95);
      }),
      0,
      h + 0.001,
      0,
    ).rotation.x = Math.PI / 2;
  },
  tv(add, m, w, d, h, look) {
    const legH = look.style.legs === 'plinth' ? 0.06 : 0.12;
    add(rbox(w, h - legH, d, 0.02), m, 0, (h - legH) / 2 + legH, 0);
    for (let i = 0; i < 3; i++)
      add(
        rbox(0.006, h - legH - 0.06, 0.006, 0.002),
        shared.dark,
        -w / 2 + (w / 3) * (i + 0.5) + w / 6,
        (h + legH) / 2,
        d / 2,
      );
    look.legs(w, d, legH, 0.06);
    add(rbox(1.25, 0.72, 0.04, 0.01), shared.screen, 0, h + 0.42, -0.05);
    add(rbox(0.3, 0.06, 0.18, 0.01), shared.dark, 0, h + 0.03, -0.05);
  },
  sideboard(add, m, w, d, h, look) {
    const legH = look.style.legs === 'plinth' ? 0.08 : 0.16;
    add(rbox(w, h - legH, d, 0.015), m, 0, (h - legH) / 2 + legH, 0);
    add(rbox(w + 0.02, 0.03, d + 0.02, 0.008), look.wood, 0, h + 0.015, 0);
    for (let i = 1; i < 4; i++)
      add(rbox(0.005, h - legH - 0.06, 0.005, 0.002), shared.dark, -w / 2 + (w / 4) * i, (h + legH) / 2, d / 2);
    for (let i = 0; i < 4; i++)
      add(
        rbox(0.012, 0.1, 0.02, 0.004),
        look.metal,
        -w / 2 + (w / 4) * (i + 0.5) + 0.12,
        (h + legH) / 2,
        d / 2 + 0.012,
      );
    look.legs(w, d, legH, 0.06);
    add(
      cyl(0.07, 0.05, 0.28, 16),
      cached(`v:${look.style.accent[0]}`, () => std(look.style.accent[0]!, 0.4)),
      -w / 3,
      h + 0.17,
      0,
    );
    add(rbox(0.32, 0.05, 0.22, 0.01), shared.canvas, w / 4, h + 0.055, 0);
  },
  console(add, m, w, d, h, look) {
    add(rbox(w, 0.04, d, 0.012), m, 0, h - 0.02, 0);
    add(rbox(w - 0.08, 0.03, d - 0.06, 0.01), m, 0, 0.2, 0);
    look.legs(w, d, h - 0.04, 0.03);
    add(cyl(0.06, 0.04, 0.24, 16), shared.white, w / 3, h + 0.12, 0);
  },
  shoe(add, m, w, d, h, look) {
    add(rbox(w, h - 0.1, d, 0.012), m, 0, (h - 0.1) / 2 + 0.1, 0);
    add(rbox(0.005, h - 0.16, 0.005, 0.002), shared.dark, 0, (h + 0.1) / 2, d / 2);
    for (const x of [-1, 1]) add(rbox(0.012, 0.12, 0.02, 0.004), look.metal, x * 0.05, h * 0.7, d / 2 + 0.012);
    look.legs(w, d, 0.1, 0.05);
  },
  altar(add, m, w, d, h, look) {
    // Vietnamese family altar cabinet (tủ thờ): a carved cabinet, a raised altar shelf, an incense bowl and vases.
    add(rbox(w, h - 0.2, d, 0.01), m, 0, (h - 0.2) / 2 + 0.2, 0);
    add(rbox(w + 0.08, 0.05, d + 0.06, 0.01), m, 0, h + 0.025, 0);
    for (const x of [-1, 1])
      add(
        rbox(w / 2 - 0.1, h - 0.4, 0.01, 0.004),
        cached('gold', () => std('#b08d57', 0.35, 0.8)),
        (x * w) / 4,
        (h + 0.2) / 2,
        d / 2 + 0.002,
      );
    look.legs(w, d, 0.2, 0.04);
    add(rbox(w * 0.6, 0.18, d * 0.6, 0.01), m, 0, h + 0.14, -0.05);
    add(
      cyl(0.09, 0.07, 0.1, 20),
      cached('bronze', () => std('#8a6a3c', 0.35, 0.8)),
      0,
      h + 0.28,
      -0.05,
    );
    for (const x of [-1, 1])
      add(
        cyl(0.05, 0.035, 0.32, 16),
        cached('jade', () => std('#3f7a6b', 0.3)),
        x * w * 0.28,
        h + 0.21,
        -0.05,
      );
  },
  dining(add, m, _w, _d, _h, look) {
    add(rbox(1.5, 0.04, 0.85, 0.02), m, 0, 0.73, 0);
    look.legs(1.4, 0.75, 0.71, 0);
    for (const x of [-0.38, 0.38]) for (const z of [-1, 1]) diningChair(add, m, look, x, z * 0.62, z > 0 ? Math.PI : 0);
  },
  diningRound(add, m, _w, _d, _h, look) {
    add(cyl(0.6, 0.6, 0.04, 48), m, 0, 0.73, 0);
    add(cyl(0.06, 0.08, 0.69, 20), look.style.legs === 'metal' ? look.metal : look.wood, 0, 0.36, 0);
    add(cyl(0.3, 0.32, 0.03, 32), look.style.legs === 'metal' ? look.metal : look.wood, 0, 0.015, 0);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      diningChair(add, m, look, Math.sin(a) * 0.68, Math.cos(a) * 0.68, a + Math.PI);
    }
  },
  dining6(add, m, w, _d, _h, look) {
    add(rbox(w - 0.2, 0.04, 0.95, 0.02), m, 0, 0.73, 0);
    look.legs(w - 0.3, 0.85, 0.71, 0);
    for (const x of [-0.6, 0, 0.6])
      for (const z of [-1, 1]) diningChair(add, m, look, x, z * 0.68, z > 0 ? Math.PI : 0);
  },
  kitchen(add, m, w, d, h, look) {
    add(rbox(w, h - 0.1, d - 0.02, 0.01), m, 0, (h - 0.1) / 2 + 0.1, 0.01);
    add(rbox(w, 0.1, d - 0.08, 0.01), shared.dark, 0, 0.05, -0.02);
    add(rbox(w + 0.02, 0.04, d + 0.02, 0.01), shared.white, 0, h + 0.02, 0);
    for (let i = 0; i < 4; i++)
      add(rbox(w / 4 - 0.02, 0.012, 0.012, 0.004), look.metal, -w / 2 + (w / 4) * (i + 0.5), h - 0.08, d / 2 + 0.01);
    add(rbox(0.5, 0.02, 0.38, 0.02), look.metal, -w / 4, h + 0.035, 0);
    add(rbox(0.6, 0.012, 0.5, 0.01), shared.screen, w / 4, h + 0.045, 0);
    add(cyl(0.012, 0.012, 0.3), look.metal, -w / 4, h + 0.18, -d / 2 + 0.08);
    // Wall cabinets above the run.
    add(rbox(w, 0.7, 0.35, 0.01), m, 0, 1.85, -d / 2 + 0.175);
  },
  fridge(add, m, w, d, h) {
    add(rbox(w, h, d, 0.03), m, 0, h / 2, 0);
    add(rbox(w - 0.02, 0.006, 0.006, 0.003), shared.dark, 0, h * 0.62, d / 2);
    for (const y of [0.4, 1.2]) add(rbox(0.02, 0.3, 0.03, 0.01), shared.dark, w / 2 - 0.08, y, d / 2 + 0.02);
  },
  washer(add, m, w, d, h) {
    add(rbox(w, h, d, 0.02), m, 0, h / 2, 0);
    const door = add(cyl(0.2, 0.2, 0.03, 32), shared.glass, 0, h * 0.45, d / 2 + 0.01);
    door.rotation.x = Math.PI / 2;
    add(ring(0.2, 0.02), shared.dark, 0, h * 0.45, d / 2 + 0.012);
    add(rbox(w - 0.06, 0.08, 0.01, 0.004), shared.dark, 0, h - 0.07, d / 2 + 0.002);
  },
  bed(add, m, w, d, h, look) {
    const base = look.style.legs === 'plinth' ? 0.22 : 0.3;
    add(rbox(w + 0.06, base - 0.08, d, 0.03), look.wood, 0, 0.08 + (base - 0.08) / 2, 0);
    if (look.style.legs === 'plinth') add(rbox(w - 0.2, 0.08, d - 0.2, 0.01), shared.dark, 0, 0.04, 0);
    else look.legs(w + 0.06, d, 0.08, 0.06);
    // Headboard: upholstered for soft styles, timber otherwise.
    const head = look.style.legs === 'turned' || look.style.round > 1.15 ? m : look.wood;
    add(rbox(w + 0.06, h, 0.08, 0.04), head, 0, h / 2, -d / 2 + 0.04);
    add(rbox(w - 0.04, 0.2, d - 0.12, 0.06), shared.linen, 0, base + 0.1, 0.04);
    add(rbox(w, 0.06, d * 0.62, 0.03), m, 0, base + 0.23, d * 0.17);
    const pillows = w > 1.3 ? 2 : 1;
    for (let i = 0; i < pillows; i++)
      add(
        rbox(w / pillows - 0.16, 0.12, 0.38, 0.05),
        shared.white,
        pillows === 1 ? 0 : ((i ? 1 : -1) * w) / 4,
        base + 0.26,
        -d / 2 + 0.32,
      );
  },
  bedSingle(add, m, w, d, h, look) {
    builders.bed!(add, m, w, d, h, look);
  },
  bedKing(add, m, w, d, h, look) {
    builders.bed!(add, m, w, d, h, look);
  },
  nightstand(add, m, w, d, h, look) {
    const legH = look.style.legs === 'plinth' ? 0.04 : 0.12;
    add(rbox(w, h - legH, d, 0.02), m, 0, (h - legH) / 2 + legH, 0);
    add(rbox(0.12, 0.012, 0.012, 0.004), look.metal, 0, h * 0.72, d / 2 + 0.006);
    look.legs(w, d, legH, 0.04);
    add(cyl(0.07, 0.09, 0.22), shared.shade, 0.05, h + 0.12, -0.03);
  },
  wardrobe(add, m, w, d, h, look) {
    add(rbox(w, h - 0.06, d, 0.02), m, 0, (h - 0.06) / 2 + 0.06, 0);
    add(rbox(w - 0.04, 0.06, d - 0.06, 0.005), shared.dark, 0, 0.03, -0.02);
    const doors = Math.max(2, Math.round(w / 0.6));
    for (let i = 1; i < doors; i++)
      add(rbox(0.006, h - 0.16, 0.006, 0.002), shared.dark, -w / 2 + (w / doors) * i, h / 2 + 0.03, d / 2);
    if (look.style.legs !== 'plinth')
      for (let i = 0; i < doors; i++)
        add(
          rbox(0.015, 0.3, 0.025, 0.006),
          look.metal,
          -w / 2 + (w / doors) * (i + 0.5) + (i % 2 ? -1 : 1) * (w / doors / 2 - 0.06),
          h * 0.52,
          d / 2 + 0.015,
        );
  },
  wardrobe2(add, m, w, d, h, look) {
    builders.wardrobe!(add, m, w, d, h, look);
  },
  desk(add, m, w, d, h, look) {
    add(rbox(w, 0.035, d, 0.012), m, 0, h - 0.018, 0);
    look.legs(w, d, h - 0.035, 0.04);
    add(rbox(0.5, 0.32, 0.02, 0.01), shared.screen, 0.1, h + 0.25, -d / 2 + 0.12);
    add(rbox(0.06, 0.1, 0.06, 0.01), shared.dark, 0.1, h + 0.05, -d / 2 + 0.12);
  },
  dresser(add, m, w, d, h, look) {
    add(rbox(w, 0.14, d, 0.012), m, 0, h - 0.07, 0);
    add(rbox(0.12, 0.012, 0.012, 0.004), look.metal, 0, h - 0.07, d / 2 + 0.006);
    look.legs(w, d, h - 0.14, 0.04);
    // Oval mirror on the wall above.
    const mirror = add(
      cyl(0.3, 0.3, 0.02, 40),
      cached('mirror', () => std('#dfe6ea', 0.05, 0.9)),
      0,
      h + 0.55,
      -d / 2 + 0.02,
    );
    mirror.rotation.x = Math.PI / 2;
    mirror.scale.set(1, 1, 1.4);
    add(ring(0.3, 0.012), look.metal, 0, h + 0.55, -d / 2 + 0.02).scale.set(1, 1.4, 1);
  },
  chair(add, m, _w, _d, _h, look) {
    diningChair(add, m, look, 0, 0, 0);
  },
  bookshelf(add, m, w, d, h) {
    shelves(add, m, w, d, h, 5);
  },
  bookshelfLow(add, m, w, d, h, look) {
    shelves(add, m, w, d, h - 0.1, 2, 0.1);
    look.legs(w, d, 0.1, 0.04);
  },
  bathtub(add, m, w, d, h, look) {
    add(rbox(w, h, d, 0.08), m, 0, h / 2, 0);
    add(rbox(w - 0.16, 0.04, d - 0.16, 0.06), shared.water, 0, h - 0.06, 0);
    add(cyl(0.02, 0.02, 0.18), look.metal, -w / 2 + 0.12, h + 0.09, 0);
  },
  shower(add, m, w, d, h, look) {
    add(rbox(w, 0.06, d, 0.02), m, 0, 0.03, 0);
    // Glass on the two open sides, a rain head on the wall.
    add(rbox(w, h - 0.06, 0.01, 0.002), shared.glass, 0, h / 2 + 0.03, d / 2 - 0.005);
    add(rbox(0.01, h - 0.06, d, 0.002), shared.glass, -w / 2 + 0.005, h / 2 + 0.03, 0);
    add(rbox(0.02, h - 0.06, 0.02, 0.004), look.metal, -w / 2 + 0.01, h / 2 + 0.03, d / 2 - 0.01);
    add(cyl(0.012, 0.012, 0.35), look.metal, w / 4, h - 0.2, -d / 2 + 0.05);
    add(cyl(0.12, 0.12, 0.015, 24), look.metal, w / 4, h - 0.38, -d / 2 + 0.18);
  },
  toilet(add, m, _w, d) {
    add(rbox(0.36, 0.38, 0.5, 0.12), m, 0, 0.19, 0.06);
    add(rbox(0.38, 0.05, 0.46, 0.15), m, 0, 0.42, 0.08);
    add(rbox(0.4, 0.36, 0.18, 0.04), m, 0, 0.6, -d / 2 + 0.09);
  },
  sink(add, m, w, d, h, look) {
    add(rbox(w, h - 0.15, d, 0.02), m, 0, (h - 0.15) / 2 + 0.15, 0);
    add(rbox(w - 0.1, 0.12, d - 0.1, 0.05), shared.white, 0, h + 0.04, 0.02);
    add(cyl(0.012, 0.012, 0.2), look.metal, 0, h + 0.18, -d / 2 + 0.06);
    add(
      rbox(w - 0.1, 0.7, 0.02, 0.01),
      cached('mirror', () => std('#dfe6ea', 0.05, 0.9)),
      0,
      h + 0.7,
      -d / 2 + 0.01,
    );
  },
  plant(add, m) {
    add(cyl(0.16, 0.12, 0.34, 18), m, 0, 0.17, 0);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const leaf = add(
        (leafGeo ??= new SphereGeometry(0.16, 10, 8)),
        shared.leaf,
        Math.cos(a) * 0.1,
        0.5 + (i % 3) * 0.22,
        Math.sin(a) * 0.1,
      );
      leaf.scale.set(1, 1.35, 0.7);
    }
  },
  plantPalm(add, m, _w, _d, h) {
    add(cyl(0.3, 0.22, 0.5, 24), m, 0, 0.25, 0);
    add(cyl(0.28, 0.28, 0.02, 24), shared.soil, 0, 0.49, 0);
    for (const [x, z, t] of [
      [0, 0, h - 0.5],
      [0.08, 0.05, h - 0.75],
      [-0.07, -0.04, h - 0.95],
    ] as const) {
      add(
        cyl(0.025, 0.035, t),
        cached('trunk', () => std('#7a6045', 0.9)),
        x,
        0.5 + t / 2,
        z,
      );
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + x * 9;
        const frond = add(
          (frondGeo ??= new SphereGeometry(0.1, 8, 6)),
          shared.palm,
          x + Math.cos(a) * 0.28,
          0.5 + t - 0.05,
          z + Math.sin(a) * 0.28,
        );
        frond.scale.set(3.2, 0.25, 0.9);
        frond.rotation.y = -a;
        frond.rotation.z = 0.35;
      }
    }
  },
  lamp(add, m, _w, _d, h) {
    add(cyl(0.16, 0.16, 0.03), m, 0, 0.015, 0);
    add(cyl(0.012, 0.012, h - 0.3), m, 0, (h - 0.3) / 2, 0);
    add(cyl(0.13, 0.19, 0.3, 20), shared.shade, 0, h - 0.15, 0);
  },
  art(add, m, w, _d, h, look) {
    artwork(add, look, m, w, h - 0.75, 0.75);
  },
  /* Stairs climb from the front (+z) of their footprint to the back, one storey high. */
  stairs(add, m, w, d, h, look) {
    flight(add, m, look, { x0: -w / 2, x1: w / 2, z0: d / 2, z1: -d / 2, axis: 'z', y0: 0, y1: h, steps: 18 });
  },
  stairsL(add, m, w, d, h, look) {
    // Up the left side to a square landing in the back-left corner, then along the back to the right.
    const run = 1.0;
    const mid = h / 2;
    flight(add, m, look, {
      x0: -w / 2,
      x1: -w / 2 + run,
      z0: d / 2,
      z1: -d / 2 + run,
      axis: 'z',
      y0: 0,
      y1: mid,
      steps: 9,
    });
    add(rbox(run, 0.05, run, 0.005), m, -w / 2 + run / 2, mid - 0.025, -d / 2 + run / 2);
    add(rbox(run, mid - 0.05, run, 0.005), shared.white, -w / 2 + run / 2, (mid - 0.05) / 2, -d / 2 + run / 2);
    flight(add, m, look, {
      x0: -w / 2 + run,
      x1: w / 2,
      z0: -d / 2,
      z1: -d / 2 + run,
      axis: 'x',
      y0: mid,
      y1: h,
      steps: 9,
    });
  },
  void() {
    // An opening in the floor: cut by the house, with railings; nothing to build here.
  },
  /* Light fittings: modelled at their real height (the ceiling is at 2.7 m). */
  downlight(add, m) {
    add(cyl(0.065, 0.065, 0.012, 24), m, 0, 2.694, 0);
    add(cyl(0.048, 0.048, 0.006, 24), glow, 0, 2.687, 0);
  },
  ceilingLight(add, m, w) {
    add(cyl(w / 2 - 0.02, w / 2, 0.03, 32), m, 0, 2.685, 0);
    add(cyl(w / 2 - 0.05, w / 2 - 0.1, 0.07, 32), glow, 0, 2.635, 0);
  },
  pendant(add, m, w) {
    add(cyl(0.004, 0.004, 1.0, 6), shared.dark, 0, 2.2, 0);
    add(cyl(0.05, 0.05, 0.03, 16), m, 0, 2.69, 0);
    add(cyl(0.035, w / 2, 0.22, 28), m, 0, 1.6, 0);
    add(cyl(0.03, 0.03, 0.05, 12), shared.dark, 0, 1.69, 0);
    add((leafGeo ??= new SphereGeometry(0.16, 10, 8)), glow, 0, 1.55, 0).scale.setScalar(0.32);
  },
  chandelier(add, m, w) {
    add(cyl(0.008, 0.008, 0.5, 8), m, 0, 2.45, 0);
    add(cyl(0.06, 0.06, 0.03, 16), m, 0, 2.69, 0);
    add(ring(w / 2 - 0.08, 0.012), m, 0, 2.05, 0).rotation.x = Math.PI / 2;
    add(ring(w / 4, 0.01), m, 0, 2.2, 0).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = w / 2 - 0.08;
      add(cyl(0.012, 0.012, 0.08, 10), shared.white, Math.cos(a) * r, 2.1, Math.sin(a) * r);
      add(cyl(0.01, 0.018, 0.05, 10), glow, Math.cos(a) * r, 2.165, Math.sin(a) * r);
    }
  },
  wallLight(add, m, _w, d) {
    add(rbox(0.1, 0.16, 0.02, 0.006), m, 0, 1.8, -d / 2 + 0.01);
    add(cyl(0.065, 0.065, 0.18, 24), m, 0, 1.8, 0.01);
    for (const y of [1.89, 1.71]) add(cyl(0.055, 0.055, 0.004, 24), glow, 0, y, 0.01);
  },
};

/** A dining chair at (x, z) turned by rot: linen (or rattan) seat, back in the main colour, the style's legs. */
function diningChair(_add: Add, m: Material, look: Look, x: number, z: number, rot: number) {
  const add = look.sub(x, z, rot);
  const seat = look.style.legs === 'rattan' ? shared.rattan : shared.linen;
  add(rbox(0.44, 0.05, 0.42, 0.02), seat, 0, 0.46, 0);
  add(rbox(0.44, 0.36, 0.04, 0.02), look.style.legs === 'rattan' ? shared.rattan : m, 0, 0.68, -0.19);
  const legMat = look.style.legs === 'metal' ? look.metal : look.wood;
  for (const lx of [-1, 1]) for (const lz of [-1, 1]) add(cyl(0.017, 0.013, 0.44), legMat, lx * 0.18, 0.22, lz * 0.17);
}

/**
 * One flight of stairs: treads in the main colour on white risers over a solid stringer, a handrail on posts along
 * the open side. Climbs along z (from z0 to z1) or along x (from x0 to x1), from y0 to y1.
 */
function flight(
  add: Add,
  m: Material,
  look: Look,
  f: { x0: number; x1: number; z0: number; z1: number; axis: 'x' | 'z'; y0: number; y1: number; steps: number },
) {
  const rise = (f.y1 - f.y0) / f.steps;
  const along = f.axis === 'z' ? f.z1 - f.z0 : f.x1 - f.x0;
  const run = along / f.steps;
  const width = f.axis === 'z' ? Math.abs(f.x1 - f.x0) : Math.abs(f.z1 - f.z0);
  const cx = (f.x0 + f.x1) / 2;
  const cz = (f.z0 + f.z1) / 2;
  for (let k = 0; k < f.steps; k++) {
    const top = f.y0 + (k + 1) * rise;
    const c = (f.axis === 'z' ? f.z0 : f.x0) + run * (k + 0.5);
    const [x, z] = f.axis === 'z' ? [cx, c] : [c, cz];
    const [tw, td] = f.axis === 'z' ? [width, Math.abs(run) + 0.02] : [Math.abs(run) + 0.02, width];
    add(rbox(tw, 0.035, td, 0.004), m, x, top - 0.0175, z);
    // Riser and the solid mass under the step.
    add(
      rbox(
        f.axis === 'z' ? width - 0.01 : Math.abs(run),
        top - 0.035,
        f.axis === 'z' ? Math.abs(run) : width - 0.01,
        0.002,
      ),
      shared.white,
      x,
      (top - 0.035) / 2,
      z,
    );
  }
  // Handrail on posts along the side away from the wall (the +x side for a z flight, the +z side for an x flight).
  const posts = 4;
  for (let i = 0; i <= posts; i++) {
    const t = i / posts;
    const y = f.y0 + (f.y1 - f.y0) * t;
    const [x, z] =
      f.axis === 'z'
        ? [Math.max(f.x0, f.x1) - 0.04, f.z0 + along * t]
        : [f.x0 + along * t, Math.max(f.z0, f.z1) - 0.04];
    add(cyl(0.015, 0.015, 0.9, 8), look.metal, x, y + 0.45, z);
  }
  const len = Math.hypot(along, f.y1 - f.y0);
  const rail = add(cyl(0.022, 0.022, len, 10), look.wood, 0, 0, 0);
  const [rx, rz] =
    f.axis === 'z'
      ? [Math.max(f.x0, f.x1) - 0.04, (f.z0 + f.z1) / 2]
      : [(f.x0 + f.x1) / 2, Math.max(f.z0, f.z1) - 0.04];
  rail.position.set(rx, (f.y0 + f.y1) / 2 + 0.9, rz);
  const slope = Math.atan2(f.y1 - f.y0, Math.abs(along));
  if (f.axis === 'z') rail.rotation.x = (along < 0 ? -1 : 1) * (Math.PI / 2 - slope);
  else rail.rotation.z = (along < 0 ? 1 : -1) * (Math.PI / 2 - slope);
}

/** Open shelving with books, `n` shelves from `y0`. */
function shelves(add: Add, m: Material, w: number, d: number, h: number, n: number, y0 = 0) {
  for (const x of [-1, 1]) add(rbox(0.03, h, d, 0.005), m, x * (w / 2 - 0.015), y0 + h / 2, 0);
  add(rbox(w, h, 0.012, 0.004), m, 0, y0 + h / 2, -d / 2 + 0.006);
  const books = ['#b0674c', '#5c6b80', '#e7dfd2', '#8a9a8c', '#3b3a38', '#c8a77e'];
  const step = (h - 0.05) / (n - 0.5);
  for (let s = 0; s < n; s++) {
    const y = y0 + 0.02 + s * step;
    add(rbox(w - 0.06, 0.025, d - 0.02, 0.004), m, 0, y, 0);
    if (s === n - 1 && n > 2) continue;
    let x = -w / 2 + 0.06;
    let k = s * 3;
    while (x < w / 2 - 0.12) {
      const bw = 0.03 + ((k * 7) % 5) * 0.008;
      const bh = Math.min(step - 0.06, 0.24 + ((k * 3) % 4) * 0.03);
      if (k % 9 === 4) {
        x += 0.12; // a gap with an object, not wall-to-wall books
        k++;
        continue;
      }
      add(rbox(bw, bh, d - 0.08, 0.003), mainMat(books[k % books.length]!, 'book'), x + bw / 2, y + 0.0125 + bh / 2, 0);
      x += bw + 0.004;
      k++;
    }
  }
}

/** Builds one piece of furniture in a design style. Unknown types become a box so a bad save never breaks the scene. */
/**
 * Builds a piece of furniture. A piece that cannot be built (a broken definition from the AI or a shared link) comes
 * back as a plain block instead of throwing, so one bad piece never takes the 3D view down.
 */
export function buildFurniture(type: string, color?: string, styleId?: string, rise?: number): Group {
  try {
    return buildPiece(type, color, styleId, rise);
  } catch (err) {
    console.warn(`Could not build ${type}; showing a block instead.`, err);
    soft = 1;
    const g = new Group();
    const block = new Mesh(rbox(0.5, 0.5, 0.5), mainMat('#cccccc', 'block'));
    block.position.y = 0.25;
    g.add(block);
    return g;
  }
}

/* ---------- Library models (library.ts) ---------- */

/** Ceiling height the light fittings are modelled at. */
const CEILING = 2.7;

const models = new Map<string, Promise<Group>>();
let modelLoaded: () => void = () => {};
/** Called whenever a library model arrives and has replaced its placeholder (to redraw and refresh shadows). */
export function onModelLoaded(f: () => void) {
  modelLoaded = f;
}

/** A model file as a scene: glTF/GLB, or OBJ with its MTL (flat colours, given the planner's standard material). */
async function readModel(src: string): Promise<Object3D> {
  if (src.endsWith('.obj')) {
    const [{ OBJLoader }, { MTLLoader }] = await Promise.all([
      import('three/addons/loaders/OBJLoader.js'),
      import('three/addons/loaders/MTLLoader.js'),
    ]);
    const mtlSrc = src.replace(/\.obj$/, '.mtl');
    const [mtlText, objText] = await Promise.all([bundled(mtlSrc), bundled(src)]);
    const mtl =
      mtlText !== null ? new MTLLoader().parse(mtlText, '') : await new MTLLoader().loadAsync(modelUrl(mtlSrc));
    mtl.preload();
    const loader = new OBJLoader().setMaterials(mtl);
    const obj = objText !== null ? loader.parse(objText) : await loader.loadAsync(modelUrl(src));
    obj.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const swap = (mat: Material) => {
        const c = (mat as Material & { color?: Color }).color;
        return std(c ? `#${c.getHexString()}` : '#cccccc', 0.65);
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
    });
    return obj;
  }
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const text = await bundled(src);
  return (text !== null ? await new GLTFLoader().parseAsync(text, '') : await new GLTFLoader().loadAsync(modelUrl(src)))
    .scene;
}

/** Loads a library model once: centred on its footprint, standing on the floor, front towards +z. */
function loadModel(type: string): Promise<Group> {
  let p = models.get(type);
  if (!p) {
    const m = LIBRARY[type]!;
    p = readModel(m.src).then((inner) => {
      inner.scale.setScalar(m.scale ?? 1);
      inner.rotation.y = ((m.turn ?? 0) * Math.PI) / 180;
      const outer = new Group();
      outer.add(inner);
      // A file at the wrong scale is fitted to the catalogue size; one at its real size is left as it is.
      let box = new Box3().setFromObject(outer);
      const size = box.getSize(new Vector3());
      const ratios = [m.def.w / size.x, m.def.h / size.y, m.def.d / size.z].filter(Number.isFinite);
      if (ratios.some((r) => r < 0.7 || r > 1.4)) inner.scale.multiplyScalar(Math.min(...ratios));
      box = new Box3().setFromObject(outer);
      const c = box.getCenter(new Vector3());
      inner.position.set(inner.position.x - c.x, inner.position.y - box.min.y, inner.position.z - c.z);
      outer.traverse((o) => {
        const mesh = o as Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
      return outer;
    });
    models.set(type, p);
  }
  return p;
}

/** A library piece: a quiet block of its size at once, the model in its place when it has loaded. */
function buildModel(type: string) {
  const def = FURNITURE[type]!;
  const g = new Group();
  const block = new Mesh(rbox(def.w, def.h, def.d, 0.02), mainMat('#d9d6cf', 'block'));
  block.position.y = def.mount === 'ceiling' ? CEILING - def.h / 2 : def.mount === 'wall' ? 1.6 : def.h / 2;
  g.add(block);
  loadModel(type)
    .then((model) => {
      const copy = model.clone(true);
      // Fittings hang from the ceiling or sit on the wall at lamp height.
      if (def.mount === 'ceiling') copy.position.y = CEILING - def.h;
      else if (def.mount === 'wall') copy.position.y = 1.6 - def.h / 2;
      const item = g.userData.item as string | undefined;
      copy.traverse((o) => (o.userData.item = item));
      g.remove(block);
      g.add(copy);
      modelLoaded();
    })
    .catch((err) => console.warn(`Could not load ${type}; keeping a block.`, err));
  return g;
}

/** `rise`: the floor-to-floor height a stair (or anything opening the floor above) climbs, when known. */
function buildPiece(type: string, color?: string, styleId?: string, rise?: number) {
  if (LIBRARY[type]) return buildModel(type);
  const def = FURNITURE[type];
  const style = styleOf(styleId);
  soft = Number.isFinite(style.round) ? style.round : 1;
  const g = new Group();
  const m = mainMat(color ?? def?.colors[0] ?? '#cccccc', type);
  const add: Add = (geo, mat, x, y, z) => {
    const me = mesh(geo, mat, x, y, z);
    g.add(me);
    return me;
  };
  const wood = cached(`w:${style.wood}`, () => std(style.wood, 0.55));
  const metal = cached(`m:${style.metal}`, () => std(style.metal, 0.35, 0.85));
  const mesh = (geo: BufferGeometry, mat: Material, x: number, y: number, z: number) => {
    const me = new Mesh(geo, mat);
    me.position.set(x, y, z);
    me.castShadow = !def?.flat;
    me.receiveShadow = true;
    return me;
  };
  const look: Look = {
    style,
    wood,
    metal,
    sub(x, z, rot) {
      const s = new Group();
      s.position.set(x, 0, z);
      s.rotation.y = rot;
      g.add(s);
      return (geo, mat, px, py, pz) => {
        const me = mesh(geo, mat, px, py, pz);
        s.add(me);
        return me;
      };
    },
    legs(w, d, h, inset = 0.06) {
      if (h <= 0.001) return;
      const pts: [number, number][] = [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ];
      const px = Math.max(0, w / 2 - inset);
      const pz = Math.max(0, d / 2 - inset);
      switch (style.legs) {
        case 'plinth':
          add(rbox(Math.max(0.05, w - 0.12), h, Math.max(0.05, d - 0.12), 0.004), shared.dark, 0, h / 2, 0);
          break;
        case 'metal':
          for (const [x, z] of pts) add(cyl(0.011, 0.011, h, 10), metal, x * px, h / 2, z * pz);
          break;
        case 'turned':
          for (const [x, z] of pts) {
            add(cyl(0.022, 0.016, h, 12), wood, x * px, h / 2, z * pz);
            if (h > 0.15) for (const k of [0.3, 0.72]) add(cyl(0.032, 0.032, 0.035, 12), wood, x * px, h * k, z * pz);
          }
          break;
        case 'rattan':
          for (const [x, z] of pts) add(cyl(0.02, 0.02, h, 10), shared.rattan, x * px, h / 2, z * pz);
          break;
        default:
          for (const [x, z] of pts) add(cyl(0.022, 0.012, h, 12), wood, x * px, h / 2, z * pz);
      }
    },
  };
  const build = builders[type];
  const parts = CUSTOM_PARTS.get(type);
  // A stair climbs to the floor above, whatever height that floor is at (2.6 m for a mezzanine, 4.2 m in a villa).
  const climbs = !!def?.opensAbove && !!rise && Number.isFinite(rise) && rise > 1.5;
  if (parts) {
    buildCustom(parts, look.sub(0, 0, 0));
    if (climbs) g.scale.y = rise! / def!.h;
  } else if (def && build) build(add, m, def.w, def.d, climbs ? rise! : def.h, look);
  else add(rbox(0.5, 0.5, 0.5), m, 0, 0.25, 0); // unknown type: a plain block
  if (def?.mount) g.userData.mount = def.mount;
  soft = 1;
  return g;
}

/* ---------- Objects Claude defined (custom.ts) ---------- */

const customMat = (material: string, color: string) =>
  cached(`x:${material}:${color}`, () => {
    switch (material) {
      case 'metal':
        return std(color, 0.35, 0.85);
      case 'glass':
        return new MeshStandardMaterial({ color, roughness: 0.05, transparent: true, opacity: 0.3, depthWrite: false });
      case 'fabric':
        return std(color, 0.92);
      case 'stone':
        return std(color, 0.4);
      case 'ceramic':
        return std(color, 0.2);
      case 'plant':
        return std(color, 0.7);
      case 'light':
        return new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, roughness: 0.5 });
      case 'wood':
        return std(color, 0.55);
      default:
        return std(color, 0.5);
    }
  });

const DEG = Math.PI / 180;

/** Builds a custom object's parts (repeats unrolled) with the given adder. */
function buildCustom(parts: CustomPart[], add: Add) {
  for (const p of parts) {
    const geo =
      p.shape === 'box'
        ? rbox(p.w ?? 0.1, p.h ?? 0.1, p.d ?? 0.1, 0.006)
        : p.shape === 'cylinder'
          ? cyl(p.rTop ?? p.r ?? 0.1, p.r ?? 0.1, p.h ?? 0.1, 24)
          : p.shape === 'cone'
            ? cyl(0.001, p.r ?? 0.1, p.h ?? 0.1, 24)
            : p.shape === 'sphere'
              ? (sphereGeo(p.r ?? 0.1) as BufferGeometry)
              : ring(p.r ?? 0.1, p.tube ?? 0.02);
    // A part whose geometry came out with holes in its numbers would poison the whole frame (ambient occlusion
    // spreads a NaN across the screen): leave it out.
    if (!finiteGeometry(geo)) continue;
    const mat = customMat(p.material ?? 'plastic', p.color ?? '#d9d6cf');
    const n = p.repeat?.count ?? 1;
    const [px, pz] = p.repeat?.pivot ?? [0, 0];
    for (let i = 0; i < n; i++) {
      // Turn the part's position about the pivot, then step it.
      const a = (p.repeat?.ry ?? 0) * i * DEG;
      const ox = p.x - px;
      const oz = p.z - pz;
      const x = px + ox * Math.cos(a) + oz * Math.sin(a) + (p.repeat?.dx ?? 0) * i;
      const z = pz - ox * Math.sin(a) + oz * Math.cos(a) + (p.repeat?.dz ?? 0) * i;
      const y = p.y + (p.repeat?.dy ?? 0) * i;
      if (![x, y, z, a].every(Number.isFinite)) continue;
      const mesh = add(geo, mat, x, y, z);
      mesh.rotation.set((p.rx ?? 0) * DEG, (p.ry ?? 0) * DEG + a, (p.rz ?? 0) * DEG);
    }
  }
}

const finiteChecked = new WeakMap<BufferGeometry, boolean>();
function finiteGeometry(g: BufferGeometry) {
  let ok = finiteChecked.get(g);
  if (ok === undefined) {
    const a = g.getAttribute('position')?.array ?? [];
    ok = a.length > 0;
    for (let i = 0; ok && i < a.length; i++) ok = Number.isFinite(a[i]!);
    finiteChecked.set(g, ok);
  }
  return ok;
}

const sphereGeos = new Map<number, SphereGeometry>();
function sphereGeo(r: number) {
  let g = sphereGeos.get(r);
  if (!g) sphereGeos.set(r, (g = new SphereGeometry(r, 20, 14)));
  return g;
}
