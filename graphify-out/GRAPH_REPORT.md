# Graph Report - meridian-tryon  (2026-11-15)

## Corpus Check
- 88 files · ~53,100 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: .css 7, (none) 5)

## Summary
- 675 nodes · 1374 edges · 37 communities (32 shown, 5 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7b34dea6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store/package.json
- RenderLoop
- shopify.ts
- pages/index.astro
- web/package.json
- package.json
- deploy
- watch/index.astro
- three-core/package.json
- ref_three
- compilerOptions
- compilerOptions
- web/tsconfig.json
- check-bundle.mjs
- .prettierrc.json
- box/studio.ts
- store/README.md
- index.ts
- assembly/index.astro
- assembly/studio.ts
- configurator.ts
- ProjectChapter.astro
- Duy Q. — 3D portfolio & product demos
- graphify.sh
- app.ts
- watch/stage.ts
- startStudio
- parts.ts
- bakeStudio
- BaseLayout.astro
- ai.ts
- devDependencies
- Story
- room/stage.ts
- scripts
- Studio

## God Nodes (most connected - your core abstractions)
1. `startStudio()` - 27 edges
2. `RenderLoop` - 25 edges
3. `$` - 20 edges
4. `startBoxStudio()` - 19 edges
5. `startChair()` - 19 edges
6. `getQuality()` - 17 edges
7. `AssemblyApi` - 16 edges
8. `startWatch()` - 16 edges
9. `Customize()` - 15 edges
10. `createRenderer()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Layout` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `Performance rules for 3D` --references--> `AdaptiveResolution`  [INFERRED]
  README.md → packages/three-core/src/quality.ts
- `Layout` --references--> `ScrollDirector`  [INFERRED]
  CLAUDE.md → packages/three-core/src/scroll-director.ts
- `3D work: performance comes first` --references--> `exposeTextureWorker()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/textures.ts
- `3D work: performance comes first` --references--> `generateTextures()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/textures.ts

## Import Cycles
- None detected.

## Communities (37 total, 5 thin omitted)

### Community 0 - "store/package.json"
Cohesion: 0.08
Nodes (32): dependencies, @meridian/three-core@*, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.30.6, @shopify/hydrogen-react@^2026.4.4, three@~0.187.0, devDependencies (+24 more)

### Community 1 - "RenderLoop"
Cohesion: 0.24
Nodes (12): Hero3D(), sized(), Customize(), startBoxStudio(), startChair(), startRoom(), 3D work: performance comes first, RenderLoop (+4 more)

### Community 2 - "shopify.ts"
Cohesion: 0.07
Nodes (71): CartCtx, CartProvider(), Ctx, load(), save(), useCart(), COLORS, FIXTURE_COLLECTIONS (+63 more)

### Community 3 - "pages/index.astro"
Cohesion: 0.16
Nodes (10): Props, projects, services, stack, steps, UPWORK_URL, initCursor(), initRail() (+2 more)

### Community 4 - "web/package.json"
Cohesion: 0.14
Nodes (18): dependencies, @anthropic-ai/sdk@^1.8.0, astro@^7.4.11, @fontsource/geist-mono@^5.3.0, @fontsource/instrument-serif@^5.3.0, @fontsource-variable/inter@^5.3.0, @meridian/three-core@*, three@~0.187.0 (+10 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (43): description, devDependencies, eslint@^10.14.0, @eslint/js@^10.0.0, eslint-plugin-astro@^3.2.1, eslint-plugin-react-hooks@^7.1.1, globals@^17.0.0, @playwright/test@1.63.0 (+35 more)

### Community 6 - "deploy"
Cohesion: 0.06
Nodes (34): name, runs-on, steps, concurrency, cancel-in-progress, group, environment, if (+26 more)

### Community 7 - "watch/index.astro"
Cohesion: 0.08
Nodes (37): $, initStickyNav(), toast(), usd(), chapters, configurator, gauges, applyMaterial() (+29 more)

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

### Community 15 - "box/studio.ts"
Cohesion: 0.10
Nodes (14): createDieline(), rebuild(), toVec(), createPallet(), PALLET, PalletPlan, DISCOUNT, MaterialKey (+6 more)

### Community 18 - "index.ts"
Cohesion: 0.09
Nodes (28): assemblySpecs(), AssemblyTexture, paintMesh(), boxSpecs(), chairSpecs(), noise(), WatchTextures, brush (+20 more)

### Community 20 - "assembly/studio.ts"
Cohesion: 0.17
Nodes (18): DEFAULT_OFFSETS, DEFAULT_VIEW, defaultMove(), endOf(), EndState, GLASS_ASIDE, INSTALLED, lastPosition() (+10 more)

### Community 21 - "configurator.ts"
Cohesion: 0.13
Nodes (22): buildBackdrops(), ARMREST_PRICE, BASE_PRICE, ChairConfig, COLORS, FabricKey, FABRICS, FrameKey (+14 more)

### Community 22 - "ProjectChapter.astro"
Cohesion: 0.29
Nodes (3): Props, Project, withBase()

### Community 23 - "Duy Q. — 3D portfolio & product demos"
Cohesion: 0.50
Nodes (3): Develop, Duy Q. — 3D portfolio & product demos, Stack

### Community 25 - "app.ts"
Cohesion: 0.13
Nodes (8): ease(), esc(), pad(), startAssembly(), STUDIO, cloneGuide(), partsOf(), globals

### Community 26 - "watch/stage.ts"
Cohesion: 0.19
Nodes (13): KEYS, Pose, ShotKey, SHOTS, startWatch(), loadWatchTextures(), clamp(), damp() (+5 more)

### Community 27 - "startStudio"
Cohesion: 0.20
Nodes (5): AssemblyApi, Guide, esc(), pad(), startStudio()

### Community 28 - "parts.ts"
Cohesion: 0.23
Nodes (13): ACCENT, Look, newLook(), patchLook(), Saved, setXray(), buildParts(), Kit (+5 more)

### Community 29 - "bakeStudio"
Cohesion: 0.18
Nodes (10): createStudioEnvironment(), After finishing a change: ship it to `main`, Before starting any task: build the graphify graph, Checks, Layout, Project notes for Claude, bakeStudio(), DARK_STUDIO (+2 more)

### Community 30 - "BaseLayout.astro"
Cohesion: 0.17
Nodes (3): base, canonical, Props

### Community 31 - "ai.ts"
Cohesion: 0.29
Nodes (9): AiContext, AiMove, AiStep, generateStep(), Place, PLACES, schema(), systemPrompt() (+1 more)

### Community 32 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, @astrojs/check@^0.9.12, sharp@^0.35.5, @types/three@~0.187.0, typescript@~5.9.3, @types/three, typescript, @astrojs/check (+1 more)

### Community 33 - "Story"
Cohesion: 0.29
Nodes (3): sized(), Story(), AdaptiveResolution

### Community 34 - "room/stage.ts"
Cohesion: 0.29
Nodes (6): Framing, NUMERIC, Pose, SECTION_OF, Shot, DEG

### Community 35 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, preview, typecheck

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 244 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$` connect `watch/index.astro` to `RenderLoop`, `pages/index.astro`, `box/studio.ts`, `assembly/studio.ts`, `configurator.ts`, `app.ts`, `startStudio`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `startStudio()` (e.g. with `.captureView()` and `.changed()`) actually correct?**
  _`startStudio()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07563025210084033 - nodes in this community are weakly interconnected._
- **Why does `RenderLoop` connect `RenderLoop` to `Story`, `shopify.ts`, `room/stage.ts`, `box/studio.ts`, `index.ts`, `configurator.ts`, `watch/stage.ts`, `bakeStudio`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `RenderLoop` (e.g. with `3D work: performance comes first` and `Layout`) actually correct?**
  _`RenderLoop` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `shopify.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06664964249233912 - nodes in this community are weakly interconnected._