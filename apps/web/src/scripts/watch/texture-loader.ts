import { generateTextures } from '@meridian/three-core';
import type { Texture, WebGLRenderer } from 'three';
import { specs, type TextureName } from './textures';

export type WatchTextures = Record<TextureName, Texture>;

/** Generates the watch textures, in a worker when the browser supports OffscreenCanvas. */
export const loadWatchTextures = (
  renderer: WebGLRenderer,
  dialSize: number,
  anisotropy: number,
  onProgress: (p: number) => void,
) =>
  generateTextures<{ dialSize: number }, TextureName>({
    build: (p) => specs(p.dialSize),
    params: { dialSize },
    worker: () => new Worker(new URL('./textures.worker.ts', import.meta.url), { type: 'module' }),
    anisotropy,
    onProgress,
    renderer,
  });
