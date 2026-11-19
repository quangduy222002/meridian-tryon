# Graph Report - portfolio  (2026-11-19)

## Corpus Check
- 120 files · ~118,357 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: .css 9, (none) 7)

## Summary
- 1112 nodes · 2622 edges · 47 communities (44 shown, 3 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 122 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a96950fa`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store/package.json
- ScrollDirector
- shopify.ts
- studio/app.ts
- web/package.json
- package.json
- deploy
- configurator.ts
- three-core/package.json
- build.ts
- compilerOptions
- compilerOptions
- web/tsconfig.json
- artifact.mjs
- .prettierrc.json
- export.ts
- store/README.md
- 4. Danh sách cảnh (bản chính ~88 giây)
- box/studio.ts
- assembly/app.ts
- index.ts
- pages/index.astro
- PlanEditor
- graphify.sh
- plan.ts
- room/app.ts
- plan.ts
- room/ai.ts
- ref_three
- studio/index.astro
- ProjectChapter.astro
- setupThree
- .syncStructure
- symbols.ts
- RenderLoop
- BaseLayout.astro
- room/look.ts
- furniture.ts
- store.ts
- editor2d.ts
- $
- watch/model.ts
- room/textures.ts
- watch/index.astro
- quality.ts
- Duy Q. — 3D portfolio & product demos

## God Nodes (most connected - your core abstractions)
1. `startRoomcraft()` - 50 edges
2. `PlanEditor` - 39 edges
3. `Plan` - 35 edges
4. `startStudio()` - 28 edges
5. `$` - 28 edges
6. `Vec2` - 27 edges
7. `RenderLoop` - 27 edges
8. `startStudio()` - 27 edges
9. `nodeMap()` - 24 edges
10. `setupThree()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Layout` --references--> `bakeStudio()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/environment.ts
- `Layout` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `Layout` --references--> `generateTextures()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/textures.ts
- `3D work: performance comes first` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `3D work: performance comes first` --references--> `getQuality()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/quality.ts

## Import Cycles
- None detected.

## Communities (47 total, 3 thin omitted)

### Community 0 - "store/package.json"
Cohesion: 0.08
Nodes (31): dependencies, @meridian/three-core@*, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.30.6, @shopify/hydrogen-react@^2026.4.4, three@~0.187.0, devDependencies (+23 more)

### Community 1 - "ScrollDirector"
Cohesion: 0.20
Nodes (7): After finishing a change: ship it to `main`, Before starting any task: build the graphify graph, Checks, Layout, Project notes for Claude, ScrollDirector, ScrollSample

### Community 2 - "shopify.ts"
Cohesion: 0.06
Nodes (75): CartCtx, CartProvider(), Ctx, load(), save(), useCart(), sized(), COLORS (+67 more)

### Community 3 - "studio/app.ts"
Cohesion: 0.07
Nodes (41): splitWall(), Wall, count(), emptyPlan(), SheetHost, SheetView, Stage, startStudio() (+33 more)

### Community 4 - "web/package.json"
Cohesion: 0.07
Nodes (36): dependencies, @anthropic-ai/sdk@^1.8.0, astro@^7.4.11, dxf-parser@^1.1.2, @fontsource/geist-mono@^5.3.0, @fontsource/instrument-serif@^5.3.0, @fontsource-variable/inter@^5.3.0, @meridian/three-core@* (+28 more)

### Community 5 - "package.json"
Cohesion: 0.06
Nodes (43): description, devDependencies, eslint@^10.14.0, @eslint/js@^10.0.0, eslint-plugin-astro@^3.2.1, eslint-plugin-react-hooks@^7.1.1, globals@^17.0.0, @playwright/test@1.63.0 (+35 more)

### Community 6 - "deploy"
Cohesion: 0.06
Nodes (34): name, runs-on, steps, concurrency, cancel-in-progress, group, environment, if (+26 more)

### Community 7 - "configurator.ts"
Cohesion: 0.13
Nodes (22): buildBackdrops(), ARMREST_PRICE, BASE_PRICE, ChairConfig, COLORS, FabricKey, FABRICS, FrameKey (+14 more)

### Community 8 - "three-core/package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, @types/three@~0.187.0, typescript@~5.9.3, exports, ./math, ./support, three (+9 more)

### Community 9 - "build.ts"
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
Cohesion: 0.06
Nodes (20): astro, body, bytes, dist, files, head, html, keep (+12 more)

### Community 14 - ".prettierrc.json"
Cohesion: 0.33
Nodes (5): overrides, plugins, printWidth, singleQuote, trailingComma

### Community 15 - "export.ts"
Cohesion: 0.17
Nodes (17): add(), Arc, CRC, crc32(), draw(), Drawing, esc(), LAYERS (+9 more)

### Community 18 - "4. Danh sách cảnh (bản chính ~88 giây)"
Cohesion: 0.10
Nodes (20): 1. Tóm tắt, 2. Nơi quay, 3. Chuẩn bị trước khi quay, 4. Danh sách cảnh (bản chính ~88 giây), 5. Phong cách hình ảnh khi dựng, 6. Những điều không được làm, 7. Bản ngắn 30 giây (mạng xã hội), 8. Kiểm tra trước khi xuất clip (+12 more)

### Community 19 - "box/studio.ts"
Cohesion: 0.12
Nodes (14): createDieline(), rebuild(), toVec(), createPallet(), PALLET, PalletPlan, DISCOUNT, MaterialKey (+6 more)

### Community 20 - "assembly/app.ts"
Cohesion: 0.05
Nodes (59): AiContext, AiMove, AiStep, generateStep(), Place, PLACES, schema(), systemPrompt() (+51 more)

### Community 21 - "index.ts"
Cohesion: 0.09
Nodes (27): boxSpecs(), BoxTexture, chairSpecs(), noise(), loadWatchTextures(), brush, cotes, dial() (+19 more)

### Community 22 - "pages/index.astro"
Cohesion: 0.19
Nodes (7): Props, projects, services, stack, steps, UPWORK_URL, rail

### Community 23 - "PlanEditor"
Cohesion: 0.11
Nodes (9): RoomcraftApi, RoomcraftOptions, EditorHost, PlanEditor, Item, Plan, PlanNode, Vec2 (+1 more)

### Community 25 - "plan.ts"
Cohesion: 0.16
Nodes (17): DEFAULT_STYLE, Finish, FLOORS, FURNITURE, FURNITURE_PRICE, GROUPS, OPENING_PRICE, ROOM_DEFAULTS (+9 more)

### Community 26 - "room/app.ts"
Cohesion: 0.12
Nodes (22): DrawingShot, esc(), HINTS, rovingToolbar(), startRoomcraft(), renderInspector(), Estimate, estimate() (+14 more)

### Community 27 - "plan.ts"
Cohesion: 0.23
Nodes (13): addStorey(), ceilingOpenings(), centroidOf(), emptyFloor(), findRooms(), floorOnly(), floorOpenings(), HOME_WIDE (+5 more)

### Community 28 - "room/ai.ts"
Cohesion: 0.07
Nodes (41): hostClaude(), HostDownloads, hostDownloads(), HostError, hostFailure(), HostSample, hostUse(), saveFile() (+33 more)

### Community 29 - "ref_three"
Cohesion: 0.24
Nodes (8): createStudioEnvironment(), KEYS, Pose, ShotKey, SHOTS, bakeStudio(), DARK_STUDIO, LightCard

### Community 30 - "studio/index.astro"
Cohesion: 0.24
Nodes (4): Props, gl, gl, hasWebGL()

### Community 31 - "ProjectChapter.astro"
Cohesion: 0.29
Nodes (3): Props, Project, withBase()

### Community 32 - "setupThree"
Cohesion: 0.26
Nodes (5): setupThree(), DOOR_HEIGHT, Solid, solidsOf(), Walker

### Community 33 - ".syncStructure"
Cohesion: 0.17
Nodes (7): setFixtureGlow(), House, metreUVs(), skirtingGeo(), FloorOpening, pointInPoly(), roomAt()

### Community 34 - "symbols.ts"
Cohesion: 0.12
Nodes (25): AUTO, BACK, designLighting(), edgeDistance(), kelvinColor(), closestOnSegment(), nodeMap(), snapToWall() (+17 more)

### Community 35 - "RenderLoop"
Cohesion: 0.13
Nodes (21): Hero3D(), Story(), startBoxStudio(), startChair(), Framing, NUMERIC, Pose, SECTION_OF (+13 more)

### Community 36 - "BaseLayout.astro"
Cohesion: 0.13
Nodes (3): base, canonical, Props

### Community 37 - "room/look.ts"
Cohesion: 0.22
Nodes (3): BACKDROP, createLook(), Look

### Community 38 - "furniture.ts"
Cohesion: 0.14
Nodes (25): Add, artwork(), Build, buildCustom(), builders, buildFurniture(), cached(), customMat() (+17 more)

### Community 39 - "store.ts"
Cohesion: 0.38
Nodes (9): samplePlan(), compact(), fromB64(), isPlan(), loadInitial(), normalise(), pipe(), shareUrl() (+1 more)

### Community 41 - "editor2d.ts"
Cohesion: 0.25
Nodes (6): OPENING_WIDTH, paintStair(), Selection, Tool, Opening, OpeningKind

### Community 44 - "$"
Cohesion: 0.22
Nodes (15): $, announce(), initCursor(), initRail(), liveRegion, toast(), usd(), applyMaterial() (+7 more)

### Community 45 - "watch/model.ts"
Cohesion: 0.12
Nodes (21): BASE_PRICE, CaseKey, CaseOption, CASES, DialKey, DialOption, DIALS, StrapKey (+13 more)

### Community 47 - "room/textures.ts"
Cohesion: 0.22
Nodes (3): roomSpecs(), RoomTexture, TILE_METRES

### Community 48 - "watch/index.astro"
Cohesion: 0.18
Nodes (8): initStickyNav(), initReveals(), chapters, configurator, gauges, Config, WatchStage, initMetalButtons()

### Community 50 - "quality.ts"
Cohesion: 0.32
Nodes (6): detectTier(), gpuName(), PRESETS, Quality, Tier, RendererOptions

### Community 51 - "Duy Q. — 3D portfolio & product demos"
Cohesion: 0.50
Nodes (3): Develop, Duy Q. — 3D portfolio & product demos, Stack

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 354 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$` connect `$` to `setupThree`, `RenderLoop`, `studio/app.ts`, `configurator.ts`, `watch/index.astro`, `box/studio.ts`, `assembly/app.ts`, `pages/index.astro`, `room/app.ts`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `startRoomcraft()` (e.g. with `.deleteSelection()` and `.draw()`) actually correct?**
  _`startRoomcraft()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0766488413547237 - nodes in this community are weakly interconnected._
- **Why does `toast()` connect `$` to `RenderLoop`, `studio/app.ts`, `configurator.ts`, `box/studio.ts`, `assembly/app.ts`, `room/app.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `startStudio()` (e.g. with `.cancelCalibration()` and `.draw()`) actually correct?**
  _`startStudio()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Should `shopify.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0638148667601683 - nodes in this community are weakly interconnected._