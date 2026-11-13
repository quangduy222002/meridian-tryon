import type { WebGLRenderer } from 'three';

export type Tier = 'low' | 'mid' | 'high';

export interface Quality {
  tier: Tier;
  /** Upper bound for the device pixel ratio we render at. */
  maxDpr: number;
  /** Floor the adaptive resolution may drop to when frames get slow. */
  minDpr: number;
  antialias: boolean;
  shadowMapSize: number;
  /** Physically based glass (an extra render pass) — only where the GPU can afford it. */
  transmission: boolean;
  /** Side of generated textures in pixels. */
  textureSize: number;
  /** Multiplier for particle counts. */
  particles: number;
}

const PRESETS: Record<Tier, Omit<Quality, 'tier' | 'maxDpr' | 'antialias'> & { dpr: number }> = {
  low: { dpr: 1, minDpr: 0.75, shadowMapSize: 512, transmission: false, textureSize: 1024, particles: 0.4 },
  mid: { dpr: 1.5, minDpr: 1, shadowMapSize: 1024, transmission: false, textureSize: 1024, particles: 0.7 },
  high: { dpr: 2, minDpr: 1, shadowMapSize: 2048, transmission: true, textureSize: 2048, particles: 1 },
};

const SOFTWARE_GPU = /swiftshader|llvmpipe|software|basic render|mali-4|adreno \(tm\) 3|powervr sgx/i;

function gpuName(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return '';
    const name = String(gl.getParameter(gl.RENDERER) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch {
    return '';
  }
}

/** Rough device class from cores, memory, input type and GPU name. `?q=low|mid|high` overrides it. */
export function detectTier(): Tier {
  const forced = new URLSearchParams(location.search).get('q');
  if (forced === 'low' || forced === 'mid' || forced === 'high') return forced;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const coarse = matchMedia('(hover: none)').matches;
  if (SOFTWARE_GPU.test(gpuName()) || cores <= 2 || memory <= 2) return 'low';
  if (coarse || cores <= 4 || memory <= 4) return 'mid';
  return 'high';
}

export function getQuality(tier: Tier = detectTier()): Quality {
  const { dpr, ...rest } = PRESETS[tier];
  const maxDpr = Math.min(window.devicePixelRatio || 1, dpr);
  // MSAA is wasted work on dense screens; the pixel density already hides the jaggies.
  return { tier, maxDpr, antialias: maxDpr < 2, ...rest };
}

/**
 * Lowers the render resolution when frames run long and raises it back when there is headroom,
 * so slow devices stay smooth instead of dropping frames.
 */
export class AdaptiveResolution {
  private dpr: number;
  private frames: number[] = [];
  private calm = 0;

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly quality: Quality,
  ) {
    this.dpr = quality.maxDpr;
    renderer.setPixelRatio(this.dpr);
  }

  get pixelRatio() {
    return this.dpr;
  }

  /** Feed the duration of the last frame in milliseconds. */
  sample(ms: number) {
    this.frames.push(ms);
    if (this.frames.length < 40) return;
    const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    this.frames.length = 0;
    if (avg > 24 && this.dpr > this.quality.minDpr) {
      this.set(this.dpr - 0.25);
      this.calm = 0;
    } else if (avg < 17) {
      if (++this.calm >= 4 && this.dpr < this.quality.maxDpr) {
        this.set(this.dpr + 0.25);
        this.calm = 0;
      }
    } else {
      this.calm = 0;
    }
  }

  private set(dpr: number) {
    this.dpr = Math.min(this.quality.maxDpr, Math.max(this.quality.minDpr, dpr));
    this.renderer.setPixelRatio(this.dpr);
  }
}
