import {
  ACESFilmicToneMapping,
  PCFShadowMap,
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

/**
 * Compiles every shader before the first frame so scrolling never stalls on a compile.
 * Uses the non-blocking path only where the GPU driver can compile in parallel.
 */
export async function precompile(renderer: WebGLRenderer, scene: Object3D, camera: Camera) {
  if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(scene, camera);
  else renderer.compile(scene, camera);
}
