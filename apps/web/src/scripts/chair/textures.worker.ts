import { exposeTextureWorker } from '@meridian/three-core';
import { chairSpecs } from './textures';

/** Paints the chair's procedural textures off the main thread. */
exposeTextureWorker((p: { size: number }) => chairSpecs(p.size));
