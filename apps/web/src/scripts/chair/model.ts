import {
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  QuadraticBezierCurve3,
  Shape,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { FRAMES, type LegKey } from './catalog';
import type { ChairTexture } from './textures';

/** Closed rounded-rectangle tube, used for the piping that runs around each cushion. */
function piping(w: number, d: number, r: number, thickness: number) {
  const s = new Shape();
  const x = w / 2;
  const z = d / 2;
  s.moveTo(-x + r, -z);
  s.lineTo(x - r, -z);
  s.quadraticCurveTo(x, -z, x, -z + r);
  s.lineTo(x, z - r);
  s.quadraticCurveTo(x, z, x - r, z);
  s.lineTo(-x + r, z);
  s.quadraticCurveTo(-x, z, -x, z - r);
  s.lineTo(-x, -z + r);
  s.quadraticCurveTo(-x, -z, -x + r, -z);
  const pts = s.getSpacedPoints(160).map((p) => new Vector3(p.x, 0, p.y));
  return new TubeGeometry(new CatmullRomCurve3(pts, true), 220, thickness, 6, true);
}

/** Leg profiles (radius, height), turned on a lathe. */
const LEG_PROFILES: Record<LegKey, [number, number][]> = {
  straight: [
    [0.0, 0],
    [0.024, 0],
    [0.027, 0.01],
    [0.03, 0.38],
    [0.0, 0.38],
  ],
  tapered: [
    [0.0, 0],
    [0.015, 0],
    [0.018, 0.012],
    [0.026, 0.2],
    [0.033, 0.25],
    [0.039, 0.262],
    [0.039, 0.282],
    [0.032, 0.294],
    [0.033, 0.38],
    [0.0, 0.38],
  ],
};
const legGeometry = (k: LegKey) =>
  new LatheGeometry(
    LEG_PROFILES[k].map(([r, y]) => new Vector2(r, y)),
    32,
  );

export interface ChairMaterials {
  wood: MeshPhysicalMaterial;
  fabric: MeshPhysicalMaterial;
}

export function createMaterials(tex: Record<ChairTexture, Texture>): ChairMaterials {
  return {
    wood: new MeshPhysicalMaterial({
      color: FRAMES.oak.color,
      map: tex.wood,
      roughness: 0.55,
      roughnessMap: tex.wood,
      clearcoat: 0.25,
      clearcoatRoughness: 0.5,
    }),
    fabric: new MeshPhysicalMaterial({
      color: '#d6c4a8',
      roughness: 0.92,
      normalMap: tex.weave,
      sheenRoughness: 0.45,
      sheenColor: new Color('#ffffff'),
    }),
  };
}

/** The Norda lounge chair. 1 unit = 1 m; the seat is 46 cm high. */
export function buildChair(m: ChairMaterials) {
  const root = new Group();
  const add = (geo: BufferGeometry, mat: Material, parent: Object3D, x = 0, y = 0, z = 0) => {
    const mesh = new Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  /* ---------- Legs (splayed 4°, geometry swaps with the leg style) ---------- */
  const legGeos: Record<LegKey, BufferGeometry> = {
    straight: legGeometry('straight'),
    tapered: legGeometry('tapered'),
  };
  const legs = (
    [
      [-0.4, 0.33],
      [0.4, 0.33],
      [-0.4, -0.33],
      [0.4, -0.33],
    ] as const
  ).map(([x, z]) => {
    const leg = add(legGeos.straight, m.wood, root, x, 0, z);
    leg.rotation.z = Math.sign(x) * -0.07;
    leg.rotation.x = Math.sign(z) * 0.07;
    return leg;
  });

  /* ---------- Seat frame ---------- */
  const rail = (w: number, d: number) => new RoundedBoxGeometry(w, 0.06, d, 3, 0.012);
  add(rail(0.86, 0.04), m.wood, root, 0, 0.405, 0.33);
  add(rail(0.86, 0.04), m.wood, root, 0, 0.405, -0.33);
  add(rail(0.04, 0.7), m.wood, root, -0.4, 0.405, 0);
  add(rail(0.04, 0.7), m.wood, root, 0.4, 0.405, 0);

  /* ---------- Seat cushion with piping ---------- */
  const seat = new Group();
  seat.position.set(0, 0.5, 0.01);
  root.add(seat);
  add(new RoundedBoxGeometry(0.84, 0.13, 0.72, 6, 0.05), m.fabric, seat);
  const seatPipe = piping(0.8, 0.68, 0.06, 0.008);
  add(seatPipe, m.fabric, seat, 0, 0.058);
  add(seatPipe, m.fabric, seat, 0, -0.058);

  /* ---------- Back: raked posts, bowed top rail, buttoned cushion ---------- */
  const back = new Group();
  back.position.set(0, 0.4, -0.36);
  back.rotation.x = -0.2;
  root.add(back);
  const post = new RoundedBoxGeometry(0.04, 0.62, 0.04, 3, 0.012);
  add(post, m.wood, back, -0.4, 0.31);
  add(post, m.wood, back, 0.4, 0.31);
  const bow = new QuadraticBezierCurve3(
    new Vector3(-0.4, 0.6, 0),
    new Vector3(0, 0.6, -0.12),
    new Vector3(0.4, 0.6, 0),
  );
  add(new TubeGeometry(bow, 40, 0.021, 10), m.wood, back);
  const cushion = new Group();
  cushion.position.set(0, 0.36, 0.05);
  back.add(cushion);
  add(new RoundedBoxGeometry(0.78, 0.44, 0.11, 6, 0.045), m.fabric, cushion);
  const backPipe = piping(0.74, 0.4, 0.05, 0.007);
  backPipe.rotateX(Math.PI / 2);
  add(backPipe, m.fabric, cushion, 0, 0, 0.05);
  const buttons = new Group();
  cushion.add(buttons);
  const button = new SphereGeometry(0.014, 12, 8).scale(1, 1, 0.45);
  for (const x of [-0.22, 0, 0.22]) for (const y of [-0.08, 0.1]) add(button, m.fabric, buttons, x, y, 0.056);

  /* ---------- Armrests (grow in when enabled) ---------- */
  const arms = new Group();
  arms.visible = false;
  root.add(arms);
  const armPost = new CylinderGeometry(0.016, 0.018, 0.24, 16);
  const armPad = new RoundedBoxGeometry(0.075, 0.032, 0.74, 4, 0.014);
  for (const s of [-1, 1]) {
    add(armPost, m.wood, arms, s * 0.43, 0.555, 0.28);
    add(armPost, m.wood, arms, s * 0.43, 0.555, -0.22);
    add(armPad, m.wood, arms, s * 0.43, 0.685, 0.02);
  }

  /** Points of interest for the annotation pins (local to the chair). */
  const anchors = {
    frame: new Vector3(0.4, 0.405, 0.18),
    fabric: new Vector3(-0.2, 0.565, 0.3),
    legs: new Vector3(0.43, 0.14, 0.36),
  };

  return {
    root,
    setLegs(k: LegKey) {
      for (const l of legs) l.geometry = legGeos[k];
    },
    arms,
    buttons,
    anchors,
  };
}
export type Chair = ReturnType<typeof buildChair>;
