/**
 * Ready-made furniture models, all CC0, shipped under /models and loaded the first time one is placed: Poly Haven's
 * scanned pieces (glTF, `ph:`), Kenney's Furniture Kit (GLB, `k:`) and Quaternius' Ultimate House Interior (OBJ + MTL,
 * `q:`); the last two come from scripts/import-packs.mjs (library-packs.json). Each joins the catalogue as `ph:<id>` beside the pieces built in code, so the 2D plan, the
 * AI's catalogue and the inspector treat it like any other piece; the 3D view swaps a placeholder for the model once
 * it has loaded. Sizes are the models' own (measured from their glTF), in metres.
 */
import type { FurnitureDef } from './catalog';
import packs from './library-packs.json';

export interface LibraryModel {
  /** Path under models/, relative to the site root. */
  src: string;
  def: Omit<FurnitureDef, 'colors' | 'role'> & Partial<Pick<FurnitureDef, 'colors' | 'role'>>;
  /** Degrees to turn the model so its front faces +z (the catalogue's convention). */
  turn?: number;
  /** Factor that brings the file to real size (packs model at their own scale). */
  scale?: number;
  credit: string;
}

const PH = 'Poly Haven (CC0)';
const ph = (id: string, def: LibraryModel['def'], turn = 0): LibraryModel => ({
  src: `ph/${id}/${id}_1k.gltf`,
  def,
  turn,
  credit: PH,
});

const POLY_HAVEN: Record<string, LibraryModel> = {
  'ph:Sofa_01': ph('Sofa_01', {
    name: 'Fabric sofa, tufted',
    w: 1.57,
    d: 0.66,
    h: 0.8,
    room: 'Living',
    group: 'Sofas',
  }),
  'ph:sofa_02': ph('sofa_02', { name: 'Sofa, modern low', w: 1.81, d: 0.82, h: 0.71, room: 'Living', group: 'Sofas' }),
  'ph:ArmChair_01': ph('ArmChair_01', {
    name: 'Armchair, classic',
    w: 0.85,
    d: 0.77,
    h: 1.06,
    room: 'Living',
    group: 'Armchairs',
  }),
  'ph:modern_arm_chair_01': ph('modern_arm_chair_01', {
    name: 'Armchair, modern',
    w: 0.82,
    d: 0.99,
    h: 1.02,
    room: 'Living',
    group: 'Armchairs',
  }),
  'ph:mid_century_lounge_chair': ph('mid_century_lounge_chair', {
    name: 'Lounge chair, mid-century',
    w: 1.01,
    d: 1.19,
    h: 1.17,
    room: 'Living',
    group: 'Armchairs',
  }),
  'ph:Ottoman_01': ph('Ottoman_01', { name: 'Ottoman, upholstered', w: 0.89, d: 0.62, h: 0.62, group: 'Armchairs' }),
  'ph:CoffeeTable_01': ph('CoffeeTable_01', {
    name: 'Coffee table, timber',
    w: 1.54,
    d: 0.97,
    h: 0.52,
    room: 'Living',
    group: 'Coffee tables',
  }),
  'ph:modern_coffee_table_01': ph('modern_coffee_table_01', {
    name: 'Coffee table, slim modern',
    w: 0.6,
    d: 1.2,
    h: 0.39,
    room: 'Living',
    group: 'Coffee tables',
  }),
  'ph:coffee_table_round_01': ph('coffee_table_round_01', {
    name: 'Coffee table, round marble',
    w: 1.3,
    d: 1.3,
    h: 0.49,
    room: 'Living',
    group: 'Coffee tables',
  }),
  'ph:side_table_01': ph('side_table_01', {
    name: 'Side table, timber',
    w: 0.55,
    d: 0.45,
    h: 0.55,
    group: 'Coffee tables',
  }),
  'ph:dining_table': ph('dining_table', {
    name: 'Dining table, 6–8 seats',
    w: 2.26,
    d: 1.39,
    h: 0.88,
    room: 'Dining',
    group: 'Dining',
  }),
  'ph:dining_chair_02': ph('dining_chair_02', {
    name: 'Dining chair',
    w: 0.43,
    d: 0.58,
    h: 0.97,
    room: 'Dining',
    group: 'Dining',
  }),
  'ph:ClassicNightstand_01': ph('ClassicNightstand_01', {
    name: 'Nightstand, classic',
    w: 0.57,
    d: 0.42,
    h: 0.7,
    room: 'Bedroom',
    group: 'Beds',
  }),
  'ph:drawer_cabinet': ph('drawer_cabinet', {
    name: 'Tall chest of drawers',
    w: 1.14,
    d: 0.49,
    h: 1.88,
    group: 'Storage',
  }),
  'ph:modern_wooden_cabinet': ph('modern_wooden_cabinet', {
    name: 'Low cabinet / TV unit, timber',
    w: 2.44,
    d: 0.52,
    h: 0.68,
    room: 'Living',
    group: 'Storage',
  }),
  // Modelled at the wrong scale in its file: fitted to a real shelf's size on load.
  'ph:steel_frame_shelves_01': ph('steel_frame_shelves_01', {
    name: 'Steel frame shelving',
    w: 1.0,
    d: 0.46,
    h: 1.95,
    group: 'Storage',
  }),
};

export const LIBRARY: Record<string, LibraryModel> = {
  ...POLY_HAVEN,
  ...(packs as Record<string, LibraryModel>),
};

/** The library as catalogue entries: textured models keep their own colours, so styles leave them as they are. */
export function libraryDefs(): Record<string, FurnitureDef> {
  return Object.fromEntries(
    Object.entries(LIBRARY).map(([type, m]) => [type, { colors: ['#ffffff'], role: 'fixed', ...m.def }]),
  );
}

/** The Artifact build serves files beside the page and gathers each pack into one bundle (scripts/artifact.mjs). */
export const inArtifact = () => import.meta.env.BASE_URL === '/' || import.meta.env.BASE_URL === './';

const bundles = new Map<string, Promise<Record<string, string>>>();
/**
 * In the Artifact, a pack's file (kenney/…glb, quaternius/…obj or .mtl) as text from the pack's bundle (a GLB as
 * glTF JSON); null where files are served one by one.
 */
export async function bundled(src: string): Promise<string | null> {
  const pack = src.split('/')[0]!;
  if (!inArtifact() || pack === 'ph') return null;
  let b = bundles.get(pack);
  if (!b) {
    b = fetch(new URL(`models/${pack}.json`, location.href.replace(/[^/]*$/, '')).href).then((r) => {
      if (!r.ok) throw new Error(`models/${pack}.json: ${r.status}`);
      return r.json() as Promise<Record<string, string>>;
    });
    bundles.set(pack, b);
  }
  const text = (await b)[src];
  if (text === undefined) throw new Error(`${src} is not in models/${pack}.json`);
  return text;
}

/** Where the models are served: beside the page in the Artifact build, under the site's base path otherwise. */
export function modelUrl(src: string) {
  const base = import.meta.env.BASE_URL;
  // The Artifact build packs each model as one .json (scripts/artifact.mjs): it serves no .gltf or .bin files.
  if (inArtifact())
    return new URL(`models/${src.replace(/\.gltf$/, '.json')}`, location.href.replace(/[^/]*$/, '')).href;
  return `${base.replace(/\/$/, '')}/models/${src}`;
}
