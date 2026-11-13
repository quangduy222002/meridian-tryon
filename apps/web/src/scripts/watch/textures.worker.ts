import { exposeTextureWorker } from '@meridian/three-core';
import { specs } from './textures';

/** Paints the watch's procedural textures off the main thread. */
exposeTextureWorker((p: { dialSize: number }) => specs(p.dialSize));
