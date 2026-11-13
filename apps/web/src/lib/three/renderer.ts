import {
  ACESFilmicToneMapping,
  CanvasTexture,
  PCFShadowMap,
  RepeatWrapping,
  SRGBColorSpace,
  WebGLRenderer,
  type Camera,
  type Object3D,
  type ToneMapping,
} from 'three';
import type { Quality } from './quality';

interface RendererOptions {
  alpha?: boolean;
  shadows?: boolean;
  toneMapping?: ToneMapping;
  exposure?: number;
}

export function createRenderer(canvas: HTMLCanvasElement, quality: Quality, opts: RendererOptions = {}) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: quality.antialias,
    alpha: opts.alpha ?? true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(quality.maxDpr);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = opts.toneMapping ?? ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1;
  if (opts.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap; // soft filtering is built in since r18x
  }
  return renderer;
}

interface TextureOptions {
  srgb?: boolean;
  repeat?: [number, number];
  anisotropy?: number;
}

/** Wraps a canvas (or ImageBitmap from a worker) in a texture with sensible defaults. */
export function makeTexture(source: HTMLCanvasElement | ImageBitmap | OffscreenCanvas, opts: TextureOptions = {}) {
  const t = new CanvasTexture(source as HTMLCanvasElement);
  if (opts.srgb) t.colorSpace = SRGBColorSpace;
  if (opts.repeat) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(...opts.repeat);
  }
  t.anisotropy = opts.anisotropy ?? 8;
  return t;
}

/**
 * Compiles every shader before the first frame so scrolling never stalls on a compile.
 * Uses the non-blocking path only where the GPU driver can compile in parallel.
 */
export async function precompile(renderer: WebGLRenderer, scene: Object3D, camera: Camera) {
  if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(scene, camera);
  else renderer.compile(scene, camera);
}
