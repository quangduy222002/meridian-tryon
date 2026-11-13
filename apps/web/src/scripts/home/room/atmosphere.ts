import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';

function gradientCanvas(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d')!);
  return c;
}

/** Soft dark blob under the room so it sits on the page instead of floating. */
export function createFloorShadow() {
  const tex = new CanvasTexture(
    gradientCanvas(256, 256, (g) => {
      const rg = g.createRadialGradient(128, 128, 10, 128, 128, 128);
      rg.addColorStop(0, 'rgba(0,0,0,.55)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, 256, 256);
    }),
  );
  const blob = new Mesh(
    new PlaneGeometry(13, 13),
    new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = -0.26;
  return blob;
}

/** Two additive light shafts falling from the window. */
export function createLightShafts(half: number) {
  const tex = new CanvasTexture(
    gradientCanvas(64, 256, (g) => {
      const lg = g.createLinearGradient(0, 0, 0, 256);
      lg.addColorStop(0, 'rgba(255,214,160,.55)');
      lg.addColorStop(1, 'rgba(255,214,160,0)');
      g.fillStyle = lg;
      g.fillRect(0, 0, 64, 256);
    }),
  );
  tex.colorSpace = SRGBColorSpace;
  const material = new MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.22,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
  });
  const group = new Group();
  const geo = new PlaneGeometry(0.55, 3.4);
  for (const x of [1.75, 2.35]) {
    const shaft = new Mesh(geo, material);
    shaft.position.set(x - 0.35, 1.05, -half + 1.25);
    shaft.rotation.set(-0.62, 0.3, 0);
    group.add(shaft);
  }
  return group;
}
