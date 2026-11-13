import {
  CircleGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  ShadowMaterial,
  type Texture,
} from 'three';
import type { ChairTexture } from './textures';

/**
 * Two settings for the chair: a seamless studio sweep, and a small living-room corner that shows it in context.
 * Both are static, so their shadows are rendered once and refreshed only when the chair changes.
 */
export function buildBackdrops(tex: Record<ChairTexture, Texture>) {
  /* ---------- Studio: shadow catcher + soft contact shadow ---------- */
  const studio = new Group();
  const catcher = new Mesh(new PlaneGeometry(14, 14), new ShadowMaterial({ opacity: 0.16 }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.receiveShadow = true;
  studio.add(catcher);

  /* ---------- Room: oak floor, plaster wall, rug, side table ---------- */
  const room = new Group();
  room.visible = false;
  const floor = new Mesh(new PlaneGeometry(8, 8), new MeshStandardMaterial({ map: tex.floor, roughness: 0.62 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);
  const wall = new Mesh(new PlaneGeometry(8, 3.2), new MeshStandardMaterial({ color: '#e6ddd0', roughness: 0.95 }));
  wall.position.set(0, 1.6, -1.3);
  wall.receiveShadow = true;
  room.add(wall);
  const skirting = new Mesh(new PlaneGeometry(8, 0.08), new MeshStandardMaterial({ color: '#f1ebe2', roughness: 0.7 }));
  skirting.position.set(0, 0.04, -1.295);
  room.add(skirting);
  const rug = new Mesh(new CircleGeometry(1.1, 64), new MeshStandardMaterial({ color: '#cbbfa9', roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.004;
  rug.scale.set(1.25, 1, 1);
  rug.receiveShadow = true;
  room.add(rug);
  const tableMat = new MeshStandardMaterial({ color: '#b48d62', roughness: 0.55 });
  const table = new Group();
  table.position.set(0.95, 0, -0.75);
  table.scale.setScalar(0.85);
  room.add(table);
  for (const [geo, y] of [
    [new CylinderGeometry(0.24, 0.24, 0.025, 48), 0.52],
    [new CylinderGeometry(0.018, 0.018, 0.5, 16), 0.26],
    [new CylinderGeometry(0.16, 0.16, 0.015, 48), 0.008],
  ] as const) {
    const part = new Mesh(geo, tableMat);
    part.position.y = y;
    part.castShadow = part.receiveShadow = true;
    table.add(part);
  }

  /* ---------- Contact shadow shared by both: grounds the chair even where the key light misses ---------- */
  const contact = new Mesh(
    new PlaneGeometry(1.5, 1.4),
    new MeshBasicMaterial({
      color: '#000000',
      alphaMap: tex.contact,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.006;

  return {
    studio,
    room,
    contact,
    backgrounds: { studio: new Color('#efeae2'), room: new Color('#e6ddd0') },
  };
}
