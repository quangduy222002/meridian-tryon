/**
 * The 2D plan editor, drawn on a canvas like an architect's plan: thick poché walls, door swings, window lines,
 * furniture footprints, room names with areas and wall lengths. Tools: select (and drag), draw walls, place doors
 * and windows, place furniture. Pan with an empty drag / two fingers / wheel; zoom with wheel or pinch.
 * Plain 2D canvas, no three.js.
 */
import { FLOORS, FURNITURE } from './catalog';
import {
  closestOnSegment,
  itemCorners,
  len,
  nodeMap,
  roomAt,
  roomName,
  roomStyle,
  snapToWall,
  splitWall,
  tidy,
  uid,
  wallEnds,
  type Item,
  type Opening,
  type OpeningKind,
  type Plan,
  type PlanNode,
  type Room,
  type Vec2,
  type Wall,
} from './plan';

export type Tool = 'select' | 'wall' | 'door' | 'window' | 'place';
export type Selection = { kind: 'item' | 'wall' | 'opening' | 'room' | 'node'; id: string };

export interface EditorHost {
  plan(): Plan;
  rooms(): Room[];
  /** A finished edit: record undo, save, rebuild. */
  commit(message?: string): void;
  /** Mid-drag: refresh the 3D view without recording undo. */
  preview(): void;
  selected(sel: Selection | null): void;
  toolChanged(tool: Tool): void;
  /** The floor below (multi-storey homes), drawn faintly under this one to line walls up. */
  ghost?(): Plan | null;
  /** Draws something under the plan (an imported drawing), in plan coordinates. */
  underlay?(c: CanvasRenderingContext2D, X: (x: number) => number, Z: (z: number) => number, s: number): void;
  /** Where the visitor is standing in walk mode (plan metres, yaw in radians), if walking. */
  walker?(): { x: number; z: number; yaw: number } | null;
}

const INK = '#1d2433';
const ACCENT = '#2563eb';
const GRID = 0.5;
const DRAG_PX = 4;
const DEG = Math.PI / 180;

const OPENING_WIDTH: Record<OpeningKind, number> = { door: 0.9, window: 1.2 };

