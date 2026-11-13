import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LatheGeometry,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Path,
  Quaternion,
  SRGBColorSpace,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TAU } from '../../lib/math';
import type { Quality } from '../../lib/three/quality';
import type { WatchTextures } from './texture-loader';
import { CASES, DIALS, STRAPS } from './catalog';

export interface ExplodedPart {
  group: Group;
  name: string;
  /** Offset along the watch axis when fully exploded. */
  z1: number;
  /** Local point the callout line points at. */
  anchor: Vector3;
}

/** Every material the configurator can change, plus the lume used by the "after dark" chapter. */
function createMaterials(tex: WatchTextures, quality: Quality) {
  const caseColor = CASES.titanium.color;
  return {
    brushed: new MeshPhysicalMaterial({
      color: caseColor,
      metalness: 1,
      roughness: 0.34,
      roughnessMap: tex.brush,
      anisotropy: 0.85,
      envMapIntensity: 1.15,
    }),
    polished: new MeshPhysicalMaterial({ color: caseColor, metalness: 1, roughness: 0.07, envMapIntensity: 1.3 }),
    dial: new MeshPhysicalMaterial({
      color: DIALS.midnight.color,
      map: tex.dial,
      bumpMap: tex.dial,
      bumpScale: 2.2,
      metalness: 0.55,
      roughness: 0.32,
      clearcoat: 0.4,
      clearcoatRoughness: 0.18,
    }),
    rehaut: new MeshStandardMaterial({ color: DIALS.midnight.color, map: tex.rehaut, metalness: 0.4, roughness: 0.4 }),
    lume: new MeshStandardMaterial({ color: '#ecefe2', roughness: 0.6, emissive: '#7dffc4', emissiveIntensity: 0 }),
    accent: new MeshPhysicalMaterial({ color: '#e0773a', metalness: 0.3, roughness: 0.3, clearcoat: 1 }),
    // Real refraction costs an extra render pass, so only capable GPUs get it.
    crystal: quality.transmission
      ? new MeshPhysicalMaterial({
          color: '#ffffff',
          roughness: 0,
          transmission: 1,
          thickness: 0.05,
          ior: 1.77,
          transparent: true,
          envMapIntensity: 0.45,
          specularIntensity: 0.3,
        })
      : new MeshPhysicalMaterial({
          color: '#ffffff',
          roughness: 0,
          transparent: true,
          opacity: 0.06,
          envMapIntensity: 0.5,
          depthWrite: false,
        }),
    backGlass: new MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0,
      transparent: true,
      opacity: 0.12,
      envMapIntensity: 2,
      clearcoat: 1,
      depthWrite: false,
    }),
    plate: new MeshStandardMaterial({
      color: '#c9cbce',
      metalness: 1,
      roughness: 0.42,
      roughnessMap: tex.perlage,
      bumpMap: tex.perlage,
      bumpScale: 0.6,
    }),
    bridge: new MeshStandardMaterial({
      color: '#d5d7da',
      metalness: 1,
      roughness: 0.3,
      roughnessMap: tex.cotes,
      bumpMap: tex.cotes,
      bumpScale: 0.4,
    }),
    brass: new MeshStandardMaterial({ color: '#d0a45c', metalness: 1, roughness: 0.28 }),
    ruby: new MeshPhysicalMaterial({ color: '#c0102e', roughness: 0.05, clearcoat: 1 }),
    blued: new MeshStandardMaterial({ color: '#2448a8', metalness: 1, roughness: 0.25 }),
    rotor: new MeshStandardMaterial({
      color: '#d9dbde',
      metalness: 1,
      roughness: 0.28,
      roughnessMap: tex.cotes,
      bumpMap: tex.cotes,
      bumpScale: 0.5,
    }),
    engrave: new MeshStandardMaterial({
      color: caseColor,
      metalness: 1,
      roughness: 0.25,
      roughnessMap: tex.engrave,
      bumpMap: tex.engrave,
      bumpScale: 2,
    }),
    strap: new MeshPhysicalMaterial({
      color: STRAPS.leather.color,
      roughness: 0.55,
      bumpMap: tex.grain,
      bumpScale: 1.2,
      sheen: 0,
      sheenRoughness: 0.8,
      sheenColor: new Color('#fff2dc'),
    }),
    stitch: new MeshStandardMaterial({ color: '#efe3c8', roughness: 0.8 }),
  };
}
export type WatchMaterials = ReturnType<typeof createMaterials>;

