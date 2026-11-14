/**
 * The PC, built in code. Every part is a group placed at its installed ("home") position inside the case; the guide
 * only decides where each part starts and when it moves home. 1 unit = 10 cm. The case's open side faces +z,
 * its front is -x and its rear (I/O, PSU) is +x.
 */
import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
  type Texture,
} from 'three';
import { newLook, patchLook, setXray, type Look } from './look';
import type { AssemblyTexture } from './textures';

export interface PartInfo {
  id: string;
  name: string;
  spec: string;
  qty: number;
}

/** Bill of materials, in the order a builder would unpack them. */
export const PART_INFO: PartInfo[] = [
  { id: 'case', name: 'Mid-tower case', spec: 'ATX · steel · tempered glass', qty: 1 },
  { id: 'psu', name: 'Power supply', spec: '850 W · 80+ Gold · modular', qty: 1 },
  { id: 'mobo', name: 'Motherboard', spec: 'ATX · DDR5 · PCIe 5.0', qty: 1 },
  { id: 'cpu', name: 'Processor', spec: '8 cores · 5.4 GHz boost', qty: 1 },
  { id: 'cooler', name: 'CPU tower cooler', spec: '4 heat pipes · 120 mm fan', qty: 1 },
  { id: 'ram', name: 'Memory', spec: 'DDR5-6000 · 16 GB stick', qty: 2 },
  { id: 'ssd', name: 'M.2 SSD', spec: '2 TB · NVMe Gen 4', qty: 1 },
  { id: 'gpu', name: 'Graphics card', spec: '16 GB · triple fan', qty: 1 },
  { id: 'fans', name: 'Intake fans', spec: '120 mm ARGB', qty: 3 },
  { id: 'fan-rear', name: 'Exhaust fan', spec: '120 mm ARGB', qty: 1 },
  { id: 'cables', name: 'PSU cables', spec: '24-pin · 8-pin EPS · PCIe', qty: 3 },
  { id: 'glass', name: 'Side panel', spec: 'Tempered glass · 4 thumbscrews', qty: 1 },
];

export interface Part extends PartInfo {
  group: Group;
  /** Same meshes with the ghost material, shown at home as the "it goes here" hint. */
  ghost: Group;
  home: Vector3;
  /** Centre of the part in its own space (for labels and framing). */
  center: Vector3;
  look: Look;
  materials: MeshStandardMaterial[];
  xray: boolean;
}

export interface Kit {
  root: Group;
  parts: Part[];
  byId: Map<string, Part>;
  /** Fan rotors; spun around their local z axis when the build powers on. */
  rotors: Object3D[];
  ghostLook: Look;
  setXray(part: Part, on: boolean): void;
}

/** Motherboard origin (centre of the board, at the back of the PCB). Most parts are placed relative to it. */
const M = new Vector3(0.88, 3.21, -1.04);
const onBoard = (x: number, y: number, z = 0) => new Vector3(M.x + x, M.y + y, M.z + z);

