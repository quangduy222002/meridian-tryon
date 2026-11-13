export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Hermite smoothstep between two edges. */
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Frame-rate independent exponential smoothing toward a target. */
export const damp = (current: number, target: number, rate: number, dt: number) => {
  if (rate === Infinity) return target; // snap (reduced motion); avoids Infinity × 0 = NaN on a zero-length frame
  if (dt <= 0) return current;
  return lerp(current, target, 1 - Math.exp(-rate * dt));
};

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Small deterministic PRNG (mulberry32) so procedural textures look the same every load. */
export function rand32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
