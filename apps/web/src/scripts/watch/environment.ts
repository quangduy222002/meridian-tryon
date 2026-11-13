import {
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  PlaneGeometry,
  Scene,
  type WebGLRenderer,
} from 'three';

/**
 * Product-photography studio baked into an environment map: an overhead key softbox, two tall strip
 * lights, a warm rim panel and a dim floor bounce. Metal reflects these as long clean highlights;
 * rotating `scene.environmentRotation` sweeps them across the case.
 */
export function createStudioEnvironment(renderer: WebGLRenderer) {
  const env = new Scene();
  env.background = new Color(0x030303);
  const card = (w: number, h: number, color: string, intensity: number, pos: [number, number, number]) => {
    const m = new Mesh(
      new PlaneGeometry(w, h),
      new MeshBasicMaterial({ color: new Color(color).multiplyScalar(intensity), side: DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  card(7, 3.2, '#ffffff', 5.0, [0, 6, 3.5]);
  card(0.7, 9, '#ffffff', 6.0, [-6, 0.5, 1.5]);
  card(0.7, 9, '#fff4e6', 4.0, [6, 0.5, -1]);
  card(10, 1.1, '#f0c890', 2.5, [0, 1.6, -7]);
  card(14, 14, '#2a2622', 1.0, [0, -6, 0]);
  card(2.4, 2.4, '#ffffff', 3.0, [4.5, 3.5, 5]);
  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(env, 0.015);
  pmrem.dispose();
  env.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh) {
      m.geometry.dispose();
      (m.material as MeshBasicMaterial).dispose();
    }
  });
  return target.texture;
}
