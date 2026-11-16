/**
 * Furniture built from rounded boxes and cylinders. Each builder returns a group whose origin is the centre of its
 * footprint on the floor, front facing +z, matching FURNITURE sizes. The "main" material takes the item's colour.
 */
import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  type BufferGeometry,
  type Material,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { FURNITURE } from './catalog';

const geoCache = new Map<string, BufferGeometry>();
const rbox = (w: number, h: number, d: number, r = 0.02) => {
  const k = `${w},${h},${d},${r}`;
  let g = geoCache.get(k);
  if (!g) geoCache.set(k, (g = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2))));
  return g;
};
const cyl = (rt: number, rb: number, h: number, seg = 16) => {
  const k = `c${rt},${rb},${h},${seg}`;
  let g = geoCache.get(k);
  if (!g) geoCache.set(k, (g = new CylinderGeometry(rt, rb, h, seg)));
  return g;
};

let leafGeo: SphereGeometry | null = null;
const std = (color: string, roughness = 0.6, metalness = 0) =>
  new MeshStandardMaterial({ color, roughness, metalness });
const shared = {
  wood: std('#a87a4c', 0.55),
  dark: std('#2f3135', 0.5),
  metal: std('#b9bcc0', 0.3, 0.9),
  white: std('#f4f3f0', 0.25),
  linen: std('#efe9de', 0.9),
  glass: std('#cfe0e6', 0.05, 0.2),
  leaf: std('#5f7f4f', 0.7),
  pot: std('#c98f74', 0.8),
  screen: std('#16181c', 0.2, 0.3),
  shade: new MeshStandardMaterial({ color: '#fff1d6', emissive: '#ffd9a0', emissiveIntensity: 0.6, roughness: 0.9 }),
};

const mainCache = new Map<string, MeshStandardMaterial>();
const mainMat = (color: string, type: string) => {
  const k = `${type}:${color}`;
  let m = mainCache.get(k);
  if (!m) {
    const fabric = ['sofa', 'armchair', 'bed', 'rug', 'chair'].includes(type);
    mainCache.set(k, (m = std(color, fabric ? 0.92 : 0.5)));
  }
  return m;
};

type Add = (g: BufferGeometry, m: Material, x: number, y: number, z: number) => Mesh;

