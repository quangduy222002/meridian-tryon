// Cap studio: build your own Field Cap in 3D — two-tone panels, brim, stitching and
// embroidered front text — then add it to the cart with every choice attached to the line.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LIGHT_STUDIO, RenderLoop, bakeStudio, createRenderer, getQuality } from '@meridian/three-core';
import { getProduct, type Variant } from '../lib/shopify';
import { FIXTURE_PRODUCTS } from '../lib/fixtures';
import { Price, flyToCart } from '../ui';
import { useCart } from '../cart';
import { reducedMotion } from '../scroll';

const FABRIC: Record<string, string> = {
  Spruce: '#2b4a40',
  Sand: '#cdbb9a',
  Black: '#24272a',
  Navy: '#25324a',
  Glacier: '#9cc3d6',
  Clay: '#a8644a',
  Bone: '#ece6da',
};
const THREAD: Record<string, string> = {
  White: '#f4f2ec',
  Glacier: '#b7dceb',
  Gold: '#d4a64a',
  Black: '#1b1d1e',
  Clay: '#c06c4c',
};
const BASE = 38,
  EMB = 8,
  TWO_TONE = 4;

type Cfg = {
  crown: string;
  front: string;
  brim: string;
  stitch: 'Tonal' | 'Contrast';
  text: string;
  thread: string;
  style: 'Block' | 'Script';
};
const DEFAULT: Cfg = {
  crown: 'Spruce',
  front: 'Spruce',
  brim: 'Spruce',
  stitch: 'Contrast',
  text: 'HALDE',
  thread: 'Glacier',
  style: 'Block',
};
const VIEWS = { Front: [1.7, 1.6, 5.0], Side: [5.4, 0.9, 0.4], Back: [0, 1.3, -5.4], Top: [0.01, 5.4, 1.0] } as const;

