import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial } from 'three';

/**
 * Dust drifting in the window light. Positions are animated in the vertex shader from a time
 * uniform, so there is no per-frame buffer upload no matter how many particles there are.
 */
export function createDust(count: number, half: number) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = 0.6 + Math.random() * 2.2;
    pos[i * 3 + 1] = Math.random() * 2.6;
    pos[i * 3 + 2] = -half + 0.2 + Math.random() * 2.6;
    seed[i] = Math.random() * 100;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(pos, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seed, 1));

  const material = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 300 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uScale;
      attribute float aSeed;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.y = mod(p.y + uTime * 0.04 + aSeed, 2.7);
        p.x += sin(uTime * 0.55 + aSeed * 6.0) * 0.04;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 0.035 * uScale / -mv.z;
        vAlpha = smoothstep(0.0, 0.3, p.y) * smoothstep(2.7, 2.3, p.y);
      }`,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(1.0, 0.9, 0.75, smoothstep(0.5, 0.0, d) * vAlpha * 0.75);
      }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const points = new Points(geometry, material);
  points.frustumCulled = false;
  return {
    points,
    /** Height of the drawing buffer in pixels, to keep point size consistent with PointsMaterial. */
    setViewportHeight(px: number) {
      material.uniforms.uScale!.value = px / 2;
    },
    update(time: number) {
      material.uniforms.uTime!.value = time;
    },
  };
}
