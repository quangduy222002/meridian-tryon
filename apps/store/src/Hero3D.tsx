// 3D lookbook: products hang like fabric on a slowly turning ring.
// Drag (or swipe) to spin it, tap a piece to open the product.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import type { ProductCard } from './lib/shopify';
import { Price } from './ui';

const W = 1.6,
  H = 2.0; // card size, 4:5 like the product photos

const vert = /* glsl */ `
  uniform float uTime, uAmp, uSeed;
  varying vec2 vUv; varying float vShade;
  void main() {
    vUv = uv;
    vec3 p = position;
    // Fabric hangs from its top edge: the lower it is, the more it moves
    float hang = pow(1.0 - uv.y, 1.35);
    float a = p.x * 2.1 + p.y * 1.2 + uTime * 1.5 + uSeed;
    float b = p.x * 4.3 - uTime * 2.2 + uSeed * 2.0;
    p.z += (sin(a) * 0.11 + sin(b) * 0.035) * hang * uAmp;
    p.x += sin(uTime * 0.9 + uSeed) * 0.03 * hang * uAmp;
    // Shade folds from the slope of the wave
    float slope = (cos(a) * 0.23 + cos(b) * 0.15) * hang * uAmp;
    vShade = 0.92 + slope * 0.55;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;
const frag = /* glsl */ `
  uniform sampler2D uMap; uniform float uFade, uHas;
  varying vec2 vUv; varying float vShade;
  float rbox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) - r; }
  void main() {
    vec2 p = (vUv - 0.5) * vec2(${W.toFixed(1)}, ${H.toFixed(1)});
    if (rbox(p, vec2(${(W / 2).toFixed(2)}, ${(H / 2).toFixed(2)}), 0.06) > 0.0) discard;
    vec3 c = mix(vec3(0.93, 0.95, 0.94), texture2D(uMap, vUv).rgb, uHas);
    c *= vShade;
    c = mix(vec3(0.0086, 0.0423, 0.0307), c, uFade); // cards at the back sink into the spruce background
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`;

const sized = (url: string) => (url.startsWith('data:') ? url : url + (url.includes('?') ? '&' : '?') + 'width=640');

export default function Hero3D({ products }: { products: ProductCard[] }) {
  const host = useRef<HTMLDivElement>(null);
  const [front, setFront] = useState(0);
  const nav = useNavigate();
  const navRef = useRef(nav);
  navRef.current = nav;
  const items = products.filter((p) => p.featuredImage).slice(0, 8);

  useEffect(() => {
    const el = host.current;
    if (!el || items.length === 0) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

    const n = Math.max(items.length, 5);
    const R = Math.max(2.4, (n * (W + 0.55)) / (Math.PI * 2));
    const ring = new THREE.Group();
    scene.add(ring);
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const geo = new THREE.PlaneGeometry(W, H, 24, 30);
    const cards: {
      mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
      angle: number;
      lift: number;
      handle: string;
    }[] = [];

    for (let i = 0; i < n; i++) {
      const p = items[i % items.length];
      const mat = new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uAmp: { value: 1 },
          uSeed: { value: i * 1.7 },
          uMap: { value: null },
          uFade: { value: 1 },
          uHas: { value: 0 },
        },
      });
      loader.load(sized(p.featuredImage!.url), (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        mat.uniforms.uMap.value = t;
        mat.uniforms.uHas.value = 1;
      });
      const mesh = new THREE.Mesh(geo, mat);
      const angle = (i / n) * Math.PI * 2;
      mesh.position.set(Math.sin(angle) * R, 0, Math.cos(angle) * R);
      mesh.rotation.y = angle;
      ring.add(mesh);
      // a thin hanger bar above each piece
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, W * 0.92, 8).rotateZ(Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: '#b7dceb' }),
      );
      bar.position.y = H / 2 + 0.04;
      mesh.add(bar);
      cards.push({ mesh, angle, lift: 0, handle: p.handle });
    }

    // ---- interaction: drag with inertia, auto-spin when idle, tap to open ----
    let rot = 0,
      vel = 0,
      dragging = false,
      lastX = 0,
      moved = 0,
      idle = 0,
      hover = -1;
    const ray = new THREE.Raycaster(),
      ndc = new THREE.Vector2();
    const pick = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(cards.map((c) => c.mesh))[0];
      return hit ? cards.findIndex((c) => c.mesh === hit.object) : -1;
    };
    const cv = renderer.domElement;
    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      moved = 0;
      vel = 0;
    };
    const move = (e: PointerEvent) => {
      if (dragging) {
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        moved += Math.abs(dx);
        vel = dx * 0.005;
        rot += vel;
        idle = 0;
      }
      if (e.pointerType === 'mouse') {
        hover = pick(e);
        cv.style.cursor = hover >= 0 ? 'pointer' : 'grab';
      }
    };
    const up = (e: PointerEvent) => {
      if (dragging && moved < 6) {
        const i = pick(e);
        if (i >= 0) navRef.current(`/products/${cards[i].handle}`);
      }
      dragging = false;
    };
    cv.addEventListener('pointerdown', down);
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    cv.addEventListener('pointerleave', () => {
      hover = -1;
    });

    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // pull the camera back on narrow screens so the front piece fits
      const dist = R + (w / h < 0.9 ? 7.4 : 6.2);
      camera.position.set(0, 0.55, dist);
      camera.lookAt(0, -0.05, 0);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const t0 = performance.now();
    let visible = true,
      raf = 0,
      last = t0,
      frontIdx = -1;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    });
    io.observe(el);
    function tick(now: number) {
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - t0) / 1000;
      // entrance: the ring spirals in once on load
      const intro = reduced ? 1 : Math.min(1, t / 1.6),
        ease = 1 - Math.pow(1 - intro, 3);
      if (!dragging) {
        vel *= Math.pow(0.04, dt);
        idle += dt;
        rot += vel + (idle > 1.2 && !reduced ? dt * 0.12 : 0);
      }
      ring.rotation.y = rot + (1 - ease) * 2.4;
      ring.position.y = (1 - ease) * -1.2;
      ring.scale.setScalar(0.75 + ease * 0.25);
      let best = -1,
        bestZ = -1e9;
      cards.forEach((c, i) => {
        const world = c.mesh.getWorldPosition(new THREE.Vector3());
        const facing = (world.z / R + 1) / 2; // 1 = front, 0 = back
        if (world.z > bestZ) {
          bestZ = world.z;
          best = i;
        }
        c.lift += ((hover === i ? 0.12 : 0) - c.lift) * Math.min(1, dt * 8);
        c.mesh.position.y = c.lift + Math.sin(t * 0.8 + i) * 0.025;
        const u = c.mesh.material.uniforms;
        u.uTime.value = t;
        u.uAmp.value = 0.7 + Math.min(1.4, Math.abs(vel) * 40) + (hover === i ? 0.6 : 0);
        u.uFade.value = 0.22 + Math.pow(facing, 1.6) * 0.78;
      });
      if (best !== frontIdx) {
        frontIdx = best;
        setFront(best % items.length);
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      cards.forEach((c) => {
        c.mesh.material.uniforms.uMap.value?.dispose();
        c.mesh.material.dispose();
      });
      geo.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [items.map((p) => p.id).join()]); // eslint-disable-line

  const f = items[front];
  return (
    <div className="ring">
      <div className="ring-canvas" ref={host} />
      {f && (
        <div className="ring-caption" key={f.id}>
          <b>{f.title}</b>
          <span>
            <Price m={f.priceRange.minVariantPrice} />
          </span>
          <span className="ring-hint">Drag to browse, tap to open</span>
        </div>
      )}
    </div>
  );
}