function gearShape(rOut: number, rIn: number, teeth: number, hole: number) {
  const s = new Shape();
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const r = i % 4 < 2 ? rOut : rIn;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  if (hole) {
    const h = new Path();
    h.absarc(0, 0, hole, 0, TAU, true);
    s.holes.push(h);
  }
  return s;
}

/** Lathe from (radius, z) pairs, turned so the watch faces +Z. */
const lathe = (pts: [number, number][], seg = 160) =>
  new LatheGeometry(
    pts.map(([r, z]) => new Vector2(r, z)),
    seg,
  ).rotateX(Math.PI / 2);

/** Faceted dauphine hand with a central ridge, flat-shaded so each facet catches the studio light. */
function dauphine(w: number, L: number, tail: number, h: number) {
  const p = [
    [0, L, 0.004],
    [w, 0, 0],
    [0, 0, h],
    [-w, 0, 0],
    [0, -tail, 0.004],
  ];
  const tri = [
    [0, 2, 1],
    [0, 3, 2],
    [4, 1, 2],
    [4, 2, 3],
    [0, 1, 4],
    [0, 4, 3],
  ];
  const pos: number[] = [];
  for (const t of tri) for (const i of t) pos.push(...p[i]!);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Rounded strap section swept along a curve that wraps behind the wrist, tapering to the tip. */
function sweptStrap(points: Vector3[], w0: number, w1: number, th: number) {
  const curve = new CatmullRomCurve3(points);
  const SEG = 70;
  const ARC = 6;
  const r = th * 0.5;
  const X = new Vector3(1, 0, 0);
  const N = new Vector3();
  const P = new Vector3();
  const T = new Vector3();
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const frames: { P: Vector3; N: Vector3; hw: number }[] = [];
  let K = 0;
  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG;
    curve.getPointAt(t, P);
    curve.getTangentAt(t, T);
    N.crossVectors(X, T).normalize();
    const hw = (w0 + (w1 - w0) * t) / 2 - r;
    const sec: [number, number][] = [];
    const arc = (cx: number, a0: number, a1: number) => {
      for (let k = 0; k <= ARC; k++) {
        const a = a0 + ((a1 - a0) * k) / ARC;
        sec.push([cx + Math.cos(a) * r, Math.sin(a) * r]);
      }
    };
    arc(hw, -Math.PI / 2, Math.PI / 2);
    arc(-hw, Math.PI / 2, Math.PI * 1.5);
    sec.push(sec[0]!);
    K = sec.length;
    sec.forEach(([sx, sn], k) => {
      pos.push(P.x + sx, P.y + N.y * sn, P.z + N.z * sn);
      uv.push(k / (K - 1), t * 6);
    });
    frames.push({ P: P.clone(), N: N.clone(), hw: hw + r });
  }
  for (let i = 0; i < SEG; i++)
    for (let k = 0; k < K - 1; k++) {
      const a = i * K + k;
      const b = a + K;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { g, frames };
}

/** Transparent overlay with the printed dial furniture, redrawn when the dial colour changes. */
function createInk() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const x = canvas.getContext('2d')!;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const draw = (color: string) => {
    const C = 512;
    const R = 512;
    x.clearRect(0, 0, 1024, 1024);
    x.fillStyle = x.strokeStyle = color;
    x.textAlign = 'center';
    x.lineWidth = 3;
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const a = (i / 60) * TAU - Math.PI / 2;
      x.beginPath();
      x.moveTo(C + Math.cos(a) * R * 0.9, C + Math.sin(a) * R * 0.9);
      x.lineTo(C + Math.cos(a) * R * 0.94, C + Math.sin(a) * R * 0.94);
      x.stroke();
    }
    x.font = '600 50px "Inter Variable", Inter, sans-serif';
    x.letterSpacing = '16px';
    x.fillText('MERIDIAN', C + 8, C - 230);
    x.font = '500 22px "Geist Mono", monospace';
    x.letterSpacing = '9px';
    x.globalAlpha = 0.8;
    x.fillText('AUTOMATIC', C + 4, C - 188);
    x.font = 'italic 46px "Instrument Serif", serif';
    x.letterSpacing = '2px';
    x.globalAlpha = 1;
    x.fillText('Halo', C, C + 236);
    x.font = '500 17px "Geist Mono", monospace';
    x.letterSpacing = '7px';
    x.globalAlpha = 0.7;
    x.fillText('TITANIUM · 100M', C + 4, C + 272);
    x.globalAlpha = 1;
    texture.needsUpdate = true;
  };
  return { texture, draw };
}

/**
 * The Meridian Halo 01, modelled in code (no 3D files to download).
 * 1 unit ≈ 20 mm: the case is 2 units across.
 */
