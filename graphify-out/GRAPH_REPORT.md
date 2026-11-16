# Graph Report - meridian-tryon  (2026-11-16)

## Corpus Check
- 108 files · ~82,680 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: .css 9, (none) 5)

## Summary
- 898 nodes · 2126 edges · 41 communities (37 shown, 4 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 108 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7e3085ca`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store/package.json
- Customize.tsx
- shopify.ts
- studio/app.ts
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
- ScrollDirector
- store/README.md
- quality.ts
- box/studio.ts
- assembly/app.ts
- configurator.ts
- pages/index.astro
- PlanEditor
- graphify.sh
- plan.ts
- room/app.ts
- $
- watch/model.ts
- watch/index.astro
- room/index.astro
- ProjectChapter.astro
- setupThree
- Plan
- room/ai.ts
- Duy Q. — 3D portfolio & product demos
- watch/stage.ts
- EditorHost
- House
- bakeStudio
- room/stage.ts

## God Nodes (most connected - your core abstractions)
1. `PlanEditor` - 39 edges
2. `startRoomcraft()` - 33 edges
3. `RenderLoop` - 29 edges
4. `$` - 27 edges
5. `startStudio()` - 27 edges
6. `Plan` - 24 edges
7. `startAssembly()` - 21 edges
8. `getQuality()` - 21 edges
9. `Vec2` - 20 edges
10. `startBoxStudio()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Layout` --references--> `bakeStudio()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/environment.ts
- `Layout` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `3D work: performance comes first` --references--> `exposeTextureWorker()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/textures.ts
- `3D work: performance comes first` --references--> `generateTextures()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/textures.ts
- `Layout` --references--> `generateTextures()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/textures.ts

## Import Cycles
- None detected.

## Communities (41 total, 4 thin omitted)

### Community 0 - "store/package.json"
Cohesion: 0.08
Nodes (31): dependencies, @meridian/three-core@*, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.30.6, @shopify/hydrogen-react@^2026.4.4, three@~0.187.0, devDependencies (+23 more)

### Community 1 - "Customize.tsx"
Cohesion: 0.16
Nodes (14): Hero3D(), sized(), sized(), Story(), startBoxStudio(), startRoom(), startWatch(), 3D work: performance comes first (+6 more)

### Community 2 - "shopify.ts"
Cohesion: 0.07
Nodes (73): CartCtx, CartProvider(), Ctx, load(), save(), useCart(), COLORS, FIXTURE_COLLECTIONS (+65 more)

### Community 3 - "studio/app.ts"
Cohesion: 0.10
Nodes (24): emptyPlan(), SheetHost, SheetView, Stage, startStudio(), DetectResult, detectWalls(), Line (+16 more)

### Community 4 - "web/package.json"
Cohesion: 0.06
Nodes (39): dependencies, @anthropic-ai/sdk@^1.8.0, astro@^7.4.11, dxf-parser@^1.1.2, @fontsource/geist-mono@^5.3.0, @fontsource/instrument-serif@^5.3.0, @fontsource-variable/inter@^5.3.0, @meridian/three-core@* (+31 more)

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
Cohesion: 0.11
Nodes (22): createFloorShadow(), createLightShafts(), gradientCanvas(), buildRoom(), Hotspot, mat(), rbox(), createDust() (+14 more)

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

### Community 15 - "ScrollDirector"
Cohesion: 0.25
Nodes (6): After finishing a change: ship it to `main`, Before starting any task: build the graphify graph, Checks, Layout, Project notes for Claude, ScrollDirector

### Community 18 - "quality.ts"
Cohesion: 0.32
Nodes (6): detectTier(), gpuName(), PRESETS, Quality, Tier, RendererOptions

### Community 19 - "box/studio.ts"
Cohesion: 0.09
Nodes (17): createDieline(), rebuild(), toVec(), createPallet(), PALLET, PalletPlan, DISCOUNT, MaterialKey (+9 more)

### Community 20 - "assembly/app.ts"
Cohesion: 0.06
Nodes (56): AiContext, AiMove, AiStep, generateStep(), Place, PLACES, schema(), systemPrompt() (+48 more)

### Community 21 - "configurator.ts"
Cohesion: 0.05
Nodes (53): usd(), assemblySpecs(), AssemblyTexture, paintMesh(), buildBackdrops(), ARMREST_PRICE, BASE_PRICE, ChairConfig (+45 more)

### Community 22 - "pages/index.astro"
Cohesion: 0.19
Nodes (7): Props, projects, services, stack, steps, UPWORK_URL, rail

### Community 23 - "PlanEditor"
Cohesion: 0.20
Nodes (3): PlanEditor, tidy(), wallEnds()

### Community 25 - "plan.ts"
Cohesion: 0.12
Nodes (32): DEFAULT_STYLE, Finish, FLOORS, FURNITURE, FURNITURE_PRICE, FurnitureDef, OPENING_PRICE, ROOM_DEFAULTS (+24 more)

### Community 26 - "room/app.ts"
Cohesion: 0.20
Nodes (24): esc(), HINTS, rovingToolbar(), startRoomcraft(), renderInspector(), Estimate, estimate(), len() (+16 more)

### Community 27 - "$"
Cohesion: 0.25
Nodes (9): $, announce(), initCursor(), initRail(), initStickyNav(), liveRegion, toast(), applyMaterial() (+1 more)

### Community 28 - "watch/model.ts"
Cohesion: 0.29
Nodes (10): buildWatch(), createInk(), createMaterials(), dauphine(), ExplodedPart, gearShape(), lathe(), sweptStrap() (+2 more)

### Community 29 - "watch/index.astro"
Cohesion: 0.29
Nodes (5): initReveals(), chapters, configurator, gauges, initMetalButtons()

### Community 30 - "room/index.astro"
Cohesion: 0.24
Nodes (4): Props, gl, gl, hasWebGL()

### Community 31 - "ProjectChapter.astro"
Cohesion: 0.29
Nodes (3): Props, Project, withBase()

### Community 33 - "Plan"
Cohesion: 0.20
Nodes (5): RoomcraftApi, Selection, WallView, Plan, Vec2

### Community 34 - "room/ai.ts"
Cohesion: 0.39
Nodes (8): AiItem, corners(), describeRoom(), furnishRoom(), keepInside(), r2(), schema, systemPrompt()

### Community 35 - "Duy Q. — 3D portfolio & product demos"
Cohesion: 0.50
Nodes (3): Develop, Duy Q. — 3D portfolio & product demos, Stack

### Community 36 - "watch/stage.ts"
Cohesion: 0.22
Nodes (10): KEYS, Pose, ShotKey, SHOTS, loadWatchTextures(), damp(), lerp(), smoothstep() (+2 more)

### Community 37 - "EditorHost"
Cohesion: 0.22
Nodes (3): RoomcraftOptions, EditorHost, Room

### Community 38 - "House"
Cohesion: 0.28
Nodes (3): House, metreUVs(), RoomTexture

### Community 39 - "bakeStudio"
Cohesion: 0.38
Nodes (5): createStudioEnvironment(), bakeStudio(), DARK_STUDIO, LIGHT_STUDIO, LightCard

### Community 40 - "room/stage.ts"
Cohesion: 0.33
Nodes (5): Framing, NUMERIC, Pose, SECTION_OF, Shot

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 267 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$` connect `$` to `setupThree`, `Customize.tsx`, `studio/app.ts`, `watch/catalog.ts`, `box/studio.ts`, `assembly/app.ts`, `configurator.ts`, `pages/index.astro`, `room/app.ts`, `watch/index.astro`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `startRoomcraft()` (e.g. with `.deleteSelection()` and `.draw()`) actually correct?**
  _`startRoomcraft()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0766488413547237 - nodes in this community are weakly interconnected._
- **Why does `RenderLoop` connect `Customize.tsx` to `setupThree`, `shopify.ts`, `watch/stage.ts`, `room/stage.ts`, `ScrollDirector`, `box/studio.ts`, `assembly/app.ts`, `configurator.ts`, `room/app.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `RenderLoop` (e.g. with `3D work: performance comes first` and `Layout`) actually correct?**
  _`RenderLoop` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `shopify.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06617826617826618 - nodes in this community are weakly interconnected._