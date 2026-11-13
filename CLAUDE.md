# Project notes for Claude

## Before starting any task: build the graphify graph

1. Run `./scripts/graphify.sh` from the repo root (installs `graphifyy` if needed; no API key).
2. Read `graphify-out/GRAPH_REPORT.md` first to get the map of the codebase.
   Use `graphify query "<question>"`, `graphify explain "<symbol>"` or `graphify path "A" "B"` to navigate
   instead of reading whole files.

## Layout

- `apps/web` — Astro + TypeScript + three.js: portfolio (`/`), `/watch/`, `/chair/`, `/box/`.
  - `src/scripts/<page>/` holds each page's scene and UI; `src/content/site.ts` holds portfolio copy.
- `apps/store` — Vite + React storefront, built into `apps/web/dist/store`.
- `packages/three-core` (`@meridian/three-core`) — the shared 3D runtime for both apps: quality tiers, adaptive
  resolution, `RenderLoop`, `ScrollDirector`, `bakeStudio` lighting, `generateTextures`. Import math-only helpers from
  `@meridian/three-core/math` and the WebGL check from `/support` in code that runs before first paint.
- Each page is standalone: same-named functions on different pages are not related.

## 3D work: performance comes first

- Never import `three` from code that runs before first paint; load 3D with dynamic `import()` or from the page's
  own script so it lands in the shared `three` chunk. Check with `npm run budget`.
- Use `getQuality()` for pixel ratio, shadows, textures and expensive materials; `RenderLoop` for the frame loop
  (demand mode for anything that can sit idle); `precompile()` before the first frame.
- Static scenes: `renderer.shadowMap.autoUpdate = false` and set `needsUpdate` only when geometry changes.
- Heavy canvas/procedural work goes in a Web Worker via `exposeTextureWorker` + `generateTextures` (see
  `scripts/chair/textures*.ts`). Always pass `renderer` so textures reach the GPU before the worker is terminated.
- Prefer animating in shaders over per-frame buffer uploads; build models in code instead of shipping files.

## Checks

`npm run check` (typecheck, lint, format), `npm run build`, `npm run budget`, `npm test` (Playwright, desktop + mobile).
In this sandbox Chromium renders WebGL in software, so frame rates and load times here are far slower than on a
real device; judge layout and errors, not speed.

## After finishing a change: ship it to `main`

GitHub Pages is deployed by `.github/workflows/ci.yml` from `main`
(https://quangduy222002.github.io/meridian-tryon/). The owner wants every finished change committed and pushed to
`main` so it gets built:

1. Re-run `./scripts/graphify.sh` and commit the refreshed `graphify-out/` with the change.
2. Run the checks above.
3. Commit on the working branch, then fast-forward `main` to it and push both (`git push origin HEAD:main`).
   Never force-push `main`.
