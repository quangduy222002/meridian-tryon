import { exposeTextureWorker } from '@meridian/three-core';
import { boxSpecs } from './textures';

/** Paints the box studio's board textures off the main thread. */
exposeTextureWorker((p: { size: number }) => boxSpecs(p.size));
