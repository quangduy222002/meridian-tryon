# Graph Report - portfolio  (2026-11-19)

## Corpus Check
- 120 files · ~121,379 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: .css 9, (none) 7)

## Summary
- 1121 nodes · 2650 edges · 46 communities (39 shown, 7 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 122 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `105f3978`
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
- SheetView
- room/app.ts
- plan.ts
- room/ai.ts
- bakeStudio
- studio/index.astro
- ProjectChapter.astro
- watch/catalog.ts
- house.ts
- symbols.ts
- RenderLoop
- RoomcraftApi
- room/look.ts
- furniture.ts
- loop.ts
- editor2d.ts
- $
- watch/model.ts
- room/textures.ts
- watch/index.astro
- Duy Q. — 3D portfolio & product demos

## God Nodes (most connected - your core abstractions)
1. `startRoomcraft()` - 52 edges
2. `PlanEditor` - 39 edges
3. `Plan` - 36 edges
4. `startStudio()` - 28 edges
5. `$` - 28 edges
6. `RenderLoop` - 27 edges
7. `Vec2` - 27 edges
8. `startStudio()` - 27 edges
9. `nodeMap()` - 24 edges
10. `setupThree()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `3D work: performance comes first` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `Layout` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `Layout` --references--> `generateTextures()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/textures.ts
- `Layout` --references--> `bakeStudio()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/environment.ts
- `3D work: performance comes first` --references--> `getQuality()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/quality.ts

## Import Cycles
- None detected.

## Communities (46 total, 7 thin omitted)

### Community 0 - "store/package.json"
Cohesion: 0.08
Nodes (31): dependencies, @meridian/three-core@*, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.30.6, @shopify/hydrogen-react@^2026.4.4, three@~0.187.0, devDependencies (+23 more)

### Community 1 - "ScrollDirector"
Cohesion: 0.20
Nodes (7): After finishing a change: ship it to `main`, Before starting any task: build the graphify graph, Checks, Layout, Project notes for Claude, ScrollDirector, ScrollSample

### Community 2 - "shopify.ts"
Cohesion: 0.07
Nodes (73): CartCtx, CartProvider(), Ctx, load(), save(), useCart(), COLORS, FIXTURE_COLLECTIONS (+65 more)

### Community 3 - "studio/app.ts"
Cohesion: 0.11
Nodes (37): RoomcraftOptions, Plan, count(), emptyPlan(), Stage, startStudio(), withoutMasks(), DetectResult (+29 more)

### Community 4 - "web/package.json"
Cohesion: 0.06
Nodes (39): dependencies, @anthropic-ai/sdk@^1.8.0, astro@^7.4.11, dxf-parser@^1.1.2, @fontsource/geist-mono@^5.3.0, @fontsource/instrument-serif@^5.3.0, @fontsource-variable/inter@^5.3.0, @meridian/three-core@* (+31 more)

### Community 5 - "package.json"
Cohesion: 0.06
Nodes (43): description, devDependencies, eslint@^10.14.0, @eslint/js@^10.0.0, eslint-plugin-astro@^3.2.1, eslint-plugin-react-hooks@^7.1.1, globals@^17.0.0, @playwright/test@1.63.0 (+35 more)

### Community 6 - "deploy"
Cohesion: 0.06
Nodes (34): name, runs-on, steps, concurrency, cancel-in-progress, group, environment, if (+26 more)

### Community 7 - "configurator.ts"
Cohesion: 0.11
Nodes (25): usd(), updatePrice(), buildBackdrops(), ARMREST_PRICE, BASE_PRICE, ChairConfig, COLORS, FabricKey (+17 more)

### Community 8 - "three-core/package.json"
Cohesion: 0.13
Nodes (17): description, devDependencies, @types/three@~0.187.0, typescript@~5.9.3, exports, ./math, ./support, three (+9 more)

### Community 9 - "build.ts"
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
Cohesion: 0.11
Nodes (13): createDieline(), rebuild(), toVec(), createPallet(), PALLET, PalletPlan, DISCOUNT, MaterialKey (+5 more)

### Community 20 - "assembly/app.ts"
Cohesion: 0.06
Nodes (56): AiContext, AiMove, AiStep, generateStep(), Place, PLACES, schema(), systemPrompt() (+48 more)

### Community 21 - "index.ts"
Cohesion: 0.09
Nodes (28): assemblySpecs(), AssemblyTexture, paintMesh(), boxSpecs(), BoxTexture, chairSpecs(), noise(), loadWatchTextures() (+20 more)

### Community 22 - "pages/index.astro"
Cohesion: 0.15
Nodes (7): Props, projects, services, stack, steps, UPWORK_URL, rail

### Community 23 - "PlanEditor"
Cohesion: 0.09
Nodes (22): esc(), startRoomcraft(), renderInspector(), EditorHost, paintStair(), PlanEditor, WallView, samplePlan() (+14 more)

### Community 26 - "room/app.ts"
Cohesion: 0.09
Nodes (28): DrawingShot, HINTS, rovingToolbar(), DEFAULT_STYLE, Finish, FLOORS, FURNITURE_PRICE, GROUPS (+20 more)

### Community 27 - "plan.ts"
Cohesion: 0.20
Nodes (15): addStorey(), ceilingOpenings(), centroidOf(), emptyFloor(), findRooms(), floorOnly(), floorOpenings(), HOME_WIDE (+7 more)

### Community 28 - "room/ai.ts"
Cohesion: 0.06
Nodes (47): hostClaude(), HostDownloads, hostDownloads(), HostError, hostFailure(), HostSample, hostUse(), saveFile() (+39 more)

### Community 29 - "bakeStudio"
Cohesion: 0.38
Nodes (5): createStudioEnvironment(), bakeStudio(), DARK_STUDIO, LIGHT_STUDIO, LightCard

### Community 30 - "studio/index.astro"
Cohesion: 0.24
Nodes (4): Props, gl, gl, hasWebGL()

### Community 31 - "ProjectChapter.astro"
Cohesion: 0.29
Nodes (3): Props, Project, withBase()

### Community 32 - "watch/catalog.ts"
Cohesion: 0.14
Nodes (17): BASE_PRICE, CaseKey, CaseOption, CASES, Config, DialKey, DialOption, DIALS (+9 more)

### Community 33 - "house.ts"
Cohesion: 0.11
Nodes (15): setupThree(), setFixtureGlow(), BUMP, House, metreUVs(), skirtingGeo(), skirtingGeos, DOOR_HEIGHT (+7 more)

### Community 34 - "symbols.ts"
Cohesion: 0.15
Nodes (17): tidy(), fold(), labelOf(), LABELS, nameRooms(), Box, fold(), FoundSymbol (+9 more)

### Community 35 - "RenderLoop"
Cohesion: 0.11
Nodes (27): Hero3D(), sized(), sized(), Story(), startBoxStudio(), startChair(), Framing, NUMERIC (+19 more)

### Community 37 - "room/look.ts"
Cohesion: 0.22
Nodes (3): BACKDROP, createLook(), Look

### Community 38 - "furniture.ts"
Cohesion: 0.14
Nodes (25): Add, artwork(), Build, buildCustom(), builders, buildFurniture(), cached(), customMat() (+17 more)

### Community 41 - "editor2d.ts"
Cohesion: 0.14
Nodes (20): FURNITURE, OPENING_WIDTH, Tool, AUTO, BACK, designLighting(), edgeDistance(), kelvinColor() (+12 more)

### Community 44 - "$"
Cohesion: 0.25
Nodes (9): $, announce(), initCursor(), initRail(), initStickyNav(), liveRegion, toast(), applyMaterial() (+1 more)

### Community 45 - "watch/model.ts"
Cohesion: 0.26
Nodes (11): buildWatch(), createInk(), createMaterials(), dauphine(), ExplodedPart, gearShape(), lathe(), sweptStrap() (+3 more)

### Community 48 - "watch/index.astro"
Cohesion: 0.33
Nodes (4): initReveals(), chapters, configurator, gauges

### Community 51 - "Duy Q. — 3D portfolio & product demos"
Cohesion: 0.50
Nodes (3): Develop, Duy Q. — 3D portfolio & product demos, Stack

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 354 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$` connect `$` to `watch/catalog.ts`, `house.ts`, `RenderLoop`, `studio/app.ts`, `configurator.ts`, `watch/index.astro`, `box/studio.ts`, `assembly/app.ts`, `pages/index.astro`, `PlanEditor`, `room/app.ts`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `startRoomcraft()` (e.g. with `.deleteSelection()` and `.draw()`) actually correct?**
  _`startRoomcraft()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0766488413547237 - nodes in this community are weakly interconnected._
- **Why does `startRoomcraft()` connect `PlanEditor` to `house.ts`, `studio/app.ts`, `RoomcraftApi`, `furniture.ts`, `configurator.ts`, `editor2d.ts`, `$`, `export.ts`, `room/app.ts`, `plan.ts`, `room/ai.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `startStudio()` (e.g. with `.cancelCalibration()` and `.draw()`) actually correct?**
  _`startStudio()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Should `shopify.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06617826617826618 - nodes in this community are weakly interconnected._