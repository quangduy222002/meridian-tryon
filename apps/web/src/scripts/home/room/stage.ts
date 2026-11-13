import {
  Box3,
  Color,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Vector2,
  Vector3,
  type Object3D,
} from 'three';
import { buildRoom } from './build';
import { AdaptiveResolution, getQuality } from '../../../lib/three/quality';
import { createRenderer, precompile } from '../../../lib/three/renderer';
import { RenderLoop } from '../../../lib/three/loop';
import { ScrollDirector } from '../../../lib/three/scroll-director';
import { DEG, damp, lerp } from '../../../lib/math';

interface Framing {
  /** Share of the screen the subject should fill. */
  frac: number;
  /** Where on screen the subject sits, 0–1. */
  at: readonly [number, number];
}
interface Shot {
  label: string;
  focus: () => { center: Vector3; size: number };
  az: number;
  el: number;
  fov: number;
  desktop: Framing;
  mobile: Framing;
  dim: number;
  pins: number;
  lamp: number;
}
interface Pose {
  center: Vector3;
  logD: number;
  az: number;
  el: number;
  fov: number;
  ax: number;
  ay: number;
  dim: number;
  pins: number;
  lamp: number;
}
const NUMERIC = ['logD', 'az', 'el', 'fov', 'ax', 'ay', 'dim', 'pins', 'lamp'] as const;

const SECTION_OF: Record<string, string> = {
  watch: 'work-watch',
  chair: 'work-chair',
  box: 'work-box',
  viewers: 'work-client',
  store: 'work-store',
};