export function buildWatch(tex: WatchTextures, quality: Quality) {
  const mats = createMaterials(tex, quality);
  const ink = createInk();
  const root = new Group();
  const parts: ExplodedPart[] = [];
  const add = (geo: BufferGeometry, m: Material, parent: Object3D, x = 0, y = 0, z = 0) => {
    const mesh = new Mesh(geo, m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const part = (name: string, z1: number, anchor: Vector3) => {
    const group = new Group();
    root.add(group);
    parts.push({ group, name, z1, anchor });
    return group;
  };

  /* ---------- Case: brushed flanks, polished bevel, knurled crown, sculpted lugs ---------- */
  const caseG = part('Grade 5 titanium case', 0, new Vector3(1.02, -0.2, 0));
  add(
    lathe([
      [0.8, -0.215],
      [0.93, -0.215],
      [0.995, -0.17],
      [1.02, -0.09],
      [1.022, 0.06],
      [1.0, 0.13],
      [0.975, 0.15],
    ]),
    mats.brushed,
    caseG,
  );
  add(
    lathe([
      [0.975, 0.15],
      [0.94, 0.172],
      [0.905, 0.176],
    ]),
    mats.polished,
    caseG,
  );
  add(
    lathe([
      [0.905, 0.176],
      [0.88, 0.12],
      [0.86, 0.11],
    ]),
    mats.brushed,
    caseG,
  );
  {
    const crown = new Group();
    crown.position.set(1.06, 0, -0.02);
    caseG.add(crown);
    const knurl = new ExtrudeGeometry(gearShape(0.125, 0.112, 26, 0), {
      depth: 0.13,
      bevelEnabled: true,
      bevelSize: 0.008,
      bevelThickness: 0.008,
      bevelSegments: 2,
    }).rotateY(Math.PI / 2);
    add(knurl, mats.polished, crown, 0.03);
    add(new CylinderGeometry(0.07, 0.08, 0.06, 32).rotateZ(Math.PI / 2), mats.brushed, crown, 0.005);
    add(new CylinderGeometry(0.1, 0.1, 0.012, 48).rotateZ(Math.PI / 2), mats.polished, crown, 0.17);
  }
  {
    const s = new Shape();
    s.moveTo(0.72, 0.13);
    s.quadraticCurveTo(1.08, 0.13, 1.3, -0.03);
    s.lineTo(1.31, -0.1);
    s.quadraticCurveTo(1.0, -0.12, 0.72, -0.17);
    s.lineTo(0.72, 0.13);
    const lug = new ExtrudeGeometry(s, {
      depth: 0.15,
      bevelEnabled: true,
      bevelSize: 0.018,
      bevelThickness: 0.018,
      bevelSegments: 3,
      curveSegments: 16,
    });
    lug.translate(0, 0, -0.075);
    lug.applyMatrix4(new Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1)); // (x,y,z) → (z,x,y)
    for (const side of [1, -1])
      for (const sx of [-1, 1]) {
        const m = add(lug, mats.brushed, caseG, sx * 0.415);
        if (side < 0) {
          m.rotation.z = Math.PI;
          m.position.x = -sx * 0.415;
        }
      }
    const bar = new CylinderGeometry(0.018, 0.018, 0.84, 12).rotateZ(Math.PI / 2);
    for (const sy of [1, -1]) add(bar, mats.polished, caseG, 0, sy * 1.2, -0.06);
  }

  /* ---------- Dial: guilloché, flange, applied indices with lume ---------- */
  const dialG = part('Guilloché dial', 0.42, new Vector3(-0.6, 0.55, 0.12));
  add(new CircleGeometry(0.86, 128), mats.dial, dialG, 0, 0, 0.1);
  add(
    lathe([
      [0.86, 0.1],
      [0.875, 0.12],
      [0.885, 0.165],
    ]),
    mats.rehaut,
    dialG,
  );
  add(
    new CircleGeometry(0.86, 128),
    new MeshBasicMaterial({ map: ink.texture, transparent: true, depthWrite: false, toneMapped: false }),
    dialG,
    0,
    0,
    0.1015,
  );
  const bigIdx = new RoundedBoxGeometry(0.05, 0.17, 0.03, 2, 0.008);
  const smallIdx = new RoundedBoxGeometry(0.036, 0.12, 0.03, 2, 0.008);
  const bigLume = new BoxGeometry(0.022, 0.12, 0.005);
  const smallLume = new BoxGeometry(0.014, 0.08, 0.005);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const big = i % 3 === 0;
    for (const off of i === 0 ? [-0.035, 0.035] : [0]) {
      const g = new Group();
      g.position.set(Math.sin(a) * 0.66 + Math.cos(a) * off, Math.cos(a) * 0.66 - Math.sin(a) * off, 0.115);
      g.rotation.z = -a;
      dialG.add(g);
      add(big ? bigIdx : smallIdx, mats.polished, g);
      add(big ? bigLume : smallLume, mats.lume, g, 0, 0, 0.016);
    }
  }

  /* ---------- Hands ---------- */
  const handsG = part('Dauphine hands', 0.78, new Vector3(0.1, 0.35, 0.16));
  const mkHand = (w: number, L: number, z: number) => {
    const pivot = new Group();
    pivot.position.z = z;
    handsG.add(pivot);
    add(dauphine(w, L, 0.09, 0.02), mats.polished, pivot);
    add(new BoxGeometry(w * 0.5, L * 0.55, 0.004), mats.lume, pivot, 0, L * 0.42, 0.012);
    return pivot;
  };
  const hourHand = mkHand(0.05, 0.46, 0.125);
  const minuteHand = mkHand(0.04, 0.72, 0.145);
  const secondHand = new Group();
  secondHand.position.z = 0.165;
  handsG.add(secondHand);
  add(new BoxGeometry(0.01, 0.92, 0.006), mats.accent, secondHand, 0, 0.3);
  add(new CylinderGeometry(0.035, 0.035, 0.008, 24).rotateX(Math.PI / 2), mats.accent, secondHand, 0, -0.16);
  add(new CylinderGeometry(0.03, 0.03, 0.03, 24).rotateX(Math.PI / 2), mats.polished, handsG, 0, 0, 0.16);

  /* ---------- Bezel + domed sapphire ---------- */
  const bezelG = part('Polished bezel', 1.05, new Vector3(0.95, 0.2, 0.2));
  add(
    lathe([
      [0.9, 0.17],
      [0.955, 0.18],
      [0.965, 0.215],
      [0.94, 0.25],
      [0.86, 0.255],
      [0.845, 0.235],
    ]),
    mats.polished,
    bezelG,
  );
  const crystalG = part('Domed sapphire', 1.5, new Vector3(0.45, 0.55, 0.28));
  {
    const a = 0.85;
    const h = 0.045;
    const R = (a * a + h * h) / (2 * h);
    const dome = new SphereGeometry(R, 96, 12, 0, TAU, 0, Math.asin(a / R)).rotateX(Math.PI / 2);
    add(dome, mats.crystal, crystalG, 0, 0, 0.25 + h - R);
  }

  /* ---------- Movement (seen through the back) ---------- */
  const moveG = part('Calibre M-01', -0.7, new Vector3(-0.55, -0.5, -0.12));
  add(new CircleGeometry(0.8, 96).rotateY(Math.PI), mats.plate, moveG, 0, 0, -0.1);
  const gear = (r: number, teeth: number, z: number, x: number, y: number) => {
    const g = add(
      new ExtrudeGeometry(gearShape(r, r * 0.92, teeth, r * 0.18), { depth: 0.02, bevelEnabled: false }),
      mats.brass,
      moveG,
      x,
      y,
      z,
    );
    g.rotation.y = Math.PI;
    return g;
  };
  const gears = [
    gear(0.3, 40, -0.11, -0.2, 0.15),
    gear(0.16, 22, -0.12, 0.25, 0.32),
    gear(0.11, 15, -0.12, 0.05, -0.12),
  ] as const;
  {
    const b = new Shape();
    b.moveTo(-0.7, 0.1);
    b.quadraticCurveTo(-0.2, 0.62, 0.55, 0.45);
    b.lineTo(0.62, 0.25);
    b.quadraticCurveTo(-0.1, 0.36, -0.55, -0.15);
    b.lineTo(-0.7, 0.1);
    const bridge = add(
      new ExtrudeGeometry(b, {
        depth: 0.03,
        bevelEnabled: true,
        bevelSize: 0.012,
        bevelThickness: 0.01,
        bevelSegments: 2,
      }),
      mats.bridge,
      moveG,
      0,
      0,
      -0.14,
    );
    bridge.rotation.y = Math.PI;
    const screw = new CylinderGeometry(0.03, 0.03, 0.02, 20).rotateX(Math.PI / 2);
    for (const [x, y] of [
      [0.6, 0.35],
      [-0.62, 0],
      [-0.1, 0.45],
    ] as const)
      add(screw, mats.blued, moveG, x, y, -0.18);
  }
  const jewel = new SphereGeometry(0.026, 16, 12);
  for (const [x, y] of [
    [0.2, 0.15],
    [-0.25, 0.32],
    [0.25, 0.32],
    [0.05, -0.12],
    [0.46, -0.26],
  ] as const)
    add(jewel, mats.ruby, moveG, x, y, -0.16);
  const balance = new Group();
  balance.position.set(0.46, -0.26, -0.15);
  moveG.add(balance);
  add(new TorusGeometry(0.17, 0.014, 10, 64), mats.brass, balance);
  for (const r of [0, Math.PI / 2]) add(new BoxGeometry(0.34, 0.016, 0.01), mats.brass, balance).rotation.z = r;
  {
    const pts: Vector3[] = [];
    for (let i = 0; i < 400; i++) {
      const t = (i / 400) * 9 * TAU;
      const r = 0.02 + (0.012 * t) / TAU;
      pts.push(new Vector3(Math.cos(t) * r, Math.sin(t) * r, -0.012));
    }
    balance.add(new Line(new BufferGeometry().setFromPoints(pts), new LineBasicMaterial({ color: '#2448a8' })));
  }
  const rotorG = part('Côtes de Genève rotor', -1.05, new Vector3(0, -0.6, -0.22));
  const rotor = new Group();
  rotorG.add(rotor);
  {
    const s = new Shape();
    s.absarc(0, 0, 0.78, Math.PI * 0.05, Math.PI * 0.95, false);
    s.absarc(0, 0, 0.12, Math.PI * 0.95, Math.PI * 0.05, true);
    add(
      new ExtrudeGeometry(s, {
        depth: 0.03,
        bevelEnabled: true,
        bevelSize: 0.01,
        bevelThickness: 0.008,
        bevelSegments: 2,
      }),
      mats.rotor,
      rotor,
      0,
      0,
      -0.195,
    ).rotation.y = Math.PI;
    add(new TorusGeometry(0.72, 0.04, 10, 64, Math.PI * 0.9).rotateZ(Math.PI * 0.05), mats.brass, rotor, 0, 0, -0.215);
    add(new CylinderGeometry(0.1, 0.1, 0.03, 32).rotateX(Math.PI / 2), mats.polished, rotor, 0, 0, -0.21);
  }
  const backG = part('Exhibition caseback', -1.4, new Vector3(0.82, -0.25, -0.24));
  add(
    lathe([
      [0.83, -0.215],
      [0.86, -0.235],
      [0.84, -0.265],
      [0.62, -0.27],
      [0.6, -0.25],
    ]),
    mats.engrave,
    backG,
  );
  add(new CircleGeometry(0.62, 96).rotateY(Math.PI), mats.backGlass, backG, 0, 0, -0.262);

  /* ---------- Straps with instanced stitching ---------- */
  const straps: { half: Group; sy: number; stitches: InstancedMesh }[] = [];
  const stitchGeo = new BoxGeometry(0.008, 0.028, 0.006);
  const up = new Vector3(0, 1, 0);
  for (const sy of [1, -1]) {
    const pts = (
      [
        [0.98, -0.06],
        [1.45, -0.13],
        [1.92, -0.42],
        [2.22, -0.92],
        [2.28, -1.5],
      ] as const
    ).map(([y, z]) => new Vector3(0, y * sy, z));
    const { g, frames } = sweptStrap(pts, 0.62, 0.52, 0.1);
    const half = new Group();
    root.add(half);
    add(g, mats.strap, half);
    const stitches = new InstancedMesh(stitchGeo, mats.stitch, frames.length * 4);
    const M = new Matrix4();
    const Q = new Quaternion();
    const one = new Vector3(1, 1, 1);
    let c = 0;
    for (let i = 1; i < frames.length; i += 0.5) {
      const f = frames[Math.floor(i)]!;
      const along = new Vector3().crossVectors(f.N, new Vector3(1, 0, 0)).normalize();
      Q.setFromUnitVectors(up, along);
      for (const sx of [-1, 1]) {
        const p = f.P.clone().addScaledVector(f.N, 0.051);
        p.x = sx * (f.hw - 0.07);
        stitches.setMatrixAt(c++, M.compose(p, Q, one));
      }
    }
    stitches.count = c;
    half.add(stitches);
    straps.push({ half, sy, stitches });
  }

  return {
    root,
    parts,
    mats,
    ink,
    hands: { hourHand, minuteHand, secondHand },
    movement: { balance, gears, rotor },
    straps,
  };
}
export type Watch = ReturnType<typeof buildWatch>;
