/**
 * First-person walking: drag to look, WASD / arrows to move (Shift to hurry), an on-screen joystick on touch
 * screens. The walker is a circle that slides along walls; door openings are gaps it can pass through.
 */
import type { PerspectiveCamera } from 'three';
import { DOOR_HEIGHT, nodeMap, type Plan, type Vec2 } from './plan';

export interface Solid {
  a: Vec2;
  b: Vec2;
  /** Half the wall thickness plus the walker's radius. */
  r: number;
}

const RADIUS = 0.22;
const EYE = 1.6;

/** Wall stretches that block walking: everything except door openings (windows are solid at walking height). */
export function solidsOf(p: Plan): Solid[] {
  const nodes = nodeMap(p);
  const out: Solid[] = [];
  for (const w of p.walls) {
    const a = nodes.get(w.a);
    const b = nodes.get(w.b);
    if (!a || !b) continue;
    const L = Math.hypot(b.x - a.x, b.z - a.z);
    if (L < 0.01) continue;
    const ux = (b.x - a.x) / L;
    const uz = (b.z - a.z) / L;
    const gaps = p.openings
      .filter((o) => o.wall === w.id && o.kind === 'door' && DOOR_HEIGHT > EYE)
      .map((o) => [o.t * L - o.width / 2 + 0.05, o.t * L + o.width / 2 - 0.05] as const)
      .sort((m, n) => m[0] - n[0]);
    let s = 0;
    const push = (s0: number, s1: number) => {
      if (s1 - s0 > 0.01)
        out.push({ a: [a.x + ux * s0, a.z + uz * s0], b: [a.x + ux * s1, a.z + uz * s1], r: w.thick / 2 + RADIUS });
    };
    for (const [g0, g1] of gaps) {
      push(s, g0);
      s = g1;
    }
    push(s, L);
  }
  return out;
}

export class Walker {
  active = false;
  private x = 0;
  private z = 0;
  private yaw = 0;
  private pitch = 0;
  private keys = new Set<string>();
  private joy = { x: 0, y: 0, id: -1 };
  private look: { id: number; x: number; y: number } | null = null;

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly surface: HTMLElement,
    private readonly stick: HTMLElement,
    private readonly solids: () => Solid[],
    private readonly onChange: () => void,
    private readonly onExit: () => void,
  ) {
    addEventListener('keydown', (e) => {
      if (!this.active || (e.target as HTMLElement).closest('input, textarea, select, #plan')) return;
      if (e.key === 'Escape') return this.onExit();
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
        e.preventDefault();
        this.keys.add(k);
        this.onChange();
      }
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());

    // Drag anywhere on the 3D view to look around.
    surface.addEventListener('pointerdown', (e) => {
      if (!this.active || e.button !== 0 || this.look) return;
      this.look = { id: e.pointerId, x: e.clientX, y: e.clientY };
      surface.setPointerCapture(e.pointerId);
    });
    surface.addEventListener('pointermove', (e) => {
      if (!this.look || e.pointerId !== this.look.id) return;
      this.yaw -= (e.clientX - this.look.x) * 0.005;
      this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch - (e.clientY - this.look.y) * 0.005));
      this.look.x = e.clientX;
      this.look.y = e.clientY;
      this.apply();
      this.onChange();
    });
    const endLook = (e: PointerEvent) => {
      if (this.look?.id === e.pointerId) this.look = null;
    };
    surface.addEventListener('pointerup', endLook);
    surface.addEventListener('pointercancel', endLook);

    // Joystick: the knob follows the finger within the ring; its offset is the walking direction.
    const knob = stick.firstElementChild as HTMLElement;
    const set = (e: PointerEvent) => {
      const r = stick.getBoundingClientRect();
      let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const m = Math.hypot(dx, dy);
      if (m > 1) {
        dx /= m;
        dy /= m;
      }
      this.joy.x = dx;
      this.joy.y = dy;
      knob.style.translate = `${dx * 36}px ${dy * 36}px`;
      this.onChange();
    };
    stick.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.joy.id = e.pointerId;
      stick.setPointerCapture(e.pointerId);
      set(e);
    });
    stick.addEventListener('pointermove', (e) => e.pointerId === this.joy.id && set(e));
    const release = () => {
      this.joy = { x: 0, y: 0, id: -1 };
      knob.style.translate = '';
    };
    stick.addEventListener('pointerup', release);
    stick.addEventListener('pointercancel', release);
  }

  get pose() {
    return this.active ? { x: this.x, z: this.z, yaw: this.yaw } : null;
  }

  enter(x: number, z: number, yaw: number) {
    this.active = true;
    this.x = x;
    this.z = z;
    this.yaw = yaw;
    this.pitch = -0.05;
    this.apply();
  }

  exit() {
    this.active = false;
    this.keys.clear();
    this.look = null;
  }

  private apply() {
    this.camera.position.set(this.x, EYE, this.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  /** Moves the walker; returns true while it is moving (so the render loop keeps going). */
  update(dt: number) {
    if (!this.active) return false;
    const k = this.keys;
    let fwd = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0) - this.joy.y;
    let side = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0) + this.joy.x;
    const m = Math.hypot(fwd, side);
    if (m < 0.05) return false;
    if (m > 1) {
      fwd /= m;
      side /= m;
    }
    const speed = (k.has('shift') ? 3.2 : 1.6) * dt;
    // Camera looks down -z at yaw 0.
    const sx = Math.sin(this.yaw);
    const cz = Math.cos(this.yaw);
    this.x += (-sx * fwd + cz * side) * speed;
    this.z += (-cz * fwd - sx * side) * speed;
    this.collide();
    this.apply();
    return true;
  }

  /** Pushes the walker out of any wall it overlaps (a few passes settle corners). */
  private collide() {
    const list = this.solids();
    for (let pass = 0; pass < 3; pass++) {
      for (const s of list) {
        const dx = s.b[0] - s.a[0];
        const dz = s.b[1] - s.a[1];
        const l2 = dx * dx + dz * dz || 1e-9;
        const t = Math.max(0, Math.min(1, ((this.x - s.a[0]) * dx + (this.z - s.a[1]) * dz) / l2));
        const qx = s.a[0] + dx * t;
        const qz = s.a[1] + dz * t;
        const ox = this.x - qx;
        const oz = this.z - qz;
        const d = Math.hypot(ox, oz);
        if (d < s.r && d > 1e-6) {
          this.x = qx + (ox / d) * s.r;
          this.z = qz + (oz / d) * s.r;
        }
      }
    }
  }
}