// ---------- the 3D cap ----------
function buildCap() {
  const g = new THREE.Group();
  const fabricTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d')!;
    x.fillStyle = '#808080';
    x.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 3) {
      x.fillStyle = y % 6 ? '#8a8a8a' : '#767676';
      x.fillRect(0, y, 256, 1);
    } // twill lines
    for (let i = 0; i < 3000; i++) {
      x.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
      x.fillRect(Math.random() * 256, Math.random() * 256, 2, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
    t.rotation = 0.6;
    return t;
  })();
  const fabric = (hex: string) =>
    new THREE.MeshStandardMaterial({
      color: hex,
      roughness: 0.92,
      bumpMap: fabricTex,
      bumpScale: 0.6,
      side: THREE.DoubleSide,
    });

  // six crown panels; panels 0 and 5 sit either side of the front centre seam
  const panels: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const geo = new THREE.SphereGeometry(1, 20, 18, Math.PI / 2 + (i - 3) * (Math.PI / 3), Math.PI / 3, 0, Math.PI / 2);
    const m = new THREE.Mesh(geo, fabric(FABRIC.Spruce));
    m.castShadow = true;
    panels.push(m);
    g.add(m);
  }
  // seams along each panel edge (stitching)
  const stitchMat = new THREE.MeshStandardMaterial({ color: THREAD.Glacier, roughness: 0.7 });
  for (let i = 0; i < 6; i++) {
    const phi = Math.PI / 2 + (i - 3) * (Math.PI / 3);
    const pts = Array.from({ length: 24 }, (_, k) => {
      const th = (k / 23) * (Math.PI / 2);
      return new THREE.Vector3(
        -Math.cos(phi) * Math.sin(th) * 1.004,
        Math.cos(th) * 1.004,
        Math.sin(phi) * Math.sin(th) * 1.004,
      );
    });
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.007, 5), stitchMat));
  }
  // top button and eyelets
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 12).scale(1, 0.45, 1), fabric(FABRIC.Spruce));
  button.position.y = 1.0;
  g.add(button);
  const eyeletMat = new THREE.MeshStandardMaterial({ color: THREAD.Glacier, roughness: 0.6 });
  for (const i of [0, 1, 2, 3, 4, 5]) {
    const phi = Math.PI / 2 + (i - 3) * (Math.PI / 3) + Math.PI / 6,
      th = 0.62;
    const e = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.009, 8, 20), eyeletMat);
    const n = new THREE.Vector3(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th));
    e.position.copy(n.clone().multiplyScalar(1.003));
    e.lookAt(n.clone().multiplyScalar(2));
    g.add(e);
  }
  // sweatband edge
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.025, 8, 80).rotateX(Math.PI / 2), fabric(FABRIC.Spruce));
  band.position.y = 0.01;
  g.add(band);

  // baseball bill: inner edge follows the crown, outer edge is a forward ellipse; sides curve down
  const brimPoint = (u: number, v: number, yOff = 0) => {
    const th = u * 1.05;
    const ix = Math.sin(th) * 0.995,
      iz = Math.cos(th) * 0.995;
    const ox = Math.sin((u * Math.PI) / 2) * 0.88,
      oz = 0.6 + Math.cos((u * Math.PI) / 2) * 1.08;
    const x = ix + (ox - ix) * v,
      z = iz + (oz - iz) * v;
    const y = -0.015 - v * 0.05 - u * u * v * 0.09 + yOff;
    return new THREE.Vector3(x, y, z);
  };
  const brimGeo = (yOff: number) => {
    const geo = new THREE.PlaneGeometry(1, 1, 48, 10),
      p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const q = brimPoint(p.getX(k) * 2, p.getY(k) + 0.5, yOff);
      p.setXYZ(k, q.x, q.y, q.z);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const brim = new THREE.Mesh(brimGeo(0.014), fabric(FABRIC.Spruce));
  brim.castShadow = true;
  const under = new THREE.Mesh(
    brimGeo(-0.014),
    new THREE.MeshStandardMaterial({ color: '#3c4a44', roughness: 0.95, side: THREE.DoubleSide }),
  );
  g.add(brim, under);
  // rows of stitching that follow the bill's outline
  for (const f of [0.45, 0.62, 0.79, 0.93]) {
    const pts = Array.from({ length: 48 }, (_, k) => brimPoint((k / 47) * 1.9 - 0.95, f, 0.019));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.006, 4), stitchMat));
  }

  // embroidery: canvas texture on a sphere patch over the two front panels
  const embCv = document.createElement('canvas');
  embCv.width = 1024;
  embCv.height = 384;
  const embTex = new THREE.CanvasTexture(embCv);
  embTex.colorSpace = THREE.SRGBColorSpace;
  embTex.anisotropy = 8;
  const embMat = new THREE.MeshStandardMaterial({
    map: embTex,
    transparent: true,
    roughness: 0.55,
    bumpMap: embTex,
    bumpScale: 1.5,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const emb = new THREE.Mesh(new THREE.SphereGeometry(1.006, 48, 24, Math.PI / 2 - 0.85, 1.7, 0.62, 0.62), embMat);
  g.add(emb);

  // shape the crown like a real cap: taller and fuller at the front, sloping down to the back
  const deform = (v: THREE.Vector3) => v.set(v.x, v.y * (0.8 + 0.16 * Math.max(v.z, 0)), v.z * 1.04 + 0.07 * v.y);
  const tmp = new THREE.Vector3();
  g.children.forEach((m) => {
    if (!(m instanceof THREE.Mesh)) return;
    if (m === button || (m.geometry instanceof THREE.TorusGeometry && m !== band)) {
      deform(m.position);
      return;
    }
    const pos = m.geometry.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      deform(tmp.fromBufferAttribute(pos, k));
      pos.setXYZ(k, tmp.x, tmp.y, tmp.z);
    }
    m.geometry.computeVertexNormals();
  });

  return { g, panels, button, band, brim, stitchMat, eyeletMat, embCv, embTex };
}

function drawEmbroidery(cv: HTMLCanvasElement, text: string, thread: string, style: Cfg['style']) {
  const x = cv.getContext('2d')!;
  x.clearRect(0, 0, cv.width, cv.height);
  if (!text.trim()) return;
  const font = style === 'Script' ? 'italic 700 150px Georgia, serif' : '900 170px Archivo, Arial Black, sans-serif';
  x.font = font;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  let size = style === 'Script' ? 150 : 170;
  while (x.measureText(text).width > cv.width * 0.86 && size > 40) {
    size -= 6;
    x.font = font.replace(/\d+px/, size + 'px');
  }
  const cy = cv.height / 2;
  x.lineJoin = 'round';
  x.strokeStyle = 'rgba(0,0,0,.35)';
  x.lineWidth = 10;
  x.strokeText(text, cv.width / 2, cy + 4); // raised thread shadow
  x.fillStyle = THREAD[thread];
  x.fillText(text, cv.width / 2, cy);
  // satin-stitch sheen: fine diagonal lines clipped to the letters
  x.globalCompositeOperation = 'source-atop';
  x.strokeStyle = 'rgba(255,255,255,.18)';
  x.lineWidth = 2;
  for (let i = -cv.height; i < cv.width; i += 7) {
    x.beginPath();
    x.moveTo(i, cv.height);
    x.lineTo(i + cv.height, 0);
    x.stroke();
  }
  x.globalCompositeOperation = 'source-over';
}

