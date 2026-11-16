# Graph Report - meridian-tryon  (2026-11-16)

## Corpus Check
- 88 files · ~53,305 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: .css 7, (none) 5)

## Summary
- 676 nodes · 1375 edges · 31 communities (27 shown, 4 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `14b2d670`
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
- watch/index.astro
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
- src/environment.ts
- assembly/studio.ts
- configurator.ts
- Duy Q. — 3D portfolio & product demos
- graphify.sh
- app.ts
- watch/textures.ts
- startStudio
- parts.ts
- Project notes for Claude
- ai.ts
- Studio

## God Nodes (most connected - your core abstractions)
1. `startStudio()` - 27 edges
2. `RenderLoop` - 25 edges
3. `$` - 22 edges
4. `startBoxStudio()` - 19 edges
5. `startChair()` - 19 edges
6. `getQuality()` - 17 edges
7. `AssemblyApi` - 16 edges
8. `startWatch()` - 16 edges
9. `Customize()` - 15 edges
10. `createRenderer()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `3D work: performance comes first` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `3D work: performance comes first` --references--> `getQuality()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/quality.ts
- `3D work: performance comes first` --references--> `precompile()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/renderer.ts
- `Layout` --references--> `generateTextures()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/textures.ts
- `Layout` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts

## Import Cycles
- None detected.

## Communities (31 total, 4 thin omitted)

### Community 0 - "store/package.json"
Cohesion: 0.08
Nodes (32): dependencies, @meridian/three-core@*, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.30.6, @shopify/hydrogen-react@^2026.4.4, three@~0.187.0, devDependencies (+24 more)

### Community 1 - "box/studio.ts"
Cohesion: 0.05
Nodes (61): Hero3D(), sized(), Customize(), sized(), Story(), $, announce(), liveRegion (+53 more)

### Community 2 - "shopify.ts"
Cohesion: 0.07
Nodes (71): CartCtx, CartProvider(), Ctx, load(), save(), useCart(), COLORS, FIXTURE_COLLECTIONS (+63 more)

### Community 3 - "pages/index.astro"
Cohesion: 0.06
Nodes (22): Props, Props, Project, projects, services, stack, steps, UPWORK_URL (+14 more)

### Community 4 - "web/package.json"
Cohesion: 0.08
Nodes (32): dependencies, @anthropic-ai/sdk@^1.8.0, astro@^7.4.11, @fontsource/geist-mono@^5.3.0, @fontsource/instrument-serif@^5.3.0, @fontsource-variable/inter@^5.3.0, @meridian/three-core@*, three@~0.187.0 (+24 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (43): description, devDependencies, eslint@^10.14.0, @eslint/js@^10.0.0, eslint-plugin-astro@^3.2.1, eslint-plugin-react-hooks@^7.1.1, globals@^17.0.0, @playwright/test@1.63.0 (+35 more)

### Community 6 - "deploy"
Cohesion: 0.06
Nodes (34): name, runs-on, steps, concurrency, cancel-in-progress, group, environment, if (+26 more)

### Community 7 - "watch/index.astro"
Cohesion: 0.13
Nodes (20): BASE_PRICE, CaseKey, CaseOption, CASES, DialKey, DialOption, DIALS, StrapKey (+12 more)

### Community 8 - "three-core/package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, @types/three@~0.187.0, typescript@~5.9.3, exports, ./math, ./support, three (+9 more)

### Community 9 - "ref_three"
Cohesion: 0.13
Nodes (20): PALLET, PalletPlan, createFloorShadow(), createLightShafts(), gradientCanvas(), buildRoom(), Hotspot, mat() (+12 more)

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
Cohesion: 0.25
Nodes (9): 3D work: performance comes first, canPaintInWorker(), Ctx2D, exposeTextureWorker(), GenerateOptions, generateTextures(), paintFlipped(), TextureSpec (+1 more)

### Community 18 - "index.ts"
Cohesion: 0.23
Nodes (9): assemblySpecs(), AssemblyTexture, paintMesh(), boxSpecs(), BoxTexture, chairSpecs(), noise(), rand32() (+1 more)

### Community 19 - "src/environment.ts"
Cohesion: 0.24
Nodes (5): DARK_STUDIO, LIGHT_STUDIO, LightCard, FrameCallback, LoopOptions

### Community 20 - "assembly/studio.ts"
Cohesion: 0.15
Nodes (20): DEFAULT_OFFSETS, DEFAULT_VIEW, defaultMove(), endOf(), EndState, GLASS_ASIDE, INSTALLED, lastPosition() (+12 more)

### Community 21 - "configurator.ts"
Cohesion: 0.13
Nodes (21): buildBackdrops(), ARMREST_PRICE, BASE_PRICE, ChairConfig, COLORS, FabricKey, FABRICS, FrameKey (+13 more)

### Community 23 - "Duy Q. — 3D portfolio & product demos"
Cohesion: 0.50
Nodes (3): Develop, Duy Q. — 3D portfolio & product demos, Stack

### Community 25 - "app.ts"
Cohesion: 0.13
Nodes (8): ease(), esc(), pad(), startAssembly(), STUDIO, cloneGuide(), partsOf(), globals

### Community 26 - "watch/textures.ts"
Cohesion: 0.19
Nodes (11): WatchTextures, brush, cotes, dial(), engrave, grain, perlage, rehaut (+3 more)

### Community 27 - "startStudio"
Cohesion: 0.23
Nodes (3): AssemblyApi, Guide, startStudio()

### Community 28 - "parts.ts"
Cohesion: 0.23
Nodes (13): ACCENT, Look, newLook(), patchLook(), Saved, setXray(), buildParts(), Kit (+5 more)

### Community 29 - "Project notes for Claude"
Cohesion: 0.40
Nodes (4): After finishing a change: ship it to `main`, Before starting any task: build the graphify graph, Checks, Project notes for Claude

### Community 31 - "ai.ts"
Cohesion: 0.29
Nodes (9): AiContext, AiMove, AiStep, generateStep(), Place, PLACES, schema(), systemPrompt() (+1 more)

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 245 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$` connect `box/studio.ts` to `pages/index.astro`, `assembly/studio.ts`, `configurator.ts`, `app.ts`, `startStudio`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `startStudio()` (e.g. with `.captureView()` and `.changed()`) actually correct?**
  _`startStudio()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07563025210084033 - nodes in this community are weakly interconnected._
- **Why does `RenderLoop` connect `box/studio.ts` to `shopify.ts`, `src/environment.ts`, `configurator.ts`, `src/textures.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `RenderLoop` (e.g. with `3D work: performance comes first` and `Layout`) actually correct?**
  _`RenderLoop` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `box/studio.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05459770114942529 - nodes in this community are weakly interconnected._