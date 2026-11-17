# Graph Report - portfolio  (2026-11-17)

## Corpus Check
- 109 files · ~82,697 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: .css 9, (none) 5)

## Summary
- 918 nodes · 2142 edges · 46 communities (40 shown, 6 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 114 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `53e1166f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store/package.json
- RenderLoop
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
- watch/stage.ts
- store/README.md
- editor2d.ts
- box/studio.ts
- assembly/studio.ts
- configurator.ts
- pages/index.astro
- PlanEditor
- graphify.sh
- plan.ts
- room/app.ts
- $
- watch/model.ts
- watch/index.astro
- studio/index.astro
- ProjectChapter.astro
- setupThree
- Plan
- room/ai.ts
- AdaptiveResolution
- room/stage.ts
- assembly/app.ts
- startStudio
- bakeStudio
- parts.ts
- BaseLayout.astro
- furniture.ts
- assembly/ai.ts
- Studio
- .paint

## God Nodes (most connected - your core abstractions)
1. `PlanEditor` - 39 edges
2. `startRoomcraft()` - 33 edges
3. `RenderLoop` - 27 edges
4. `startStudio()` - 27 edges
5. `$` - 27 edges
6. `Plan` - 24 edges
7. `startStudio()` - 20 edges
8. `Vec2` - 20 edges
9. `SheetView` - 19 edges
10. `startBoxStudio()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Layout` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `Layout` --references--> `ScrollDirector`  [INFERRED]
  CLAUDE.md → packages/three-core/src/scroll-director.ts
- `Layout` --references--> `generateTextures()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/textures.ts
- `3D work: performance comes first` --references--> `exposeTextureWorker()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/textures.ts
- `3D work: performance comes first` --references--> `generateTextures()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/textures.ts

## Import Cycles
- None detected.

## Communities (46 total, 6 thin omitted)

### Community 0 - "store/package.json"
Cohesion: 0.08
Nodes (30): dependencies, @meridian/three-core@*, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.30.6, three@~0.187.0, devDependencies, @types/react@^19.3.0 (+22 more)

### Community 1 - "RenderLoop"
Cohesion: 0.28
Nodes (10): Customize(), Story(), startBoxStudio(), startChair(), startRoom(), 3D work: performance comes first, RenderLoop, getQuality() (+2 more)

### Community 2 - "shopify.ts"
Cohesion: 0.06
Nodes (75): @shopify/hydrogen-react@^2026.4.4, CartCtx, CartProvider(), Ctx, load(), save(), useCart(), sized() (+67 more)

### Community 3 - "studio/app.ts"
Cohesion: 0.09
Nodes (22): count(), emptyPlan(), SheetHost, SheetView, Stage, startStudio(), detectWalls(), boundsOf() (+14 more)

### Community 4 - "web/package.json"
Cohesion: 0.07
Nodes (36): dependencies, @anthropic-ai/sdk@^1.8.0, astro@^7.4.11, dxf-parser@^1.1.2, @fontsource/geist-mono@^5.3.0, @fontsource/instrument-serif@^5.3.0, @fontsource-variable/inter@^5.3.0, @meridian/three-core@* (+28 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (43): description, devDependencies, eslint@^10.14.0, @eslint/js@^10.0.0, eslint-plugin-astro@^3.2.1, eslint-plugin-react-hooks@^7.1.1, globals@^17.0.0, @playwright/test@1.63.0 (+35 more)

### Community 6 - "deploy"
Cohesion: 0.06
Nodes (34): name, runs-on, steps, concurrency, cancel-in-progress, group, environment, if (+26 more)

### Community 7 - "watch/catalog.ts"
Cohesion: 0.14
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

### Community 15 - "watch/stage.ts"
Cohesion: 0.32
Nodes (6): KEYS, Pose, ShotKey, SHOTS, loadWatchTextures(), generateTextures()

### Community 18 - "editor2d.ts"
Cohesion: 0.18
Nodes (11): OPENING_WIDTH, Selection, Tool, Opening, OpeningKind, splitWall(), Wall, wallEnds() (+3 more)

### Community 19 - "box/studio.ts"
Cohesion: 0.12
Nodes (14): createDieline(), rebuild(), toVec(), createPallet(), PALLET, PalletPlan, DISCOUNT, MaterialKey (+6 more)

### Community 20 - "assembly/studio.ts"
Cohesion: 0.17
Nodes (18): DEFAULT_OFFSETS, DEFAULT_VIEW, defaultMove(), endOf(), EndState, GLASS_ASIDE, INSTALLED, lastPosition() (+10 more)

### Community 21 - "configurator.ts"
Cohesion: 0.05
Nodes (52): assemblySpecs(), AssemblyTexture, paintMesh(), boxSpecs(), buildBackdrops(), ARMREST_PRICE, BASE_PRICE, ChairConfig (+44 more)

### Community 22 - "pages/index.astro"
Cohesion: 0.19
Nodes (7): Props, projects, services, stack, steps, UPWORK_URL, rail

### Community 23 - "PlanEditor"
Cohesion: 0.17
Nodes (6): PlanEditor, closestOnSegment(), PlanNode, tidy(), uid(), Vec2

### Community 25 - "plan.ts"
Cohesion: 0.15
Nodes (23): DEFAULT_STYLE, Finish, FLOORS, FURNITURE, FURNITURE_PRICE, FurnitureDef, OPENING_PRICE, ROOM_DEFAULTS (+15 more)

### Community 26 - "room/app.ts"
Cohesion: 0.21
Nodes (22): esc(), HINTS, rovingToolbar(), startRoomcraft(), renderInspector(), Estimate, estimate(), len() (+14 more)

### Community 27 - "$"
Cohesion: 0.27
Nodes (11): $, announce(), initCursor(), initRail(), liveRegion, toast(), usd(), applyMaterial() (+3 more)

### Community 28 - "watch/model.ts"
Cohesion: 0.26
Nodes (11): buildWatch(), createInk(), createMaterials(), dauphine(), ExplodedPart, gearShape(), lathe(), sweptStrap() (+3 more)

### Community 29 - "watch/index.astro"
Cohesion: 0.29
Nodes (5): initStickyNav(), initReveals(), chapters, configurator, gauges

### Community 30 - "studio/index.astro"
Cohesion: 0.24
Nodes (4): Props, gl, gl, hasWebGL()

### Community 31 - "ProjectChapter.astro"
Cohesion: 0.29
Nodes (3): Props, Project, withBase()

### Community 33 - "Plan"
Cohesion: 0.13
Nodes (8): RoomcraftApi, RoomcraftOptions, House, metreUVs(), Plan, Room, roomAt(), RoomTexture

### Community 34 - "room/ai.ts"
Cohesion: 0.36
Nodes (9): AiItem, corners(), describeRoom(), furnishRoom(), keepInside(), r2(), schema, systemPrompt() (+1 more)

### Community 35 - "AdaptiveResolution"
Cohesion: 0.18
Nodes (6): Hero3D(), AdaptiveResolution, Develop, Duy Q. — 3D portfolio & product demos, Performance rules for 3D, Stack

### Community 36 - "room/stage.ts"
Cohesion: 0.18
Nodes (13): Framing, NUMERIC, Pose, SECTION_OF, Shot, startWatch(), clamp(), damp() (+5 more)

### Community 37 - "assembly/app.ts"
Cohesion: 0.13
Nodes (8): ease(), esc(), pad(), startAssembly(), STUDIO, cloneGuide(), partsOf(), globals

### Community 38 - "startStudio"
Cohesion: 0.20
Nodes (5): AssemblyApi, Guide, esc(), pad(), startStudio()

### Community 39 - "bakeStudio"
Cohesion: 0.18
Nodes (10): createStudioEnvironment(), After finishing a change: ship it to `main`, Before starting any task: build the graphify graph, Checks, Layout, Project notes for Claude, bakeStudio(), DARK_STUDIO (+2 more)

### Community 40 - "parts.ts"
Cohesion: 0.23
Nodes (13): ACCENT, Look, newLook(), patchLook(), Saved, setXray(), buildParts(), Kit (+5 more)

### Community 41 - "BaseLayout.astro"
Cohesion: 0.13
Nodes (3): base, canonical, Props

### Community 42 - "furniture.ts"
Cohesion: 0.19
Nodes (10): Add, builders, buildFurniture(), geoCache, LAMP_TYPES, mainCache, mainMat(), rbox() (+2 more)

### Community 43 - "assembly/ai.ts"
Cohesion: 0.29
Nodes (9): AiContext, AiMove, AiStep, generateStep(), Place, PLACES, schema(), systemPrompt() (+1 more)

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 282 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$` connect `$` to `setupThree`, `RenderLoop`, `studio/app.ts`, `assembly/app.ts`, `startStudio`, `watch/catalog.ts`, `box/studio.ts`, `assembly/studio.ts`, `configurator.ts`, `pages/index.astro`, `room/app.ts`, `watch/index.astro`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `startRoomcraft()` (e.g. with `.deleteSelection()` and `.draw()`) actually correct?**
  _`startRoomcraft()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07954545454545454 - nodes in this community are weakly interconnected._
- **Why does `RenderLoop` connect `RenderLoop` to `setupThree`, `shopify.ts`, `AdaptiveResolution`, `room/stage.ts`, `bakeStudio`, `watch/stage.ts`, `box/studio.ts`, `configurator.ts`, `room/app.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `RenderLoop` (e.g. with `3D work: performance comes first` and `Layout`) actually correct?**
  _`RenderLoop` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `shopify.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06217858812529219 - nodes in this community are weakly interconnected._