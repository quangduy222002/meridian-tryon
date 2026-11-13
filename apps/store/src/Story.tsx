// Sticky scroll story: the garment hangs on the left as fabric; scrolling through the three
// chapters on the right re-dyes it (the new colour washes down the cloth) and shakes the fabric.
import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { AdaptiveResolution, RenderLoop, createRenderer, getQuality } from '@meridian/three-core';
import type { Img, ProductCard } from './lib/shopify';
import { colorsOf, swatch } from './ui';
import { reducedMotion, useStickyProgress } from './scroll';

const STEPS = [
  {
    title: 'Heavy, not stiff',
    body: 'Brushed-back fleece at 450 gsm holds its shape on day one and still moves with you on day five hundred.',
  },
  {
    title: 'Colour that softens',
    body: 'Garment-dyed in small batches, so every shade gets warmer with each wash instead of fading flat.',
  },
  {
    title: 'Made to be mended',
    body: 'Reinforced seams, spare thread in the pocket and free repairs for as long as you own it.',
  },
];

const vert = /* glsl */ `
  uniform float uTime, uAmp; varying vec2 vUv; varying float vShade;
  void main() {
    vUv = uv; vec3 p = position;
    float hang = pow(1.0 - uv.y, 1.3);
    float a = p.x * 1.8 + p.y * 1.1 + uTime * 1.3, b = p.x * 3.9 - uTime * 1.9 + p.y;
    p.z += (sin(a) * 0.09 + sin(b) * 0.03) * hang * uAmp;
    vShade = 0.93 + (cos(a) * 0.16 + cos(b) * 0.12) * hang * uAmp * 0.55;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;
const frag = /* glsl */ `
  uniform sampler2D uA, uB; uniform float uMix, uTime; varying vec2 vUv; varying float vShade;
  void main() {
    // the new colour washes down from the hanger with a wavy edge
    float edge = 1.0 - vUv.y + sin(vUv.x * 14.0 + uTime * 3.0) * 0.03;
    float m = smoothstep(edge - 0.06, edge + 0.06, uMix * 1.2);
    vec3 c = mix(texture2D(uA, vUv).rgb, texture2D(uB, vUv).rgb, m) * vShade;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`;

const sized = (url: string) => (url.startsWith('data:') ? url : url + (url.includes('?') ? '&' : '?') + 'width=900');

export default function Story({ product }: { product: ProductCard }) {
  const section = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const progress = useStickyProgress(section);
  const step = Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length * 0.999));

  // one image per step: the product's colours if it has them, otherwise its photos
  const looks = useMemo(() => {
    const byColor = colorsOf(product).filter(([, img]) => img) as [string, Img][];
    const pool: [string | null, Img][] =
      byColor.length > 1
        ? byColor
        : (product.images?.nodes ?? [product.featuredImage!]).filter(Boolean).map((i) => [null, i]);
    return STEPS.map((_, i) => pool[i % pool.length]);
  }, [product]);

  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduced = reducedMotion();
    // Shared runtime: device-appropriate resolution, pauses off screen, drops resolution if frames run long.
    const quality = getQuality();
    const canvas = document.createElement('canvas');
    el.appendChild(canvas);
    const renderer = createRenderer(canvas, quality, { toneMapping: THREE.NoToneMapping });
    const adaptive = new AdaptiveResolution(renderer, quality);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    camera.position.set(0, 0.1, 6.4);
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const blank = new THREE.DataTexture(new Uint8Array([236, 240, 238, 255]), 1, 1);
    blank.needsUpdate = true;
    const tex: THREE.Texture[] = looks.map(() => blank);
    looks.forEach(([, img], i) =>
      loader.load(sized(img.url), (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        tex[i] = t;
        if (i === shown) mat.uniforms.uA.value = t;
      }),
    );
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uTime: { value: 0 },
        uAmp: { value: 1 },
        uMix: { value: 0 },
        uA: { value: blank },
        uB: { value: blank },
      },
    });
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.0, 30, 40), mat);
    scene.add(cloth);
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 2.3, 10).rotateZ(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#173a31' }),
    );
    bar.position.y = 1.53;
    scene.add(bar);

    let shown = 0,
      target = 0,
      mix = 0,
      shake = 0,
      px = 0,
      py = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width - 0.5;
      py = (e.clientY - r.top) / r.height - 0.5;
    };
    el.addEventListener('pointermove', onMove);
    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = w / h < 0.85 ? 7.6 : 6.4;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    const t0 = performance.now();
    function tick(dt: number) {
      const now = performance.now();
      const want = stepRef.current;
      if (want !== target && mix === 0) {
        target = want;
        mat.uniforms.uB.value = tex[target];
        shake = 1;
      }
      if (target !== shown) {
        mix = reduced ? 1 : Math.min(1, mix + dt * 1.4);
        if (mix >= 1) {
          shown = target;
          mat.uniforms.uA.value = tex[shown];
          mix = 0;
        }
      }
      shake *= Math.pow(0.15, dt);
      mat.uniforms.uTime.value = (now - t0) / 1000;
      mat.uniforms.uMix.value = mix;
      mat.uniforms.uAmp.value = reduced ? 0 : 0.8 + shake * 2.2;
      cloth.rotation.y += (px * 0.35 - cloth.rotation.y) * Math.min(1, dt * 4);
      cloth.rotation.x += (py * 0.12 - cloth.rotation.x) * Math.min(1, dt * 4);
      renderer.render(scene, camera);
    }
    const loop = new RenderLoop(tick, { target: el, onFrameTime: (ms) => adaptive.sample(ms) });
    loop.start();
    return () => {
      loop.stop();
      ro.disconnect();
      el.removeEventListener('pointermove', onMove);
      tex.forEach((t) => t.dispose());
      mat.dispose();
      renderer.dispose();
      el.removeChild(canvas);
    };
  }, [looks]);

  return (
    <section className="story" ref={section} style={{ height: `${STEPS.length * 85 + 40}vh` }}>
      <div className="story-sticky">
        <div className="story-visual">
          <div className="story-canvas" ref={host} />
          {looks[step][0] && (
            <div className="story-color" key={looks[step][0]}>
              <span className="sw big" style={{ background: swatch(looks[step][0]!) }} />
              {looks[step][0]}
            </div>
          )}
        </div>
        <div className="story-text">
          <h2 className="story-kicker">{product.title}</h2>
          <div className="story-steps">
            {STEPS.map((s, i) => (
              <div key={s.title} className={'story-step' + (i === step ? ' on' : i < step ? ' past' : '')}>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
          <div className="story-bar">
            <span style={{ transform: `scaleX(${progress})` }} />
          </div>
          <Link to={`/products/${product.handle}`} className="btn">
            Shop the {product.title}
          </Link>
        </div>
      </div>
    </section>
  );
}
