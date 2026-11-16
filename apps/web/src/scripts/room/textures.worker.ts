import { exposeTextureWorker } from '@meridian/three-core';
import { roomSpecs } from './textures';

/** Paints the room planner's finish textures off the main thread. */
exposeTextureWorker((p: { size: number }) => roomSpecs(p.size));
