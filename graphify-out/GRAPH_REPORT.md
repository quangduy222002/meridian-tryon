# Graph Report - portfolio  (2026-11-17)

## Corpus Check
- 111 files · ~89,930 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: .css 9, (none) 5)

## Summary
- 947 nodes · 2219 edges · 53 communities (47 shown, 6 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 113 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a62cb607`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store/package.json
- RenderLoop
- shopify.ts
- studio/app.ts
- web/package.json
- scripts
- deploy
- watch/model.ts
- three-core/package.json
- ref_three
- compilerOptions
- compilerOptions
- web/tsconfig.json
- check-bundle.mjs
- .prettierrc.json
- plan.ts
- store/README.md
- symbols.ts
- box/studio.ts
- assembly/studio.ts
- configurator.ts
- pages/index.astro
- PlanEditor
- graphify.sh
- plan.ts
- room/app.ts
- studio/app.ts
- furniture.ts
- watch/catalog.ts
- studio/index.astro
- ProjectChapter.astro
- setupThree
- Plan
- room/ai.ts
- index.ts
- math.ts
- assembly/app.ts
- startStudio
- bakeStudio
- parts.ts
- BaseLayout.astro
- watch/index.astro
- assembly/ai.ts
- Studio
- $
- package.json
- smoke.spec.ts
- eslint.config.js
- devDependencies
- quality.ts
- Duy Q. — 3D portfolio & product demos
- loop.ts

## God Nodes (most connected - your core abstractions)
1. `PlanEditor` - 39 edges
2. `startRoomcraft()` - 33 edges
3. `startStudio()` - 27 edges
4. `$` - 27 edges
5. `Plan` - 26 edges
6. `RenderLoop` - 25 edges
7. `startStudio()` - 23 edges
8. `Vec2` - 22 edges
9. `nodeMap()` - 20 edges
10. `SheetView` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Layout` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `3D work: performance comes first` --references--> `exposeTextureWorker()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/textures.ts
- `3D work: performance comes first` --references--> `generateTextures()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/textures.ts
- `Layout` --references--> `generateTextures()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/textures.ts
- `Layout` --references--> `bakeStudio()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/environment.ts

## Import Cycles
- None detected.

## Communities (53 total, 6 thin omitted)

### Community 0 - "store/package.json"
Cohesion: 0.08
Nodes (31): dependencies, @meridian/three-core@*, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.30.6, @shopify/hydrogen-react@^2026.4.4, three@~0.187.0, devDependencies (+23 more)

### Community 1 - "RenderLoop"
Cohesion: 0.14
Nodes (21): Hero3D(), Story(), startBoxStudio(), startChair(), Framing, NUMERIC, Pose, SECTION_OF (+13 more)

### Community 2 - "shopify.ts"
Cohesion: 0.06
Nodes (75): CartCtx, CartProvider(), Ctx, load(), save(), useCart(), sized(), COLORS (+67 more)

### Community 3 - "studio/app.ts"
Cohesion: 0.17
Nodes (5): count(), emptyPlan(), SheetHost, SheetView, startStudio()

### Community 4 - "web/package.json"
Cohesion: 0.07
Nodes (36): dependencies, @anthropic-ai/sdk@^1.8.0, astro@^7.4.11, dxf-parser@^1.1.2, @fontsource/geist-mono@^5.3.0, @fontsource/instrument-serif@^5.3.0, @fontsource-variable/inter@^5.3.0, @meridian/three-core@* (+28 more)

### Community 5 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, budget, build, check, dev, dev:store, format, format:check (+6 more)

### Community 6 - "deploy"
Cohesion: 0.06
Nodes (34): name, runs-on, steps, concurrency, cancel-in-progress, group, environment, if (+26 more)

### Community 7 - "watch/model.ts"
Cohesion: 0.12
Nodes (22): buildWatch(), createInk(), createMaterials(), dauphine(), ExplodedPart, gearShape(), lathe(), sweptStrap() (+14 more)

### Community 8 - "three-core/package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, @types/three@~0.187.0, typescript@~5.9.3, exports, ./math, ./support, three (+9 more)

### Community 9 - "ref_three"
Cohesion: 0.24
Nodes (12): createFloorShadow(), createLightShafts(), gradientCanvas(), buildRoom(), Hotspot, mat(), rbox(), createDust() (+4 more)

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

### Community 15 - "plan.ts"
Cohesion: 0.24
Nodes (12): OPENING_WIDTH, Tool, Opening, OpeningKind, PlanNode, splitWall(), tidy(), uid() (+4 more)

### Community 18 - "symbols.ts"
Cohesion: 0.14
Nodes (21): closestOnSegment(), nodeMap(), snapToWall(), wallEnds(), fold(), labelOf(), LABELS, nameRooms() (+13 more)

### Community 19 - "box/studio.ts"
Cohesion: 0.12
Nodes (14): createDieline(), rebuild(), toVec(), createPallet(), PALLET, PalletPlan, DISCOUNT, MaterialKey (+6 more)

### Community 20 - "assembly/studio.ts"
Cohesion: 0.17
Nodes (18): DEFAULT_OFFSETS, DEFAULT_VIEW, defaultMove(), endOf(), EndState, GLASS_ASIDE, INSTALLED, lastPosition() (+10 more)

### Community 21 - "configurator.ts"
Cohesion: 0.13
Nodes (22): buildBackdrops(), ARMREST_PRICE, BASE_PRICE, ChairConfig, COLORS, FabricKey, FABRICS, FrameKey (+14 more)

### Community 22 - "pages/index.astro"
Cohesion: 0.19
Nodes (7): Props, projects, services, stack, steps, UPWORK_URL, rail

### Community 23 - "PlanEditor"
Cohesion: 0.14
Nodes (5): EditorHost, PlanEditor, WallView, Vec2, Solid

### Community 25 - "plan.ts"
Cohesion: 0.15
Nodes (22): DEFAULT_STYLE, Finish, FLOORS, FURNITURE, FURNITURE_PRICE, FurnitureDef, OPENING_PRICE, ROOM_DEFAULTS (+14 more)

### Community 26 - "room/app.ts"
Cohesion: 0.17
Nodes (24): esc(), HINTS, rovingToolbar(), startRoomcraft(), renderInspector(), Estimate, estimate(), len() (+16 more)

### Community 27 - "studio/app.ts"
Cohesion: 0.16
Nodes (19): Stage, BlockRef, boundsOf(), Drawing, inRegion(), Region, scaleFromDimensions(), segLen() (+11 more)

### Community 28 - "furniture.ts"
Cohesion: 0.19
Nodes (10): Add, builders, buildFurniture(), geoCache, LAMP_TYPES, mainCache, mainMat(), rbox() (+2 more)

### Community 29 - "watch/catalog.ts"
Cohesion: 0.14
Nodes (16): BASE_PRICE, CaseKey, CaseOption, CASES, Config, DialKey, DialOption, DIALS (+8 more)

### Community 30 - "studio/index.astro"
Cohesion: 0.24
Nodes (4): Props, gl, gl, hasWebGL()

### Community 31 - "ProjectChapter.astro"
Cohesion: 0.29
Nodes (3): Props, Project, withBase()

### Community 33 - "Plan"
Cohesion: 0.12
Nodes (9): RoomcraftApi, RoomcraftOptions, Selection, House, metreUVs(), wallReach(), Plan, RoomTexture (+1 more)

### Community 34 - "room/ai.ts"
Cohesion: 0.33
Nodes (9): AiItem, corners(), describeRoom(), furnishRoom(), keepInside(), r2(), schema, systemPrompt() (+1 more)

### Community 35 - "index.ts"
Cohesion: 0.13
Nodes (19): assemblySpecs(), AssemblyTexture, paintMesh(), boxSpecs(), chairSpecs(), noise(), noise(), roomSpecs() (+11 more)

### Community 36 - "math.ts"
Cohesion: 0.18
Nodes (9): After finishing a change: ship it to `main`, Before starting any task: build the graphify graph, Checks, Layout, Project notes for Claude, clamp(), smoothstep(), ScrollDirector (+1 more)

### Community 37 - "assembly/app.ts"
Cohesion: 0.13
Nodes (8): ease(), esc(), pad(), startAssembly(), STUDIO, cloneGuide(), partsOf(), globals

### Community 38 - "startStudio"
Cohesion: 0.20
Nodes (5): AssemblyApi, Guide, esc(), pad(), startStudio()

### Community 39 - "bakeStudio"
Cohesion: 0.22
Nodes (9): createStudioEnvironment(), KEYS, Pose, ShotKey, SHOTS, bakeStudio(), DARK_STUDIO, LIGHT_STUDIO (+1 more)

### Community 40 - "parts.ts"
Cohesion: 0.23
Nodes (13): ACCENT, Look, newLook(), patchLook(), Saved, setXray(), buildParts(), Kit (+5 more)

### Community 41 - "BaseLayout.astro"
Cohesion: 0.13
Nodes (3): base, canonical, Props

### Community 42 - "watch/index.astro"
Cohesion: 0.29
Nodes (5): initStickyNav(), initReveals(), chapters, configurator, gauges

### Community 43 - "assembly/ai.ts"
Cohesion: 0.29
Nodes (9): AiContext, AiMove, AiStep, generateStep(), Place, PLACES, schema(), systemPrompt() (+1 more)

### Community 45 - "$"
Cohesion: 0.27
Nodes (11): $, announce(), initCursor(), initRail(), liveRegion, toast(), usd(), applyMaterial() (+3 more)

### Community 46 - "package.json"
Cohesion: 0.20
Nodes (9): description, typescript@~5.9.3, engines, node, typescript, name, private, type (+1 more)

### Community 47 - "smoke.spec.ts"
Cohesion: 0.20
Nodes (4): @playwright/test@1.63.0, @playwright/test, pages3d, V

### Community 48 - "eslint.config.js"
Cohesion: 0.22
Nodes (8): @eslint/js@^10.0.0, eslint-plugin-astro@^3.2.1, eslint-plugin-react-hooks@^7.1.1, typescript-eslint@^8.72.2, @eslint/js, eslint-plugin-astro, eslint-plugin-react-hooks, typescript-eslint

### Community 49 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, eslint@^10.14.0, globals@^17.0.0, prettier@^3.10.1, prettier-plugin-astro@^1.1.2, eslint, globals, prettier (+1 more)

### Community 50 - "quality.ts"
Cohesion: 0.32
Nodes (6): detectTier(), gpuName(), PRESETS, Quality, Tier, RendererOptions

### Community 51 - "Duy Q. — 3D portfolio & product demos"
Cohesion: 0.50
Nodes (3): Develop, Duy Q. — 3D portfolio & product demos, Stack

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 284 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$` connect `$` to `setupThree`, `RenderLoop`, `studio/app.ts`, `assembly/app.ts`, `startStudio`, `watch/index.astro`, `box/studio.ts`, `assembly/studio.ts`, `configurator.ts`, `pages/index.astro`, `room/app.ts`, `studio/app.ts`, `watch/catalog.ts`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `startRoomcraft()` (e.g. with `.deleteSelection()` and `.draw()`) actually correct?**
  _`startRoomcraft()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0766488413547237 - nodes in this community are weakly interconnected._
- **Why does `toast()` connect `$` to `RenderLoop`, `studio/app.ts`, `startStudio`, `box/studio.ts`, `assembly/studio.ts`, `configurator.ts`, `room/app.ts`, `studio/app.ts`, `watch/catalog.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `startStudio()` (e.g. with `.captureView()` and `.changed()`) actually correct?**
  _`startStudio()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Should `RenderLoop` be split into smaller, more focused modules?**
  _Cohesion score 0.1365079365079365 - nodes in this community are weakly interconnected._