export default function Customize() {
  const [params, setParams] = useSearchParams();
  const [cfg, setCfg] = useState<Cfg>(
    () => ({ ...DEFAULT, ...Object.fromEntries([...params.entries()].filter(([k]) => k in DEFAULT)) }) as Cfg,
  );
  const [view, setView] = useState<keyof typeof VIEWS>('Front');
  const [variant, setVariant] = useState<Variant | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ apply: (c: Cfg) => void; fly: (v: keyof typeof VIEWS) => void; snap: () => string } | null>(
    null,
  );
  const stageRef = useRef<HTMLDivElement>(null);
  const { add, busy } = useCart();

  useEffect(() => {
    getProduct('field-cap').then((p) =>
      setVariant((p ?? FIXTURE_PRODUCTS.find((f) => f.handle === 'field-cap')!).variants.nodes[0]),
    );
  }, []);

  // ---------- three.js scene (built once) ----------
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const quality = getQuality();
    const canvas = document.createElement('canvas');
    el.appendChild(canvas);
    const renderer = createRenderer(canvas, quality, { shadows: true, exposure: 1.05 });
    // The cap only moves during its entrance; after that its shadow is reused instead of re-rendered.
    renderer.shadowMap.autoUpdate = false;
    const scene = new THREE.Scene();
    scene.environment = bakeStudio(renderer, LIGHT_STUDIO, '#dfe6e3');
    scene.environmentIntensity = 0.7;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(...VIEWS.Front);
    const key = new THREE.DirectionalLight('#ffffff', 2.2);
    key.position.set(2.5, 4, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
    Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2 });
    scene.add(key);
    scene.add(new THREE.HemisphereLight('#eef6f8', '#3a4a44', 0.6));
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8).rotateX(-Math.PI / 2),
      new THREE.ShadowMaterial({ opacity: 0.16 }),
    );
    ground.position.y = -0.36;
    ground.receiveShadow = true;
    scene.add(ground);

    const cap = buildCap();
    cap.g.position.y = -0.2;
    scene.add(cap.g);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 3.2;
    controls.maxDistance = 8;
    controls.target.set(0, 0.05, 0.25);
    controls.maxPolarAngle = Math.PI * 0.62;
    controls.autoRotate = !reducedMotion();
    controls.autoRotateSpeed = 1.2;
    let touched = false;
    controls.addEventListener('start', () => {
      touched = true;
      controls.autoRotate = false;
      flight = null;
    });

    // colour changes ease over ~0.4s instead of snapping
    const targets = new Map<THREE.Material & { color: THREE.Color }, THREE.Color>();
    const tint = (m: THREE.Material & { color: THREE.Color }, hex: string) => targets.set(m, new THREE.Color(hex));
    const panelsFront = [cap.panels[2], cap.panels[3]]; // the two panels either side of +z
    api.current = {
      apply: (c) => {
        cap.panels.forEach((p) =>
          tint(p.material as THREE.MeshStandardMaterial, FABRIC[panelsFront.includes(p) ? c.front : c.crown]),
        );
        tint(cap.button.material as THREE.MeshStandardMaterial, FABRIC[c.crown]);
        tint(cap.band.material as THREE.MeshStandardMaterial, FABRIC[c.crown]);
        tint(cap.brim.material as THREE.MeshStandardMaterial, FABRIC[c.brim]);
        const thread = c.stitch === 'Tonal' ? FABRIC[c.crown] : THREAD[c.thread];
        tint(
          cap.stitchMat,
          '#' + new THREE.Color(thread).offsetHSL(0, 0, c.stitch === 'Tonal' ? -0.08 : 0).getHexString(),
        );
        tint(cap.eyeletMat, thread);
        drawEmbroidery(cap.embCv, c.text, c.thread, c.style);
        cap.embTex.needsUpdate = true;
        loop.invalidate();
      },
      fly: (v) => {
        flight = { from: camera.position.clone(), to: new THREE.Vector3(...VIEWS[v]), t: 0 };
        controls.autoRotate = false;
        loop.invalidate();
      },
      snap: () => {
        const c = document.createElement('canvas');
        c.width = c.height = 480;
        const x = c.getContext('2d')!;
        renderer.render(scene, camera); // draw now: the buffer is not preserved between frames
        const src = renderer.domElement,
          side = Math.min(src.width, src.height);
        x.fillStyle = '#eef2f0';
        x.fillRect(0, 0, 480, 480);
        x.drawImage(src, (src.width - side) / 2, (src.height - side) / 2, side, side, 0, 0, 480, 480);
        return c.toDataURL('image/jpeg', 0.85);
      },
    };
    let flight: { from: THREE.Vector3; to: THREE.Vector3; t: number } | null = null;
    let requestRender = () => {};

    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w / h < 0.9 ? 38 : 30;
      camera.updateProjectionMatrix();
      requestRender(); // resizing clears the canvas
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    const t0 = performance.now();
    // Render on demand: draw only while colours ease, the camera flies, the cap lands or the view turns.
    const tick = (dt: number) => {
      const now = performance.now();
      targets.forEach((to, m) => {
        m.color.lerp(to, Math.min(1, dt * 9));
        if (m.color.equals(to)) targets.delete(m);
      });
      if (flight) {
        flight.t = Math.min(1, flight.t + dt * 1.6);
        const e = 1 - Math.pow(1 - flight.t, 3);
        // swing around the cap rather than cutting through it
        const a = Math.atan2(flight.from.x, flight.from.z),
          b = Math.atan2(flight.to.x, flight.to.z);
        let d = b - a;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        const r = THREE.MathUtils.lerp(
          Math.hypot(flight.from.x, flight.from.z),
          Math.hypot(flight.to.x, flight.to.z),
          e,
        );
        camera.position.set(
          Math.sin(a + d * e) * r,
          THREE.MathUtils.lerp(flight.from.y, flight.to.y, e),
          Math.cos(a + d * e) * r,
        );
        if (flight.t >= 1) flight = null;
      }
      // entrance: the cap drops onto the table once
      const intro = reducedMotion() ? 1 : Math.min(1, (now - t0) / 900),
        bounce = 1 - Math.pow(1 - intro, 3);
      cap.g.position.y = -0.2 + (1 - bounce) * 1.4;
      cap.g.rotation.y = (1 - bounce) * -1.2;
      if (intro < 1 || now - t0 < 1200) renderer.shadowMap.needsUpdate = true;
      if (!touched && !flight) controls.autoRotate = !reducedMotion();
      const moving = controls.update(dt);
      renderer.render(scene, camera);
      return moving || !!flight || targets.size > 0 || intro < 1 || controls.autoRotate;
    };
    const loop = new RenderLoop(tick, { target: el, demand: true });
    controls.addEventListener('change', () => loop.invalidate());
    requestRender = () => loop.invalidate();
    loop.start();
    return () => {
      loop.stop();
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      el.removeChild(canvas);
      api.current = null;
    };
  }, []);

  // push every change into the scene and the shareable URL
  useEffect(() => {
    api.current?.apply(cfg);
    const t = setTimeout(
      () =>
        setParams(
          Object.fromEntries(Object.entries(cfg).filter(([k, v]) => DEFAULT[k as keyof Cfg] !== v)) as Record<
            string,
            string
          >,
          { replace: true },
        ),
      300,
    );
    return () => clearTimeout(t);
  }, [cfg]); // eslint-disable-line
  useEffect(() => {
    api.current?.fly(view);
  }, [view]);

  const twoTone = cfg.front !== cfg.crown || cfg.brim !== cfg.crown;
  const total = BASE + (cfg.text.trim() ? EMB : 0) + (twoTone ? TWO_TONE : 0);
  const set = <K extends keyof Cfg>(k: K, v: Cfg[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const summary = useMemo(
    () => [
      { key: 'Crown', value: cfg.crown },
      { key: 'Front', value: cfg.front },
      { key: 'Brim', value: cfg.brim },
      { key: 'Stitching', value: cfg.stitch },
      ...(cfg.text.trim() ? [{ key: 'Embroidery', value: `"${cfg.text.trim()}" in ${cfg.thread}, ${cfg.style}` }] : []),
    ],
    [cfg],
  );

  const addToCart = () => {
    if (!variant) return;
    flyToCart(stageRef.current);
    const shot = api.current?.snap();
    add(
      {
        ...variant,
        title: 'Made to order',
        image: shot ? { url: shot, altText: 'Your custom Field Cap', width: 480, height: 480 } : variant.image,
      },
      { title: 'Custom Field Cap', handle: 'field-cap' },
      1,
      { attributes: summary, price: { amount: total.toFixed(2), currencyCode: variant.price.currencyCode } },
    );
  };

  const Swatches = ({ k, palette }: { k: 'crown' | 'front' | 'brim' | 'thread'; palette: Record<string, string> }) => (
    <div className="opt-vals colors">
      {Object.entries(palette).map(([name, hex]) => (
        <button
          key={name}
          className={'opt-color' + (cfg[k] === name ? ' on' : '')}
          aria-label={name}
          title={name}
          aria-pressed={cfg[k] === name}
          onClick={() => set(k, name)}
        >
          <span style={{ background: hex }} />
        </button>
      ))}
    </div>
  );

  return (
    <main className="studio">
      <div className="studio-stage" ref={stageRef}>
        <div className="studio-canvas" ref={host} />
        <div className="views" role="group" aria-label="Camera view">
          {(Object.keys(VIEWS) as (keyof typeof VIEWS)[]).map((v) => (
            <button
              key={v}
              className={view === v ? 'on' : ''}
              onClick={() => {
                setView(v);
                api.current?.fly(v);
              }}
            >
              {v}
            </button>
          ))}
        </div>
        <p className="studio-hint small">Drag to turn the cap. Pinch or scroll to zoom.</p>
      </div>

      <aside className="studio-panel">
        <nav className="crumbs small">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/products/field-cap">Field Cap</Link>
        </nav>
        <h1 className="pdp-title">Build your cap</h1>
        <p className="muted">Six-panel washed twill, made to order in two weeks.</p>

        <fieldset className="opt">
          <legend>
            Crown <b>{cfg.crown}</b>
          </legend>
          <Swatches k="crown" palette={FABRIC} />
        </fieldset>
        <fieldset className="opt">
          <legend>
            Front panels <b>{cfg.front}</b>
          </legend>
          <Swatches k="front" palette={FABRIC} />
        </fieldset>
        <fieldset className="opt">
          <legend>
            Brim <b>{cfg.brim}</b>
          </legend>
          <Swatches k="brim" palette={FABRIC} />
        </fieldset>
        <fieldset className="opt">
          <legend>
            Stitching <b>{cfg.stitch}</b>
          </legend>
          <div className="opt-vals">
            {(['Tonal', 'Contrast'] as const).map((s) => (
              <button key={s} className={'opt-btn' + (cfg.stitch === s ? ' on' : '')} onClick={() => set('stitch', s)}>
                {s}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="opt emb">
          <legend>
            Front embroidery <b>{cfg.text.trim() ? `+$${EMB}` : 'None'}</b>
          </legend>
          <input
            className="emb-input"
            value={cfg.text}
            maxLength={12}
            placeholder="Up to 12 letters"
            onChange={(e) => set('text', e.target.value.toUpperCase().replace(/[^A-Z0-9 &.\-']/g, ''))}
            onFocus={() => setView('Front')}
            aria-label="Embroidery text"
          />
          <div className="emb-row">
            <div className="opt-vals">
              {(['Block', 'Script'] as const).map((s) => (
                <button key={s} className={'opt-btn' + (cfg.style === s ? ' on' : '')} onClick={() => set('style', s)}>
                  {s}
                </button>
              ))}
            </div>
            <Swatches k="thread" palette={THREAD} />
          </div>
        </fieldset>

        <div className="studio-total">
          <div className="row">
            <span>Field Cap</span>
            <span>${BASE}</span>
          </div>
          {twoTone && (
            <div className="row">
              <span>Two-tone panels</span>
              <span>+${TWO_TONE}</span>
            </div>
          )}
          {cfg.text.trim() && (
            <div className="row">
              <span>Embroidery</span>
              <span>+${EMB}</span>
            </div>
          )}
          <div className="row big">
            <span>Total</span>
            <b>
              {variant ? (
                <Price m={{ amount: total.toFixed(2), currencyCode: variant.price.currencyCode }} />
              ) : (
                `$${total}`
              )}
            </b>
          </div>
        </div>
        <button className="btn full" onClick={addToCart} disabled={!variant || busy}>
          {busy ? 'Adding…' : 'Add custom cap to cart'}
        </button>
        <button className="text-btn reset" onClick={() => setCfg(DEFAULT)}>
          Start over
        </button>
      </aside>
    </main>
  );
}
