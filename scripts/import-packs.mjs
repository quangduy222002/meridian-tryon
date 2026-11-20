/**
 * Imports the CC0 furniture packs into the planner's library:
 *   node scripts/import-packs.mjs <Kenney "Models/GLTF format" folder> <Quaternius "OBJ" folder>
 * Copies the models under apps/web/public/models/{kenney,quaternius}/ and writes
 * apps/web/src/scripts/room/library-packs.json: one catalogue entry per piece, with its group (by name), its size in
 * metres (each pack's models are at their own scale: Kenney's about half size, Quaternius' about double) and the
 * scale that brings it to real size. Architecture (walls, floors, doors, windows, columns) and tableware are left out.
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Box3, Matrix4, Quaternion, Vector3 } from 'three';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [kenneyDir, quatDir] = process.argv.slice(2);
if (!kenneyDir || !quatDir)
  throw new Error('Usage: node scripts/import-packs.mjs <kenney glb folder> <quaternius obj folder>');

const SKIP =
  /^(wall|floor|doorway|paneling|stairs|computer|laptop|speaker|radio|toaster|kitchenBlender|kitchenCoffeeMachine|books|bear|cardboard|pillow|televisionAntenna|Door_|Window_|Column_|Fork|Knife|Spoon|Plate_|Bathroom_ToiletPaper|Bathroom_Towel)/;

/** Catalogue group, room hint and mount of a piece, from its name. */
function classify(name) {
  const n = name.toLowerCase();
  const pick = (group, room, mount) => ({ group, ...(room ? { room } : {}), ...(mount ? { mount } : {}) });
  if (/ceiling|chandelier|ceilingfan/.test(n)) return pick('Lighting', null, 'ceiling');
  if (/lampwall/.test(n)) return pick('Lighting', null, 'wall');
  if (/lamp|light/.test(n)) return pick('Lighting');
  if (/sofa|couch/.test(n)) return pick('Sofas', 'Living');
  if (/loungechair|loungedesignchair|chairrounded/.test(n)) return pick('Armchairs', 'Living');
  if (/chairdesk/.test(n)) return pick('Desks', 'Study');
  if (/desk/.test(n)) return pick('Desks', 'Study');
  if (/bench/.test(n)) return pick('Benches');
  if (/tablecoffee|sidetable/.test(n)) return pick('Coffee tables', 'Living');
  if (/chair|stool|table/.test(n)) return pick('Dining', 'Dining');
  if (/bed|nightstand/.test(n)) return pick('Beds', 'Bedroom');
  if (/bookcase|bookshelf|shelf|drawer|cabinettelevision|coatrack/.test(n)) return pick('Storage');
  if (/bathroom|bathtub|shower|toilet|washer|dryer|washingmachine/.test(n)) return pick('Bathroom', 'Bathroom');
  if (/kitchen|hood/.test(n)) return pick('Kitchen', 'Kitchen');
  if (/rug|carpet/.test(n)) return pick('Rugs');
  if (/plant/.test(n)) return pick('Plants');
  if (/television/.test(n)) return pick('Decor', 'Living');
  return pick('Decor');
}

/** "loungeSofaCorner" / "Couch_Large1" → "Lounge sofa corner" / "Couch large 1". */
const human = (name) =>
  name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());

/** Bounding box size of a GLB: POSITION min/max of each mesh under its full node transforms. */
function glbSize(file) {
  const buf = readFileSync(file);
  const len = buf.readUInt32LE(12);
  const g = JSON.parse(buf.subarray(20, 20 + len).toString());
  const box = new Box3();
  const walk = (ni, parent) => {
    const n = g.nodes[ni];
    const m = new Matrix4();
    if (n.matrix) m.fromArray(n.matrix);
    else
      m.compose(
        new Vector3(...(n.translation ?? [0, 0, 0])),
        new Quaternion(...(n.rotation ?? [0, 0, 0, 1])),
        new Vector3(...(n.scale ?? [1, 1, 1])),
      );
    const world = parent.clone().multiply(m);
    if (n.mesh !== undefined)
      for (const p of g.meshes[n.mesh].primitives) {
        const a = g.accessors[p.attributes.POSITION];
        box.union(new Box3(new Vector3(...a.min), new Vector3(...a.max)).applyMatrix4(world));
      }
    for (const c of n.children ?? []) walk(c, world);
  };
  for (const ni of g.scenes[g.scene ?? 0].nodes) walk(ni, new Matrix4());
  return box.getSize(new Vector3()).toArray();
}

function objSize(file) {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const l of readFileSync(file, 'utf8').split('\n'))
    if (l.startsWith('v ')) {
      const v = l.trim().split(/\s+/).slice(1, 4).map(Number);
      for (let i = 0; i < 3; i++) {
        lo[i] = Math.min(lo[i], v[i]);
        hi[i] = Math.max(hi[i], v[i]);
      }
    }
  return hi.map((v, i) => v - lo[i]);
}

const entries = {};
const add = (type, src, name, size, scale, credit) => {
  const [w, h, d] = size.map((v) => Math.round(v * scale * 100) / 100);
  entries[type] = {
    src,
    scale,
    credit,
    def: { name, w: Math.max(0.05, w), d: Math.max(0.02, d), h: Math.max(0.02, h), ...classify(name) },
  };
};

const kOut = join(root, 'apps/web/public/models/kenney');
mkdirSync(kOut, { recursive: true });
for (const f of readdirSync(kenneyDir)
  .filter((f) => f.endsWith('.glb'))
  .sort()) {
  const id = f.replace(/\.glb$/, '');
  if (SKIP.test(id)) continue;
  copyFileSync(join(kenneyDir, f), join(kOut, f));
  add(`k:${id}`, `kenney/${f}`, human(id), glbSize(join(kenneyDir, f)), 1.9, 'Kenney Furniture Kit (CC0)');
}

const qOut = join(root, 'apps/web/public/models/quaternius');
mkdirSync(qOut, { recursive: true });
for (const f of readdirSync(quatDir)
  .filter((f) => f.endsWith('.obj'))
  .sort()) {
  const id = f.replace(/\.obj$/, '');
  if (SKIP.test(id)) continue;
  copyFileSync(join(quatDir, f), join(qOut, f));
  copyFileSync(join(quatDir, `${id}.mtl`), join(qOut, `${id}.mtl`));
  add(
    `q:${id}`,
    `quaternius/${f}`,
    human(id),
    objSize(join(quatDir, f)),
    0.5,
    'Quaternius Ultimate House Interior (CC0)',
  );
}

writeFileSync(join(root, 'apps/web/src/scripts/room/library-packs.json'), `${JSON.stringify(entries, null, 1)}\n`);
writeFileSync(
  join(root, 'apps/web/public/models/LICENSES.md'),
  `# Furniture models

All models here are public domain (CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/):

- \`ph/\`: Poly Haven, https://polyhaven.com/models
- \`kenney/\`: Kenney Furniture Kit, https://kenney.nl/assets/furniture-kit
- \`quaternius/\`: Quaternius Ultimate House Interior Pack, https://quaternius.com/packs/ultimatehomeinterior.html
`,
);
console.log(`${Object.keys(entries).length} pieces imported`);
