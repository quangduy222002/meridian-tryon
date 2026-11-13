# Graph Report - meridian-tryon  (2026-11-13)

## Corpus Check
- 65 files · ~32,871 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: .css 6, (none) 5)

## Summary
- 495 nodes · 954 edges · 24 communities (21 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `26e31b41`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store/package.json
- studio.ts
- shopify.ts
- model.ts
- BaseLayout.astro
- package.json
- deploy
- pages/index.astro
- startRoom
- build.ts
- scripts
- compilerOptions
- web/tsconfig.json
- check-bundle.mjs
- .prettierrc.json
- precompile
- store/README.md
- textures.ts
- watch/stage.ts
- RenderLoop
- configurator.ts
- room/stage.ts
- graphify.sh

## God Nodes (most connected - your core abstractions)
1. `RenderLoop` - 19 edges
2. `startWatch()` - 16 edges
3. `$` - 16 edges
4. `startBoxStudio()` - 14 edges
5. `startRoom()` - 14 edges
6. `scripts` - 14 edges
7. `react` - 14 edges
8. `Home()` - 13 edges
9. `startChair()` - 12 edges
10. `Price()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Layout` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → apps/web/src/lib/three/loop.ts
- `Layout` --references--> `ScrollDirector`  [INFERRED]
  CLAUDE.md → apps/web/src/lib/three/scroll-director.ts
- `3D work: performance comes first` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → apps/web/src/lib/three/loop.ts
- `3D work: performance comes first` --references--> `getQuality()`  [INFERRED]
  CLAUDE.md → apps/web/src/lib/three/quality.ts
- `Performance rules for 3D` --references--> `RenderLoop`  [INFERRED]
  README.md → apps/web/src/lib/three/loop.ts

## Import Cycles
- None detected.

## Communities (24 total, 3 thin omitted)

### Community 0 - "store/package.json"
Cohesion: 0.08
Nodes (30): dependencies, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.30.6, @shopify/hydrogen-react@^2026.4.4, three@~0.187.0, devDependencies, @types/react@^19.3.0 (+22 more)

### Community 1 - "studio.ts"
Cohesion: 0.15
Nodes (13): detectTier(), gpuName(), PRESETS, Quality, Tier, createRenderer(), RendererOptions, TextureOptions (+5 more)

### Community 2 - "shopify.ts"
Cohesion: 0.06
Nodes (76): CartCtx, CartProvider(), Ctx, load(), save(), useCart(), Hero3D(), sized() (+68 more)

### Community 3 - "model.ts"
Cohesion: 0.10
Nodes (27): toast(), easeOutCubic(), BASE_PRICE, CaseKey, CaseOption, CASES, Config, DialKey (+19 more)

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
Nodes (21): Props, Props, Project, projects, services, stack, steps, UPWORK_URL (+13 more)

### Community 8 - "startRoom"
Cohesion: 0.20
Nodes (7): AdaptiveResolution, getQuality(), startRoom(), Develop, Duy Q. — 3D portfolio & product demos, Performance rules for 3D, Stack

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
Cohesion: 0.20
Nodes (5): budgets, files, walk(), PORT, TYPES

### Community 14 - ".prettierrc.json"
Cohesion: 0.33
Nodes (5): overrides, plugins, printWidth, singleQuote, trailingComma

### Community 15 - "precompile"
Cohesion: 0.25
Nodes (7): precompile(), 3D work: performance comes first, After finishing a change: ship it to `main`, Before starting any task: build the graphify graph, Checks, Layout, Project notes for Claude

### Community 18 - "textures.ts"
Cohesion: 0.14
Nodes (19): rand32(), inWorker(), loadWatchTextures(), onMainThread(), Sources, WatchTextures, brush, cotes (+11 more)

### Community 19 - "watch/stage.ts"
Cohesion: 0.19
Nodes (13): clamp(), damp(), lerp(), smoothstep(), TAU, ScrollDirector, ScrollSample, createStudioEnvironment() (+5 more)

### Community 20 - "RenderLoop"
Cohesion: 0.28
Nodes (6): usd(), RenderLoop, startBoxStudio(), updatePrice(), startChair(), refresh()

### Community 21 - "configurator.ts"
Cohesion: 0.17
Nodes (10): FrameCallback, LoopOptions, COLORS, FabricKey, FABRICS, FrameKey, FRAMES, LegKey (+2 more)

### Community 22 - "room/stage.ts"
Cohesion: 0.29
Nodes (6): DEG, Framing, NUMERIC, Pose, SECTION_OF, Shot

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 198 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `shopify.ts` to `store/package.json`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `RenderLoop` (e.g. with `3D work: performance comes first` and `Layout`) actually correct?**
  _`RenderLoop` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07954545454545454 - nodes in this community are weakly interconnected._
- **Why does `react-router-dom` connect `shopify.ts` to `store/package.json`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `startWatch()` (e.g. with `.start()` and `.sample()`) actually correct?**
  _`startWatch()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `studio.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14705882352941177 - nodes in this community are weakly interconnected._