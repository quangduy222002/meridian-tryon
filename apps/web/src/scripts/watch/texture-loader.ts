import { RepeatWrapping, SRGBColorSpace, Texture } from 'three';
import { paintFlipped, specs, type TextureName } from './textures';

type Sources = Record<TextureName, ImageBitmap | HTMLCanvasElement>;

function inWorker(dialSize: number, onProgress: (p: number) => void): Promise<Sources> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./textures.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ progress?: number; bitmaps?: Sources }>) => {
      if (e.data.progress !== undefined) onProgress(e.data.progress);
      if (e.data.bitmaps) {
        worker.terminate();
        resolve(e.data.bitmaps);
      }
    };
    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };
    worker.postMessage({ dialSize });
  });
}

async function onMainThread(dialSize: number, onProgress: (p: number) => void): Promise<Sources> {
  const out = {} as Sources;
  const all = specs(dialSize);
  const names = Object.keys(all) as TextureName[];
  for (const [i, name] of names.entries()) {
    const spec = all[name];
    const canvas = document.createElement('canvas');
    canvas.width = spec.width;
    canvas.height = spec.height;
    paintFlipped(canvas.getContext('2d')!, spec);
    out[name] = canvas;
    onProgress((i + 1) / names.length);
    await new Promise((r) => setTimeout(r)); // yield so the page stays responsive
  }
  return out;
}

export type WatchTextures = Record<TextureName, Texture>;

/** Generates the watch textures, in a worker when the browser supports OffscreenCanvas. */
export async function loadWatchTextures(dialSize: number, anisotropy: number, onProgress: (p: number) => void) {
  const canWork = typeof OffscreenCanvas !== 'undefined' && 'transferToImageBitmap' in OffscreenCanvas.prototype;
  const sources = canWork
    ? await inWorker(dialSize, onProgress).catch(() => onMainThread(dialSize, onProgress))
    : await onMainThread(dialSize, onProgress);

  const make = (name: TextureName, srgb = false, repeat?: [number, number]) => {
    const t = new Texture(sources[name] as HTMLCanvasElement);
    t.flipY = false;
    t.anisotropy = anisotropy;
    if (srgb) t.colorSpace = SRGBColorSpace;
    if (repeat) {
      t.wrapS = t.wrapT = RepeatWrapping;
      t.repeat.set(...repeat);
    }
    t.needsUpdate = true;
    return t;
  };
  return {
    brush: make('brush', false, [1, 1]),
    dial: make('dial', true),
    perlage: make('perlage', false, [3, 3]),
    cotes: make('cotes', false, [1, 1]),
    grain: make('grain', false, [2, 8]),
    engrave: make('engrave'),
    rehaut: make('rehaut', true),
  } satisfies WatchTextures;
}
