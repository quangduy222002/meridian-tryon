/**
 * Furniture built from rounded boxes and cylinders. Each builder returns a group whose origin is the centre of its
 * footprint on the floor, front facing +z, matching FURNITURE sizes. The "main" material takes the item's colour;
 * the design style (styles.ts) decides the timber, the metal, how pieces stand (tapered legs, slim metal legs, a
 * recessed plinth, turned legs or rattan) and how soft their edges are.
 */
import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Material,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { FURNITURE } from './catalog';
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
  shade: new MeshStandardMaterial({ color: '#fff1d6', emissive: '#ffd9a0', emissiveIntensity: 0.6, roughness: 0.9 }),
};

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
export function buildFurniture(type: string, color?: string, styleId?: string) {
  const def = FURNITURE[type];
  const style = styleOf(styleId);
  soft = style.round;
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
  if (def && build) build(add, m, def.w, def.d, def.h, look);
  else add(rbox(0.5, 0.5, 0.5), m, 0, 0.25, 0);
  soft = 1;
  return g;
}

/** Point light under a lamp shade, used for warm evening light. */
export const LAMP_TYPES = new Set(['lamp', 'nightstand']);
