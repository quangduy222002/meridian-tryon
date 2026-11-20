#!/usr/bin/env node
/**
 * Packs Floorwise (/studio/) as a claude.ai Artifact, where its "Furnish with AI" runs on the viewer's own Claude
 * account instead of an API key (see apps/web/src/lib/claude-host.ts).
 *
 * 1. Builds apps/web with ARTIFACT=1 (relative asset URLs, into apps/web/dist-artifact).
 * 2. Copies the studio page and only the files it reaches into apps/web/dist-artifact/publish/:
 *    index.html (the page content without its document skeleton, which the Artifact adds), assets/…, A26.pdf and
 *    the furniture models under models/.
 * 3. Writes publish/files.json: the `files` map for the Artifact tool.
 *
 * Usage: node scripts/artifact.mjs [--no-build]
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const web = join(root, 'apps/web');
const dist = join(web, 'dist-artifact');
const out = join(dist, 'publish');
const SITE = 'https://quangduy222002.github.io/meridian-tryon/';

if (!process.argv.includes('--no-build'))
  execFileSync('npx', ['astro', 'build'], { cwd: web, stdio: 'inherit', env: { ...process.env, ARTIFACT: '1' } });

let html = readFileSync(join(dist, 'studio/index.html'), 'utf8');

// Files the page reaches: start from the HTML, then follow every _astro file name mentioned in a reached file.
const astro = new Set(readdirSync(join(dist, '_astro')));
const reached = new Set();
const scan = (text) => {
  for (const name of astro) if (!reached.has(name) && text.includes(name)) queue.push(name);
};
const queue = [];
scan(html);
while (queue.length) {
  const name = queue.pop();
  if (reached.has(name)) continue;
  reached.add(name);
  if (/\.(js|mjs|css)$/.test(name)) scan(readFileSync(join(dist, '_astro', name), 'utf8'));
}

// The Artifact wraps the page in its own document skeleton: keep the head's title, styles and scripts, drop the rest
// of the head (canonical, social cards, theme colour), and serve every file from beside the page.
const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
const keep = [
  ...head.matchAll(/<link rel="stylesheet"[^>]*>|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>/g),
].map((m) => m[0]);
html = [
  '<title>Floorwise</title>',
  '<meta name="description" content="Import a PDF or DXF floor plan, fix it, furnish it with Claude and see it in 3D.">',
  ...keep,
  body,
]
  .join('\n')
  .replaceAll('"/_astro/', '"assets/')
  // Links out of the app go to the published portfolio.
  .replaceAll('href="../"', `href="${SITE}" target="_blank" rel="noopener"`);

rmSync(out, { recursive: true, force: true });
// Artifact paths may not start with "_": the bundle goes under assets/ (chunks reach each other by bare file name).
mkdirSync(join(out, 'assets'), { recursive: true });
writeFileSync(join(out, 'index.html'), html);
for (const name of reached) {
  const to = join(out, 'assets', name);
  // Fonts in the stylesheets are linked from the site root; beside the stylesheet they are just "./name".
  if (name.endsWith('.css'))
    writeFileSync(to, readFileSync(join(dist, '_astro', name), 'utf8').replaceAll('/_astro/', './'));
  else if (/\.m?js$/.test(name))
    // Raw control characters (pdf.js keeps some inside string literals) are refused by the Artifact service: write
    // them as escapes, which mean the same inside strings, templates and regexes.
    writeFileSync(
      to,
      readFileSync(join(dist, '_astro', name), 'utf8')
        // eslint-disable-next-line no-control-regex -- matching control characters is the point here
        .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, (c) => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
        // So is a literal U+FFFD (the SDK's text decoder uses one).
        .replaceAll('\ufffd', '\\ufffd'),
    );
  else cpSync(join(dist, '_astro', name), to);
}
const files = Object.fromEntries([...reached].sort().map((n) => [`assets/${n}`, join(out, 'assets', n)]));
if (existsSync(join(dist, 'studio/A26.pdf'))) {
  cpSync(join(dist, 'studio/A26.pdf'), join(out, 'A26.pdf'));
  files['A26.pdf'] = join(out, 'A26.pdf');
}
// Ready-made furniture models (room/library.ts), loaded beside the page as models/…
const modelsDir = join(dist, 'models');
if (existsSync(modelsDir)) {
  cpSync(modelsDir, join(out, 'models'), { recursive: true });
  // The Artifact serves neither .gltf nor .bin: each model becomes one .json (its buffers inlined as data URIs;
  // textures stay beside it as .jpg/.png), which room/library.ts asks for in this build.
  const walk = (dir, rel) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const r = `${rel}/${entry.name}`;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path, r);
      else if (entry.name.endsWith('.gltf')) {
        const gltf = JSON.parse(readFileSync(path, 'utf8'));
        for (const b of gltf.buffers ?? []) {
          if (!b.uri || b.uri.startsWith('data:')) continue;
          const bin = join(dir, b.uri);
          b.uri = `data:application/octet-stream;base64,${readFileSync(bin).toString('base64')}`;
          rmSync(bin);
          delete files[`${rel}/${basename(bin)}`];
        }
        const json = path.replace(/\.gltf$/, '.json');
        writeFileSync(json, JSON.stringify(gltf));
        rmSync(path);
        files[r.replace(/\.gltf$/, '.json')] = json;
      } else if (!entry.name.endsWith('.bin')) files[r] = path;
    }
  };
  walk(join(out, 'models'), 'models');
}
writeFileSync(join(out, 'files.json'), JSON.stringify(files, null, 2));
const bytes = Object.values(files).reduce((s, f) => s + readFileSync(f).length, 0);
console.log(`Artifact: ${Object.keys(files).length} files, ${(bytes / 1e6).toFixed(1)} MB → ${out}`);
