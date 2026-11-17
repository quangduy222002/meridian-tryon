# Graph Report - portfolio  (2026-11-17)

## Corpus Check
- 113 files · ~91,130 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: .css 9, (none) 5)

## Summary
- 961 nodes · 2272 edges · 44 communities (40 shown, 4 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 116 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8455de2e`
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
- artifact.mjs
- .prettierrc.json
- studio/app.ts
- store/README.md
- symbols.ts
- box/studio.ts
- assembly/app.ts
- configurator.ts
- pages/index.astro
- PlanEditor
- graphify.sh
- plan.ts
- room/app.ts
- room/stage.ts
- furniture.ts
- watch/catalog.ts
- studio/index.astro
- ProjectChapter.astro
- setupThree
- Plan
- watch/stage.ts
- bakeStudio
- BaseLayout.astro
- $
- package.json
- smoke.spec.ts
- eslint.config.js
- devDependencies
- quality.ts
- Duy Q. — 3D portfolio & product demos

## God Nodes (most connected - your core abstractions)
1. `PlanEditor` - 39 edges
2. `startRoomcraft()` - 34 edges
3. `RenderLoop` - 29 edges
4. `$` - 27 edges
5. `startStudio()` - 27 edges
6. `Plan` - 26 edges
7. `startStudio()` - 23 edges
8. `Vec2` - 22 edges
9. `startAssembly()` - 21 edges
10. `getQuality()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Layout` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `Performance rules for 3D` --references--> `RenderLoop`  [INFERRED]
  README.md → packages/three-core/src/loop.ts
- `Performance rules for 3D` --references--> `getQuality()`  [INFERRED]
  README.md → packages/three-core/src/quality.ts
- `Performance rules for 3D` --references--> `AdaptiveResolution`  [INFERRED]
  README.md → packages/three-core/src/quality.ts
- `Layout` --references--> `ScrollDirector`  [INFERRED]
  CLAUDE.md → packages/three-core/src/scroll-director.ts

## Import Cycles
- None detected.

## Communities (44 total, 4 thin omitted)

### Community 0 - "store/package.json"
Cohesion: 0.08
Nodes (30): dependencies, @meridian/three-core@*, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.30.6, three@~0.187.0, devDependencies, @types/react@^19.3.0 (+22 more)

### Community 1 - "RenderLoop"
Cohesion: 0.19
Nodes (13): Hero3D(), sized(), Story(), startBoxStudio(), startChair(), startRoom(), startWatch(), 3D work: performance comes first (+5 more)

### Community 2 - "shopify.ts"
Cohesion: 0.06
Nodes (75): @shopify/hydrogen-react@^2026.4.4, CartCtx, CartProvider(), Ctx, load(), save(), useCart(), COLORS (+67 more)

### Community 3 - "studio/app.ts"
Cohesion: 0.09
Nodes (20): count(), emptyPlan(), SheetHost, SheetView, startStudio(), BlockRef, boundsOf(), inRegion() (+12 more)

### Community 4 - "web/package.json"
Cohesion: 0.06
Nodes (48): dependencies, @anthropic-ai/sdk@^1.8.0, dxf-parser@^1.1.2, @fontsource/geist-mono@^5.3.0, @fontsource/instrument-serif@^5.3.0, @fontsource-variable/inter@^5.3.0, @meridian/three-core@*, pdfjs-dist@^6.5.438 (+40 more)

### Community 5 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, artifact, budget, build, check, dev, dev:store, format (+7 more)

### Community 6 - "deploy"
Cohesion: 0.06
Nodes (34): name, runs-on, steps, concurrency, cancel-in-progress, group, environment, if (+26 more)

### Community 7 - "watch/model.ts"
Cohesion: 0.29
Nodes (10): buildWatch(), createInk(), createMaterials(), dauphine(), ExplodedPart, gearShape(), lathe(), sweptStrap() (+2 more)

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

### Community 13 - "artifact.mjs"
Cohesion: 0.08
Nodes (18): astro, body, bytes, dist, files, head, html, keep (+10 more)

### Community 14 - ".prettierrc.json"
Cohesion: 0.33
Nodes (5): overrides, plugins, printWidth, singleQuote, trailingComma

### Community 15 - "studio/app.ts"
Cohesion: 0.14
Nodes (15): RoomcraftApi, RoomcraftOptions, Selection, Opening, Plan, splitWall(), uid(), Wall (+7 more)

### Community 18 - "symbols.ts"
Cohesion: 0.14
Nodes (22): closestOnSegment(), nodeMap(), snapToWall(), wallEnds(), fold(), labelOf(), LABELS, nameRooms() (+14 more)

### Community 19 - "box/studio.ts"
Cohesion: 0.10
Nodes (17): createDieline(), rebuild(), toVec(), createPallet(), PALLET, PalletPlan, DISCOUNT, MaterialKey (+9 more)

### Community 20 - "assembly/app.ts"
Cohesion: 0.05
Nodes (59): AiContext, AiMove, AiStep, generateStep(), Place, PLACES, schema(), systemPrompt() (+51 more)

### Community 21 - "configurator.ts"
Cohesion: 0.06
Nodes (48): buildBackdrops(), ARMREST_PRICE, BASE_PRICE, ChairConfig, COLORS, FabricKey, FABRICS, FrameKey (+40 more)

### Community 22 - "pages/index.astro"
Cohesion: 0.17
Nodes (8): Props, projects, services, stack, steps, UPWORK_URL, initReveals(), rail

### Community 23 - "PlanEditor"
Cohesion: 0.14
Nodes (6): EditorHost, PlanEditor, Item, PlanNode, tidy(), Vec2

### Community 25 - "plan.ts"
Cohesion: 0.12
Nodes (27): DEFAULT_STYLE, Finish, FLOORS, FURNITURE, FURNITURE_PRICE, FurnitureDef, OPENING_PRICE, ROOM_DEFAULTS (+19 more)

### Community 26 - "room/app.ts"
Cohesion: 0.19
Nodes (25): hostClaude(), esc(), HINTS, rovingToolbar(), startRoomcraft(), renderInspector(), Estimate, estimate() (+17 more)

### Community 27 - "room/stage.ts"
Cohesion: 0.33
Nodes (5): Framing, NUMERIC, Pose, SECTION_OF, Shot

### Community 28 - "furniture.ts"
Cohesion: 0.19
Nodes (10): Add, builders, buildFurniture(), geoCache, LAMP_TYPES, mainCache, mainMat(), rbox() (+2 more)

### Community 29 - "watch/catalog.ts"
Cohesion: 0.12
Nodes (20): chapters, configurator, gauges, BASE_PRICE, CaseKey, CaseOption, CASES, Config (+12 more)

### Community 30 - "studio/index.astro"
Cohesion: 0.24
Nodes (4): Props, gl, gl, hasWebGL()

### Community 31 - "ProjectChapter.astro"
Cohesion: 0.29
Nodes (3): Props, Project, withBase()

### Community 33 - "Plan"
Cohesion: 0.24
Nodes (4): House, metreUVs(), wallReach(), RoomTexture

### Community 36 - "watch/stage.ts"
Cohesion: 0.19
Nodes (10): KEYS, Pose, ShotKey, SHOTS, damp(), lerp(), smoothstep(), TAU (+2 more)

### Community 39 - "bakeStudio"
Cohesion: 0.18
Nodes (10): createStudioEnvironment(), After finishing a change: ship it to `main`, Before starting any task: build the graphify graph, Checks, Layout, Project notes for Claude, bakeStudio(), DARK_STUDIO (+2 more)

### Community 41 - "BaseLayout.astro"
Cohesion: 0.11
Nodes (5): astro@^7.4.11, base, canonical, Props, astro

### Community 45 - "$"
Cohesion: 0.24
Nodes (11): $, announce(), initCursor(), initRail(), initStickyNav(), liveRegion, toast(), usd() (+3 more)

### Community 46 - "package.json"
Cohesion: 0.25
Nodes (7): description, engines, node, name, private, type, workspaces

### Community 47 - "smoke.spec.ts"
Cohesion: 0.20
Nodes (4): @playwright/test@1.63.0, @playwright/test, pages3d, V

### Community 48 - "eslint.config.js"
Cohesion: 0.18
Nodes (10): @eslint/js@^10.0.0, eslint-plugin-astro@^3.2.1, eslint-plugin-react-hooks@^7.1.1, globals@^17.0.0, typescript-eslint@^8.72.2, @eslint/js, eslint-plugin-astro, eslint-plugin-react-hooks (+2 more)

### Community 49 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, eslint@^10.14.0, prettier@^3.10.1, prettier-plugin-astro@^1.1.2, typescript@~5.9.3, typescript, eslint, prettier (+1 more)

### Community 50 - "quality.ts"
Cohesion: 0.32
Nodes (6): detectTier(), gpuName(), PRESETS, Quality, Tier, RendererOptions

### Community 51 - "Duy Q. — 3D portfolio & product demos"
Cohesion: 0.40
Nodes (4): Develop, Duy Q. — 3D portfolio & product demos, Performance rules for 3D, Stack

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 298 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$` connect `$` to `setupThree`, `RenderLoop`, `studio/app.ts`, `studio/app.ts`, `box/studio.ts`, `assembly/app.ts`, `configurator.ts`, `pages/index.astro`, `room/app.ts`, `watch/catalog.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `startRoomcraft()` (e.g. with `.deleteSelection()` and `.draw()`) actually correct?**
  _`startRoomcraft()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07954545454545454 - nodes in this community are weakly interconnected._
- **Why does `RenderLoop` connect `RenderLoop` to `setupThree`, `shopify.ts`, `watch/stage.ts`, `bakeStudio`, `box/studio.ts`, `assembly/app.ts`, `configurator.ts`, `Duy Q. — 3D portfolio & product demos`, `room/app.ts`, `room/stage.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `RenderLoop` (e.g. with `3D work: performance comes first` and `Layout`) actually correct?**
  _`RenderLoop` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `shopify.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06330625895843286 - nodes in this community are weakly interconnected._