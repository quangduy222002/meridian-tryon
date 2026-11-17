/**
 * How the 3D room is lit and finished, aiming for an architectural-visualisation look within each device's budget:
 * - Daylight: a physical sky (Rayleigh / Mie scattering) for the sun's position is baked into the environment map,
 *   so the fill light turns blue at noon and amber at dusk with the sun; AgX tone mapping handles the range.
 * - Ambient occlusion (GTAO) darkens corners, skirting lines and the ground under furniture; with multisampling on the
 *   composer's buffer for clean edges. High tier only: lower tiers render straight to the screen as before.
 * The background is a flat colour that the ground fades into with fog, so the model sits in a quiet studio.
 */
import {
  NeutralToneMapping,
  Color,
  Fog,
  HalfFloatType,
  PMREMGenerator,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type PerspectiveCamera,
  type WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { Sky } from 'three/addons/objects/Sky.js';
import type { Quality } from '@meridian/three-core';

export const BACKDROP = '#e8ebef';

export interface Look {
  render(): void;
  setSize(w: number, h: number): void;
  /** Re-bakes the sky light for a sun direction (unit vector towards the sun) and elevation in radians. */
  setSun(dir: Vector3, elevation: number): void;
}

export function createLook(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  quality: Quality,
  /** Called after the sky light is re-baked, to draw a frame with it. */
  changed: () => void,
): Look {
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  scene.background = new Color(BACKDROP);
  scene.fog = new Fog(BACKDROP, 40, 120);

  /* Sky light */
  const sky = new Sky();
  sky.scale.setScalar(1000);
  const u = sky.material.uniforms as Record<string, { value: unknown }>;
  u.turbidity!.value = 3;
  u.rayleigh!.value = 1.2;
  u.mieCoefficient!.value = 0.004;
  u.mieDirectionalG!.value = 0.8;
  const skyScene = new Scene();
  skyScene.add(sky);
  const pmrem = new PMREMGenerator(renderer);
  let env: WebGLRenderTarget | null = null;
  let pending = 0;
  const bake = () => {
    pending = 0;
    const next = pmrem.fromScene(skyScene, 0.02);
    scene.environment = next.texture;
    env?.dispose();
    env = next;
    changed();
  };

  /* Post-processing (high tier) */
  let composer: EffectComposer | null = null;
  let gtao: GTAOPass | null = null;
  if (quality.tier === 'high' && renderer.capabilities.isWebGL2) {
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    gtao = new GTAOPass(scene, camera, 1, 1);
    gtao.blendIntensity = 1;
    gtao.updateGtaoMaterial({ radius: 0.55, distanceExponent: 1, thickness: 1.4, scale: 1.8, samples: 16 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 8, rings: 2, samples: 16 });
    composer.addPass(gtao);
    composer.addPass(new OutputPass());
  }
  const size = new Vector2();

  return {
    render() {
      if (composer) composer.render();
      else renderer.render(scene, camera);
    },
    setSize(w, h) {
      if (!composer) return;
      renderer.getDrawingBufferSize(size);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
      gtao?.setSize(size.x, size.y);
    },
    setSun(dir, elevation) {
      (u.sunPosition!.value as Vector3).copy(dir);
      // A low sun gives a warmer, hazier sky.
      const low = 1 - Math.min(1, elevation / (35 * (Math.PI / 180)));
      u.turbidity!.value = 3 + low * 5;
      u.rayleigh!.value = 1.2 + low * 1.6;
      // Baking takes a few milliseconds: at most once per frame while the sun slider moves.
      if (!pending) pending = requestAnimationFrame(bake);
    },
  };
}