export class PlanEditor {
  tool: Tool = 'select';
  placeType = 'sofa';
  sel: Selection | null = null;
  /** Pixels per metre and the screen position of the origin. */
  private s = 50;
  private ox = 40;
  private oy = 40;
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private hover: Vec2 | null = null;
  private draft: { from: Vec2 | null; fromNode: string | null } = { from: null, fromNode: null };
  private pointers = new Map<number, { x: number; y: number }>();
  private pinch: { d: number; mx: number; my: number } | null = null;
  private press: {
    id: number;
    x: number;
    y: number;
    target: Selection | null;
    dragging: boolean;
    grab: Vec2;
    start: Plan;
  } | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly host: EditorHost,
  ) {
    this.ctx = canvas.getContext('2d')!;
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onCancel);
    canvas.addEventListener('lostpointercapture', (e) => this.pointers.delete(e.pointerId));
    canvas.addEventListener('pointerleave', () => {
      this.hover = null;
      this.draw();
    });
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('dblclick', () => {
      if (this.tool === 'wall') this.finishWall();
    });
    canvas.addEventListener('keydown', this.onKey);
    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  /* ---------- View ---------- */

  private resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.draw();
  }

  /** Fits the whole plan in the canvas. */
  fit() {
    const p = this.host.plan();
    const r = this.canvas.getBoundingClientRect();
    if (!p.nodes.length || !r.width) {
      this.s = 50;
      this.ox = r.width / 2;
      this.oy = r.height / 2;
      return this.draw();
    }
    const xs = p.nodes.map((n) => n.x);
    const zs = p.nodes.map((n) => n.z);
    const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
    const pad = 56;
    this.s = Math.max(
      10,
      Math.min(140, Math.min((r.width - pad * 2) / (x1 - x0 || 1), (r.height - pad * 2) / (z1 - z0 || 1))),
    );
    this.ox = r.width / 2 - ((x0 + x1) / 2) * this.s;
    this.oy = r.height / 2 - ((z0 + z1) / 2) * this.s;
    this.draw();
  }

  zoomBy(f: number, cx?: number, cy?: number) {
    const r = this.canvas.getBoundingClientRect();
    const x = cx ?? r.width / 2;
    const y = cy ?? r.height / 2;
    const ns = Math.max(10, Math.min(260, this.s * f));
    this.ox = x - ((x - this.ox) * ns) / this.s;
    this.oy = y - ((y - this.oy) * ns) / this.s;
    this.s = ns;
    this.draw();
  }

  private toPlan(x: number, y: number): Vec2 {
    return [(x - this.ox) / this.s, (y - this.oy) / this.s];
  }
  private local(e: PointerEvent | WheelEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  setTool(t: Tool, placeType?: string) {
    this.tool = t;
    if (placeType) this.placeType = placeType;
    this.draft = { from: null, fromNode: null };
    this.canvas.dataset.cursor = t;
    // Drawing or placing starts fresh: drop the selection so its panel doesn't cover the plan.
    if (t !== 'select' && this.sel) this.select(null);
    this.host.toolChanged(t);
    this.draw();
  }

  select(sel: Selection | null) {
    this.sel = sel;
    this.host.selected(sel);
    this.draw();
  }

  /* ---------- Hit testing ---------- */

  private hitItem(p: Plan, pt: Vec2): Item | undefined {
    for (let i = p.items.length - 1; i >= 0; i--) {
      const it = p.items[i]!;
      const def = FURNITURE[it.type];
      if (!def) continue;
      const a = -it.rot * DEG;
      const dx = pt[0] - it.x;
      const dz = pt[1] - it.z;
      const lx = dx * Math.cos(a) - dz * Math.sin(a);
      const lz = dx * Math.sin(a) + dz * Math.cos(a);
      if (Math.abs(lx) <= def.w / 2 && Math.abs(lz) <= def.d / 2) return it;
    }
    // Rugs lie under everything: only hit once nothing else is there.
    return undefined;
  }

  private nearestWall(p: Plan, pt: Vec2, maxPx: number) {
    const nodes = nodeMap(p);
    let best: { wall: Wall; t: number; d: number; q: Vec2 } | null = null;
    for (const w of p.walls) {
      const [a, b] = wallEnds(p, w, nodes);
      const c = closestOnSegment(pt, a, b);
      if (c.d * this.s <= maxPx + (w.thick * this.s) / 2 && (!best || c.d < best.d)) best = { wall: w, ...c };
    }
    return best;
  }

  private hitOpening(p: Plan, pt: Vec2) {
    const nodes = nodeMap(p);
    for (const o of p.openings) {
      const w = p.walls.find((x) => x.id === o.wall);
      if (!w) continue;
      const [a, b] = wallEnds(p, w, nodes);
      const c = closestOnSegment(pt, a, b);
      const L = len(a, b);
      if (c.d * this.s < (w.thick * this.s) / 2 + 6 && Math.abs(c.t * L - o.t * L) < o.width / 2) return o;
    }
    return undefined;
  }

  private hitNode(p: Plan, pt: Vec2, px = 10) {
    let best: PlanNode | undefined;
    let bd = px / this.s;
    for (const n of p.nodes) {
      const d = Math.hypot(n.x - pt[0], n.z - pt[1]);
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    return best;
  }

  private hit(pt: Vec2): Selection | null {
    const p = this.host.plan();
    const o = this.hitOpening(p, pt);
    if (o) return { kind: 'opening', id: o.id };
    const n = this.sel?.kind === 'wall' || this.sel?.kind === 'node' ? this.hitNode(p, pt) : undefined;
    if (n) return { kind: 'node', id: n.id };
    const it = this.hitItem({ ...p, items: p.items.filter((x) => !FURNITURE[x.type]?.flat) }, pt);
    if (it) return { kind: 'item', id: it.id };
    const w = this.nearestWall(p, pt, 4);
    if (w) return { kind: 'wall', id: w.wall.id };
    const rug = this.hitItem({ ...p, items: p.items.filter((x) => FURNITURE[x.type]?.flat) }, pt);
    if (rug) return { kind: 'item', id: rug.id };
    const r = roomAt(this.host.rooms(), pt);
    if (r) return { kind: 'room', id: r.key };
    return null;
  }

  /* ---------- Snapping ---------- */

  private snapGrid = (v: number, step = 0.05) => Math.round(v / step) * step;

  /** Snap for drawing walls: existing node, a point on a wall, 90° from the previous point, then the grid. */
  private snapWallPoint(pt: Vec2): { pt: Vec2; node?: PlanNode; onWall?: { wall: Wall; t: number } } {
    const p = this.host.plan();
    const n = this.hitNode(p, pt, 12);
    if (n) return { pt: [n.x, n.z], node: n };
    const w = this.nearestWall(p, pt, 6);
    if (w && w.t > 0.02 && w.t < 0.98) return { pt: w.q, onWall: { wall: w.wall, t: w.t } };
    let q: Vec2 = [this.snapGrid(pt[0], 0.1), this.snapGrid(pt[1], 0.1)];
    const from = this.draft.from;
    if (from) {
      const dx = q[0] - from[0];
      const dz = q[1] - from[1];
      if (Math.abs(dz) < Math.abs(dx) * Math.tan(8 * DEG)) q = [q[0], from[1]];
      else if (Math.abs(dx) < Math.abs(dz) * Math.tan(8 * DEG)) q = [from[0], q[1]];
    }
    return { pt: q };
  }

  private snapToWall(it: Item) {
    snapToWall(this.host.plan(), it);
  }

  /* ---------- Pointer input ---------- */

  private onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
    this.canvas.focus({ preventScroll: true });
    this.canvas.setPointerCapture(e.pointerId);
    const { x, y } = this.local(e);
    this.pointers.set(e.pointerId, { x, y });
    if (this.pointers.size === 2) {
      // Second finger: switch to pinch-zoom and drop any drag in progress.
      const [a, b] = [...this.pointers.values()];
      this.pinch = { d: Math.hypot(a!.x - b!.x, a!.y - b!.y), mx: (a!.x + b!.x) / 2, my: (a!.y + b!.y) / 2 };
      if (this.press?.dragging) this.restore();
      this.press = null;
      return;
    }
    const pt = this.toPlan(x, y);
    const p = this.host.plan();
    const pan = e.button === 1;
    const target = pan || this.tool !== 'select' ? null : this.hit(pt);
    let grab: Vec2 = [0, 0];
    if (target?.kind === 'item') {
      const it = p.items.find((i) => i.id === target.id)!;
      grab = [pt[0] - it.x, pt[1] - it.z];
    }
    this.press = { id: e.pointerId, x, y, target, dragging: false, grab, start: structuredClone(p) };
  };

  private onMove = (e: PointerEvent) => {
    const { x, y } = this.local(e);
    const prev = this.pointers.get(e.pointerId);
    if (prev) this.pointers.set(e.pointerId, { x, y });
    if (this.pinch && this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const mx = (a!.x + b!.x) / 2;
      const my = (a!.y + b!.y) / 2;
      this.ox += mx - this.pinch.mx;
      this.oy += my - this.pinch.my;
      this.zoomBy(d / this.pinch.d, mx, my);
      this.pinch = { d, mx, my };
      return;
    }
    const pt = this.toPlan(x, y);
    this.hover = pt;
    const pr = this.press;
    if (!pr || pr.id !== e.pointerId) return this.draw();
    if (!pr.dragging && Math.hypot(x - pr.x, y - pr.y) < DRAG_PX) return;
    pr.dragging = true;
    const p = this.host.plan();
    const t = pr.target;
    if (!t || t.kind === 'room' || this.tool !== 'select') {
      // Empty space (or any tool but select): pan.
      if (this.tool === 'select' || e.buttons === 4 || e.pointerType === 'touch') {
        this.ox += x - (prev?.x ?? x);
        this.oy += y - (prev?.y ?? y);
      }
      return this.draw();
    }
    if (t.kind === 'item') {
      const it = p.items.find((i) => i.id === t.id);
      if (!it) return;
      it.x = this.snapGrid(pt[0] - pr.grab[0]);
      it.z = this.snapGrid(pt[1] - pr.grab[1]);
    } else if (t.kind === 'node') {
      const n = p.nodes.find((m) => m.id === t.id);
      if (!n) return;
      [n.x, n.z] = this.alignNode(p, n, pt);
    } else if (t.kind === 'wall') {
      const w = p.walls.find((m) => m.id === t.id);
      const base = pr.start;
      if (!w) return;
      const dx = this.snapGrid(pt[0] - this.toPlan(pr.x, pr.y)[0]);
      const dz = this.snapGrid(pt[1] - this.toPlan(pr.x, pr.y)[1]);
      for (const id of [w.a, w.b]) {
        const n = p.nodes.find((m) => m.id === id)!;
        const n0 = base.nodes.find((m) => m.id === id)!;
        n.x = n0.x + dx;
        n.z = n0.z + dz;
      }
    } else if (t.kind === 'opening') {
      const o = p.openings.find((m) => m.id === t.id);
      const w = o && p.walls.find((m) => m.id === o.wall);
      if (!o || !w) return;
      const [a, b] = wallEnds(p, w);
      const L = len(a, b);
      const c = closestOnSegment(pt, a, b);
      const half = o.width / 2 / L;
      o.t = Math.min(1 - half, Math.max(half, Math.round(c.t * L * 20) / 20 / L));
    }
    this.host.preview();
    this.draw();
  };

  /** Node drag: grid snap, then line up with other nodes horizontally or vertically. */
  private alignNode(p: Plan, n: PlanNode, pt: Vec2): Vec2 {
    let x = this.snapGrid(pt[0]);
    let z = this.snapGrid(pt[1]);
    const tol = 8 / this.s;
    for (const m of p.nodes) {
      if (m.id === n.id) continue;
      if (Math.abs(m.x - x) < tol) x = m.x;
      if (Math.abs(m.z - z) < tol) z = m.z;
    }
    return [x, z];
  }

  private onUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    if (this.pinch) {
      if (this.pointers.size < 2) this.pinch = null;
      return;
    }
    const pr = this.press;
    this.press = null;
    if (!pr || pr.id !== e.pointerId) return;
    const { x, y } = this.local(e);
    const pt = this.toPlan(x, y);
    if (pr.dragging) {
      if (pr.target && pr.target.kind !== 'room' && this.tool === 'select') {
        if (pr.target.kind === 'node') this.mergeNode(pr.target.id);
        this.select(pr.target);
        this.host.commit();
      }
      return;
    }
    // A click.
    if (this.tool === 'select') this.select(pr.target);
    else if (this.tool === 'wall') this.wallClick(pt);
    else if (this.tool === 'door' || this.tool === 'window') this.placeOpening(this.tool, pt);
    else if (this.tool === 'place') this.placeItem(pt);
  };

  private onCancel = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    this.pinch = null;
    if (this.press?.dragging) this.restore();
    this.press = null;
  };

  /** Puts the plan back the way it was when the drag started. */
  private restore() {
    if (!this.press) return;
    const p = this.host.plan();
    Object.assign(p, structuredClone(this.press.start));
    this.host.preview();
    this.draw();
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const { x, y } = this.local(e);
    if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) this.zoomBy(Math.exp(-e.deltaY * 0.0015), x, y);
    else {
      this.ox -= e.deltaX;
      this.draw();
    }
  };

  /* ---------- Keyboard: the non-drag way to do everything ---------- */

  private onKey = (e: KeyboardEvent) => {
    const p = this.host.plan();
    const sel = this.sel;
    const step = e.shiftKey ? 0.5 : 0.05;
    const arrows: Record<string, Vec2> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (e.key === 'Escape') {
      if (this.tool === 'wall' && this.draft.from) this.draft = { from: null, fromNode: null };
      else if (this.tool !== 'select') this.setTool('select');
      else this.select(null);
      this.draw();
      return;
    }
    if (e.key === 'Enter' && this.tool === 'wall') return this.finishWall();
    if (!sel) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this.deleteSelection();
      return;
    }
    if ((e.key === 'r' || e.key === 'R') && sel.kind === 'item') {
      this.rotateSelected(e.shiftKey ? -90 : 90);
      return;
    }
    const d = arrows[e.key];
    if (!d) return;
    e.preventDefault();
    if (sel.kind === 'item') {
      const it = p.items.find((i) => i.id === sel.id);
      if (it) [it.x, it.z] = [this.snapGrid(it.x + d[0]), this.snapGrid(it.z + d[1])];
    } else if (sel.kind === 'node' || sel.kind === 'wall') {
      const ids =
        sel.kind === 'node'
          ? [sel.id]
          : (() => {
              const w = p.walls.find((m) => m.id === sel.id);
              return w ? [w.a, w.b] : [];
            })();
      for (const id of ids) {
        const n = p.nodes.find((m) => m.id === id);
        if (n) [n.x, n.z] = [this.snapGrid(n.x + d[0]), this.snapGrid(n.z + d[1])];
      }
    } else if (sel.kind === 'opening') {
      const o = p.openings.find((m) => m.id === sel.id);
      const w = o && p.walls.find((m) => m.id === o.wall);
      if (o && w) {
        const L = len(...wallEnds(p, w));
        const half = o.width / 2 / L;
        o.t = Math.min(1 - half, Math.max(half, o.t + (d[0] + d[1]) / L));
      }
    } else return;
    this.host.commit();
    this.draw();
  };

  rotateSelected(deg: number) {
    const p = this.host.plan();
    const it = this.sel?.kind === 'item' ? p.items.find((i) => i.id === this.sel!.id) : undefined;
    if (!it) return;
    it.rot = (((it.rot + deg) % 360) + 360) % 360;
    this.host.commit(`${FURNITURE[it.type]?.name ?? 'Item'} rotated`);
    this.draw();
  }

  deleteSelection() {
    const p = this.host.plan();
    const sel = this.sel;
    if (!sel) return;
    if (sel.kind === 'item') p.items = p.items.filter((i) => i.id !== sel.id);
    else if (sel.kind === 'opening') p.openings = p.openings.filter((o) => o.id !== sel.id);
    else if (sel.kind === 'wall') p.walls = p.walls.filter((w) => w.id !== sel.id);
    else if (sel.kind === 'node') p.walls = p.walls.filter((w) => w.a !== sel.id && w.b !== sel.id);
    else if (sel.kind === 'room') {
      // Deleting a room clears its custom finish and name.
      delete p.rooms[sel.id];
    }
    tidy(p);
    this.select(null);
    this.host.commit('Deleted');
  }

  /* ---------- Tools ---------- */

  private wallClick(pt: Vec2) {
    const p = this.host.plan();
    const snap = this.snapWallPoint(pt);
    let node = snap.node;
    if (!node && snap.onWall) node = splitWall(p, snap.onWall.wall, snap.onWall.t);
    if (!node) {
      node = { id: uid('n'), x: snap.pt[0], z: snap.pt[1] };
      p.nodes.push(node);
    }
    const from = this.draft.fromNode;
    if (from && from !== node.id) {
      const exists = p.walls.some((w) => (w.a === from && w.b === node!.id) || (w.b === from && w.a === node!.id));
      if (!exists) p.walls.push({ id: uid('w'), a: from, b: node.id, thick: 0.15 });
      this.host.commit();
      // Clicking an existing node ends the chain (closing a room or joining a wall).
      if (snap.node) {
        this.draft = { from: null, fromNode: null };
        return this.draw();
      }
    }
    this.draft = { from: [node.x, node.z], fromNode: node.id };
    this.draw();
  }

  finishWall() {
    const p = this.host.plan();
    tidy(p); // drops a starting node that never got a wall
    this.draft = { from: null, fromNode: null };
    this.host.preview();
    this.draw();
  }

  private placeOpening(kind: OpeningKind, pt: Vec2) {
    const p = this.host.plan();
    const near = this.nearestWall(p, pt, 18);
    if (!near) return;
    const [a, b] = wallEnds(p, near.wall);
    const L = len(a, b);
    const width = Math.min(OPENING_WIDTH[kind], L - 0.2);
    if (width < 0.4) return;
    const half = width / 2 / L;
    const t = Math.min(1 - half, Math.max(half, near.t));
    const clash = p.openings.some(
      (o) => o.wall === near.wall.id && Math.abs(o.t - t) * L < (o.width + width) / 2 + 0.05,
    );
    if (clash) return;
    const o: Opening = { id: uid('o'), wall: near.wall.id, kind, t, width, flip: 1 };
    p.openings.push(o);
    this.select({ kind: 'opening', id: o.id });
    this.host.commit(`${kind === 'door' ? 'Door' : 'Window'} added`);
  }

  private placeItem(pt: Vec2) {
    const p = this.host.plan();
    const it: Item = { id: uid('i'), type: this.placeType, x: this.snapGrid(pt[0]), z: this.snapGrid(pt[1]), rot: 0 };
    this.snapToWall(it);
    p.items.push(it);
    this.setTool('select');
    this.select({ kind: 'item', id: it.id });
    this.host.commit(`${FURNITURE[it.type]?.name ?? 'Item'} added`);
  }

  /** After dragging a node onto another one, joins them. */
  private mergeNode(id: string) {
    const p = this.host.plan();
    const n = p.nodes.find((m) => m.id === id);
    if (!n) return;
    const other = p.nodes.find((m) => m.id !== id && Math.hypot(m.x - n.x, m.z - n.z) < 0.08);
    if (!other) return;
    for (const w of p.walls) {
      if (w.a === id) w.a = other.id;
      if (w.b === id) w.b = other.id;
    }
    p.walls = p.walls.filter((w) => w.a !== w.b);
    tidy(p);
    if (this.sel?.id === id) this.sel = { kind: 'node', id: other.id };
  }

  /* ---------- Drawing ---------- */

  draw() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.paint();
    });
  }

  private paint() {
    const c = this.ctx;
    const dpr = this.canvas.width / Math.max(1, this.canvas.getBoundingClientRect().width);
    const W = this.canvas.width / dpr;
    const H = this.canvas.height / dpr;
    const p = this.host.plan();
    const rooms = this.host.rooms();
    const nodes = nodeMap(p);
    const s = this.s;
    const X = (x: number) => x * s + this.ox;
    const Z = (z: number) => z * s + this.oy;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, W, H);

    // Grid: 50 cm minor, 1 m major
    const [gx0, gz0] = this.toPlan(0, 0);
    const [gx1, gz1] = this.toPlan(W, H);
    for (let gx = Math.floor(gx0 / GRID) * GRID; gx <= gx1; gx += GRID) {
      c.fillStyle = Math.abs(gx % 1) < 1e-6 || Math.abs((gx % 1) - 1) < 1e-6 ? '#e3e7ed' : '#f1f3f6';
      c.fillRect(Math.round(X(gx)), 0, 1, H);
    }
    for (let gz = Math.floor(gz0 / GRID) * GRID; gz <= gz1; gz += GRID) {
      c.fillStyle = Math.abs(gz % 1) < 1e-6 || Math.abs((gz % 1) - 1) < 1e-6 ? '#e3e7ed' : '#f1f3f6';
      c.fillRect(0, Math.round(Z(gz)), W, 1);
    }

    this.host.underlay?.(c, X, Z, s);
    const below = this.host.ghost?.();
    // Stairs on the floor below open this floor: dashed outline, crossed, "Void".
    for (const it of below?.items ?? []) {
      if (!FURNITURE[it.type]?.opensAbove) continue;
      const q = itemCorners(it);
      c.save();
      c.setLineDash([5, 4]);
      c.strokeStyle = '#475467';
      c.lineWidth = 1.2;
      c.beginPath();
      q.forEach(([x, z], i) => (i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))));
      c.closePath();
      c.stroke();
      c.beginPath();
      c.moveTo(X(q[0]![0]), Z(q[0]![1]));
      c.lineTo(X(q[2]![0]), Z(q[2]![1]));
      c.moveTo(X(q[1]![0]), Z(q[1]![1]));
      c.lineTo(X(q[3]![0]), Z(q[3]![1]));
      c.stroke();
      c.setLineDash([]);
      c.font = '500 11px "Inter Variable", sans-serif';
      c.fillStyle = '#475467';
      c.textAlign = 'center';
      c.fillText('Void · stairs below', X(it.x), Z(it.z) - 6);
      c.restore();
    }
    if (below) {
      const gn = nodeMap(below);
      c.strokeStyle = 'rgba(102, 112, 133, 0.28)';
      c.lineCap = 'butt';
      for (const w of below.walls) {
        const a = gn.get(w.a);
        const b = gn.get(w.b);
        if (!a || !b) continue;
        c.lineWidth = Math.max(1, w.thick * s);
        c.beginPath();
        c.moveTo(X(a.x), Z(a.z));
        c.lineTo(X(b.x), Z(b.z));
        c.stroke();
      }
    }

    // Rooms tinted with their floor finish
    for (const r of rooms) {
      const st = roomStyle(p, r);
      const selected = this.sel?.kind === 'room' && this.sel.id === r.key;
      c.beginPath();
      r.poly.forEach(([x, z], i) => (i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))));
      c.closePath();
      // A faint hint of the floor finish; the selected room gets the accent wash instead.
      c.globalAlpha = selected ? 0.1 : 0.16;
      c.fillStyle = selected ? ACCENT : (FLOORS[st.floor]?.color ?? '#d9dde3');
      c.fill();
      c.globalAlpha = 1;
      if (selected) {
        c.strokeStyle = ACCENT;
        c.lineWidth = 2;
        c.stroke();
      }
    }

    // Furniture: rugs first
    const items = [...p.items].sort((a, b) => +!FURNITURE[a.type]?.flat - +!FURNITURE[b.type]?.flat);
    for (const it of items) this.paintItem(c, it, X, Z, this.sel?.kind === 'item' && this.sel.id === it.id);
    if (this.tool === 'place' && this.hover) {
      const ghost: Item = {
        id: 'ghost',
        type: this.placeType,
        x: this.snapGrid(this.hover[0]),
        z: this.snapGrid(this.hover[1]),
        rot: 0,
      };
      this.snapToWall(ghost);
      c.globalAlpha = 0.55;
      this.paintItem(c, ghost, X, Z, true);
      c.globalAlpha = 1;
    }

    // Walls as solid poché, openings cut out
    for (const w of p.walls) {
      const [a, b] = wallEnds(p, w, nodes);
      const L = len(a, b);
      if (L < 1e-3) continue;
      const ux = (b[0] - a[0]) / L;
      const uz = (b[1] - a[1]) / L;
      const nx = -uz;
      const nz = ux;
      const t = w.thick / 2;
      const quad = (s0: number, s1: number, fill: string) => {
        c.beginPath();
        c.moveTo(X(a[0] + ux * s0 + nx * t), Z(a[1] + uz * s0 + nz * t));
        c.lineTo(X(a[0] + ux * s1 + nx * t), Z(a[1] + uz * s1 + nz * t));
        c.lineTo(X(a[0] + ux * s1 - nx * t), Z(a[1] + uz * s1 - nz * t));
        c.lineTo(X(a[0] + ux * s0 - nx * t), Z(a[1] + uz * s0 - nz * t));
        c.closePath();
        c.fillStyle = fill;
        c.fill();
      };
      const sel = this.sel?.kind === 'wall' && this.sel.id === w.id;
      if (w.rail) {
        // Railing: a light band with the handrail line along it.
        quad(-t, L + t, sel ? ACCENT : '#c9d0da');
        c.strokeStyle = sel ? '#ffffff' : INK;
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(X(a[0] - ux * t), Z(a[1] - uz * t));
        c.lineTo(X(b[0] + ux * t), Z(b[1] + uz * t));
        c.stroke();
      } else quad(-t, L + t, sel ? ACCENT : INK);
      for (const o of p.openings.filter((x) => x.wall === w.id)) {
        const s0 = o.t * L - o.width / 2;
        const s1 = o.t * L + o.width / 2;
        quad(s0, s1, '#ffffff');
        const osel = this.sel?.kind === 'opening' && this.sel.id === o.id;
        c.strokeStyle = osel ? ACCENT : INK;
        c.lineWidth = osel ? 2 : 1;
        const line = (u0: number, u1: number, k: number) => {
          c.beginPath();
          c.moveTo(X(a[0] + ux * u0 + nx * t * k), Z(a[1] + uz * u0 + nz * t * k));
          c.lineTo(X(a[0] + ux * u1 + nx * t * k), Z(a[1] + uz * u1 + nz * t * k));
          c.stroke();
        };
        if (o.kind === 'window' && o.tall) {
          // Glass door: two overlapping sliding panels on parallel tracks.
          const m = (s0 + s1) / 2;
          const lap = Math.min(0.08, (s1 - s0) / 6);
          c.lineWidth += 1.5;
          line(s0, m + lap, -0.3);
          line(m - lap, s1, 0.3);
        } else if (o.kind === 'window') {
          for (const k of [-0.35, 0, 0.35]) line(s0, s1, k);
        } else {
          // Leaf and swing arc, hinged at one jamb (a double door: a half-width leaf at each), opening to the flip side.
          const f = o.flip ?? 1;
          const leaf = (at: number, dir: number, r: number) => {
            const hx = a[0] + ux * at + nx * t * f;
            const hz = a[1] + uz * at + nz * t * f;
            // Closed, the leaf lies along the wall towards the far jamb; open, it points out to the swing side.
            const base = Math.atan2(uz * dir, ux * dir);
            const open = Math.atan2(nz * f, nx * f);
            let diff = open - base;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff <= -Math.PI) diff += Math.PI * 2;
            c.beginPath();
            c.moveTo(X(hx), Z(hz));
            c.lineTo(X(hx + Math.cos(open) * r), Z(hz + Math.sin(open) * r));
            c.stroke();
            c.setLineDash([3, 3]);
            c.beginPath();
            c.arc(X(hx), Z(hz), r * s, base, base + diff, diff < 0);
            c.stroke();
            c.setLineDash([]);
          };
          if (o.leaves === 2) {
            leaf(s0, 1, o.width / 2);
            leaf(s1, -1, o.width / 2);
          } else if (f * (o.hand ?? 1) > 0) leaf(s1, -1, o.width);
          else leaf(s0, 1, o.width);
        }
      }
      // Length label: on outside walls (placed outside) and on the selected wall
      const outward = (k: number) =>
        !roomAt(rooms, [(a[0] + b[0]) / 2 + nx * k * (t + 0.15), (a[1] + b[1]) / 2 + nz * k * (t + 0.15)]);
      const side = outward(1) ? 1 : outward(-1) ? -1 : sel ? 1 : 0;
      if (s > 28 && side) {
        c.save();
        const mx = (a[0] + b[0]) / 2 + nx * side * (t + 0.3);
        const mz = (a[1] + b[1]) / 2 + nz * side * (t + 0.3);
        c.translate(X(mx), Z(mz));
        let ang = Math.atan2(uz, ux);
        if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
        c.rotate(ang);
        c.font = '500 10.5px "Geist Mono", ui-monospace, monospace';
        c.fillStyle = sel ? ACCENT : '#667085';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(`${L.toFixed(2)} m`, 0, 0);
        c.restore();
      }
    }

    // Room labels
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const r of rooms) {
      const [cx, cz] = r.centroid;
      c.font = `600 ${Math.max(11, Math.min(14, s * 0.24))}px "Inter Variable", sans-serif`;
      c.fillStyle = INK;
      c.fillText(roomName(p, r), X(cx), Z(cz) - 8);
      c.font = '500 11px "Geist Mono", ui-monospace, monospace';
      c.fillStyle = '#667085';
      c.fillText(`${r.area.toFixed(1)} m²`, X(cx), Z(cz) + 9);
    }

    // Nodes (handles) when editing walls
    if (this.tool === 'wall' || this.sel?.kind === 'wall' || this.sel?.kind === 'node') {
      for (const n of p.nodes) {
        const sel = this.sel?.kind === 'node' && this.sel.id === n.id;
        c.beginPath();
        c.arc(X(n.x), Z(n.z), sel ? 6 : 4, 0, Math.PI * 2);
        c.fillStyle = sel ? ACCENT : '#fff';
        c.fill();
        c.strokeStyle = sel ? ACCENT : INK;
        c.lineWidth = 1.5;
        c.stroke();
      }
    }

    // Wall tool: rubber band and snap marker
    if (this.tool === 'wall' && this.hover) {
      const snap = this.snapWallPoint(this.hover);
      if (this.draft.from) {
        const [fx, fz] = this.draft.from;
        c.strokeStyle = ACCENT;
        c.lineWidth = Math.max(2, 0.15 * s);
        c.globalAlpha = 0.5;
        c.beginPath();
        c.moveTo(X(fx), Z(fz));
        c.lineTo(X(snap.pt[0]), Z(snap.pt[1]));
        c.stroke();
        c.globalAlpha = 1;
        c.font = '600 12px "Geist Mono", ui-monospace, monospace';
        c.fillStyle = ACCENT;
        c.fillText(
          `${len(this.draft.from, snap.pt).toFixed(2)} m`,
          X((fx + snap.pt[0]) / 2),
          Z((fz + snap.pt[1]) / 2) - 14,
        );
      }
      c.beginPath();
      c.arc(X(snap.pt[0]), Z(snap.pt[1]), snap.node || snap.onWall ? 7 : 4, 0, Math.PI * 2);
      c.strokeStyle = ACCENT;
      c.lineWidth = 2;
      c.stroke();
    }
    // Door / window tool: preview where it would go
    if ((this.tool === 'door' || this.tool === 'window') && this.hover) {
      const near = this.nearestWall(p, this.hover, 18);
      if (near) {
        const [a, b] = wallEnds(p, near.wall, nodes);
        const L = len(a, b);
        const width = Math.min(OPENING_WIDTH[this.tool], L - 0.2);
        const ux = (b[0] - a[0]) / L;
        const uz = (b[1] - a[1]) / L;
        c.strokeStyle = ACCENT;
        c.lineWidth = Math.max(3, near.wall.thick * s);
        c.globalAlpha = 0.55;
        c.beginPath();
        c.moveTo(X(near.q[0] - (ux * width) / 2), Z(near.q[1] - (uz * width) / 2));
        c.lineTo(X(near.q[0] + (ux * width) / 2), Z(near.q[1] + (uz * width) / 2));
        c.stroke();
        c.globalAlpha = 1;
      }
    }

    // "You are here" while walking in 3D: a dot and the direction of view.
    const me = this.host.walker?.();
    if (me) {
      const fx = -Math.sin(me.yaw);
      const fz = -Math.cos(me.yaw);
      const a0 = Math.atan2(fz, fx);
      c.beginPath();
      c.moveTo(X(me.x), Z(me.z));
      c.arc(X(me.x), Z(me.z), 1.6 * s, a0 - 0.55, a0 + 0.55);
      c.closePath();
      c.fillStyle = 'rgba(226, 98, 43, 0.18)';
      c.fill();
      c.beginPath();
      c.arc(X(me.x), Z(me.z), 6, 0, Math.PI * 2);
      c.fillStyle = ACCENT;
      c.fill();
      c.strokeStyle = '#fff';
      c.lineWidth = 2;
      c.stroke();
    }

    // North arrow
    c.save();
    c.translate(W - 34, 34);
    c.rotate(p.north * DEG);
    c.fillStyle = INK;
    c.beginPath();
    c.moveTo(0, -16);
    c.lineTo(7, 8);
    c.lineTo(0, 3);
    c.lineTo(-7, 8);
    c.closePath();
    c.fill();
    c.restore();
    c.font = '600 11px "Inter Variable", sans-serif';
    c.fillStyle = INK;
    c.fillText('N', W - 34, 62);
  }

  private paintItem(
    c: CanvasRenderingContext2D,
    it: Item,
    X: (x: number) => number,
    Z: (z: number) => number,
    selected: boolean,
  ) {
    const def = FURNITURE[it.type];
    if (!def) return;
    const s = this.s;
    c.save();
    c.translate(X(it.x), Z(it.z));
    c.rotate(it.rot * DEG);
    const w = def.w * s;
    const d = def.d * s;
    if (it.type === 'stairs' || it.type === 'stairsL' || it.type === 'void') {
      paintStair(c, it.type, w, d, s, selected);
      c.restore();
      return;
    }
    if (def.mount) {
      // Lighting-plan symbols: a circle (crossed for a downlight), a half circle on the wall for a wall light.
      const r = Math.max(5, (Math.min(def.w, 0.5) * s) / 2);
      c.strokeStyle = selected ? ACCENT : '#a16207';
      c.fillStyle = 'rgba(250, 204, 21, 0.28)';
      c.lineWidth = selected ? 2 : 1.2;
      c.beginPath();
      if (def.mount === 'wall') c.arc(0, -d / 2, r, 0, Math.PI);
      else c.arc(0, 0, r, 0, Math.PI * 2);
      c.closePath();
      c.fill();
      c.stroke();
      if (it.type === 'downlight' || it.type === 'chandelier') {
        const k = r * Math.SQRT1_2;
        c.beginPath();
        c.moveTo(-k, -k);
        c.lineTo(k, k);
        c.moveTo(k, -k);
        c.lineTo(-k, k);
        c.stroke();
      } else if (it.type !== 'wallLight') {
        c.beginPath();
        c.arc(0, 0, r * 0.45, 0, Math.PI * 2);
        c.stroke();
      }
      c.restore();
      return;
    }
    c.fillStyle = def.flat ? (it.color ?? def.colors[0]!) : '#ffffff';
    c.globalAlpha *= def.flat ? 0.5 : 1;
    c.strokeStyle = selected ? ACCENT : '#475467';
    c.lineWidth = selected ? 2 : 1;
    c.beginPath();
    c.roundRect(-w / 2, -d / 2, w, d, Math.min(4, s * 0.05));
    c.fill();
    c.globalAlpha /= def.flat ? 0.5 : 1;
    c.stroke();
    // A stripe on the back edge shows which way it faces; colour shows the chosen finish.
    if (!def.flat) {
      c.fillStyle = it.color ?? def.colors[0]!;
      c.fillRect(-w / 2 + 2, -d / 2 + 2, w - 4, Math.max(3, d * 0.18));
    }
    if (s * Math.min(def.w, def.d) > 26 && !def.flat) {
      c.fillStyle = '#475467';
      c.font = `500 ${Math.max(9, Math.min(12, s * 0.17))}px "Inter Variable", sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.rotate(-it.rot * DEG);
      c.fillText(def.name, 0, 2);
    }
    c.restore();
  }
}

/**
 * Plan symbol of a stair (treads, a walking line and an UP arrow from the bottom step) or a double-height void
 * (dashed and crossed), in the item's own frame: w × d pixels, front (bottom step) towards +z.
 */
function paintStair(c: CanvasRenderingContext2D, type: string, w: number, d: number, s: number, selected: boolean) {
  c.strokeStyle = selected ? '#2563eb' : '#475467';
  c.fillStyle = '#ffffff';
  c.lineWidth = selected ? 2 : 1;
  if (type === 'void') {
    c.setLineDash([5, 4]);
    c.strokeRect(-w / 2, -d / 2, w, d);
    c.beginPath();
    c.moveTo(-w / 2, -d / 2);
    c.lineTo(w / 2, d / 2);
    c.moveTo(w / 2, -d / 2);
    c.lineTo(-w / 2, d / 2);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#475467';
    c.font = '500 11px "Inter Variable", sans-serif';
    c.textAlign = 'center';
    c.fillText('Void', 0, -4);
    return;
  }
  const treads = (x0: number, z0: number, x1: number, z1: number, n: number, alongZ: boolean) => {
    c.fillRect(Math.min(x0, x1), Math.min(z0, z1), Math.abs(x1 - x0), Math.abs(z1 - z0));
    c.strokeRect(Math.min(x0, x1), Math.min(z0, z1), Math.abs(x1 - x0), Math.abs(z1 - z0));
    c.beginPath();
    for (let i = 1; i < n; i++) {
      if (alongZ) {
        const z = z0 + ((z1 - z0) * i) / n;
        c.moveTo(x0, z);
        c.lineTo(x1, z);
      } else {
        const x = x0 + ((x1 - x0) * i) / n;
        c.moveTo(x, z0);
        c.lineTo(x, z1);
      }
    }
    c.stroke();
  };
  const arrow: [number, number][] = [];
  if (type === 'stairs') {
    treads(-w / 2, d / 2, w / 2, -d / 2, 18, true);
    arrow.push([0, d / 2 - 0.15 * s], [0, -d / 2 + 0.25 * s]);
  } else {
    const run = 1.0 * s;
    treads(-w / 2, d / 2, -w / 2 + run, -d / 2 + run, 9, true);
    c.fillRect(-w / 2, -d / 2, run, run);
    c.strokeRect(-w / 2, -d / 2, run, run);
    treads(-w / 2 + run, -d / 2, w / 2, -d / 2 + run, 9, false);
    arrow.push(
      [-w / 2 + run / 2, d / 2 - 0.15 * s],
      [-w / 2 + run / 2, -d / 2 + run / 2],
      [w / 2 - 0.25 * s, -d / 2 + run / 2],
    );
  }
  // Walking line with an arrow head and "UP" at the bottom.
  c.beginPath();
  arrow.forEach(([x, z], i) => (i ? c.lineTo(x, z) : c.moveTo(x, z)));
  c.stroke();
  const [ax, az] = arrow[arrow.length - 1]!;
  const [px, pz] = arrow[arrow.length - 2]!;
  const ang = Math.atan2(az - pz, ax - px);
  c.beginPath();
  c.moveTo(ax, az);
  c.lineTo(ax - Math.cos(ang - 0.45) * 8, az - Math.sin(ang - 0.45) * 8);
  c.moveTo(ax, az);
  c.lineTo(ax - Math.cos(ang + 0.45) * 8, az - Math.sin(ang + 0.45) * 8);
  c.stroke();
  c.fillStyle = selected ? '#2563eb' : '#475467';
  c.font = '600 10px "Inter Variable", sans-serif';
  c.textAlign = 'center';
  c.fillText('UP', arrow[0]![0], arrow[0]![1] + 12);
}
