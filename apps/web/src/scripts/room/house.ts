/**
 * Turns a plan into 3D: walls with door and window openings (each face painted with the finish of the room it faces),
 * room floors, an invisible roof that only casts shadows (so sunlight enters through the windows), and furniture.
 * Structure is rebuilt only when walls, openings or finishes change; moving furniture just moves its group.
 */
import {
  BoxGeometry,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
  type Material,
  type Texture,
} from 'three';
import { FLOORS, FURNITURE, WALLS, type Finish } from './catalog';
import { buildFurniture } from './furniture';
import {
  DOOR_HEIGHT,
  WALL_HEIGHT,
  WINDOW_SILL,
  WINDOW_TOP,
  nodeMap,
  roomAt,
  roomStyle,
  type Plan,
  type Room,
  type Vec2,
} from './plan';
import type { RoomTexture } from './textures';

export interface WallView {
  id: string;
  group: Group;
  mid: Vec2;
  /** Unit normal of the +z face. */
  normal: Vec2;
  /** Current cut-away amount, 0 (full height) to 1 (cut down). */
  cut: number;
  openings: Group[];
}

const DEG = Math.PI / 180;

export class House {
  readonly root = new Group();
  walls: WallView[] = [];
  readonly items = new Map<string, { group: Group; sig: string }>();
  /** Centre and radius of the building, for framing and shadows. */
  bounds = { cx: 0, cz: 0, r: 6 };

  private structure = new Group();
  private furniture = new Group();
  private structureSig = '';
  private ceilings: Mesh[] = [];
  private showCeilings = false;
  private readonly ceilingMat = new MeshStandardMaterial({ color: '#f6f3ee', roughness: 0.95 });
  private finishMats = new Map<string, MeshStandardMaterial>();
  private readonly cap = new MeshStandardMaterial({ color: '#3d3833', roughness: 0.9 });
  private readonly exterior = new MeshStandardMaterial({ color: '#f3efe8', roughness: 0.92 });
  private readonly frame = new MeshStandardMaterial({ color: '#f7f5f1', roughness: 0.5 });
  private readonly leaf = new MeshStandardMaterial({ color: '#c8a77e', roughness: 0.55 });
  private readonly glass = new MeshStandardMaterial({
    color: '#bcd3dc',
    roughness: 0.05,
    metalness: 0.3,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  /** Writes no colour or depth: the roof exists only in the shadow map. */
  private readonly roofMat = new MeshStandardMaterial({ colorWrite: false, depthWrite: false, side: DoubleSide });
  private readonly selection = new LineLoop(
    new BufferGeometry(),
    new LineBasicMaterial({ color: '#e2622b', depthTest: false }),
  );

  constructor(private readonly tex: Record<RoomTexture, Texture>) {
    this.root.add(this.structure, this.furniture, this.selection);
    this.selection.renderOrder = 10;
    this.selection.visible = false;
  }

  private finish(kind: 'floor' | 'wall', key: string): MeshStandardMaterial {
    const id = `${kind}:${key}`;
    let m = this.finishMats.get(id);
    if (!m) {
      const f: Finish =
        (kind === 'floor' ? FLOORS[key] : WALLS[key]) ?? (kind === 'floor' ? FLOORS.oak! : WALLS.chalk!);
      m = new MeshStandardMaterial({
        color: f.color,
        roughness: f.roughness,
        map: f.tex ? this.tex[f.tex as RoomTexture] : null,
      });
      this.finishMats.set(id, m);
    }
    return m;
  }

  /** Rebuilds walls, openings, floors and roof if any of them changed. Returns true when it rebuilt. */
  syncStructure(p: Plan, rooms: Room[]) {
    const sig = JSON.stringify([p.nodes, p.walls, p.openings, rooms.map((r) => [r.key, roomStyle(p, r)])]);
    if (sig === this.structureSig) return false;
    this.structureSig = sig;
    this.structure.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) m.geometry.dispose();
    });
    this.structure.clear();
    this.walls = [];
    this.ceilings = [];
    const nodes = nodeMap(p);

