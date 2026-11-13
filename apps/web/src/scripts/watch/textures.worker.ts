import { paintFlipped, specs, type TextureName } from './textures';

// Typed locally: pulling the global `webworker` lib into the project would retype `addEventListener`
// on every page script.
const scope = self as unknown as {
  onmessage: ((e: MessageEvent<{ dialSize: number }>) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
};

/** Paints every procedural texture off the main thread and hands back transferable ImageBitmaps. */
scope.onmessage = (e) => {
  const out: Partial<Record<TextureName, ImageBitmap>> = {};
  const all = specs(e.data.dialSize);
  const names = Object.keys(all) as TextureName[];
  for (const name of names) {
    const spec = all[name];
    const canvas = new OffscreenCanvas(spec.width, spec.height);
    paintFlipped(canvas.getContext('2d')!, spec);
    out[name] = canvas.transferToImageBitmap();
    scope.postMessage({ progress: Object.keys(out).length / names.length });
  }
  scope.postMessage({ bitmaps: out }, Object.values(out));
};
