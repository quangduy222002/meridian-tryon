/**
 * One shader patch drives every "look" a part can have, so changing steps only moves a few uniforms:
 * washed out (already installed), accent rim (the part being installed), x-ray (see-through) and RGB lighting
 * that cycles in the shader once the build powers on.
 */
import { Color, NormalBlending, type MeshStandardMaterial } from 'three';

export const ACCENT = new Color('#e2622b');

/** Shared by every part: time for the RGB cycle and how far the build is powered on (0..1). */
export const globals = { uTime: { value: 0 }, uPower: { value: 0 } };
const accent = { uAccent: { value: ACCENT } };

export interface Look {
  uDim: { value: number };
  uGlow: { value: number };
  uFade: { value: number };
  uAlpha: { value: number };
}

export const newLook = (): Look => ({
  uDim: { value: 0 },
  uGlow: { value: 0 },
  uFade: { value: 0 },
  uAlpha: { value: 1 },
});

interface Saved {
  transparent: boolean;
  depthWrite: boolean;
  blending: MeshStandardMaterial['blending'];
}

/** Adds the look uniforms (and optionally the RGB cycle) to a standard material. */
export function patchLook(m: MeshStandardMaterial, look: Look, rgb = false) {
  m.userData.saved = { transparent: m.transparent, depthWrite: m.depthWrite, blending: m.blending } satisfies Saved;
  m.customProgramCacheKey = () => (rgb ? 'look-rgb' : 'look');
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, look, globals, accent);
    if (rgb) {
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vRgbPos;')
        .replace(
          '#include <project_vertex>',
          '#include <project_vertex>\nvRgbPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
        );
    }
    s.fragmentShader = s.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uDim, uGlow, uFade, uAlpha, uTime, uPower;
uniform vec3 uAccent;
${rgb ? 'varying vec3 vRgbPos;' : ''}`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        rgb
          ? `#include <emissivemap_fragment>
vec3 rgbC = 0.5 + 0.5 * cos(6.2832 * (uTime * 0.18 - vRgbPos.y * 0.09 + vRgbPos.x * 0.04 + vec3(0.0, 0.33, 0.67)));
totalEmissiveRadiance += rgbC * rgbC * uPower * 1.6;`
          : '#include <emissivemap_fragment>',
      )
      .replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
{
  float fr = pow(1.0 - clamp(abs(dot(normalize(vViewPosition), normal)), 0.0, 1.0), 2.0);
  vec3 c = gl_FragColor.rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // Installed parts wash out to a pale warm grey, like the greyed-out parts in a printed manual.
  c = mix(c, vec3(0.7, 0.68, 0.65) + l * 0.22, uDim * 0.72);
  c = mix(c, uAccent, uGlow * fr * 0.6);
  // X-ray: thin accent outlines, see-through faces.
  c = mix(c, uAccent * 0.9, uFade);
  gl_FragColor = vec4(c, mix(gl_FragColor.a, 0.03 + fr * 0.55, uFade) * uAlpha);
}`,
      );
  };
}

/** Switches a patched material between its own look and the see-through x-ray look. */
export function setXray(m: MeshStandardMaterial, on: boolean) {
  const saved = m.userData.saved as Saved;
  const transparent = on || saved.transparent;
  const blending = on ? NormalBlending : saved.blending;
  if (m.transparent === transparent && m.blending === blending) return;
  m.transparent = transparent;
  m.depthWrite = on ? false : saved.depthWrite;
  m.blending = blending;
  m.needsUpdate = true;
}
