# Graph Report - portfolio  (2026-11-17)

## Corpus Check
- 116 files · ~99,209 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: .css 9, (none) 5)

## Summary
- 1027 nodes · 2379 edges · 46 communities (41 shown, 5 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 115 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2e475199`
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
- configurator.ts
- pages/index.astro
- PlanEditor
- graphify.sh
- plan.ts
- room/app.ts
- devDependencies
- room/ai.ts
- $
- studio/index.astro
- ProjectChapter.astro
- setupThree
- .syncStructure
- loop.ts
- RenderLoop
- BaseLayout.astro
- room/look.ts
- furniture.ts
- bakeStudio
- startStudio
- store.ts
- assembly/ai.ts
- Studio
- quality.ts
- Duy Q. — 3D portfolio & product demos

## God Nodes (most connected - your core abstractions)
1. `PlanEditor` - 39 edges
2. `startRoomcraft()` - 37 edges
3. `Plan` - 30 edges
4. `RenderLoop` - 27 edges
5. `startStudio()` - 27 edges
6. `$` - 27 edges
7. `Vec2` - 26 edges
8. `nodeMap()` - 24 edges
9. `startStudio()` - 23 edges
10. `startAssembly()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Layout` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `Performance rules for 3D` --references--> `AdaptiveResolution`  [INFERRED]
  README.md → packages/three-core/src/quality.ts
- `Layout` --references--> `ScrollDirector`  [INFERRED]
  CLAUDE.md → packages/three-core/src/scroll-director.ts
- `3D work: performance comes first` --references--> `precompile()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/renderer.ts
- `3D work: performance comes first` --references--> `generateTextures()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/textures.ts

## Import Cycles
- None detected.

## Communities (46 total, 5 thin omitted)

### Community 0 - "store/package.json"
Cohesion: 0.08
Nodes (30): dependencies, @meridian/three-core@*, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.30.6, three@~0.187.0, devDependencies, @types/react@^19.3.0 (+22 more)

### Community 1 - "RenderLoop"
Cohesion: 0.12
Nodes (20): Framing, NUMERIC, Pose, SECTION_OF, Shot, startRoom(), KEYS, Pose (+12 more)

### Community 2 - "shopify.ts"
Cohesion: 0.06
Nodes (75): @shopify/hydrogen-react@^2026.4.4, CartCtx, CartProvider(), Ctx, load(), save(), useCart(), COLORS (+67 more)

### Community 3 - "studio/app.ts"
Cohesion: 0.05
Nodes (54): RoomcraftApi, RoomcraftOptions, centroidOf(), findRooms(), Plan, pointInPoly(), roomKey(), signedArea() (+46 more)

### Community 4 - "web/package.json"
Cohesion: 0.12
Nodes (22): dependencies, @anthropic-ai/sdk@^1.8.0, astro@^7.4.11, dxf-parser@^1.1.2, @fontsource/geist-mono@^5.3.0, @fontsource/instrument-serif@^5.3.0, @fontsource-variable/inter@^5.3.0, @meridian/three-core@* (+14 more)

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
Nodes (15): createDieline(), rebuild(), toVec(), createPallet(), PALLET, PalletPlan, DISCOUNT, MaterialKey (+7 more)

### Community 20 - "assembly/app.ts"
Cohesion: 0.13
Nodes (28): ease(), esc(), pad(), startAssembly(), STUDIO, cloneGuide(), DEFAULT_OFFSETS, DEFAULT_VIEW (+20 more)

### Community 21 - "configurator.ts"
Cohesion: 0.06
Nodes (42): ACCENT, globals, Look, newLook(), patchLook(), Saved, setXray(), buildParts() (+34 more)

### Community 22 - "pages/index.astro"
Cohesion: 0.15
Nodes (10): Props, projects, services, stack, steps, UPWORK_URL, initCursor(), initRail() (+2 more)

### Community 23 - "PlanEditor"
Cohesion: 0.14
Nodes (10): startRoomcraft(), EditorHost, PlanEditor, closestOnSegment(), Item, splitWall(), uid(), Vec2 (+2 more)

### Community 25 - "plan.ts"
Cohesion: 0.13
Nodes (33): esc(), renderInspector(), DEFAULT_STYLE, Finish, FLOORS, FURNITURE, FURNITURE_PRICE, FurnitureDef (+25 more)

### Community 26 - "room/app.ts"
Cohesion: 0.11
Nodes (12): hostClaude(), HostDownloads, hostDownloads(), HostError, HostSample, hostUse(), saveFile(), uses (+4 more)

### Community 27 - "devDependencies"
Cohesion: 0.13
Nodes (14): devDependencies, @astrojs/check@^0.9.12, sharp@^0.35.5, @types/three@~0.187.0, typescript@~5.9.3, @types/three, typescript, scripts (+6 more)

### Community 28 - "room/ai.ts"
Cohesion: 0.22
Nodes (14): hostFailure(), AiItem, askApi(), askHost(), compass(), corners(), describeRoom(), furnishRoom() (+6 more)

### Community 29 - "$"
Cohesion: 0.07
Nodes (40): $, announce(), initStickyNav(), liveRegion, toast(), usd(), chapters, configurator (+32 more)

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
Cohesion: 0.24
Nodes (4): House, metreUVs(), skirtingGeo(), RoomTexture

### Community 35 - "RenderLoop"
Cohesion: 0.25
Nodes (10): Hero3D(), sized(), Customize(), startBoxStudio(), startChair(), 3D work: performance comes first, RenderLoop, getQuality() (+2 more)

### Community 36 - "BaseLayout.astro"
Cohesion: 0.13
Nodes (3): base, canonical, Props

### Community 37 - "room/look.ts"
Cohesion: 0.25
Nodes (3): BACKDROP, createLook(), Look

### Community 38 - "furniture.ts"
Cohesion: 0.19
Nodes (10): Add, builders, buildFurniture(), geoCache, LAMP_TYPES, mainCache, mainMat(), rbox() (+2 more)

### Community 39 - "bakeStudio"
Cohesion: 0.18
Nodes (10): createStudioEnvironment(), After finishing a change: ship it to `main`, Before starting any task: build the graphify graph, Checks, Layout, Project notes for Claude, bakeStudio(), DARK_STUDIO (+2 more)

### Community 41 - "startStudio"
Cohesion: 0.23
Nodes (3): AssemblyApi, Guide, startStudio()

### Community 42 - "store.ts"
Cohesion: 0.26
Nodes (12): samplePlan(), autosave(), clearLinkHash(), compact(), fromB64(), isPlan(), loadInitial(), normalise() (+4 more)

### Community 43 - "assembly/ai.ts"
Cohesion: 0.29
Nodes (9): AiContext, AiMove, AiStep, generateStep(), Place, PLACES, schema(), systemPrompt() (+1 more)

### Community 50 - "quality.ts"
Cohesion: 0.32
Nodes (6): detectTier(), gpuName(), PRESETS, Quality, Tier, RendererOptions

### Community 51 - "Duy Q. — 3D portfolio & product demos"
Cohesion: 0.50
Nodes (3): Develop, Duy Q. — 3D portfolio & product demos, Stack

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 339 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$` connect `$` to `setupThree`, `RenderLoop`, `studio/app.ts`, `configurator.ts`, `startStudio`, `box/studio.ts`, `assembly/app.ts`, `pages/index.astro`, `PlanEditor`, `room/app.ts`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `startRoomcraft()` (e.g. with `.deleteSelection()` and `.draw()`) actually correct?**
  _`startRoomcraft()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07954545454545454 - nodes in this community are weakly interconnected._
- **Why does `react` connect `shopify.ts` to `store/package.json`, `RenderLoop`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `RenderLoop` (e.g. with `3D work: performance comes first` and `Layout`) actually correct?**
  _`RenderLoop` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `RenderLoop` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._