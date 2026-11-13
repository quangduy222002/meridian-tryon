import { RepeatWrapping, SRGBColorSpace, Texture, type WebGLRenderer } from 'three';

/**
 * Procedural textures painted with the 2D canvas API. Specs are plain objects so the same painter runs in a Web Worker
 * (OffscreenCanvas) or on the main thread when workers can't paint.
 */
export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface TextureSpec {
  width: number;
  height: number;
  paint: (c: Ctx2D, w: number, h: number) => void;
  /** Upload settings applied on the main thread. */
  srgb?: boolean;
  repeat?: [number, number];
}

export type SpecMap = Record<string, TextureSpec>;

/**
 * Paints a spec upside down, so it can be uploaded with `flipY = false`
 * (ImageBitmaps ignore WebGL's flip flag; this keeps worker and fallback identical).
 */
export function paintFlipped(c: Ctx2D, spec: TextureSpec) {
  c.setTransform(1, 0, 0, -1, 0, spec.height);
  spec.paint(c, spec.width, spec.height);
}

interface WorkerScope {
  onmessage: ((e: MessageEvent<unknown>) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

/**
 * Call from a worker module: paints every spec off the main thread and posts back transferable ImageBitmaps.
 * `build` receives whatever the page passed as params (e.g. the texture size for this device).
 */
export function exposeTextureWorker<P>(build: (params: P) => SpecMap) {
  const scope = self as unknown as WorkerScope;
  scope.onmessage = (e) => {
    const specs = build(e.data as P);
    const names = Object.keys(specs);
    const out: Record<string, ImageBitmap> = {};
    for (const name of names) {
      const spec = specs[name]!;
      const canvas = new OffscreenCanvas(spec.width, spec.height);
      paintFlipped(canvas.getContext('2d')!, spec);
      out[name] = canvas.transferToImageBitmap();
      scope.postMessage({ progress: Object.keys(out).length / names.length });
    }
    scope.postMessage({ bitmaps: out }, Object.values(out));
  };
}

const canPaintInWorker = () =>
  typeof OffscreenCanvas !== 'undefined' && 'transferToImageBitmap' in OffscreenCanvas.prototype;

interface GenerateOptions<P> {
  /** Spec builder; also used for the main-thread fallback. */
  build: (params: P) => SpecMap;
  params: P;
  /** Factory for the page's texture worker: `() => new Worker(new URL('./x.worker.ts', import.meta.url), { type: 'module' })`. */
  worker?: () => Worker;
  anisotropy?: number;
  onProgress?: (p: number) => void;
  /**
   * Uploads every texture to the GPU before resolving. Recommended: bitmaps made by a worker are only guaranteed to be
   * readable until the worker is gone, and it avoids an upload hitch the first time a hidden object appears.
   */
  renderer?: WebGLRenderer;
}

/** Generates textures in a worker when possible, otherwise in small main-thread slices. */
export async function generateTextures<P, K extends string = string>(
  opts: GenerateOptions<P>,
): Promise<Record<K, Texture>> {
  const specs = opts.build(opts.params);
  const progress = opts.onProgress ?? (() => {});
  let worker: Worker | undefined;
  const fromWorker = (): Promise<Record<string, ImageBitmap>> =>
    new Promise((resolve, reject) => {
      const w = (worker = opts.worker!());
      w.onmessage = (e: MessageEvent<{ progress?: number; bitmaps?: Record<string, ImageBitmap> }>) => {
        if (e.data.progress !== undefined) progress(e.data.progress);
        // The worker is kept alive until the bitmaps are on the GPU (see below).
        if (e.data.bitmaps) resolve(e.data.bitmaps);
      };
      w.onerror = (err) => {
        w.terminate();
        reject(err);
      };
      w.postMessage(opts.params);
    });
  const onMainThread = async () => {
    const out: Record<string, HTMLCanvasElement> = {};
    const names = Object.keys(specs);
    for (const [i, name] of names.entries()) {
      const spec = specs[name]!;
      const canvas = document.createElement('canvas');
      canvas.width = spec.width;
      canvas.height = spec.height;
      paintFlipped(canvas.getContext('2d')!, spec);
      out[name] = canvas;
      progress((i + 1) / names.length);
      await new Promise((r) => setTimeout(r)); // yield so the page stays responsive
    }
    return out;
  };
  const sources: Record<string, ImageBitmap | HTMLCanvasElement> =
    opts.worker && canPaintInWorker() ? await fromWorker().catch(onMainThread) : await onMainThread();

  const textures = {} as Record<K, Texture>;
  for (const [name, spec] of Object.entries(specs)) {
    const t = new Texture(sources[name] as HTMLCanvasElement);
    t.flipY = false;
    t.anisotropy = opts.anisotropy ?? 8;
    if (spec.srgb) t.colorSpace = SRGBColorSpace;
    if (spec.repeat) {
      t.wrapS = t.wrapT = RepeatWrapping;
      t.repeat.set(...spec.repeat);
    }
    t.needsUpdate = true;
    textures[name as K] = t;
    opts.renderer?.initTexture(t);
  }
  worker?.terminate();
  return textures;
}