    /* Floors and the shadow-only roof */
    for (const r of rooms) {
      const shape = new Shape(r.poly.map(([x, z]) => ({ x, y: -z }) as never));
      const geo = new ShapeGeometry(shape);
      const floor = new Mesh(geo, this.finish('floor', roomStyle(p, r).floor));
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0.004;
      floor.receiveShadow = true;
      floor.userData.room = r.key;
      this.structure.add(floor);
      const roof = new Mesh(geo, this.roofMat);
      roof.rotation.x = -Math.PI / 2;
      roof.position.y = WALL_HEIGHT;
      roof.castShadow = true;
      this.structure.add(roof);
      // Visible ceiling, only while walking through the rooms (faces down).
      const ceiling = new Mesh(
        new ShapeGeometry(new Shape(r.poly.map(([x, z]) => ({ x, y: z }) as never))),
        this.ceilingMat,
      );
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.y = WALL_HEIGHT - 0.002;
      ceiling.receiveShadow = true;
      ceiling.visible = this.showCeilings;
      this.ceilings.push(ceiling);
      this.structure.add(ceiling);
    }

    /* Walls */
    const ends = wallReach(p, nodes);
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const w of p.walls) {
      const a = nodes.get(w.a);
      const b = nodes.get(w.b);
      if (!a || !b) continue;
      minX = Math.min(minX, a.x, b.x);
      maxX = Math.max(maxX, a.x, b.x);
      minZ = Math.min(minZ, a.z, b.z);
      maxZ = Math.max(maxZ, a.z, b.z);
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const L = Math.hypot(dx, dz);
      if (L < 0.005) continue;
      const [endA, endB] = ends.get(w.id) ?? [0, 0];
      const mid: Vec2 = [(a.x + b.x) / 2, (a.z + b.z) / 2];
      const n: Vec2 = [-dz / L, dx / L];
      const side = (s: number) => {
        const pt: Vec2 = [mid[0] + n[0] * s * (w.thick / 2 + 0.12), mid[1] + n[1] * s * (w.thick / 2 + 0.12)];
        const r = roomAt(rooms, pt);
        return r ? this.finish('wall', roomStyle(p, r).wall) : this.exterior;
      };
      const mats: Material[] = [this.cap, this.cap, this.cap, this.cap, side(1), side(-1)];
      const g = new Group();
      g.position.set(mid[0], 0, mid[1]);
      g.rotation.y = Math.atan2(-dz, dx);
      this.structure.add(g);
      const view: WallView = { id: w.id, group: g, mid, normal: n, cut: 0, openings: [] };

      // Solid stretches between openings, plus the pieces below windows and above doors and windows.
      const ops = p.openings
        .filter((o) => o.wall === w.id)
        .map((o) => ({ o, s: o.t * L - o.width / 2, e: o.t * L + o.width / 2 }))
        .sort((m1, m2) => m1.s - m2.s);
      const piece = (s: number, e: number, y0: number, y1: number) => {
        if (e - s < 0.005 || y1 - y0 < 0.005) return;
        const geo = new BoxGeometry(e - s, y1 - y0, w.thick);
        metreUVs(geo, (s + e) / 2, (y0 + y1) / 2);
        const m = new Mesh(geo, mats);
        m.position.set((s + e) / 2 - L / 2, (y0 + y1) / 2, 0);
        m.castShadow = m.receiveShadow = true;
        g.add(m);
      };
      let cursor = -endA;
      for (const { o, s, e } of ops) {
        piece(cursor, s, 0, WALL_HEIGHT);
        const glassDoor = o.kind === 'window' && !!o.tall;
        const top = o.kind === 'door' || glassDoor ? DOOR_HEIGHT : WINDOW_TOP;
        if (o.kind === 'window' && !glassDoor) piece(s, e, 0, WINDOW_SILL);
        piece(s, e, top, WALL_HEIGHT);
        view.openings.push(
          this.opening(g, glassDoor ? 'glass' : o.kind, (s + e) / 2 - L / 2, e - s, w.thick, o.flip ?? 1),
        );
        cursor = e;
      }
      piece(cursor, L + endB, 0, WALL_HEIGHT);
      this.walls.push(view);
    }
    if (Number.isFinite(minX)) {
      this.bounds = {
        cx: (minX + maxX) / 2,
        cz: (minZ + maxZ) / 2,
        r: Math.max(3, Math.hypot(maxX - minX, maxZ - minZ) / 2),
      };
    }
    return true;
  }

  /**
   * Door (frame + leaf ajar), window (frame, sill, glass) or glass door (frame and two sliding glazed panels, one
   * slid half open) filling an opening, in the wall's local space.
   */
  private opening(g: Group, kind: 'door' | 'window' | 'glass', x: number, width: number, thick: number, flip: number) {
    const o = new Group();
    o.position.x = x;
    g.add(o);
    const box = (w: number, h: number, d: number, m: Material, px: number, py: number, pz = 0) => {
      const mesh = new Mesh(new BoxGeometry(w, h, d), m);
      mesh.position.set(px, py, pz);
      mesh.castShadow = m !== this.glass;
      mesh.receiveShadow = true;
      o.add(mesh);
      return mesh;
    };
    const f = 0.05;
    const d = thick + 0.02;
    if (kind === 'door') {
      for (const s of [-1, 1]) box(f, DOOR_HEIGHT, d, this.frame, (s * (width - f)) / 2, DOOR_HEIGHT / 2);
      box(width, f, d, this.frame, 0, DOOR_HEIGHT - f / 2);
      const hinge = new Group();
      hinge.position.set((flip * (width - 2 * f)) / 2, 0, (thick / 2) * flip);
      hinge.rotation.y = flip * 0.55;
      o.add(hinge);
      const leaf = new Mesh(new BoxGeometry(width - 2 * f, DOOR_HEIGHT - f, 0.04), this.leaf);
      leaf.position.set((-flip * (width - 2 * f)) / 2, (DOOR_HEIGHT - f) / 2, 0);
      leaf.castShadow = leaf.receiveShadow = true;
      hinge.add(leaf);
    } else if (kind === 'glass') {
      const h = DOOR_HEIGHT;
      for (const s of [-1, 1]) box(f, h, d, this.frame, (s * (width - f)) / 2, h / 2);
      box(width, f, d, this.frame, 0, h - f / 2);
      box(width, 0.02, d, this.frame, 0, 0.01);
      // Two panels on parallel tracks; the second is slid a third of the way over the first.
      const pw = (width - 2 * f) / 2 + 0.03;
      const slide = pw / 3;
      for (const [px, pz] of [
        [-(width - 2 * f) / 2 + pw / 2, -0.025],
        [(width - 2 * f) / 2 - pw / 2 - slide, 0.025],
      ] as const) {
        const ph = h - f - 0.02;
        const py = 0.02 + ph / 2;
        for (const s of [-1, 1]) box(0.04, ph, 0.035, this.frame, px + (s * (pw - 0.04)) / 2, py, pz);
        box(pw, 0.05, 0.035, this.frame, px, 0.02 + 0.025, pz);
        box(pw, 0.04, 0.035, this.frame, px, h - f - 0.02, pz);
        box(pw - 0.08, ph - 0.09, 0.01, this.glass, px, py, pz);
      }
    } else {
      const h = WINDOW_TOP - WINDOW_SILL;
      const y = WINDOW_SILL + h / 2;
      for (const s of [-1, 1]) box(f, h, d, this.frame, (s * (width - f)) / 2, y);
      box(width, f, d, this.frame, 0, WINDOW_TOP - f / 2);
      box(width + 0.06, 0.04, d + 0.08, this.frame, 0, WINDOW_SILL + 0.02);
      box(0.03, h, 0.05, this.frame, 0, y);
      box(width - 2 * f, h - f, 0.012, this.glass, 0, y);
    }
    return o;
  }

  setCeilings(on: boolean) {
    this.showCeilings = on;
    for (const c of this.ceilings) c.visible = on;
  }

  /** Adds, removes and moves furniture; rebuilds an item only when its type or colour changes. */
  syncItems(p: Plan) {
    const seen = new Set<string>();
    for (const it of p.items) {
      seen.add(it.id);
      const sig = `${it.type}:${it.color ?? ''}`;
      let entry = this.items.get(it.id);
      if (!entry || entry.sig !== sig) {
        if (entry) this.furniture.remove(entry.group);
        const group = buildFurniture(it.type, it.color);
        group.userData.item = it.id;
        group.traverse((o) => (o.userData.item = it.id));
        this.furniture.add(group);
        entry = { group, sig };
        this.items.set(it.id, entry);
      }
      entry.group.position.set(it.x, 0, it.z);
      entry.group.rotation.y = -it.rot * DEG;
    }
    for (const [id, e] of this.items)
      if (!seen.has(id)) {
        this.furniture.remove(e.group);
        this.items.delete(id);
      }
  }

  /** Outlines the selected item's footprint on the floor. */
  select(p: Plan, id: string | null) {
    const it = id ? p.items.find((x) => x.id === id) : undefined;
    const def = it && FURNITURE[it.type];
    this.selection.visible = !!def;
    if (!it || !def) return;
    const w = def.w / 2 + 0.05;
    const d = def.d / 2 + 0.05;
    this.selection.geometry.dispose();
    this.selection.geometry = new BufferGeometry().setAttribute(
      'position',
      new Float32BufferAttribute([-w, 0.02, -d, w, 0.02, -d, w, 0.02, d, -w, 0.02, d], 3),
    );
    this.selection.position.set(it.x, 0, it.z);
    this.selection.rotation.y = -it.rot * DEG;
  }
}

