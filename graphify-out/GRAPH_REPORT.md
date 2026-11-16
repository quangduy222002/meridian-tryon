# Graph Report - meridian-tryon  (2026-11-16)

## Corpus Check
- 100 files · ~70,994 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: .css 8, (none) 5)

## Summary
- 836 nodes · 1895 edges · 39 communities (34 shown, 5 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 94 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d37d580d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store/package.json
- watch/stage.ts
- shopify.ts
- BaseLayout.astro
- web/package.json
- package.json
- deploy
- watch/catalog.ts
- three-core/package.json
- ref_three
- compilerOptions
- compilerOptions
- web/tsconfig.json
- check-bundle.mjs
- .prettierrc.json
- src/textures.ts
- store/README.md
- index.ts
- box/studio.ts
- assembly/studio.ts
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
- assembly/app.ts
- setupThree
- startStudio
- parts.ts
- Story
- room/stage.ts
- ai.ts
- Studio

## God Nodes (most connected - your core abstractions)
1. `PlanEditor` - 39 edges
2. `startRoomcraft()` - 27 edges
3. `startStudio()` - 27 edges
4. `RenderLoop` - 25 edges
5. `$` - 25 edges
6. `Vec2` - 19 edges
7. `startBoxStudio()` - 19 edges
8. `startChair()` - 19 edges
9. `Plan` - 17 edges
10. `getQuality()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `3D work: performance comes first` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `Layout` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `Performance rules for 3D` --references--> `RenderLoop`  [INFERRED]
  README.md → packages/three-core/src/loop.ts
- `Layout` --references--> `ScrollDirector`  [INFERRED]
  CLAUDE.md → packages/three-core/src/scroll-director.ts
- `Layout` --references--> `bakeStudio()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/environment.ts

## Import Cycles
- None detected.

## Communities (39 total, 5 thin omitted)

### Community 0 - "store/package.json"
Cohesion: 0.08
Nodes (30): dependencies, @meridian/three-core@*, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.30.6, three@~0.187.0, devDependencies, @types/react@^19.3.0 (+22 more)

### Community 1 - "watch/stage.ts"
Cohesion: 0.20
Nodes (16): startBoxStudio(), startChair(), startRoom(), createStudioEnvironment(), KEYS, Pose, ShotKey, SHOTS (+8 more)

### Community 2 - "shopify.ts"
Cohesion: 0.06
Nodes (76): @shopify/hydrogen-react@^2026.4.4, CartCtx, CartProvider(), Ctx, load(), save(), useCart(), sized() (+68 more)

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
Cohesion: 0.15
Nodes (16): BASE_PRICE, CaseKey, CaseOption, CASES, Config, DialKey, DialOption, DIALS (+8 more)

### Community 8 - "three-core/package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, @types/three@~0.187.0, typescript@~5.9.3, exports, ./math, ./support, three (+9 more)

### Community 9 - "ref_three"
Cohesion: 0.15
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
Cohesion: 0.18
Nodes (12): 3D work: performance comes first, After finishing a change: ship it to `main`, Before starting any task: build the graphify graph, Checks, Layout, Project notes for Claude, canPaintInWorker(), exposeTextureWorker() (+4 more)

### Community 18 - "index.ts"
Cohesion: 0.18
Nodes (11): assemblySpecs(), AssemblyTexture, paintMesh(), boxSpecs(), chairSpecs(), noise(), FrameCallback, LoopOptions (+3 more)

### Community 19 - "box/studio.ts"
Cohesion: 0.10
Nodes (17): createDieline(), rebuild(), toVec(), createPallet(), PALLET, PalletPlan, DISCOUNT, MaterialKey (+9 more)

### Community 20 - "assembly/studio.ts"
Cohesion: 0.15
Nodes (20): DEFAULT_OFFSETS, DEFAULT_VIEW, defaultMove(), endOf(), EndState, GLASS_ASIDE, INSTALLED, lastPosition() (+12 more)

### Community 21 - "configurator.ts"
Cohesion: 0.13
Nodes (22): buildBackdrops(), ARMREST_PRICE, BASE_PRICE, ChairConfig, COLORS, FabricKey, FABRICS, FrameKey (+14 more)

### Community 22 - "pages/index.astro"
Cohesion: 0.14
Nodes (9): Props, Props, Project, projects, services, stack, steps, UPWORK_URL (+1 more)

### Community 23 - "furniture.ts"
Cohesion: 0.19
Nodes (10): Add, builders, buildFurniture(), geoCache, LAMP_TYPES, mainCache, mainMat(), rbox() (+2 more)

### Community 25 - "room/app.ts"
Cohesion: 0.06
Nodes (67): esc(), HINTS, rovingToolbar(), startRoomcraft(), renderInspector(), DEFAULT_STYLE, Finish, FLOORS (+59 more)

### Community 26 - "watch/textures.ts"
Cohesion: 0.18
Nodes (12): loadWatchTextures(), brush, cotes, dial(), engrave, grain, perlage, rehaut (+4 more)

### Community 27 - "$"
Cohesion: 0.24
Nodes (11): $, announce(), initCursor(), initRail(), initStickyNav(), liveRegion, toast(), usd() (+3 more)

### Community 28 - "watch/model.ts"
Cohesion: 0.26
Nodes (11): buildWatch(), createInk(), createMaterials(), dauphine(), ExplodedPart, gearShape(), lathe(), sweptStrap() (+3 more)

### Community 29 - "watch/index.astro"
Cohesion: 0.24
Nodes (6): initReveals(), withBase(), chapters, configurator, gauges, initMetalButtons()

### Community 31 - "assembly/app.ts"
Cohesion: 0.13
Nodes (8): ease(), esc(), pad(), startAssembly(), STUDIO, cloneGuide(), partsOf(), globals

### Community 32 - "setupThree"
Cohesion: 0.16
Nodes (4): setupThree(), roomSpecs(), TILE_METRES, Walker

### Community 33 - "startStudio"
Cohesion: 0.23
Nodes (3): AssemblyApi, Guide, startStudio()

### Community 34 - "parts.ts"
Cohesion: 0.23
Nodes (13): ACCENT, Look, newLook(), patchLook(), Saved, setXray(), buildParts(), Kit (+5 more)

### Community 35 - "Story"
Cohesion: 0.16
Nodes (7): Hero3D(), Story(), AdaptiveResolution, Develop, Duy Q. — 3D portfolio & product demos, Performance rules for 3D, Stack

### Community 36 - "room/stage.ts"
Cohesion: 0.17
Nodes (10): Framing, NUMERIC, Pose, SECTION_OF, Shot, clamp(), DEG, smoothstep() (+2 more)

### Community 37 - "ai.ts"
Cohesion: 0.29
Nodes (9): AiContext, AiMove, AiStep, generateStep(), Place, PLACES, schema(), systemPrompt() (+1 more)

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 262 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$` connect `$` to `setupThree`, `startStudio`, `watch/stage.ts`, `watch/catalog.ts`, `box/studio.ts`, `assembly/studio.ts`, `configurator.ts`, `pages/index.astro`, `room/app.ts`, `watch/index.astro`, `assembly/app.ts`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `startRoomcraft()` (e.g. with `.deleteSelection()` and `.draw()`) actually correct?**
  _`startRoomcraft()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07954545454545454 - nodes in this community are weakly interconnected._
- **Why does `RenderLoop` connect `watch/stage.ts` to `shopify.ts`, `Story`, `room/stage.ts`, `src/textures.ts`, `index.ts`, `box/studio.ts`, `configurator.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `startStudio()` (e.g. with `.captureView()` and `.changed()`) actually correct?**
  _`startStudio()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Should `shopify.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0626858842370167 - nodes in this community are weakly interconnected._