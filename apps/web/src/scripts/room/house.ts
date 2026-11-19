/**
 * Turns a plan into 3D: walls with door and window openings (each face painted with the finish of the room it faces),
 * room floors, an invisible roof that only casts shadows (so sunlight enters through the windows), and furniture.
 * Structure is rebuilt only when walls, openings or finishes change; moving furniture just moves its group.
 */
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  PointLight,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
  SpotLight,
  type Material,
  type Texture,
} from 'three';
import { FLOORS, FURNITURE, WALLS, type Finish } from './catalog';
import { buildFurniture, setFixtureGlow } from './furniture';
import {
  DOOR_HEIGHT,
  RAIL_HEIGHT,
  WALL_HEIGHT,
  WINDOW_SILL,
  WINDOW_TOP,
  nodeMap,
  roomAt,
  roomStyle,
  type Plan,
  type Room,
  type Vec2,
  wallReach,
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
  /** A balcony railing (never cut away). */
  rail?: boolean;
}

const DEG = Math.PI / 180;

export class House {
  readonly root = new Group();
  walls: WallView[] = [];
  readonly items = new Map<string, { group: Group; sig: string; light?: SpotLight | PointLight; power: number }>();
  /** Centre and radius of the building, for framing and shadows. */
  bounds = { cx: 0, cz: 0, r: 6 };

