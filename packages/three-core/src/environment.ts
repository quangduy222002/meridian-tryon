import {
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  PlaneGeometry,
  Scene,
  type Texture,
  type WebGLRenderer,
} from 'three';

/** An emissive card in the virtual photo studio (softbox, strip light, bounce card…). */
export interface LightCard {
  size: [number, number];
  color: string;
  intensity: number;
  position: [number, number, number];
}

/**
 * Bakes a product-photography studio into a prefiltered environment map. Cards are flat emissive panels facing the
 * origin; metal and gloss reflect them as clean, long highlights. Costs one PMREM pass at start-up, nothing per frame.
 */
export function bakeStudio(renderer: WebGLRenderer, cards: LightCard[], background = '#050505'): Texture {
  const env = new Scene();
  env.background = new Color(background);
  for (const c of cards) {
    const m = new Mesh(
      new PlaneGeometry(...c.size),
      new MeshBasicMaterial({ color: new Color(c.color).multiplyScalar(c.intensity), side: DoubleSide }),
    );
    m.position.set(...c.position);
    m.lookAt(0, 0, 0);
    env.add(m);
  }
  const pmrem = new PMREMGenerator(renderer);
  const texture = pmrem.fromScene(env, 0.015).texture;
  pmrem.dispose();
  env.traverse((o) => {
    const m = o as Mesh<PlaneGeometry, MeshBasicMaterial>;
    if (m.isMesh) {
      m.geometry.dispose();
      m.material.dispose();
    }
  });
  return texture;
}

/** Dark, high-contrast studio for jewellery-like metal (watch page). */
export const DARK_STUDIO: LightCard[] = [
  { size: [7, 3.2], color: '#ffffff', intensity: 5, position: [0, 6, 3.5] },
  { size: [0.7, 9], color: '#ffffff', intensity: 6, position: [-6, 0.5, 1.5] },
  { size: [0.7, 9], color: '#fff4e6', intensity: 4, position: [6, 0.5, -1] },
  { size: [10, 1.1], color: '#f0c890', intensity: 2.5, position: [0, 1.6, -7] },
  { size: [14, 14], color: '#2a2622', intensity: 1, position: [0, -6, 0] },
  { size: [2.4, 2.4], color: '#ffffff', intensity: 3, position: [4.5, 3.5, 5] },
];

/** Bright, soft studio for furniture and packaging: big overhead diffusion, warm bounce from the floor. */
export const LIGHT_STUDIO: LightCard[] = [
  { size: [10, 6], color: '#ffffff', intensity: 2.6, position: [0, 7, 2] },
  { size: [3, 6], color: '#fff6ec', intensity: 2.2, position: [-6, 2.5, 3] },
  { size: [3, 6], color: '#eef3ff', intensity: 1.4, position: [6, 2, -2] },
  { size: [16, 16], color: '#e9e1d4', intensity: 0.9, position: [0, -5, 0] },
  { size: [12, 6], color: '#f4efe7', intensity: 0.8, position: [0, 2, -8] },
];
