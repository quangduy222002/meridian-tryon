import { Color, DirectionalLight, PerspectiveCamera, Scene, Vector3 } from 'three';
import { AdaptiveResolution, getQuality } from '../../lib/three/quality';
import { createRenderer, precompile } from '../../lib/three/renderer';
import { RenderLoop } from '../../lib/three/loop';
import { ScrollDirector } from '../../lib/three/scroll-director';
import { TAU, damp, lerp, smoothstep } from '../../lib/math';
import { CASES, DIALS, STRAPS, type Config } from './catalog';
import { loadWatchTextures } from './texture-loader';
import { createStudioEnvironment } from './environment';
import { buildWatch } from './model';

/** Watch pose and camera per chapter. env: studio rotation · e: explode · lume: lights off. */
const SHOTS = {
  hero: { rx: 0.42, ry: -0.62, rz: 0.12, d: 6.3, ax: 0.68, ay: 0.52, env: 0.0, e: 0, lume: 0 },
  dial: { rx: 0.08, ry: -0.16, rz: 0.0, d: 4.3, ax: 0.33, ay: 0.5, env: 0.9, e: 0, lume: 0 },
  case: { rx: 0.18, ry: 1.28, rz: 0.0, d: 4.5, ax: 0.66, ay: 0.5, env: 2.6, e: 0, lume: 0 },
  layers: { rx: 0.62, ry: -1.02, rz: 0.1, d: 9.6, ax: 0.4, ay: 0.5, env: 3.2, e: 1, lume: 0 },
  movement: { rx: 0.12, ry: 3.55, rz: 0.0, d: 4.6, ax: 0.68, ay: 0.5, env: 3.8, e: 0, lume: 0 },
  lume: { rx: 0.18, ry: -0.3, rz: 0.06, d: 4.6, ax: 0.36, ay: 0.5, env: 4.4, e: 0, lume: 1 },
  config: { rx: 0.3, ry: -0.42, rz: 0.08, d: 5.9, ax: 0.66, ay: 0.5, env: 6.0, e: 0, lume: 0 },
  final: { rx: 0.36, ry: 0.55, rz: -0.1, d: 11.5, ax: 0.5, ay: 0.27, env: 6.6, e: 0, lume: 0 },
};
type ShotKey = keyof typeof SHOTS;
type Pose = (typeof SHOTS)[ShotKey];
const KEYS = Object.keys(SHOTS.hero) as (keyof Pose)[];

export interface WatchStage {
  setConfig(c: Config): void;
}