/**
 * How far each wall reaches past its two nodes, so joints are closed without two walls sharing a face (overlapping
 * coplanar faces flicker). At each node one wall runs through: a straight continuation (both stop flush at the node)
 * or, at a corner, the thickest wall, which reaches across the others. The other walls stop at its face.
 */
export function wallReach(p: Plan, nodes: Map<string, { x: number; z: number }>): Map<string, [number, number]> {
  type End = { id: string; end: 0 | 1; t: number; dx: number; dz: number; L: number };
  const at = new Map<string, End[]>();
  const out = new Map<string, [number, number]>();
  for (const w of p.walls) {
    const a = nodes.get(w.a);
    const b = nodes.get(w.b);
    if (!a || !b) continue;
    const L = Math.hypot(b.x - a.x, b.z - a.z);
    if (L < 0.005) continue;
    const dx = (b.x - a.x) / L;
    const dz = (b.z - a.z) / L;
    out.set(w.id, [0, 0]);
    const add = (n: string, e: End) => at.set(n, [...(at.get(n) ?? []), e]);
    add(w.a, { id: w.id, end: 0, t: w.thick, dx, dz, L });
    add(w.b, { id: w.id, end: 1, t: w.thick, dx: -dx, dz: -dz, L });
  }
  const set = (e: End, v: number) => (out.get(e.id)![e.end] = Math.max(v, -e.L / 2));
  for (const list of at.values()) {
    if (list.length < 2) continue;
    const dot = (e: End, f: End) => e.dx * f.dx + e.dz * f.dz;
    // A straight run through the node (the thickest such pair), else the thickest (then longest) wall.
    let through: End[] = [];
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++)
        if (dot(list[i]!, list[j]!) < -0.97) {
          const pair = [list[i]!, list[j]!];
          if (!through.length || Math.min(...pair.map((e) => e.t)) > Math.min(...through.map((e) => e.t)))
            through = pair;
        }
    if (!through.length) {
      const main = [...list].sort((e, f) => f.t - e.t || f.L - e.L)[0]!;
      let reach = 0;
      for (const e of list)
        if (e !== main) reach = Math.max(reach, e.t / 2 / Math.max(0.5, Math.abs(main.dx * e.dz - main.dz * e.dx)));
      set(main, Math.min(reach, 0.6));
      through = [main];
    }
    const face = Math.min(...through.map((e) => e.t)) / 2;
    const ref = through[0]!;
    for (const e of list) {
      if (through.includes(e)) continue;
      const sin = Math.max(0.2, Math.abs(ref.dx * e.dz - ref.dz * e.dx));
      const cos = Math.abs(dot(ref, e));
      set(e, Math.min(0, -face / sin + (e.t / 2) * (cos / sin)));
    }
  }
  return out;
}

/** Box UVs in metres (u along the wall, v up), offset so texture runs on across pieces of the same wall. */
function metreUVs(geo: BoxGeometry, cx: number, cy: number) {
  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx;
    const y = pos.getY(i) + cy;
    const z = pos.getZ(i);
    if (Math.abs(nor.getZ(i)) > 0.5) uv.setXY(i, x, y);
    else if (Math.abs(nor.getX(i)) > 0.5) uv.setXY(i, z, y);
    else uv.setXY(i, x, z);
  }
  uv.needsUpdate = true;
}