const builders: Record<string, (add: Add, m: MeshStandardMaterial, w: number, d: number, h: number) => void> = {
  sofa(add, m, w, d) {
    add(rbox(w, 0.42, d, 0.06), m, 0, 0.21 + 0.06, 0);
    add(rbox(w, 0.5, 0.22, 0.08), m, 0, 0.6, -d / 2 + 0.11);
    for (const s of [-1, 1]) add(rbox(0.2, 0.62, d, 0.08), m, s * (w / 2 - 0.1), 0.37, 0);
    for (let i = 0; i < 3; i++)
      add(
        rbox((w - 0.44) / 3 - 0.02, 0.14, d - 0.3, 0.06),
        m,
        -w / 2 + 0.22 + ((w - 0.44) / 3) * (i + 0.5),
        0.55,
        0.08,
      );
    for (const x of [-1, 1])
      for (const z of [-1, 1]) add(cyl(0.025, 0.02, 0.06), shared.dark, x * (w / 2 - 0.1), 0.03, z * (d / 2 - 0.1));
  },
  armchair(add, m, w, d) {
    add(rbox(w, 0.4, d, 0.06), m, 0, 0.28, 0);
    add(rbox(w, 0.45, 0.2, 0.08), m, 0, 0.62, -d / 2 + 0.1);
    for (const s of [-1, 1]) add(rbox(0.16, 0.55, d, 0.06), m, s * (w / 2 - 0.08), 0.36, 0);
    for (const x of [-1, 1])
      for (const z of [-1, 1]) add(cyl(0.022, 0.016, 0.1), shared.wood, x * (w / 2 - 0.1), 0.05, z * (d / 2 - 0.1));
  },
  coffee(add, m, w, d, h) {
    add(rbox(w, 0.04, d, 0.02), m, 0, h - 0.02, 0);
    add(rbox(w - 0.1, 0.02, d - 0.1, 0.01), m, 0, 0.14, 0);
    for (const x of [-1, 1])
      for (const z of [-1, 1])
        add(cyl(0.018, 0.018, h - 0.04), shared.dark, x * (w / 2 - 0.06), (h - 0.04) / 2, z * (d / 2 - 0.06));
  },
  rug(add, m, w, d, h) {
    add(rbox(w, h, d, 0.005), m, 0, h / 2, 0);
  },
  tv(add, m, w, d, h) {
    add(rbox(w, h - 0.08, d, 0.02), m, 0, (h - 0.08) / 2 + 0.08, 0);
    for (const x of [-1, 1]) add(rbox(0.04, 0.08, d - 0.06, 0.01), shared.dark, x * (w / 2 - 0.1), 0.04, 0);
    add(rbox(1.25, 0.72, 0.04, 0.01), shared.screen, 0, h + 0.42, -0.05);
    add(rbox(0.3, 0.06, 0.18, 0.01), shared.dark, 0, h + 0.03, -0.05);
  },
  dining(add, m) {
    add(rbox(1.5, 0.04, 0.85, 0.02), m, 0, 0.73, 0);
    for (const x of [-1, 1]) for (const z of [-1, 1]) add(cyl(0.025, 0.02, 0.71), m, x * 0.65, 0.355, z * 0.33);
    for (const x of [-0.38, 0.38])
      for (const z of [-1, 1]) {
        add(rbox(0.42, 0.04, 0.42, 0.02), shared.linen, x, 0.45, z * 0.62);
        add(rbox(0.42, 0.4, 0.04, 0.02), m, x, 0.66, z * 0.82);
        for (const lx of [-1, 1])
          for (const lz of [-1, 1]) add(cyl(0.015, 0.015, 0.43), m, x + lx * 0.18, 0.215, z * 0.62 + lz * 0.18);
      }
  },
  kitchen(add, m, w, d, h) {
    add(rbox(w, h - 0.1, d - 0.02, 0.01), m, 0, (h - 0.1) / 2 + 0.1, 0.01);
    add(rbox(w, 0.1, d - 0.08, 0.01), shared.dark, 0, 0.05, -0.02);
    add(rbox(w + 0.02, 0.04, d + 0.02, 0.01), shared.white, 0, h + 0.02, 0);
    for (let i = 0; i < 4; i++)
      add(rbox(w / 4 - 0.02, 0.012, 0.012, 0.004), shared.metal, -w / 2 + (w / 4) * (i + 0.5), h - 0.08, d / 2 + 0.01);
    add(rbox(0.5, 0.02, 0.38, 0.02), shared.metal, -w / 4, h + 0.035, 0);
    add(rbox(0.6, 0.012, 0.5, 0.01), shared.screen, w / 4, h + 0.045, 0);
    add(cyl(0.012, 0.012, 0.3), shared.metal, -w / 4, h + 0.18, -d / 2 + 0.08);
  },
  fridge(add, m, w, d, h) {
    add(rbox(w, h, d, 0.03), m, 0, h / 2, 0);
    add(rbox(w - 0.02, 0.006, 0.006, 0.003), shared.dark, 0, h * 0.62, d / 2);
    for (const y of [0.4, 1.2]) add(rbox(0.02, 0.3, 0.03, 0.01), shared.metal, w / 2 - 0.08, y, d / 2 + 0.02);
  },
  bed(add, m, w, d) {
    add(rbox(w + 0.06, 0.28, d, 0.03), shared.wood, 0, 0.2, 0);
    add(rbox(w + 0.06, 0.95, 0.08, 0.03), shared.wood, 0, 0.475, -d / 2 + 0.04);
    add(rbox(w - 0.04, 0.2, d - 0.12, 0.06), shared.linen, 0, 0.44, 0.04);
    add(rbox(w, 0.06, d * 0.62, 0.03), m, 0, 0.555, d * 0.17);
    for (const x of [-1, 1]) add(rbox(w / 2 - 0.12, 0.12, 0.38, 0.05), shared.white, (x * w) / 4, 0.58, -d / 2 + 0.32);
  },
  nightstand(add, m, w, d, h) {
    add(rbox(w, h - 0.06, d, 0.02), m, 0, (h - 0.06) / 2 + 0.06, 0);
    add(rbox(0.12, 0.012, 0.012, 0.004), shared.metal, 0, h * 0.7, d / 2 + 0.006);
    add(cyl(0.07, 0.09, 0.22), shared.shade, 0.05, h + 0.12, -0.03);
  },
  wardrobe(add, m, w, d, h) {
    add(rbox(w, h, d, 0.02), m, 0, h / 2, 0);
    add(rbox(0.006, h - 0.1, 0.006, 0.002), shared.dark, 0, h / 2, d / 2);
    for (const x of [-1, 1]) add(rbox(0.015, 0.3, 0.025, 0.006), shared.metal, x * 0.05, h * 0.52, d / 2 + 0.015);
  },
  desk(add, m, w, d, h) {
    add(rbox(w, 0.035, d, 0.012), m, 0, h - 0.018, 0);
    for (const x of [-1, 1])
      add(rbox(0.035, h - 0.035, d - 0.08, 0.01), shared.dark, x * (w / 2 - 0.04), (h - 0.035) / 2, 0);
    add(rbox(0.5, 0.32, 0.02, 0.01), shared.screen, 0.1, h + 0.25, -d / 2 + 0.12);
    add(rbox(0.06, 0.1, 0.06, 0.01), shared.dark, 0.1, h + 0.05, -d / 2 + 0.12);
  },
  chair(add, m) {
    add(rbox(0.46, 0.04, 0.44, 0.02), m, 0, 0.46, 0.02);
    add(rbox(0.46, 0.38, 0.04, 0.02), m, 0, 0.68, -0.2);
    for (const x of [-1, 1])
      for (const z of [-1, 1]) add(cyl(0.015, 0.015, 0.44), shared.dark, x * 0.19, 0.22, z * 0.18);
  },
  bookshelf(add, m, w, d, h) {
    for (const x of [-1, 1]) add(rbox(0.03, h, d, 0.005), m, x * (w / 2 - 0.015), h / 2, 0);
    add(rbox(w, h, 0.012, 0.004), m, 0, h / 2, -d / 2 + 0.006);
    const books = ['#b0674c', '#5c6b80', '#e7dfd2', '#8a9a8c', '#3b3a38', '#c8a77e'];
    for (let s = 0; s < 5; s++) {
      const y = 0.04 + s * 0.45;
      add(rbox(w - 0.06, 0.025, d - 0.02, 0.004), m, 0, y, 0);
      if (s === 4) continue;
      let x = -w / 2 + 0.06;
      let k = s * 3;
      while (x < w / 2 - 0.12) {
        const bw = 0.03 + ((k * 7) % 5) * 0.008;
        const bh = 0.24 + ((k * 3) % 4) * 0.03;
        add(
          rbox(bw, bh, d - 0.08, 0.003),
          mainMat(books[k % books.length]!, 'book'),
          x + bw / 2,
          y + 0.0125 + bh / 2,
          0,
        );
        x += bw + 0.004;
        k++;
      }
    }
  },
  bathtub(add, m, w, d, h) {
    add(rbox(w, h, d, 0.08), m, 0, h / 2, 0);
    add(rbox(w - 0.16, 0.04, d - 0.16, 0.06), shared.glass, 0, h - 0.06, 0);
    add(cyl(0.02, 0.02, 0.18), shared.metal, -w / 2 + 0.12, h + 0.09, 0);
  },
  toilet(add, m, w, d) {
    add(rbox(0.36, 0.38, 0.5, 0.12), m, 0, 0.19, 0.06);
    add(rbox(0.38, 0.05, 0.46, 0.15), m, 0, 0.42, 0.08);
    add(rbox(0.4, 0.36, 0.18, 0.04), m, 0, 0.6, -d / 2 + 0.09);
    void w;
  },
  sink(add, m, w, d, h) {
    add(rbox(w, h - 0.15, d, 0.02), m, 0, (h - 0.15) / 2 + 0.15, 0);
    add(rbox(w - 0.1, 0.12, d - 0.1, 0.05), shared.white, 0, h + 0.04, 0.02);
    add(cyl(0.012, 0.012, 0.2), shared.metal, 0, h + 0.18, -d / 2 + 0.06);
    add(rbox(w - 0.1, 0.7, 0.02, 0.01), shared.glass, 0, h + 0.7, -d / 2 + 0.01);
  },
  plant(add, m, w, d, h) {
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
    void w;
    void d;
    void h;
  },
  lamp(add, m, w, d, h) {
    add(cyl(0.16, 0.16, 0.03), m, 0, 0.015, 0);
    add(cyl(0.012, 0.012, h - 0.3), m, 0, (h - 0.3) / 2, 0);
    add(cyl(0.13, 0.19, 0.3, 20), shared.shade, 0, h - 0.15, 0);
    void w;
    void d;
  },
};

/** Builds one piece of furniture. Unknown types become a labelled box so a bad save never breaks the scene. */
export function buildFurniture(type: string, color?: string) {
  const def = FURNITURE[type];
  const g = new Group();
  const m = mainMat(color ?? def?.colors[0] ?? '#cccccc', type);
  const add: Add = (geo, mat, x, y, z) => {
    const mesh = new Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = type !== 'rug';
    mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };
  const build = builders[type];
  if (def && build) build(add, m, def.w, def.d, def.h);
  else add(rbox(0.5, 0.5, 0.5), m, 0, 0.25, 0);
  return g;
}

/** Point light under a lamp shade, used for warm evening light. */
export const LAMP_TYPES = new Set(['lamp', 'nightstand']);
