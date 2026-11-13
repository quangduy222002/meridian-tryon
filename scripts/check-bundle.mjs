// Performance budget for the built site: fails CI when a bundle grows past its limit.
// Sizes are gzip, which is what GitHub Pages serves.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'apps/web/dist';
const KB = 1024;
const budgets = [
  { name: 'three.js (shared, lazy)', match: /^_astro\/three\..*\.js$/, max: 160 * KB },
  { name: 'page entry scripts', match: /^_astro\/.*index\.astro.*\.js$/, max: 6 * KB, each: true },
  { name: 'page CSS', match: /^_astro\/.*\.css$/, max: 12 * KB, each: true },
  { name: 'store initial JS', match: /^store\/assets\/(index|react|shopify)-.*\.js$/, max: 80 * KB },
];

const files = [];
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p.slice(DIST.length + 1));
  }
};
walk(DIST);

let failed = false;
for (const b of budgets) {
  const matched = files.filter((f) => b.match.test(f));
  if (!matched.length) {
    console.error(`✗ ${b.name}: no files matched ${b.match}`);
    failed = true;
    continue;
  }
  const sizes = matched.map((f) => [f, gzipSync(readFileSync(join(DIST, f))).length]);
  const checks = b.each ? sizes : [[`${matched.length} file(s)`, sizes.reduce((s, [, n]) => s + n, 0)]];
  for (const [label, size] of checks) {
    const ok = size <= b.max;
    failed ||= !ok;
    console.log(
      `${ok ? '✓' : '✗'} ${b.name.padEnd(26)} ${(size / KB).toFixed(1).padStart(6)} kB / ${b.max / KB} kB  ${label}`,
    );
  }
}
process.exit(failed ? 1 : 0);
