# Graph Report - meridian-tryon  (2026-11-16)

## Corpus Check
- 101 files · ~73,259 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: .css 8, (none) 5)

## Summary
- 850 nodes · 1919 edges · 35 communities (31 shown, 4 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `14535f82`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store/package.json
- Customize.tsx
- shopify.ts
- BaseLayout.astro
- web/package.json
- package.json
- deploy
- watch/catalog.ts
- three-core/package.json
- room/stage.ts
- compilerOptions
- compilerOptions
- web/tsconfig.json
- check-bundle.mjs
- .prettierrc.json
- src/textures.ts
- store/README.md
- index.ts
- box/studio.ts
- assembly/app.ts
- configurator.ts
- pages/index.astro
- furniture.ts
- graphify.sh
- room/app.ts
- watch/textures.ts
- $
- watch/model.ts
- watch/index.astro
- room/index.astro
- ProjectChapter.astro
- setupThree
- Duy Q. — 3D portfolio & product demos
- watch/stage.ts

## God Nodes (most connected - your core abstractions)
1. `PlanEditor` - 39 edges
2. `startRoomcraft()` - 30 edges
3. `startStudio()` - 27 edges
4. `$` - 25 edges
5. `RenderLoop` - 23 edges
6. `Vec2` - 20 edges
7. `startBoxStudio()` - 19 edges
8. `startChair()` - 19 edges
9. `Plan` - 18 edges
10. `AssemblyApi` - 16 edges

## Surprising Connections (you probably didn't know these)
- `3D work: performance comes first` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `Layout` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `Layout` --references--> `ScrollDirector`  [INFERRED]
  CLAUDE.md → packages/three-core/src/scroll-director.ts
- `Layout` --references--> `bakeStudio()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/environment.ts
- `3D work: performance comes first` --references--> `getQuality()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/quality.ts

## Import Cycles
- None detected.

## Communities (35 total, 4 thin omitted)

### Community 0 - "store/package.json"
Cohesion: 0.08
Nodes (31): dependencies, @meridian/three-core@*, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.30.6, @shopify/hydrogen-react@^2026.4.4, three@~0.187.0, devDependencies (+23 more)

### Community 1 - "Customize.tsx"
Cohesion: 0.11
Nodes (22): Hero3D(), sized(), Customize, buildCap(), Cfg, Customize(), DEFAULT, drawEmbroidery() (+14 more)

### Community 2 - "shopify.ts"
Cohesion: 0.07
Nodes (63): CartCtx, CartProvider(), Ctx, load(), save(), useCart(), COLORS, FIXTURE_COLLECTIONS (+55 more)

### Community 3 - "BaseLayout.astro"
Cohesion: 0.13
Nodes (3): base, canonical, Props

### Community 4 - "web/package.json"
Cohesion: 0.08
Nodes (32): dependencies, @anthropic-ai/sdk@^1.8.0, astro@^7.4.11, @fontsource/geist-mono@^5.3.0, @fontsource/instrument-serif@^5.3.0, @fontsource-variable/inter@^5.3.0, @meridian/three-core@*, three@~0.187.0 (+24 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (43): description, devDependencies, eslint@^10.14.0, @eslint/js@^10.0.0, eslint-plugin-astro@^3.2.1, eslint-plugin-react-hooks@^7.1.1, globals@^17.0.0, @playwright/test@1.63.0 (+35 more)

### Community 6 - "deploy"
Cohesion: 0.06
Nodes (34): name, runs-on, steps, concurrency, cancel-in-progress, group, environment, if (+26 more)

### Community 7 - "watch/catalog.ts"
Cohesion: 0.14
Nodes (17): BASE_PRICE, CaseKey, CaseOption, CASES, Config, DialKey, DialOption, DIALS (+9 more)

### Community 8 - "three-core/package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, @types/three@~0.187.0, typescript@~5.9.3, exports, ./math, ./support, three (+9 more)

### Community 9 - "room/stage.ts"
Cohesion: 0.09
Nodes (18): createFloorShadow(), createLightShafts(), gradientCanvas(), buildRoom(), Hotspot, mat(), rbox(), createDust() (+10 more)

### Community 10 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, noUncheckedIndexedAccess, skipLibCheck (+4 more)

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

### Community 15 - "src/textures.ts"
Cohesion: 0.17
Nodes (13): 3D work: performance comes first, After finishing a change: ship it to `main`, Before starting any task: build the graphify graph, Checks, Layout, Project notes for Claude, canPaintInWorker(), Ctx2D (+5 more)

### Community 18 - "index.ts"
Cohesion: 0.15
Nodes (13): createStudioEnvironment(), bakeStudio(), DARK_STUDIO, LIGHT_STUDIO, LightCard, FrameCallback, LoopOptions, detectTier() (+5 more)

### Community 19 - "box/studio.ts"
Cohesion: 0.11
Nodes (16): createDieline(), rebuild(), toVec(), createPallet(), PALLET, PalletPlan, DISCOUNT, MaterialKey (+8 more)

### Community 20 - "assembly/app.ts"
Cohesion: 0.05
Nodes (57): AiContext, AiMove, AiStep, generateStep(), Place, PLACES, schema(), systemPrompt() (+49 more)

### Community 21 - "configurator.ts"
Cohesion: 0.11
Nodes (25): buildBackdrops(), ARMREST_PRICE, BASE_PRICE, ChairConfig, COLORS, FabricKey, FABRICS, FrameKey (+17 more)

### Community 22 - "pages/index.astro"
Cohesion: 0.19
Nodes (7): Props, projects, services, stack, steps, UPWORK_URL, rail

### Community 23 - "furniture.ts"
Cohesion: 0.19
Nodes (10): Add, builders, buildFurniture(), geoCache, LAMP_TYPES, mainCache, mainMat(), rbox() (+2 more)

### Community 25 - "room/app.ts"
Cohesion: 0.05
Nodes (75): AiItem, corners(), describeRoom(), furnishRoom(), keepInside(), r2(), schema, systemPrompt() (+67 more)

### Community 26 - "watch/textures.ts"
Cohesion: 0.17
Nodes (13): loadWatchTextures(), WatchTextures, brush, cotes, dial(), engrave, grain, perlage (+5 more)

### Community 27 - "$"
Cohesion: 0.24
Nodes (11): $, announce(), initCursor(), initRail(), initStickyNav(), liveRegion, toast(), usd() (+3 more)

### Community 28 - "watch/model.ts"
Cohesion: 0.29
Nodes (10): buildWatch(), createInk(), createMaterials(), dauphine(), ExplodedPart, gearShape(), lathe(), sweptStrap() (+2 more)

### Community 29 - "watch/index.astro"
Cohesion: 0.33
Nodes (4): initReveals(), chapters, configurator, gauges

### Community 31 - "ProjectChapter.astro"
Cohesion: 0.29
Nodes (3): Props, Project, withBase()

### Community 32 - "setupThree"
Cohesion: 0.16
Nodes (4): setupThree(), roomSpecs(), TILE_METRES, Walker

### Community 35 - "Duy Q. — 3D portfolio & product demos"
Cohesion: 0.50
Nodes (3): Develop, Duy Q. — 3D portfolio & product demos, Stack

### Community 36 - "watch/stage.ts"
Cohesion: 0.20
Nodes (12): KEYS, Pose, ShotKey, SHOTS, startWatch(), clamp(), damp(), DEG (+4 more)

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 267 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$` connect `$` to `setupThree`, `Customize.tsx`, `watch/catalog.ts`, `box/studio.ts`, `assembly/app.ts`, `configurator.ts`, `pages/index.astro`, `room/app.ts`, `watch/index.astro`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `startRoomcraft()` (e.g. with `.deleteSelection()` and `.draw()`) actually correct?**
  _`startRoomcraft()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0766488413547237 - nodes in this community are weakly interconnected._
- **Why does `@anthropic-ai/sdk` connect `web/package.json` to `room/app.ts`, `assembly/app.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `startStudio()` (e.g. with `.captureView()` and `.changed()`) actually correct?**
  _`startStudio()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Should `Customize.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._