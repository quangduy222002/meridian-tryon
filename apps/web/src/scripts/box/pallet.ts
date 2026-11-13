import { BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, type Material } from 'three';

/** Euro pallet footprint and a safe stacking height, in scene units (1 unit = 10 cm). */
const PALLET = { w: 12, d: 8, deck: 1.44, maxStack: 13 };
const MAX_INSTANCES = 400;

export interface PalletPlan {
  perPallet: number;
  /** Height of the loaded pallet, deck included. */
  height: number;
  pallets: number;
  shown: number;
}

/**
 * The whole order on a pallet: one instanced mesh draws every carton in a single draw call,
 * so even a full pallet costs about the same as one box.
 */
export function createPallet(boxMaterials: Material[]) {
  const group = new Group();
  group.visible = false;
  const wood = new MeshStandardMaterial({ color: '#c9a77c', roughness: 0.85 });
  const board = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const m = new Mesh(new BoxGeometry(w, h, d), wood);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
  };
  for (const z of [-3.6, -1.2, 1.2, 3.6]) board(PALLET.w, 0.22, 0.95, 0, PALLET.deck - 0.11, z);
  for (const x of [-5.4, 0, 5.4]) {
    for (const z of [-3.5, 0, 3.5]) board(1.4, 0.78, 1.0, x, 0.61, z);
    board(1.4, 0.22, PALLET.d, x, 0.11, 0);
  }

  const unit = new BoxGeometry(1, 1, 1);
  const cartons = new InstancedMesh(unit, boxMaterials, MAX_INSTANCES);
  cartons.castShadow = cartons.receiveShadow = true;
  group.add(cartons);
  const m = new Matrix4();
  let plan: PalletPlan = { perPallet: 0, pallets: 0, shown: 0, height: PALLET.deck };

  function layout(W: number, H: number, D: number, qty: number): PalletPlan {
    const gap = 0.04;
    const nx = Math.max(1, Math.floor(PALLET.w / (W + gap)));
    const nz = Math.max(1, Math.floor(PALLET.d / (D + gap)));
    const ny = Math.max(1, Math.floor(PALLET.maxStack / (H + gap)));
    const perPallet = nx * nz * ny;
    const shown = Math.min(qty, perPallet, MAX_INSTANCES);
    const x0 = (-(nx - 1) * (W + gap)) / 2;
    const z0 = (-(nz - 1) * (D + gap)) / 2;
    for (let i = 0; i < shown; i++) {
      const layer = Math.floor(i / (nx * nz));
      const k = i % (nx * nz);
      const ix = k % nx;
      const iz = Math.floor(k / nx);
      m.makeScale(W, H, D).setPosition(
        x0 + ix * (W + gap),
        PALLET.deck + H / 2 + layer * (H + gap),
        z0 + iz * (D + gap),
      );
      cartons.setMatrixAt(i, m);
    }
    cartons.count = shown;
    cartons.instanceMatrix.needsUpdate = true;
    cartons.computeBoundingSphere();
    const layers = Math.ceil(shown / (nx * nz));
    plan = { perPallet, pallets: Math.ceil(qty / perPallet), shown, height: PALLET.deck + layers * (H + gap) };
    return plan;
  }

  return { group, layout, height: () => plan.height };
}