export async function startWatch(onProgress: (p: number, label: string) => void): Promise<WatchStage> {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const quality = getQuality();
  const canvas = document.getElementById('stage') as HTMLCanvasElement;
  const renderer = createRenderer(canvas, quality, { exposure: 1 });
  const adaptive = new AdaptiveResolution(renderer, quality);

  onProgress(0.05, 'Machining case');
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const textures = await loadWatchTextures(quality.textureSize, anisotropy, (p) =>
    onProgress(0.05 + p * 0.6, 'Engraving dial'),
  );

  onProgress(0.7, 'Regulating movement');
  const scene = new Scene();
  scene.environment = createStudioEnvironment(renderer);
  const key = new DirectionalLight(0xffffff, 1.2);
  scene.add(key);
  const watch = buildWatch(textures, quality);
  scene.add(watch.root);
  const camera = new PerspectiveCamera(30, 1, 0.05, 100);

  /* ---------- Layout ---------- */
  let W = 1;
  let H = 1;
  let portrait = false;
  const callLayer = document.getElementById('callouts')!;
  const lines = document.getElementById('lines')!;
  const svg = 'http://www.w3.org/2000/svg';
  const callouts = watch.parts.map((p, i) => {
    const el = document.createElement('div');
    el.className = 'callout';
    el.innerHTML = `<b>${String(i + 1).padStart(2, '0')}</b>${p.name}`;
    callLayer.appendChild(el);
    const line = document.createElementNS(svg, 'path');
    line.setAttribute('class', 'leader');
    const dot = document.createElementNS(svg, 'circle');
    dot.setAttribute('r', '2.5');
    lines.append(line, dot);
    return { part: p, el, line, dot, w: 0, x: 0, y: 0, ly: 0 };
  });
  const layout = () => {
    W = innerWidth;
    H = innerHeight;
    portrait = W / H < 1 || W <= 820;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    callouts.forEach((c) => (c.w = c.el.offsetWidth));
  };
  addEventListener('resize', layout);
  layout();

  const director = new ScrollDirector([...document.querySelectorAll<HTMLElement>('[data-shot]')]);
  const shot = (k: string): Pose => {
    const s = { ...SHOTS[k as ShotKey] };
    if (portrait) {
      s.ax = k === 'layers' ? 0.64 : 0.5;
      s.ay = 0.25;
      s.d *= k === 'layers' ? 1.7 : 1.95;
      if (k === 'final') {
        s.ay = 0.22;
        s.d *= 1.1;
      }
    }
    return s;
  };
  const pose = (): Pose & { active: number } => {
    const { from, to, t, active } = director.sample();
    const a = shot(from);
    const b = shot(to);
    const out = { ...a, active };
    for (const k of KEYS) out[k] = lerp(a[k], b[k], t);
    return out;
  };
  const cur = pose();

  /* ---------- Drag to turn, with inertia ---------- */
  const drag = { on: false, x: 0, y: 0, yaw: 0, pitch: 0, vy: 0 };
  const pointer = { x: 0, y: 0 };
  const isUI = (e: Event) => (e.target as Element | null)?.closest?.('a, button, .config, nav, .rail');
  addEventListener('pointerdown', (e) => {
    if (isUI(e)) return;
    drag.on = true;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.vy = 0;
  });
  addEventListener(
    'pointermove',
    (e) => {
      pointer.x = (e.clientX / W) * 2 - 1;
      pointer.y = (e.clientY / H) * 2 - 1;
      if (!drag.on) return;
      const dx = (e.clientX - drag.x) / W;
      const dy = (e.clientY - drag.y) / H;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.vy = dx * 6;
      drag.yaw += drag.vy;
      if (e.pointerType === 'mouse') drag.pitch = Math.max(-0.6, Math.min(0.6, drag.pitch + dy * 3));
    },
    { passive: true },
  );
  const release = () => (drag.on = false);
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);

  /* ---------- Configuration targets ---------- */
  const target = { case: new Color(), dial: new Color(), strap: new Color(), caseRough: 0.34, strapRough: 0.55 };
  const setConfig = (c: Config) => {
    target.case.set(CASES[c.case].color);
    target.dial.set(DIALS[c.dial].color);
    target.strap.set(STRAPS[c.strap].color);
    target.caseRough = CASES[c.case].rough;
    target.strapRough = STRAPS[c.strap].rough;
    watch.ink.draw(DIALS[c.dial].ink);
    watch.mats.strap.bumpScale = STRAPS[c.strap].bump;
    watch.mats.strap.sheen = STRAPS[c.strap].sheen;
    watch.straps.forEach((s) => (s.stitches.visible = STRAPS[c.strap].stitch));
  };

  /* ---------- Frame ---------- */
  const night = document.getElementById('night')!;
  const backdrop = document.getElementById('backdrop')!;
  const hudTime = document.getElementById('hud-time')!;
  const hudCh = document.getElementById('hud-ch')!;
  const rail = [...document.querySelectorAll<HTMLAnchorElement>('#rail a')];
  const tmp = new Vector3();
  const { hourHand, minuteHand, secondHand } = watch.hands;
  const { balance, gears, rotor } = watch.movement;
  let lastHud = 0;
  let activeIdx = -1;

  const frame = (dt: number, t: number) => {
    const goal = pose();
    const rate = reduce ? Infinity : 3.4;
    for (const k of KEYS) cur[k] = damp(cur[k], goal[k], rate, dt);
    if (goal.active !== activeIdx) {
      activeIdx = goal.active;
      rail.forEach((a, i) => a.classList.toggle('on', i === activeIdx));
      hudCh.textContent = String(activeIdx).padStart(2, '0');
      backdrop.style.setProperty('--gx', `${portrait ? 50 : goal.ax * 100}%`);
    }

    // Inertia; outside the configurator the watch eases back to its authored pose.
    const inConfig = director.keys[activeIdx] === 'config';
    if (!drag.on) {
      drag.yaw += drag.vy;
      drag.vy *= Math.pow(0.04, dt);
      drag.pitch = damp(drag.pitch, 0, 1.5, dt);
      if (!inConfig && Math.abs(drag.vy) < 0.002) drag.yaw = damp(drag.yaw, Math.round(drag.yaw / TAU) * TAU, 1.2, dt);
    }
    const live = reduce ? 0 : 1;
    watch.root.rotation.set(
      cur.rx + drag.pitch + pointer.y * 0.05 * live,
      cur.ry + drag.yaw + (pointer.x * 0.08 + Math.sin(t * 0.45) * 0.04) * live,
      cur.rz,
    );
    watch.root.position.y = Math.sin(t * 1.1) * 0.03 * live;

    camera.position.set(0, 0, cur.d);
    camera.lookAt(0, 0, 0);
    camera.setViewOffset(W, H, (0.5 - cur.ax) * W, (0.5 - cur.ay) * H, W, H);
    camera.updateProjectionMatrix();
    scene.environmentRotation.y = cur.env + pointer.x * 0.25 * live;
    key.position.set(Math.sin(cur.env) * 5, 4, Math.cos(cur.env) * 5);

    for (const p of watch.parts) p.group.position.z = p.z1 * cur.e;
    for (const s of watch.straps) {
      s.half.position.y = s.sy * 0.9 * cur.e;
      s.half.position.z = -0.25 * cur.e;
    }

    // After dark: the studio fades, the lume takes over.
    scene.environmentIntensity = lerp(1, 0.06, cur.lume);
    key.intensity = lerp(1.2, 0.02, cur.lume);
    watch.mats.lume.emissiveIntensity = cur.lume * 2.6;
    watch.mats.lume.color.setScalar(lerp(0.92, 0.35, cur.lume));
    night.style.opacity = (cur.lume * 0.82).toFixed(3);

    // Local time on the hands; the movement beats at 4 Hz.
    const d = new Date();
    const s = d.getSeconds() + (reduce ? 0 : d.getMilliseconds() / 1000);
    const m = d.getMinutes() + s / 60;
    secondHand.rotation.z = -(s / 60) * TAU;
    minuteHand.rotation.z = -(m / 60) * TAU;
    hourHand.rotation.z = -(((d.getHours() % 12) + m / 60) / 12) * TAU;
    if (!reduce) {
      balance.rotation.z = Math.sin(t * TAU * 4) * 1.6;
      gears[0].rotation.z += dt * 0.25;
      gears[1].rotation.z -= dt * 0.25 * (0.3 / 0.16);
      gears[2].rotation.z -= dt * 0.25 * (0.3 / 0.11);
      rotor.rotation.z = Math.sin(t * 0.6) * 1.1 + drag.yaw * 0.6;
    }

    // Materials ease toward the chosen options.
    const k = 1 - Math.exp(-dt * 5);
    const { brushed, polished, engrave, dial, rehaut, strap } = watch.mats;
    brushed.color.lerp(target.case, k);
    polished.color.lerp(target.case, k);
    engrave.color.lerp(target.case, k);
    brushed.roughness = lerp(brushed.roughness, target.caseRough, k);
    dial.color.lerp(target.dial, k);
    rehaut.color.lerp(target.dial, k);
    strap.color.lerp(target.strap, k);
    strap.roughness = lerp(strap.roughness, target.strapRough, k);

    renderer.render(scene, camera);

    // Exploded-view callouts: one column, de-overlapped, leader lines to each part.
    const showCallouts = cur.e > 0.55;
    const alpha = showCallouts ? smoothstep(0.55, 0.95, cur.e).toFixed(3) : '0';
    callLayer.style.opacity = alpha;
    lines.style.opacity = alpha;
    if (showCallouts) {
      for (const c of callouts) {
        tmp.copy(c.part.anchor);
        c.part.group.localToWorld(tmp);
        tmp.project(camera);
        c.x = (tmp.x * 0.5 + 0.5) * W;
        c.y = (-tmp.y * 0.5 + 0.5) * H;
      }
      const colX = portrait ? 16 : Math.max(24, Math.min(...callouts.map((c) => c.x)) - 260);
      const gap = portrait ? 18 : 26;
      const top = portrait ? 70 : 90;
      const bottom = portrait ? H * 0.46 : H - 60;
      const sorted = [...callouts].sort((a, b) => a.y - b.y);
      let y = -1e9;
      for (const c of sorted) y = c.ly = Math.max(c.y, y + gap, top);
      const over = y - bottom;
      for (const c of sorted) {
        if (over > 0) c.ly -= over;
        c.el.style.transform = `translate3d(${colX}px, ${c.ly - 7}px, 0)`;
        const ex = colX + c.w + 10;
        const kx = Math.min(c.x - 20, ex + 40);
        c.line.setAttribute('d', `M${ex},${c.ly} L${kx},${c.ly} L${c.x},${c.y}`);
        c.dot.setAttribute('cx', String(c.x));
        c.dot.setAttribute('cy', String(c.y));
      }
    }

    if (t - lastHud > 0.25) {
      lastHud = t;
      hudTime.textContent = d.toLocaleTimeString('en-GB');
    }
  };

  onProgress(0.85, 'Polishing crystal');
  await precompile(renderer, scene, camera);
  const loop = new RenderLoop(frame, { onFrameTime: (ms) => adaptive.sample(ms) });
  loop.start();
  onProgress(1, 'Ready');
  return { setConfig };
}
