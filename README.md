# Duy Q. — 3D portfolio & product demos

Live: https://quangduy222002.github.io/meridian-tryon/

| Path      | What it is                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------- |
| `/`       | Portfolio: one live Three.js room behind the page; the camera flies to each project as you scroll |
| `/watch/` | Product story: guilloché dial, brushed titanium, exploded view, live movement, lume, configurator |
| `/chair/` | Furniture configurator (materials, options, live price, snapshot)                                 |
| `/box/`   | Packaging studio (folding dieline, logo upload, volume pricing)                                   |
| `/store/` | Headless Shopify storefront (React + Hydrogen React + Storefront API on mock.shop)                |

Demo brands are fictional.

## Stack

- **apps/web** — [Astro](https://astro.build) + TypeScript + [three.js](https://threejs.org). Pages ship as static HTML;
  3D loads as a separate, cached chunk.
- **apps/store** — Vite + React 18 + Hydrogen React, built into `apps/web/dist/store`.
- npm workspaces, ESLint, Prettier, Playwright, GitHub Actions → GitHub Pages.

```
apps/
  web/
    src/
      pages/            one .astro file per route
      components/       Astro components (portfolio sections)
      content/site.ts   portfolio copy and project data
      layouts/          BaseLayout: SEO, fonts, global CSS
      lib/three/        shared 3D core: quality tiers, adaptive resolution, render loop, scroll director
      lib/dom/          reveals, sticky nav, cursor, toast
      scripts/<page>/   the 3D scene and UI for each page
      styles/           base.css + one stylesheet per page
  store/                React storefront
tests/e2e/              Playwright smoke tests (desktop + mobile)
scripts/                bundle budget, graphify
```

## Performance rules for 3D

These are enforced in code (see `lib/three/`) and by `npm run budget` in CI.

- **Text first, 3D second.** HTML and CSS paint immediately; three.js (~148 kB gzip) loads as one shared chunk after
  first paint (on idle on the portfolio). Entry scripts stay under 6 kB.
- **Quality tiers.** `getQuality()` picks `low / mid / high` from cores, memory, input type and GPU name (override with
  `?q=low|mid|high`). It sets max pixel ratio, MSAA, shadow map size, glass refraction and texture size.
- **Adaptive resolution.** `AdaptiveResolution` drops the pixel ratio when frames run long and raises it back when
  there is headroom.
- **Only render when needed.** `RenderLoop` pauses when the tab is hidden or the canvas is off screen. Configurators use
  demand mode: they draw only while something is changing.
- **Static shadows are rendered once** (`shadowMap.autoUpdate = false`), and refreshed only when geometry changes.
- **Heavy procedural textures are painted in a Web Worker** (OffscreenCanvas → ImageBitmap) so the page never freezes.
- **GPU does the animation work** where it can (dust particles animate in the vertex shader — no buffer uploads).
- **Shaders are compiled before the first frame** (`precompile`) so scrolling never stutters.
- **No 3D files to download.** Every model is built from code.
- Self-hosted fonts (latin subsets), AVIF/WebP responsive images, no third-party requests on load.

## Develop

```bash
npm install
npm run dev          # portfolio + demos at http://localhost:4321/meridian-tryon/
npm run dev:store    # storefront on its own dev server
npm run check        # typecheck + lint + format check
npm run build        # web + store → apps/web/dist
npm run budget       # bundle size budget
npm test             # Playwright smoke tests against the build
npm run graph        # refresh the graphify code map (graphify-out/)
```

Pushing to `main` runs CI and deploys `apps/web/dist` to GitHub Pages (Settings → Pages → Source: **GitHub Actions**).
