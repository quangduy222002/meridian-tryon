# Graph Report - portfolio  (2026-11-19)

## Corpus Check
- 119 files · ~111,843 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: .css 9, (none) 7)

## Summary
- 1081 nodes · 2531 edges · 52 communities (46 shown, 6 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 121 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `21aabb00`
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
- watch/catalog.ts
- studio/index.astro
- ProjectChapter.astro
- setupThree
- .syncStructure
- parts.ts
- RenderLoop
- BaseLayout.astro
- room/look.ts
- furniture.ts
- bakeStudio
- watch/textures.ts
- startStudio
- store.ts
- assembly/ai.ts
- $
- watch/model.ts
- Studio
- room/textures.ts
- watch/index.astro
- lighting.ts
- quality.ts
- Duy Q. — 3D portfolio & product demos

## God Nodes (most connected - your core abstractions)
1. `startRoomcraft()` - 45 edges
2. `PlanEditor` - 39 edges
3. `Plan` - 34 edges
4. `$` - 28 edges
5. `Vec2` - 27 edges
6. `startStudio()` - 27 edges
7. `RenderLoop` - 27 edges
8. `startStudio()` - 27 edges
9. `nodeMap()` - 24 edges
10. `startAssembly()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Layout` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `Layout` --references--> `ScrollDirector`  [INFERRED]
  CLAUDE.md → packages/three-core/src/scroll-director.ts
- `3D work: performance comes first` --references--> `generateTextures()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/textures.ts
- `Layout` --references--> `generateTextures()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/textures.ts
- `3D work: performance comes first` --references--> `exposeTextureWorker()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/textures.ts

## Import Cycles
- None detected.

## Communities (52 total, 6 thin omitted)

### Community 0 - "store/package.json"
Cohesion: 0.08
Nodes (31): dependencies, @meridian/three-core@*, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.30.6, @shopify/hydrogen-react@^2026.4.4, three@~0.187.0, devDependencies (+23 more)

### Community 1 - "RenderLoop"
Cohesion: 0.12
Nodes (18): Framing, NUMERIC, Pose, SECTION_OF, Shot, KEYS, Pose, ShotKey (+10 more)

### Community 2 - "shopify.ts"
Cohesion: 0.07
Nodes (70): CartCtx, CartProvider(), Ctx, load(), save(), useCart(), COLORS, FIXTURE_COLLECTIONS (+62 more)

### Community 3 - "studio/app.ts"
Cohesion: 0.05
Nodes (55): splitWall(), uid(), count(), emptyPlan(), SheetHost, SheetView, Stage, startStudio() (+47 more)

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
Cohesion: 0.15
Nodes (25): ease(), esc(), pad(), startAssembly(), STUDIO, cloneGuide(), DEFAULT_OFFSETS, DEFAULT_VIEW (+17 more)

### Community 21 - "index.ts"
Cohesion: 0.13
Nodes (17): assemblySpecs(), AssemblyTexture, paintMesh(), boxSpecs(), chairSpecs(), noise(), FrameCallback, LoopOptions (+9 more)

### Community 22 - "pages/index.astro"
Cohesion: 0.19
Nodes (7): Props, projects, services, stack, steps, UPWORK_URL, rail

### Community 23 - "PlanEditor"
Cohesion: 0.11
Nodes (9): RoomcraftApi, RoomcraftOptions, EditorHost, PlanEditor, Item, Plan, tidy(), Vec2 (+1 more)

### Community 25 - "plan.ts"
Cohesion: 0.17
Nodes (18): Finish, FLOORS, FURNITURE, FURNITURE_PRICE, FurnitureDef, GROUPS, OPENING_PRICE, WALLS (+10 more)

### Community 26 - "room/app.ts"
Cohesion: 0.11
Nodes (24): hostClaude(), HostDownloads, hostDownloads(), HostError, HostSample, hostUse(), saveFile(), uses (+16 more)

### Community 27 - "plan.ts"
Cohesion: 0.12
Nodes (25): DEFAULT_STYLE, ROOM_DEFAULTS, OPENING_WIDTH, Selection, Tool, addStorey(), centroidOf(), closestOnSegment() (+17 more)

### Community 28 - "room/ai.ts"
Cohesion: 0.21
Nodes (15): hostFailure(), AiItem, askApi(), askHost(), compass(), corners(), describeRoom(), furnishRoom() (+7 more)

### Community 29 - "watch/catalog.ts"
Cohesion: 0.14
Nodes (17): BASE_PRICE, CaseKey, CaseOption, CASES, Config, DialKey, DialOption, DIALS (+9 more)

### Community 30 - "studio/index.astro"
Cohesion: 0.24
Nodes (4): Props, gl, gl, hasWebGL()

### Community 31 - "ProjectChapter.astro"
Cohesion: 0.29
Nodes (3): Props, Project, withBase()

### Community 32 - "setupThree"
Cohesion: 0.23
Nodes (6): setupThree(), createLook(), DOOR_HEIGHT, Solid, solidsOf(), Walker

### Community 33 - ".syncStructure"
Cohesion: 0.17
Nodes (5): setFixtureGlow(), House, metreUVs(), skirtingGeo(), RoomTexture

### Community 34 - "parts.ts"
Cohesion: 0.21
Nodes (14): ACCENT, globals, Look, newLook(), patchLook(), Saved, setXray(), buildParts() (+6 more)

### Community 35 - "RenderLoop"
Cohesion: 0.16
Nodes (18): Hero3D(), sized(), buildCap(), Customize(), drawEmbroidery(), sized(), Story(), startBoxStudio() (+10 more)

### Community 36 - "BaseLayout.astro"
Cohesion: 0.13
Nodes (3): base, canonical, Props

### Community 38 - "furniture.ts"
Cohesion: 0.16
Nodes (18): Add, artwork(), Build, builders, buildFurniture(), cached(), cyl(), diningChair() (+10 more)

### Community 39 - "bakeStudio"
Cohesion: 0.18
Nodes (10): createStudioEnvironment(), After finishing a change: ship it to `main`, Before starting any task: build the graphify graph, Checks, Layout, Project notes for Claude, bakeStudio(), DARK_STUDIO (+2 more)

### Community 40 - "watch/textures.ts"
Cohesion: 0.19
Nodes (11): WatchTextures, brush, cotes, dial(), engrave, grain, perlage, rehaut (+3 more)

### Community 41 - "startStudio"
Cohesion: 0.20
Nodes (5): AssemblyApi, Guide, esc(), pad(), startStudio()

### Community 42 - "store.ts"
Cohesion: 0.26
Nodes (12): samplePlan(), autosave(), clearLinkHash(), compact(), fromB64(), isPlan(), loadInitial(), normalise() (+4 more)

### Community 43 - "assembly/ai.ts"
Cohesion: 0.29
Nodes (9): AiContext, AiMove, AiStep, generateStep(), Place, PLACES, schema(), systemPrompt() (+1 more)

### Community 44 - "$"
Cohesion: 0.21
Nodes (12): $, announce(), initCursor(), initRail(), initStickyNav(), liveRegion, toast(), usd() (+4 more)

### Community 45 - "watch/model.ts"
Cohesion: 0.29
Nodes (10): buildWatch(), createInk(), createMaterials(), dauphine(), ExplodedPart, gearShape(), lathe(), sweptStrap() (+2 more)

### Community 48 - "watch/index.astro"
Cohesion: 0.33
Nodes (4): initReveals(), chapters, configurator, gauges

### Community 49 - "lighting.ts"
Cohesion: 0.40
Nodes (5): AUTO, BACK, designLighting(), edgeDistance(), kelvinColor()

### Community 50 - "quality.ts"
Cohesion: 0.32
Nodes (6): detectTier(), gpuName(), PRESETS, Quality, Tier, RendererOptions

### Community 51 - "Duy Q. — 3D portfolio & product demos"
Cohesion: 0.50
Nodes (3): Develop, Duy Q. — 3D portfolio & product demos, Stack

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 352 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$` connect `$` to `setupThree`, `RenderLoop`, `studio/app.ts`, `configurator.ts`, `startStudio`, `watch/index.astro`, `box/studio.ts`, `assembly/app.ts`, `pages/index.astro`, `room/app.ts`, `watch/catalog.ts`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `startRoomcraft()` (e.g. with `.deleteSelection()` and `.draw()`) actually correct?**
  _`startRoomcraft()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0766488413547237 - nodes in this community are weakly interconnected._
- **Why does `RenderLoop` connect `RenderLoop` to `RenderLoop`, `shopify.ts`, `configurator.ts`, `bakeStudio`, `box/studio.ts`, `assembly/app.ts`, `index.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `RenderLoop` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Why does `startRoomcraft()` connect `room/app.ts` to `setupThree`, `studio/app.ts`, `store.ts`, `$`, `export.ts`, `lighting.ts`, `PlanEditor`, `plan.ts`, `plan.ts`, `room/ai.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._