  private structure = new Group();
  private furniture = new Group();
  private structureSig = '';
  private ceilings: Mesh[] = [];
  private showCeilings = false;
  private readonly ceilingMat = new MeshStandardMaterial({ color: '#f6f3ee', roughness: 0.95 });
  private finishMats = new Map<string, MeshStandardMaterial>();
  private readonly cap = new MeshStandardMaterial({ color: '#2a303b', roughness: 0.9 });
  private readonly exterior = new MeshStandardMaterial({ color: '#eef0f3', roughness: 0.92 });
  private readonly frame = new MeshStandardMaterial({ color: '#f7f5f1', roughness: 0.5 });
  private readonly leaf = new MeshStandardMaterial({ color: '#c8a77e', roughness: 0.55 });
  private readonly metal = new MeshStandardMaterial({ color: '#4a4744', roughness: 0.4, metalness: 0.6 });
  /** Clear glass: barely tinted, mostly what it reflects (the sky light), as real panes read. */
  private readonly glass = new MeshPhysicalMaterial({
    color: '#dfeaee',
    roughness: 0.02,
    metalness: 0,
    ior: 1.5,
    specularIntensity: 1,
    envMapIntensity: 2.5,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  private readonly skirting = new MeshStandardMaterial({ color: '#f4f3f0', roughness: 0.4 });
  private readonly handle = new MeshStandardMaterial({ color: '#c9ccd1', roughness: 0.3, metalness: 1 });
  /** Writes no colour or depth: the roof exists only in the shadow map. */
  private readonly roofMat = new MeshStandardMaterial({ colorWrite: false, depthWrite: false, side: DoubleSide });
  private readonly selection = new LineLoop(
    new BufferGeometry(),
    new LineBasicMaterial({ color: '#2563eb', depthTest: false }),
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
      const map = f.tex ? this.tex[f.tex as RoomTexture] : null;
      // The finish's own pattern doubles as its relief: plank joints and grain, grout lines, mortar, terrazzo chips.
      m = new MeshStandardMaterial({
        color: f.color,
        roughness: f.roughness,
        map,
        bumpMap: map,
        bumpScale: map ? (BUMP[f.tex as RoomTexture] ?? 1) : 1,
      });
      this.finishMats.set(id, m);
    }
    return m;
  }

  /** Rebuilds walls, openings, floors and roof if any of them changed. Returns true when it rebuilt. */
  /**
   * Height of the walls: the room height for the floor being edited; floor-to-floor for a floor below another, so its
   * walls run up to the next floor's slab.
   */
  wallHeight = WALL_HEIGHT;

  syncStructure(p: Plan, rooms: Room[]) {
    const sig = JSON.stringify([
      p.nodes,
      p.walls,
      p.openings,
      rooms.map((r) => [r.key, roomStyle(p, r)]),
      this.wallHeight,
    ]);
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
      roof.position.y = this.wallHeight;
      roof.castShadow = true;
      roof.layers.set(1);
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
      // Box faces: ±x ends and the underside are plastered like the room they open onto (door and window reveals,
      // lintel soffits, joints between wall pieces); the top is the dark section cut seen in the dollhouse.
      const front = side(1);
      const back = side(-1);
      const reveal = front !== this.exterior ? front : back;
      const mats: Material[] = [reveal, reveal, this.cap, reveal, front, back];
      const g = new Group();
      g.position.set(mid[0], 0, mid[1]);
      g.rotation.y = Math.atan2(-dz, dx);
      this.structure.add(g);
      const view: WallView = {
        id: w.id,
        group: g,
        mid,
        normal: n,
        cut: 0,
        openings: [],
        ...(w.rail ? { rail: true } : {}),
      };

      if (w.rail) {
        this.railing(g, -endA - L / 2, L / 2 + endB, w.thick);
        this.walls.push(view);
        continue;
      }

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
        // Skirting boards along the foot of every face that looks into a room.
        if (y0 === 0)
          for (const k of [1, -1]) {
            if (mats[k === 1 ? 4 : 5] === this.exterior) continue;
            const sk = new Mesh(skirtingGeo(e - s), this.skirting);
            sk.position.set((s + e) / 2 - L / 2, SKIRTING / 2, k * (w.thick / 2 + 0.006));
            sk.receiveShadow = true;
            g.add(sk);
          }
      };
      let cursor = -endA;
      for (const { o, s, e } of ops) {
        piece(cursor, s, 0, this.wallHeight);
        const glassDoor = o.kind === 'window' && !!o.tall;
        const top = o.kind === 'door' || glassDoor ? DOOR_HEIGHT : WINDOW_TOP;
        if (o.kind === 'window' && !glassDoor) piece(s, e, 0, WINDOW_SILL);
        piece(s, e, top, this.wallHeight);
        view.openings.push(
          this.opening(
            g,
            glassDoor ? 'glass' : o.kind,
            (s + e) / 2 - L / 2,
            e - s,
            w.thick,
            o.flip ?? 1,
            o.leaves,
            o.hand,
          ),
        );
        cursor = e;
      }
      piece(cursor, L + endB, 0, this.wallHeight);
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
  private opening(
    g: Group,
    kind: 'door' | 'window' | 'glass',
    x: number,
    width: number,
    thick: number,
    flip: number,
    leaves = 1,
    hand = 1,
  ) {
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
      // One leaf hinged at one jamb, or (double door) a half-width leaf at each jamb.
      const lw = (width - 2 * f) / leaves;
      for (const j of leaves === 2 ? [flip, -flip] : [flip * hand]) {
        const hinge = new Group();
        hinge.position.set((j * (width - 2 * f)) / 2, 0, (thick / 2) * flip);
        // Open towards the flip side (local +z for flip 1, -z for -1), whichever jamb the leaf hangs on: the leaf
        // reaches -j along x from its hinge, and a turn of θ about y moves its tip by j·sin θ along z.
        hinge.rotation.y = j * flip * 0.55;
        o.add(hinge);
        const leaf = new Mesh(new BoxGeometry(lw, DOOR_HEIGHT - f, 0.04), this.leaf);
        leaf.position.set((-j * lw) / 2, (DOOR_HEIGHT - f) / 2, 0);
        leaf.castShadow = leaf.receiveShadow = true;
        hinge.add(leaf);
        // Lever handles on both faces, near the free edge, pointing back towards the hinge.
        for (const side of [1, -1]) {
          const rose = new Mesh(new BoxGeometry(0.04, 0.12, 0.01), this.handle);
          rose.position.set(-j * (lw - 0.07), 1.0, side * 0.025);
          const lever = new Mesh(new BoxGeometry(0.13, 0.02, 0.022), this.handle);
          lever.position.set(-j * (lw - 0.07) + j * 0.05, 1.02, side * 0.045);
          rose.castShadow = lever.castShadow = true;
          hinge.add(rose, lever);
        }
      }
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

  /** Balcony railing from x0 to x1 in the wall's local space: a kerb, glass panes between posts, a handrail. */
  private railing(g: Group, x0: number, x1: number, thick: number) {
    const L = x1 - x0;
    if (L < 0.01) return;
    const mid = (x0 + x1) / 2;
    const add = (w: number, h: number, d: number, m: Material, x: number, y: number) => {
      const mesh = new Mesh(new BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, 0);
      mesh.castShadow = m !== this.glass;
      mesh.receiveShadow = true;
      g.add(mesh);
    };
    const kerb = 0.1;
    add(L, kerb, Math.max(thick, 0.08), this.exterior, mid, kerb / 2);
    add(L, 0.05, 0.07, this.metal, mid, RAIL_HEIGHT - 0.025);
    const bays = Math.max(1, Math.round(L / 1.2));
    for (let i = 0; i <= bays; i++)
      add(0.04, RAIL_HEIGHT - kerb, 0.04, this.metal, x0 + 0.02 + ((L - 0.04) * i) / bays, (RAIL_HEIGHT + kerb) / 2);
    add(L - 0.04, RAIL_HEIGHT - kerb - 0.1, 0.012, this.glass, mid, (RAIL_HEIGHT + kerb - 0.05) / 2);
  }

  setCeilings(on: boolean) {
    this.showCeilings = on;
    for (const c of this.ceilings) c.visible = on;
  }

  /** Adds, removes and moves furniture; rebuilds an item only when its type, colour or the design style changes. */
  syncItems(p: Plan) {
    const seen = new Set<string>();
    for (const it of p.items) {
      seen.add(it.id);
      const sig = `${it.type}:${it.color ?? ''}:${p.style ?? ''}`;
      let entry = this.items.get(it.id);
      if (!entry || entry.sig !== sig) {
        if (entry) this.furniture.remove(entry.group);
        const group = buildFurniture(it.type, it.color, p.style);
        group.userData.item = it.id;
        group.traverse((o) => (o.userData.item = it.id));
        this.furniture.add(group);
        const def = FURNITURE[it.type];
        let light: SpotLight | PointLight | undefined;
        if (def?.light) {
          // Off until setLights says otherwise; no shadows (each would cost a shadow map per frame).
          if (def.light.kind === 'spot') {
            const spot = new SpotLight('#ffffff', 0, 0, 0.62, 0.85, 2);
            spot.position.set(0, def.light.y, 0);
            spot.target.position.set(0, 0, 0);
            group.add(spot.target);
            light = spot;
          } else {
            light = new PointLight('#ffffff', 0, 0, 2);
            light.position.set(0, def.light.y, 0);
          }
          light.visible = false;
          group.add(light);
        }
        this.showFixtures(group);
        entry = { group, sig, light, power: def?.light?.power ?? 0 };
        this.lightsDirty = true;
        this.items.set(it.id, entry);
      }
      entry.group.position.set(it.x, 0, it.z);
      entry.group.rotation.y = -it.rot * DEG;
    }
    for (const [id, e] of this.items)
      if (!seen.has(id)) {
        this.furniture.remove(e.group);
        this.items.delete(id);
        this.lightsDirty = true;
      }
    if (this.lightsDirty) this.setLights(this.lighting.on, this.lighting.color, this.lighting.cap);
  }

  /** Whether ceiling and wall fittings are drawn (not in the dollhouse cut-away, where they would float). */
  private fixturesShown = true;
  private lightsDirty = false;
  private lighting = { on: false, color: new Color('#ffd9a8'), cap: 16 };
  setFixturesShown(on: boolean) {
    this.fixturesShown = on;
    for (const e of this.items.values()) this.showFixtures(e.group);
  }
  private showFixtures(g: Group) {
    if (!g.userData.mount) return;
    for (const c of g.children) if ((c as Mesh).isMesh) c.visible = this.fixturesShown;
  }

  /**
   * Switches the light fittings on or off in a colour; at most `cap` of them emit (the brightest first) so a lit
   * home stays smooth on modest GPUs, the rest still glow.
   */
  setLights(on: boolean, color: Color, cap: number) {
    this.lighting = { on, color: color.clone(), cap };
    this.lightsDirty = false;
    const lit = [...this.items.values()].filter((e) => e.light).sort((a, b) => b.power - a.power);
    lit.forEach((e, i) => {
      const l = e.light!;
      l.visible = on && i < cap;
      l.color.copy(color);
      // Output in this scene's units (the sun is about 4): a downlight lights the floor below like a 7 W LED.
      l.intensity = (l instanceof SpotLight ? 7 : 3) * e.power;
    });
    setFixtureGlow(on, color);
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

/** Relief strength of each finish texture used as a bump map. */
const BUMP: Partial<Record<RoomTexture, number>> = {
  planks: 1.6,
  tile: 1.4,
  brick: 3,
  concrete: 0.6,
  terrazzo: 0.5,
  carpet: 2,
  herringbone: 1.6,
  marble: 0.3,
  encaustic: 0.6,
  slats: 3,
  panel: 2.5,
};

const SKIRTING = 0.07;
const skirtingGeos = new Map<number, BoxGeometry>();
/** Skirting board of a given length (shared per length, since walls repeat them). */
function skirtingGeo(len: number) {
  const k = Math.round(len * 1000);
  let g = skirtingGeos.get(k);
  if (!g) skirtingGeos.set(k, (g = new BoxGeometry(k / 1000, SKIRTING, 0.012)));
  return g;
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
