# Graph Report - meridian-tryon  (2026-11-13)

## Corpus Check
- 64 files · ~32,094 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: .css 6, (none) 5)

## Summary
- 485 nodes · 935 edges · 19 communities (15 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `66c440b1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store/package.json
- room/stage.ts
- shopify.ts
- watch/stage.ts
- BaseLayout.astro
- package.json
- deploy
- pages/index.astro
- README.md
- build.ts
- scripts
- compilerOptions
- web/tsconfig.json
- check-bundle.mjs
- .prettierrc.json
- Project notes for Claude
- store/README.md
- graphify.sh

## God Nodes (most connected - your core abstractions)
1. `$` - 16 edges
2. `RenderLoop` - 16 edges
3. `startWatch()` - 16 edges
4. `react` - 14 edges
5. `startBoxStudio()` - 14 edges
6. `startRoom()` - 14 edges
7. `scripts` - 14 edges
8. `Home()` - 13 edges
9. `Price()` - 12 edges
10. `startChair()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `applyMaterial()` --calls--> `$`  [EXTRACTED]
  apps/web/src/scripts/box/studio.ts → apps/web/src/lib/dom/chrome.ts
- `initConfigurator()` --calls--> `easeOutCubic()`  [EXTRACTED]
  apps/web/src/scripts/watch/ui.ts → apps/web/src/lib/math.ts
- `startRoom()` --calls--> `buildRoom()`  [EXTRACTED]
  apps/web/src/scripts/home/room/stage.ts → apps/web/src/scripts/home/room/build.ts
- `initConfigurator()` --calls--> `priceOf()`  [EXTRACTED]
  apps/web/src/scripts/watch/ui.ts → apps/web/src/scripts/watch/catalog.ts
- `startWatch()` --calls--> `createStudioEnvironment()`  [EXTRACTED]
  apps/web/src/scripts/watch/stage.ts → apps/web/src/scripts/watch/environment.ts

## Import Cycles
- None detected.

## Communities (19 total, 4 thin omitted)

### Community 0 - "store/package.json"
Cohesion: 0.08
Nodes (30): dependencies, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.30.6, @shopify/hydrogen-react@^2026.4.4, three@~0.187.0, devDependencies, @types/react@^19.3.0 (+22 more)

### Community 1 - "room/stage.ts"
Cohesion: 0.06
Nodes (48): $, toast(), usd(), damp(), lerp(), smoothstep(), FrameCallback, LoopOptions (+40 more)

### Community 2 - "shopify.ts"
Cohesion: 0.06
Nodes (76): CartCtx, CartProvider(), Ctx, load(), save(), useCart(), Hero3D(), sized() (+68 more)

### Community 3 - "watch/stage.ts"
Cohesion: 0.06
Nodes (52): clamp(), DEG, easeOutCubic(), rand32(), TAU, BASE_PRICE, CaseKey, CaseOption (+44 more)

### Community 4 - "BaseLayout.astro"
Cohesion: 0.06
Nodes (31): dependencies, astro@^7.4.11, @fontsource/geist-mono@^5.3.0, @fontsource/instrument-serif@^5.3.0, @fontsource-variable/inter@^5.3.0, three@~0.187.0, devDependencies, @astrojs/check@^0.9.12 (+23 more)

### Community 5 - "package.json"
Cohesion: 0.08
Nodes (29): description, devDependencies, eslint@^10.14.0, @eslint/js@^10.0.0, eslint-plugin-astro@^3.2.1, eslint-plugin-react-hooks@^7.1.1, globals@^17.0.0, @playwright/test@1.63.0 (+21 more)

### Community 6 - "deploy"
Cohesion: 0.06
Nodes (34): name, runs-on, steps, concurrency, cancel-in-progress, group, environment, if (+26 more)

### Community 7 - "pages/index.astro"
Cohesion: 0.09
Nodes (19): Props, Props, Project, projects, services, stack, steps, UPWORK_URL (+11 more)

### Community 9 - "build.ts"
Cohesion: 0.24
Nodes (12): createFloorShadow(), createLightShafts(), gradientCanvas(), buildRoom(), Hotspot, mat(), rbox(), createDust() (+4 more)

### Community 10 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, budget, build, check, dev, dev:store, format, format:check (+6 more)

### Community 11 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, jsx, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+2 more)

### Community 12 - "web/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, baseUrl, lib, paths, exclude, extends, include, astro/tsconfigs/strict

### Community 13 - "check-bundle.mjs"
Cohesion: 0.29
Nodes (3): budgets, files, walk()

### Community 14 - ".prettierrc.json"
Cohesion: 0.33
Nodes (5): overrides, plugins, printWidth, singleQuote, trailingComma

### Community 15 - "Project notes for Claude"
Cohesion: 0.50
Nodes (3): After finishing a change: ship it to `main`, Before starting any task: build the graphify graph, Project notes for Claude

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 195 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `shopify.ts` to `store/package.json`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `startWatch()` (e.g. with `.start()` and `.sample()`) actually correct?**
  _`startWatch()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07954545454545454 - nodes in this community are weakly interconnected._
- **Why does `react-router-dom` connect `shopify.ts` to `store/package.json`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `room/stage.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06050228310502283 - nodes in this community are weakly interconnected._
- **Why does `astro` connect `BaseLayout.astro` to `pages/index.astro`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._