export function buildParts(tex: Record<AssemblyTexture, Texture>): Kit {
  /* ---------- Base materials (cloned per part below) ---------- */
  const std = (color: string, roughness: number, metalness = 0, extra: Partial<MeshStandardMaterial> = {}) =>
    Object.assign(new MeshStandardMaterial({ color, roughness, metalness }), extra);
  const steel = std('#1a1d23', 0.42, 0.7);
  const steelLight = std('#30343c', 0.4, 0.75);
  // White powder-coated case panels
  const shell = std('#ece9e3', 0.55, 0.12);
  const shellDark = std('#d4cfc6', 0.5, 0.15);
  const alu = std('#9aa0a8', 0.3, 1);
  const aluDark = std('#353a43', 0.38, 0.9);
  const plastic = std('#0e0f12', 0.55);
  const plasticGrey = std('#2b2e35', 0.5);
  const silver = std('#cfd3d8', 0.22, 1);
  const gold = std('#d6a84c', 0.3, 1);
  const copper = std('#c8703c', 0.26, 1);
  const pcbGreen = std('#1d3b2b', 0.55, 0.1);
  const rubber = std('#050506', 0.9);
  const rgb = std('#8c939e', 0.35, 0, { emissive: new Color('#000000') });
  rgb.userData.rgb = true;
  const meshTex = (map: Texture, tint = '#ffffff') => std(tint, 0.7, 0, { map });

  const pcb = std('#ffffff', 0.62, 0.25, { map: tex.pcb });
  const sleeve = std('#ffffff', 0.75, 0.1, { map: tex.sleeve });
  const label = std('#ffffff', 0.5, 0.1, { map: tex.label });
  const logo = std('#ffffff', 0.4, 0.2, {
    map: tex.logo,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const logoInk = std('#1d1d1f', 0.4, 0.2, {
    map: tex.logo,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const grill = std('#ffffff', 0.5, 0.6, { map: tex.grill });
  const glass = std('#8fa6bd', 0.04, 0.9, { transparent: true, opacity: 0.16, depthWrite: false });

  /* ---------- Helpers ---------- */
  const geoCache = new Map<string, BufferGeometry>();
  const boxGeo = (w: number, h: number, d: number) => {
    const k = `b${w},${h},${d}`;
    let g = geoCache.get(k);
    if (!g) geoCache.set(k, (g = new BoxGeometry(w, h, d)));
    return g;
  };
  const add = <T extends Object3D>(parent: Object3D, o: T, x = 0, y = 0, z = 0) => {
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const box = (parent: Object3D, w: number, h: number, d: number, m: Material | Material[], x = 0, y = 0, z = 0) =>
    add(parent, new Mesh(boxGeo(w, h, d), m), x, y, z);
  const cyl = (parent: Object3D, r: number, h: number, m: Material, x = 0, y = 0, z = 0, seg = 20) =>
    add(parent, new Mesh(new CylinderGeometry(r, r, h, seg), m), x, y, z);
  /** Decal plane facing +z. */
  const plane = (parent: Object3D, w: number, h: number, m: Material, x = 0, y = 0, z = 0) =>
    add(parent, new Mesh(new PlaneGeometry(w, h), m), x, y, z);

  const rotors: Object3D[] = [];
  /** 120 mm-style fan facing +z: frame, seven pitched blades, ARGB ring. */
  const fan = (size: number, depth = 0.25) => {
    const g = new Group();
    const bar = size * 0.08;
    for (const s of [-1, 1]) {
      box(g, size, bar, depth, plastic, 0, (s * (size - bar)) / 2, 0);
      box(g, bar, size, depth, plastic, (s * (size - bar)) / 2, 0, 0);
    }
    const ring = new Mesh(new TorusGeometry(size * 0.43, size * 0.025, 8, 48), rgb);
    ring.position.z = depth * 0.45;
    g.add(ring);
    const rotor = new Group();
    g.add(rotor);
    const hub = cyl(rotor, size * 0.15, depth * 0.8, plasticGrey);
    hub.rotation.x = Math.PI / 2;
    const bladeGeo = new BoxGeometry(size * 0.3, size * 0.15, 0.012);
    for (let i = 0; i < 7; i++) {
      const arm = new Group();
      arm.rotation.z = (i / 7) * Math.PI * 2;
      rotor.add(arm);
      const b = new Mesh(bladeGeo, plastic);
      b.position.x = size * 0.27;
      b.rotation.x = 0.55;
      arm.add(b);
    }
    rotors.push(rotor);
    return g;
  };

  const groups = new Map<string, Group>();
  const homes = new Map<string, Vector3>();
  const part = (id: string, home: Vector3) => {
    const g = new Group();
    g.userData.partId = id;
    groups.set(id, g);
    homes.set(id, home.clone());
    return g;
  };

  /* ---------- Case ---------- */
  {
    const g = part('case', new Vector3(0, 0, 0));
    const L = 4.6;
    const W = 2.3;
    box(g, L, 0.06, W, shell, 0, 0.18, 0); // floor
    box(g, L, 0.06, W, [shell, shell, meshTex(tex.meshTop), shell, shell, shell], 0, 4.92, 0); // top
    box(g, L, 4.8, 0.04, shellDark, 0, 2.55, -1.13); // motherboard tray / right side
    box(g, 0.08, 4.8, W, [shell, meshTex(tex.meshFront), shell, shell, shell, shell], -2.26, 2.55, 0); // front
    // Rear panel with the PSU opening
    box(g, 0.04, 3.81, W, shell, 2.28, 2.985, 0);
    for (const s of [-1, 1]) box(g, 0.04, 0.87, 0.4, shell, 2.28, 0.645, s * 0.95);
    box(g, 0.02, 1.1, 0.45, rubber, 2.29, 4.06, -0.84); // I/O cutout
    const rearGrill = plane(g, 1.1, 1.1, grill, 2.305, 3.9, 0);
    rearGrill.rotation.y = Math.PI / 2;
    for (let i = 0; i < 7; i++) box(g, 0.02, 0.06, 0.95, shellDark, 2.3, 2.62 - i * 0.2, 0.1); // slot covers
    // Feet
    for (const x of [-1.9, 1.9]) for (const z of [-0.85, 0.85]) box(g, 0.5, 0.15, 0.3, rubber, x, 0.075, z);
    // PSU shroud
    box(g, 3.85, 0.04, 2.22, shell, 0.35, 1.08, 0);
    box(g, 2.0, 0.87, 0.04, shell, -0.6, 0.645, 1.1);
    const shroudLogo = plane(g, 1.2, 0.3, logoInk, -0.6, 0.66, 1.125);
    shroudLogo.renderOrder = 1;
    box(g, 0.3, 0.012, 0.6, rubber, -0.42, 1.1, -0.55); // cable grommet
    box(g, 0.05, 2.2, 0.01, rubber, -0.62, 3.3, -1.105); // tray grommets
    box(g, 1.2, 0.05, 0.01, rubber, 0.2, 4.82, -1.105);
    // ARGB strip on the front edge
    box(g, 0.03, 4.4, 0.05, rgb, -2.31, 2.55, 1.08);
  }

  /* ---------- Power supply ---------- */
  {
    const g = part('psu', new Vector3(1.45, 0.62, 0));
    box(g, 1.5, 0.8, 1.5, steel);
    const bottom = plane(g, 1.2, 1.2, grill, 0, -0.401, 0);
    bottom.rotation.x = Math.PI / 2;
    const rear = plane(g, 0.7, 0.6, meshTex(tex.meshPsu, '#4a4a4a'), 0.751, 0, 0.35);
    rear.rotation.y = Math.PI / 2;
    box(g, 0.05, 0.22, 0.3, rubber, 0.76, 0.1, -0.45); // power socket
    box(g, 0.05, 0.12, 0.08, plasticGrey, 0.76, -0.18, -0.45); // switch
    plane(g, 1.2, 0.6, label, 0, 0, 0.751);
    for (let i = 0; i < 6; i++)
      box(g, 0.04, 0.12, 0.2, rubber, -0.76, 0.2 - (i % 2) * 0.25, -0.5 + Math.floor(i / 2) * 0.4);
  }

  /* ---------- Motherboard ---------- */
  {
    const g = part('mobo', M);
    const bw = 2.44;
    const bh = 3.05;
    box(g, bw, bh, 0.02, [pcbGreen, pcbGreen, pcbGreen, pcbGreen, pcb, pcbGreen], 0, 0, 0);
    // Standoffs
    for (const [x, y] of [
      [-1.12, 1.4],
      [1.12, 1.4],
      [-1.12, 0],
      [1.12, 0],
      [-1.12, -1.4],
      [1.12, -1.4],
    ] as const) {
      const s = cyl(g, 0.03, 0.06, gold, x, y, -0.04, 8);
      s.rotation.x = Math.PI / 2;
    }
    // Socket and lever
    box(g, 0.56, 0.56, 0.04, aluDark, 0.15, 0.7, 0.03);
    box(g, 0.44, 0.44, 0.01, gold, 0.15, 0.7, 0.051);
    const lever = cyl(g, 0.012, 0.5, silver, 0.47, 0.7, 0.04, 8);
    lever.rotation.z = 0;
    // VRM heatsinks with an ARGB accent
    box(g, 1.3, 0.22, 0.22, aluDark, 0.15, 1.33, 0.12);
    box(g, 0.22, 1.25, 0.22, aluDark, 0.92, 0.55, 0.12);
    box(g, 0.02, 1.0, 0.02, rgb, 0.81, 0.55, 0.23);
    // Rear I/O shroud
    box(g, 0.35, 1.1, 0.4, plastic, 1.0, 0.85, 0.2);
    plane(g, 0.3, 0.08, logo, 1.0, 0.85, 0.401);
    // RAM slots (sticks go in the 2nd and 4th)
    for (let i = 0; i < 4; i++) box(g, 0.05, 1.35, 0.07, i % 2 ? plasticGrey : plastic, -0.42 - i * 0.1, 0.7, 0.045);
    // Power connectors
    box(g, 0.1, 0.5, 0.12, plastic, -1.12, 0.6, 0.07); // 24-pin
    box(g, 0.25, 0.1, 0.12, plastic, 0.9, 1.45, 0.07); // 8-pin EPS
    // PCIe slots, the top one with a steel shield
    box(g, 1.6, 0.08, 0.1, steelLight, 0.3, -0.75, 0.06);
    box(g, 0.9, 0.07, 0.08, plastic, 0.6, -1.25, 0.05);
    // M.2 socket and standoff
    box(g, 0.04, 0.22, 0.04, plastic, -0.62, -0.35, 0.03);
    const m2s = cyl(g, 0.025, 0.03, gold, 0.2, -0.35, 0.025, 8);
    m2s.rotation.x = Math.PI / 2;
    // Chipset heatsink
    box(g, 0.62, 0.5, 0.08, aluDark, -0.55, -1.05, 0.05);
    plane(g, 0.5, 0.12, logo, -0.55, -1.05, 0.091);
    // Capacitors around the socket
    for (let i = 0; i < 8; i++) {
      const c = cyl(g, 0.03, 0.08, alu, -0.28 + (i % 4) * 0.14, i < 4 ? 1.12 : 0.28, 0.05, 10);
      c.rotation.x = Math.PI / 2;
    }
  }

  /* ---------- CPU ---------- */
  {
    const g = part('cpu', onBoard(0.15, 0.7, 0.01));
    box(g, 0.42, 0.42, 0.012, pcbGreen, 0, 0, 0.05);
    box(g, 0.34, 0.34, 0.03, silver, 0, 0, 0.07);
    const tri = new Mesh(new CylinderGeometry(0.025, 0.025, 0.004, 3), gold);
    tri.rotation.x = Math.PI / 2;
    add(g, tri, -0.18, -0.18, 0.058);
  }

  /* ---------- CPU cooler ---------- */
  {
    const g = part('cooler', onBoard(0.15, 0.7, 0.095));
    box(g, 0.42, 0.42, 0.06, copper, 0, 0, 0.03);
    box(g, 0.9, 0.08, 0.05, aluDark, 0, 0, 0.085);
    for (const x of [-0.15, -0.05, 0.05, 0.15]) {
      const p = cyl(g, 0.028, 1.45, copper, x, 0, 0.78, 12);
      p.rotation.x = Math.PI / 2;
    }
    const fins = new InstancedMesh(new BoxGeometry(0.55, 1.2, 0.009), alu, 38);
    const m4 = new Matrix4();
    for (let i = 0; i < 38; i++) fins.setMatrixAt(i, m4.makeTranslation(0, 0, 0.36 + i * 0.03));
    g.add(fins);
    box(g, 0.58, 1.22, 0.05, aluDark, 0, 0, 1.52);
    box(g, 0.05, 1.0, 0.02, rgb, 0, 0, 1.555);
    const f = add(g, fan(1.2), -0.42, 0, 0.92);
    f.rotation.y = -Math.PI / 2;
  }

  /* ---------- Memory ---------- */
  {
    const g = part('ram', onBoard(-0.62, 0.7, 0.01));
    for (const x of [0.1, -0.1]) {
      box(g, 0.012, 1.33, 0.28, pcbGreen, x, 0, 0.18);
      box(g, 0.045, 1.35, 0.28, aluDark, x, 0, 0.2);
      box(g, 0.04, 1.3, 0.05, rgb, x, 0, 0.365);
      box(g, 0.047, 0.5, 0.12, silver, x, 0.3, 0.22);
    }
  }

  /* ---------- M.2 SSD ---------- */
  {
    const g = part('ssd', onBoard(-0.21, -0.35, 0.01));
    box(g, 0.8, 0.22, 0.015, pcbGreen, 0, 0, 0.03);
    box(g, 0.25, 0.16, 0.02, plastic, -0.15, 0, 0.045);
    box(g, 0.25, 0.16, 0.02, plastic, 0.17, 0, 0.045);
    box(g, 0.05, 0.2, 0.004, gold, -0.39, 0, 0.04);
  }

  /* ---------- Graphics card ---------- */
  {
    const g = part('gpu', onBoard(0.3, -0.75, 0.05));
    const cx = -0.33;
    box(g, 2.8, 0.02, 1.1, pcbGreen, cx, -0.03, 0.61);
    box(g, 2.8, 0.03, 1.12, aluDark, cx, 0.0, 0.61); // backplate
    const bpLogo = plane(g, 1.0, 0.25, logo, cx - 0.5, 0.016, 0.7);
    bpLogo.rotation.x = -Math.PI / 2;
    box(g, 2.8, 0.34, 1.14, plastic, cx, -0.22, 0.61); // shroud
    box(g, 2.6, 0.04, 0.02, rgb, cx, -0.12, 1.185); // light bar on the top edge
    for (const x of [-1.2, -0.33, 0.54]) {
      const f = add(g, fan(0.82, 0.1), x, -0.4, 0.61);
      f.rotation.x = Math.PI / 2;
    }
    box(g, 0.03, 0.42, 1.0, steelLight, 1.08, -0.2, 0.55); // bracket
    for (let i = 0; i < 3; i++) box(g, 0.02, 0.08, 0.14, rubber, 1.095, -0.12, 0.25 + i * 0.25); // ports
    box(g, 0.3, 0.1, 0.06, rubber, -0.68, -0.08, 1.19); // power connector
  }

  /* ---------- Case fans ---------- */
  {
    const g = part('fans', new Vector3(-2.08, 0, 0));
    for (const y of [1.25, 2.55, 3.85]) {
      const f = add(g, fan(1.2), 0, y, 0);
      f.rotation.y = Math.PI / 2;
    }
  }
  {
    const g = part('fan-rear', new Vector3(2.12, 3.9, 0));
    const f = add(g, fan(1.2), 0, 0, 0);
    f.rotation.y = Math.PI / 2;
  }

  /* ---------- Cables (world-space curves) ---------- */
  {
    const g = part('cables', new Vector3(0, 0, 0));
    const cable = (
      pts: [number, number, number][],
      r: number,
      plug: [number, number, number, number, number, number],
    ) => {
      const curve = new CatmullRomCurve3(pts.map((p) => new Vector3(...p)));
      g.add(new Mesh(new TubeGeometry(curve, 64, r, 10, false), sleeve));
      const [x, y, z, w, h, d] = plug;
      box(g, w, h, d, plastic, x, y, z);
    };
    cable(
      [
        [-0.28, 3.81, -0.86],
        [-0.6, 3.78, -0.8],
        [-0.8, 3.0, -0.85],
        [-0.8, 1.6, -0.9],
        [-0.55, 1.12, -0.62],
        [-0.45, 0.9, -0.55],
      ],
      0.075,
      [-0.24, 3.81, -0.88, 0.12, 0.52, 0.1],
    );
    cable(
      [
        [1.78, 4.72, -0.86],
        [1.5, 4.8, -0.85],
        [0.2, 4.8, -0.95],
        [-0.55, 4.75, -1.07],
      ],
      0.045,
      [1.78, 4.66, -0.88, 0.27, 0.1, 0.1],
    );
    cable(
      [
        [0.5, 2.38, 0.27],
        [0.35, 2.2, 0.45],
        [0.1, 1.6, 0.45],
        [-0.12, 1.12, 0.3],
        [-0.15, 0.9, 0.25],
      ],
      0.05,
      [0.5, 2.38, 0.22, 0.32, 0.1, 0.08],
    );
  }

  /* ---------- Glass side panel ---------- */
  {
    const g = part('glass', new Vector3(0, 2.55, 1.17));
    const pane = box(g, 4.5, 4.7, 0.03, glass);
    pane.renderOrder = 2;
    for (const x of [-2.1, 2.1])
      for (const y of [-2.2, 2.2]) {
        const s = cyl(g, 0.06, 0.05, silver, x, y, 0.03, 12);
        s.rotation.x = Math.PI / 2;
      }
  }

  /* ---------- Per-part materials, ghosts and bookkeeping ---------- */
  const root = new Group();
  const ghostLook = newLook();
  ghostLook.uFade.value = 1;
  const ghostMat = new MeshStandardMaterial({ color: '#000000', side: DoubleSide });
  patchLook(ghostMat, ghostLook);
  setXray(ghostMat, true);

  const parts: Part[] = PART_INFO.map((info) => {
    const group = groups.get(info.id)!;
    const home = homes.get(info.id)!;
    group.position.copy(home);
    const look = newLook();
    const clones = new Map<Material, MeshStandardMaterial>();
    const cloneMat = (m: Material) => {
      let c = clones.get(m);
      if (!c) {
        c = (m as MeshStandardMaterial).clone();
        patchLook(c, look, !!m.userData.rgb);
        clones.set(m, c);
      }
      return c;
    };
    const ghost = group.clone();
    group.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(cloneMat) : cloneMat(mesh.material);
    });
    ghost.traverse((o) => {
      const mesh = o as Mesh;
      if (mesh.isMesh) {
        mesh.material = ghostMat;
        mesh.renderOrder = 3;
      }
    });
    ghost.userData = { ghost: true };
    ghost.visible = false;
    root.add(group, ghost);
    // Centre of the bounding box in the part's own space
    group.updateMatrixWorld(true);
    const center = new Vector3();
    let n = 0;
    const v = new Vector3();
    group.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.computeBoundingBox();
      mesh.geometry.boundingBox!.getCenter(v);
      center.add(mesh.localToWorld(v).sub(group.position));
      n++;
    });
    center.divideScalar(Math.max(1, n));
    return { ...info, group, ghost, home, center, look, materials: [...clones.values()], xray: false };
  });

  return {
    root,
    parts,
    byId: new Map(parts.map((p) => [p.id, p])),
    rotors, // ghosts are clones, so this only holds the real rotors
    ghostLook,
    setXray(p, on) {
      if (p.xray === on) return;
      p.xray = on;
      for (const m of p.materials) setXray(m, on);
    },
  };
}