export function startRoom() {
  const canvas = document.getElementById('gl') as HTMLCanvasElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const quality = getQuality();
  const renderer = createRenderer(canvas, quality, { shadows: true, exposure: 1.05 });
  // The room is static: render its shadow map once instead of every frame.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  const adaptive = new AdaptiveResolution(renderer, quality);

  const room = buildRoom(quality);
  const { scene } = room;
  const camera = new PerspectiveCamera(24, 1, 0.05, 200);

  /* ---------- Shots ---------- */
  const ROOM = { center: new Vector3(0, 1.05, 0), size: 8.4 };
  const boxOf = (o: Object3D) => {
    const b = new Box3().setFromObject(o);
    return { center: b.getCenter(new Vector3()), size: b.getSize(new Vector3()).length() };
  };
  const watchFocus = (size: number) => () => ({ center: room.face.getWorldPosition(new Vector3()), size });
  const shot = (
    label: string,
    focus: Shot['focus'],
    az: number,
    el: number,
    fov: number,
    desktop: Framing,
    mobile: Framing,
    extra: Partial<Pick<Shot, 'dim' | 'pins' | 'lamp'>> = {},
  ): Shot => ({ label, focus, az, el, fov, desktop, mobile, dim: 0, pins: 0, lamp: 1, ...extra });
  const SHOTS: Record<string, Shot> = {
    hero: shot(
      '00 · ROOM',
      () => ROOM,
      45,
      33,
      24,
      { frac: 0.8, at: [0.7, 0.56] },
      { frac: 0.44, at: [0.5, 0.76] },
      { pins: 1 },
    ),
    overview: shot(
      '00 · OVERVIEW',
      () => ROOM,
      28,
      44,
      26,
      { frac: 0.74, at: [0.72, 0.55] },
      { frac: 0.34, at: [0.5, 0.8] },
      { dim: 0.1 },
    ),
    watch: shot(
      '01 · MERIDIAN',
      watchFocus(0.7),
      12,
      16,
      30,
      { frac: 0.62, at: [0.68, 0.5] },
      { frac: 0.5, at: [0.5, 0.24] },
      { lamp: 1.3 },
    ),
    chair: shot(
      '02 · NORDA',
      () => boxOf(room.chair),
      58,
      22,
      30,
      { frac: 0.7, at: [0.32, 0.52] },
      { frac: 0.5, at: [0.5, 0.25] },
    ),
    box: shot(
      '03 · PAKKA',
      () => boxOf(room.boxes),
      30,
      26,
      30,
      { frac: 0.66, at: [0.68, 0.52] },
      { frac: 0.5, at: [0.5, 0.25] },
    ),
    store: shot(
      '04 · HALDE',
      () => boxOf(room.rack),
      72,
      8,
      32,
      { frac: 0.62, at: [0.32, 0.5] },
      { frac: 0.46, at: [0.5, 0.24] },
    ),
    client: shot(
      '05 · VIEWERS',
      () => boxOf(room.screens),
      14,
      10,
      30,
      { frac: 0.62, at: [0.66, 0.48] },
      { frac: 0.5, at: [0.5, 0.24] },
    ),
    services: shot(
      '06 · SERVICES',
      () => ROOM,
      60,
      64,
      22,
      { frac: 0.9, at: [0.5, 0.55] },
      { frac: 0.7, at: [0.5, 0.5] },
      { dim: 0.82 },
    ),
    process: shot(
      '07 · PROCESS',
      () => ROOM,
      18,
      24,
      22,
      { frac: 0.9, at: [0.5, 0.55] },
      { frac: 0.7, at: [0.5, 0.5] },
      { dim: 0.84 },
    ),
    contact: shot(
      '08 · CONTACT',
      () => ROOM,
      45,
      30,
      24,
      { frac: 0.62, at: [0.5, 0.74] },
      { frac: 0.5, at: [0.5, 0.78] },
      { dim: 0.25, lamp: 1.8 },
    ),
  };

  const director = new ScrollDirector([...document.querySelectorAll<HTMLElement>('[data-shot]')]);
  let W = 1;
  let H = 1;
  let mobile = false;
  const resolved: Record<string, Pose> = {};
  const resolveShots = () => {
    scene.updateMatrixWorld(true);
    const aspect = W / H;
    for (const [key, s] of Object.entries(SHOTS)) {
      const f = mobile ? s.mobile : s.desktop;
      const { center, size } = s.focus();
      const t = 2 * Math.tan((s.fov * DEG) / 2);
      const fracW = mobile ? Math.min(0.92, f.frac * 1.9) : Math.min(0.58, f.frac * 0.9);
      const dist = Math.max(size / (t * f.frac), size / (t * aspect * fracW));
      resolved[key] = {
        center,
        logD: Math.log(dist),
        az: s.az,
        el: s.el,
        fov: s.fov,
        ax: f.at[0],
        ay: f.at[1],
        dim: s.dim,
        pins: s.pins,
        lamp: s.lamp,
      };
    }
  };

  /* ---------- Hotspot pins ---------- */
  const pinLayer = document.getElementById('pins')!;
  const pins = room.hotspots.map((h) => {
    const el = document.createElement('button');
    el.className = 'pin';
    el.type = 'button';
    el.innerHTML = `<span class="dot"></span><span class="full">${h.label}</span><span class="short">${h.short}</span>`;
    el.addEventListener('click', () => go(h.id));
    el.addEventListener('pointerenter', () => setHover(h.id));
    el.addEventListener('pointerleave', () => setHover(null));
    pinLayer.appendChild(el);
    return { ...h, el, w: 0, h: 0 };
  });
  const go = (id: string) =>
    document
      .getElementById(SECTION_OF[id] ?? '')
      ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });

  /* ---------- Hover highlight + picking (only while the room is the hero) ---------- */
  let hoverId: string | null = null;
  const tint = new Color('#e3a95c');
  const setHover = (id: string | null) => {
    if (hoverId === id) return;
    hoverId = id;
    scene.traverse((o) => {
      const m = o as Mesh<never, MeshStandardMaterial>;
      if (!m.isMesh || !o.userData.hot || !m.material.emissive) return;
      const on = o.userData.hot === id;
      if (on && !o.userData.ownMat) {
        m.material = m.material.clone();
        o.userData.ownMat = true;
        o.userData.baseEm = m.material.emissive.clone();
      }
      if (o.userData.ownMat)
        m.material.emissive.copy(on ? tint : (o.userData.baseEm as Color)).multiplyScalar(on ? 0.22 : 1);
    });
    pins.forEach((p) => p.el.classList.toggle('on', p.id === id));
    document.body.style.cursor = id ? 'pointer' : '';
    loop.invalidate();
  };
  const ray = new Raycaster();
  const ndc = new Vector2();
  const pick = (e: PointerEvent | MouseEvent) => {
    ndc.set((e.clientX / W) * 2 - 1, -(e.clientY / H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(scene.children, true).find((i) => i.object.userData.hot);
    return (hit?.object.userData.hot as string | undefined) ?? null;
  };
  const overUI = (e: Event) =>
    (e.target as Element | null)?.closest?.('a, button, .panel, .hero-copy, .nav, .rail') ?? null;
  const pointer = { x: 0, y: 0 };
  addEventListener(
    'pointermove',
    (e) => {
      pointer.x = (e.clientX / W) * 2 - 1;
      pointer.y = (e.clientY / H) * 2 - 1;
      if (e.pointerType === 'mouse' && cur.pins > 0.5) {
        const ui = overUI(e);
        setHover(ui ? ((e.target as Element).closest('.pin') ? hoverId : null) : pick(e));
      } else if (hoverId && !(e.target as Element).closest?.('.pin')) setHover(null);
    },
    { passive: true },
  );
  addEventListener('click', (e) => {
    if (cur.pins > 0.5 && !overUI(e)) {
      const id = pick(e);
      if (id) go(id);
    }
  });

  /* ---------- Layout ---------- */
  const layout = () => {
    W = innerWidth;
    H = innerHeight;
    mobile = W < 900;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    room.dust.setViewportHeight(H * adaptive.pixelRatio);
    resolveShots();
    pins.forEach((p) => {
      p.w = p.el.offsetWidth;
      p.h = p.el.offsetHeight;
    });
  };
  addEventListener('resize', layout);
  layout();

  /* ---------- Frame ---------- */
  const cur: Pose = { ...resolved.hero!, center: resolved.hero!.center.clone() };
  const goal: Pose = { ...cur, center: cur.center.clone() };
  const dimEl = document.getElementById('dim')!;
  const hudCam = document.getElementById('hud-cam')!;
  const hudFov = document.getElementById('hud-fov')!;
  const hudScroll = document.getElementById('hud-scroll')!;
  const dir = new Vector3();
  const tmp = new Vector3();
  const bulbBase = room.bulb.intensity;
  let lastHud = 0;
  let active = 'hero';

  const frame = (dt: number, time: number) => {
    const { from, to, t, active: idx } = director.sample();
    active = director.keys[idx] ?? active;
    const a = resolved[from]!;
    const b = resolved[to]!;
    goal.center.lerpVectors(a.center, b.center, t);
    for (const k of NUMERIC) goal[k] = lerp(a[k], b[k], t);
    const rate = reduce ? Infinity : 3.6;
    cur.center.set(
      damp(cur.center.x, goal.center.x, rate, dt),
      damp(cur.center.y, goal.center.y, rate, dt),
      damp(cur.center.z, goal.center.z, rate, dt),
    );
    for (const k of NUMERIC) cur[k] = damp(cur[k], goal[k], rate, dt);

    const sway = reduce ? 0 : Math.sin(time / 4.2) * 1.6 + pointer.x * 4;
    const az = (cur.az + sway) * DEG;
    const el = (cur.el - (reduce ? 0 : pointer.y * 2.5)) * DEG;
    dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    camera.position.copy(cur.center).addScaledVector(dir, Math.exp(cur.logD));
    camera.lookAt(cur.center);
    camera.fov = cur.fov;
    camera.setViewOffset(W, H, (0.5 - cur.ax) * W, (0.5 - cur.ay) * H, W, H);
    camera.updateProjectionMatrix();

    dimEl.style.opacity = cur.dim.toFixed(3);
    room.bulb.intensity = bulbBase * cur.lamp;

    const d = new Date();
    const s = d.getSeconds() + d.getMilliseconds() / 1000;
    const m = d.getMinutes() + s / 60;
    room.hands.second.rotation.z = -(s / 60) * Math.PI * 2;
    room.hands.minute.rotation.z = -(m / 60) * Math.PI * 2;
    room.hands.hour.rotation.z = (-((d.getHours() % 12) + m / 60) / 12) * Math.PI * 2;
    if (!reduce) {
      room.code.update(time * 1000);
      room.dust.update(time);
    }

    renderer.render(scene, camera);

    // Pins follow their objects and are nudged apart so labels never overlap.
    const show = cur.pins > 0.02;
    pinLayer.style.opacity = cur.pins.toFixed(3);
    pinLayer.style.visibility = show ? 'visible' : 'hidden';
    if (show) {
      const placed: { x: number; y: number; w: number; h: number }[] = [];
      pins
        .map((p) => {
          tmp.copy(p.anchor);
          p.group.localToWorld(tmp);
          tmp.project(camera);
          return { p, x: (tmp.x * 0.5 + 0.5) * W, y: (-tmp.y * 0.5 + 0.5) * H };
        })
        .sort((q1, q2) => q1.y - q2.y)
        .forEach((q) => {
          for (const o of placed)
            if (Math.abs(q.x - o.x) < (q.p.w + o.w) / 2 + 6 && Math.abs(q.y - o.y) < q.p.h + 6) q.y = o.y + q.p.h + 6;
          placed.push({ x: q.x, y: q.y, w: q.p.w, h: q.p.h });
          q.p.el.style.transform = `translate3d(${q.x - q.p.w / 2}px, ${q.y - q.p.h / 2}px, 0)`;
          q.p.el.style.pointerEvents = cur.pins > 0.5 ? 'auto' : 'none';
        });
    }

    if (time - lastHud > 0.4) {
      lastHud = time;
      hudCam.textContent = SHOTS[active]?.label ?? '';
      hudFov.textContent = `${Math.round(cur.fov)}°`;
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      hudScroll.textContent = `${Math.round((100 * scrollY) / max)}%`;
    }
  };

  const loop = new RenderLoop(frame, {
    onFrameTime: (ms) => {
      const before = adaptive.pixelRatio;
      adaptive.sample(ms);
      if (adaptive.pixelRatio !== before) room.dust.setViewportHeight(H * adaptive.pixelRatio);
    },
  });

  // Compile every shader up front so the first scroll does not stutter.
  precompile(renderer, scene, camera).finally(() => {
    loop.start();
    document.body.classList.add('gl-ready');
    document.getElementById('hud')?.classList.add('show');
  });
}
