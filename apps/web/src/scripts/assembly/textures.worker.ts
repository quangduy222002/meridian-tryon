import { exposeTextureWorker } from '@meridian/three-core';
import { assemblySpecs } from './textures';

/** Paints the build guide's procedural textures off the main thread. */
exposeTextureWorker((p: { size: number }) => assemblySpecs(p.size));
