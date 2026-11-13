/** Procedural textures for the chair. Painted in a worker; only the 2D canvas API is used. */
import { rand32, type Ctx2D, type SpecMap } from '@meridian/three-core';

/** Writes a height field as a tangent-space normal map. */
function heightToNormal(c: Ctx2D, w: number, h: number, height: (x: number, y: number) => number, strength: number) {
  const img = c.createImageData(w, h);
  const hAt = (x: number, y: number) => height((x + w) % w, (y + h) % h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (hAt(x + 1, y) - hAt(x - 1, y)) * strength;
      const dy = (hAt(x, y + 1) - hAt(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      img.data[i] = (-dx / len) * 127 + 128;
      img.data[i + 1] = (-dy / len) * 127 + 128;
      img.data[i + 2] = (1 / len) * 127 + 128;
      img.data[i + 3] = 255;
    }
  c.putImageData(img, 0, 0);
}

/** Smooth value noise, tileable over `period`. */
function noise(seed: number, period: number) {
  const r = rand32(seed);
  const g = Array.from({ length: period * period }, () => r());
  const at = (x: number, y: number) =>
    g[(((y % period) + period) % period) * period + (((x % period) + period) % period)]!;
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * sx;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * sx;
    return a + (b - a) * sy;
  };
}

export const chairSpecs = (size: number): SpecMap => ({
  /** Long-grain timber in greyscale; the species colour tints it so wood changes can ease smoothly. */
  wood: {
    width: size / 2,
    height: size,
    repeat: [1, 1],
    srgb: true,
    paint(c, w, h) {
      const n = noise(5, 32);
      const img = c.createImageData(w, h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const u = x / w;
          const v = y / h;
          const warp = n(u * 6, v * 2) * 3 + n(u * 18, v * 6) * 0.6;
          const ring = Math.sin((u * 26 + warp) * Math.PI);
          const pores = n(u * 120, v * 12) * 0.35;
          const tone = 196 + ring * 22 - pores * 50 + n(u * 3, v * 1.2) * 24;
          const i = (y * w + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, tone));
          img.data[i + 3] = 255;
        }
      c.putImageData(img, 0, 0);
    },
  },
  /** Plain-weave linen as a normal map: threads pass over and under each other. */
  weave: {
    width: 256,
    height: 256,
    repeat: [9, 9],
    paint(c, w, h) {
      const n = noise(9, 64);
      const threads = 16;
      heightToNormal(
        c,
        w,
        h,
        (x, y) => {
          const u = (x / w) * threads;
          const v = (y / h) * threads;
          const cu = Math.floor(u);
          const cv = Math.floor(v);
          const over = (cu + cv) % 2 === 0;
          const along = over ? Math.sin((u - cu) * Math.PI) : Math.sin((v - cv) * Math.PI);
          const slub = n(x * 0.25, y * 0.05) * 0.4; // irregular linen yarn
          return (over ? 1 : 0.55) * along + slub;
        },
        3.2,
      );
    },
  },
  /** Pebbled leather grain as a normal map. */
  leather: {
    width: 256,
    height: 256,
    repeat: [6, 6],
    paint(c, w, h) {
      // Worley noise on a jittered 16×16 grid: each pixel only checks its 3×3 neighbourhood.
      const G = 16;
      const cs = w / G;
      const r = rand32(17);
      const jitter = Array.from({ length: G * G }, () => [r(), r()] as const);
      const n = noise(23, 32);
      heightToNormal(
        c,
        w,
        h,
        (x, y) => {
          const gx = Math.floor(x / cs);
          const gy = Math.floor(y / cs);
          let d1 = 1e9;
          let d2 = 1e9;
          for (let oy = -1; oy <= 1; oy++)
            for (let ox = -1; ox <= 1; ox++) {
              const cx = gx + ox;
              const cy = gy + oy;
              const [jx, jy] = jitter[((cy + G) % G) * G + ((cx + G) % G)]!;
              const d = Math.hypot(x - (cx + jx) * cs, y - (cy + jy) * cs);
              if (d < d1) {
                d2 = d1;
                d1 = d;
              } else if (d < d2) d2 = d;
            }
          return Math.min(1, (d2 - d1) / 6) + n(x / 8, y / 8) * 0.3;
        },
        1.4,
      );
    },
  },
  /** Oak floor planks for the room view. */
  floor: {
    width: size,
    height: size,
    repeat: [2, 2],
    srgb: true,
    paint(c, w, h) {
      const r = rand32(31);
      const n = noise(37, 32);
      const planks = 6;
      const pw = w / planks;
      const img = c.createImageData(w, h);
      const offsets = Array.from({ length: planks }, () => r());
      const tones = Array.from({ length: planks * 3 }, () => 0.85 + r() * 0.25);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const p = Math.floor(x / pw);
          const v = (y / h + offsets[p]!) % 1;
          const seg = Math.floor(v * 3);
          const lx = x - p * pw;
          const gap = lx < 1.5 || Math.abs(v * 3 - Math.round(v * 3)) * (h / 3) < 1.2;
          const grain = Math.sin(((lx / pw) * 9 + n((x / w) * 8, (y / h) * 2) * 3) * Math.PI) * 0.06;
          const k = gap ? 0.45 : tones[p * 3 + seg]! + grain;
          const i = (y * w + x) * 4;
          img.data[i] = 186 * k;
          img.data[i + 1] = 146 * k;
          img.data[i + 2] = 104 * k;
          img.data[i + 3] = 255;
        }
      c.putImageData(img, 0, 0);
    },
  },
  /** Soft contact shadow, used as an alpha map under the chair. */
  contact: {
    width: 256,
    height: 256,
    paint(c, w, h) {
      const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgb(255,255,255)');
      g.addColorStop(0.45, 'rgb(150,150,150)');
      g.addColorStop(1, 'rgb(0,0,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    },
  },
});

export type ChairTexture = 'wood' | 'weave' | 'leather' | 'floor' | 'contact';
