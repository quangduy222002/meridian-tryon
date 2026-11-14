# Graph Report - meridian-tryon  (2026-11-14)

## Corpus Check
- 87 files · ~49,042 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: .css 7, (none) 5)

## Summary
- 661 nodes · 1303 edges · 31 communities (27 shown, 4 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c3f8d2cb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store/package.json
- box/studio.ts
- shopify.ts
- pages/index.astro
- web/package.json
- package.json
- deploy
- watch/stage.ts
- three-core/package.json
- ref_three
- compilerOptions
- compilerOptions
- web/tsconfig.json
- check-bundle.mjs
- .prettierrc.json
- app.ts
- store/README.md
- index.ts
- room/stage.ts
- parts.ts
- configurator.ts
- startStudio
- scripts
- graphify.sh
- assembly/studio.ts
- chair/textures.ts
- src/textures.ts
- bakeStudio
- Project notes for Claude
- Studio

## God Nodes (most connected - your core abstractions)
1. `RenderLoop` - 23 edges
2. `startStudio()` - 20 edges
3. `$` - 20 edges
4. `startChair()` - 19 edges
5. `startBoxStudio()` - 19 edges
6. `AssemblyApi` - 16 edges
7. `startWatch()` - 16 edges
8. `getQuality()` - 15 edges
9. `Customize()` - 15 edges
10. `Story()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `3D work: performance comes first` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `Layout` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `Layout` --references--> `ScrollDirector`  [INFERRED]
  CLAUDE.md → packages/three-core/src/scroll-director.ts
- `Layout` --references--> `generateTextures()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/textures.ts
- `3D work: performance comes first` --references--> `getQuality()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/quality.ts

## Import Cycles
- None detected.

## Communities (31 total, 4 thin omitted)

### Community 0 - "store/package.json"
Cohesion: 0.08
Nodes (32): dependencies, @meridian/three-core@*, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.30.6, @shopify/hydrogen-react@^2026.4.4, three@~0.187.0, devDependencies (+24 more)

### Community 1 - "box/studio.ts"
Cohesion: 0.13
Nodes (13): createDieline(), rebuild(), toVec(), createPallet(), PALLET, PalletPlan, DISCOUNT, MaterialKey (+5 more)

### Community 2 - "shopify.ts"
Cohesion: 0.05
Nodes (84): CartCtx, CartProvider(), Ctx, load(), save(), useCart(), Hero3D(), sized() (+76 more)

### Community 3 - "pages/index.astro"
Cohesion: 0.06
Nodes (17): Props, Props, Project, projects, services, stack, steps, UPWORK_URL (+9 more)

### Community 4 - "web/package.json"
Cohesion: 0.08
Nodes (30): dependencies, astro@^7.4.11, @fontsource/geist-mono@^5.3.0, @fontsource/instrument-serif@^5.3.0, @fontsource-variable/inter@^5.3.0, @meridian/three-core@*, three@~0.187.0, devDependencies (+22 more)

### Community 5 - "package.json"
Cohesion: 0.08
Nodes (29): description, devDependencies, eslint@^10.14.0, @eslint/js@^10.0.0, eslint-plugin-astro@^3.2.1, eslint-plugin-react-hooks@^7.1.1, globals@^17.0.0, @playwright/test@1.63.0 (+21 more)

### Community 6 - "deploy"
Cohesion: 0.06
Nodes (34): name, runs-on, steps, concurrency, cancel-in-progress, group, environment, if (+26 more)

### Community 7 - "watch/stage.ts"
Cohesion: 0.06
Nodes (54): $, initStickyNav(), toast(), usd(), chapters, configurator, gauges, startBoxStudio() (+46 more)

### Community 8 - "three-core/package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, @types/three@~0.187.0, typescript@~5.9.3, exports, ./math, ./support, three (+9 more)

### Community 9 - "ref_three"
Cohesion: 0.14
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

### Community 15 - "app.ts"
Cohesion: 0.14
Nodes (9): ease(), esc(), GAME_STUDIO, pad(), startAssembly(), cloneGuide(), DEFAULT_VIEW, assemblySpecs() (+1 more)

### Community 18 - "index.ts"
Cohesion: 0.16
Nodes (13): loadWatchTextures(), brush, cotes, dial(), engrave, grain, perlage, rehaut (+5 more)

### Community 19 - "room/stage.ts"
Cohesion: 0.12
Nodes (6): Framing, NUMERIC, Pose, SECTION_OF, Shot, startRoom()

### Community 20 - "parts.ts"
Cohesion: 0.19
Nodes (14): ACCENT, globals, Look, newLook(), patchLook(), Saved, setXray(), buildParts() (+6 more)

### Community 21 - "configurator.ts"
Cohesion: 0.13
Nodes (22): buildBackdrops(), ARMREST_PRICE, BASE_PRICE, ChairConfig, COLORS, FabricKey, FABRICS, FrameKey (+14 more)

### Community 22 - "startStudio"
Cohesion: 0.19
Nodes (5): AssemblyApi, StepView, esc(), pad(), startStudio()

### Community 23 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, budget, build, check, dev, dev:store, format, format:check (+6 more)

### Community 25 - "assembly/studio.ts"
Cohesion: 0.27
Nodes (10): DEFAULT_OFFSETS, Guide, newId(), SAMPLE_GUIDE, Step, step(), ToolId, TOOLS (+2 more)

### Community 26 - "chair/textures.ts"
Cohesion: 0.26
Nodes (7): boxSpecs(), BoxTexture, chairSpecs(), noise(), rand32(), Ctx2D, SpecMap

### Community 27 - "src/textures.ts"
Cohesion: 0.33
Nodes (7): 3D work: performance comes first, canPaintInWorker(), exposeTextureWorker(), GenerateOptions, generateTextures(), paintFlipped(), WorkerScope

### Community 28 - "bakeStudio"
Cohesion: 0.38
Nodes (5): createStudioEnvironment(), bakeStudio(), DARK_STUDIO, LIGHT_STUDIO, LightCard

### Community 29 - "Project notes for Claude"
Cohesion: 0.33
Nodes (5): After finishing a change: ship it to `main`, Before starting any task: build the graphify graph, Checks, Layout, Project notes for Claude

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 244 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$` connect `watch/stage.ts` to `box/studio.ts`, `pages/index.astro`, `app.ts`, `configurator.ts`, `startStudio`, `assembly/studio.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `RenderLoop` (e.g. with `3D work: performance comes first` and `Layout`) actually correct?**
  _`RenderLoop` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07563025210084033 - nodes in this community are weakly interconnected._
- **Why does `RenderLoop` connect `shopify.ts` to `box/studio.ts`, `watch/stage.ts`, `index.ts`, `configurator.ts`, `src/textures.ts`, `Project notes for Claude`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `startStudio()` (e.g. with `.captureView()` and `.changed()`) actually correct?**
  _`startStudio()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Should `box/studio.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13071895424836602 - nodes in this community are weakly interconnected._