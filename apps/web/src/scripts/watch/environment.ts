import { DARK_STUDIO, bakeStudio } from '@meridian/three-core';
import type { WebGLRenderer } from 'three';

/**
 * Product-photography studio for the watch: an overhead key softbox, two tall strip lights, a warm rim panel and a dim
 * floor bounce. Rotating `scene.environmentRotation` sweeps these highlights across the case.
 */
export const createStudioEnvironment = (renderer: WebGLRenderer) => bakeStudio(renderer, DARK_STUDIO, '#030303');
