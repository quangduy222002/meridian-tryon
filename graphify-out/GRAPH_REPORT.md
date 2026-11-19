# Graph Report - portfolio  (2026-11-19)

## Corpus Check
- 125 files · ~143,145 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: .css 9, (none) 7)

## Summary
- 1258 nodes · 2785 edges · 52 communities (47 shown, 5 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 122 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1199fa86`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store/package.json
- src/textures.ts
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
- Geometric / rule-based algorithms for parsing vector floor plans (PDF/DXF segments + text) into walls, openings and rooms
- room/app.ts
- plan.ts
- room/ai.ts
- ref_three
- studio/index.astro
- ProjectChapter.astro
- watch/catalog.ts
- house.ts
- Architectural floor plan drawing conventions for automatic parsing (Vietnamese residential focus)
- RenderLoop
- RoomcraftApi
- room/look.ts
- furniture.ts
- Learned floor plan understanding and floor-plan-to-model tools (state of the art, transferability, expected accuracy)
- Combining vision-language models with geometric parsing for floor plan understanding
- editor2d.ts
- BaseLayout.astro
- estimate.ts
- $
- watch/stage.ts
- setupThree
- room/textures.ts
- watch/index.astro
- store.ts
- Để hình học đếm, để Claude đọc bản vẽ
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
- `Layout` --references--> `ScrollDirector`  [INFERRED]
  CLAUDE.md → packages/three-core/src/scroll-director.ts
- `Layout` --references--> `bakeStudio()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/environment.ts
- `3D work: performance comes first` --references--> `getQuality()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/quality.ts

## Import Cycles
- None detected.

## Communities (52 total, 5 thin omitted)

### Community 0 - "store/package.json"
Cohesion: 0.09
Nodes (25): @meridian/three-core@*, three@~0.187.0, devDependencies, @types/react@^19.3.0, @types/react-dom@^19.3.0, @types/three@~0.187.0, typescript@~5.9.3, vite@^8.3.8 (+17 more)

### Community 1 - "src/textures.ts"
Cohesion: 0.18
Nodes (12): 3D work: performance comes first, After finishing a change: ship it to `main`, Before starting any task: build the graphify graph, Checks, Layout, Project notes for Claude, canPaintInWorker(), exposeTextureWorker() (+4 more)

### Community 2 - "shopify.ts"
Cohesion: 0.06
Nodes (80): dependencies, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.30.6, @shopify/hydrogen-react@^2026.4.4, CartCtx, CartProvider(), Ctx (+72 more)

### Community 3 - "studio/app.ts"
Cohesion: 0.05
Nodes (54): DrawingShot, splitWall(), count(), emptyPlan(), SheetHost, SheetView, Stage, startStudio() (+46 more)

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
Cohesion: 0.18
Nodes (15): add(), Arc, CRC, crc32(), draw(), Drawing, esc(), LAYERS (+7 more)

### Community 18 - "4. Danh sách cảnh (bản chính ~88 giây)"
Cohesion: 0.10
Nodes (20): 1. Tóm tắt, 2. Nơi quay, 3. Chuẩn bị trước khi quay, 4. Danh sách cảnh (bản chính ~88 giây), 5. Phong cách hình ảnh khi dựng, 6. Những điều không được làm, 7. Bản ngắn 30 giây (mạng xã hội), 8. Kiểm tra trước khi xuất clip (+12 more)

### Community 19 - "box/studio.ts"
Cohesion: 0.13
Nodes (13): createDieline(), rebuild(), toVec(), createPallet(), PALLET, PalletPlan, DISCOUNT, MaterialKey (+5 more)

### Community 20 - "assembly/app.ts"
Cohesion: 0.06
Nodes (56): AiContext, AiMove, AiStep, generateStep(), Place, PLACES, schema(), systemPrompt() (+48 more)

### Community 21 - "index.ts"
Cohesion: 0.14
Nodes (14): assemblySpecs(), AssemblyTexture, paintMesh(), boxSpecs(), BoxTexture, chairSpecs(), noise(), FrameCallback (+6 more)

### Community 22 - "pages/index.astro"
Cohesion: 0.19
Nodes (7): Props, projects, services, stack, steps, UPWORK_URL, rail

### Community 23 - "PlanEditor"
Cohesion: 0.13
Nodes (7): EditorHost, paintStair(), PlanEditor, WallView, PlanNode, Vec2, Solid

### Community 25 - "Geometric / rule-based algorithms for parsing vector floor plans (PDF/DXF segments + text) into walls, openings and rooms"
Cohesion: 0.05
Nodes (36): 1. Wall detection (parallel-line pairing, skeletons, hatch/stroke/layer features, merging, junctions), 2. Openings (door arcs/leaves, windows, gap closing), 3. Room segmentation (noding, planar graph, face extraction, filtering, labels), 4. Annotation separation (dimensions, grids, leaders, hatches, title block, setbacks, furniture), 5. Scale inference, 6. Multi-plan sheets, alignment between floors, rotation, 7. Robustness, performance and evaluation, Cited Findings (+28 more)

### Community 26 - "room/app.ts"
Cohesion: 0.10
Nodes (29): hostClaude(), HostDownloads, hostDownloads(), HostError, HostSample, hostUse(), saveFile(), uses (+21 more)

### Community 27 - "plan.ts"
Cohesion: 0.20
Nodes (15): addStorey(), ceilingOpenings(), centroidOf(), emptyFloor(), findRooms(), floorOnly(), floorOpenings(), HOME_WIDE (+7 more)

### Community 28 - "room/ai.ts"
Cohesion: 0.08
Nodes (39): hostFailure(), adoptCustoms(), AiItem, AiQuestion, askJson(), Brain, cleanStyle(), compass() (+31 more)

### Community 29 - "ref_three"
Cohesion: 0.17
Nodes (11): createStudioEnvironment(), bakeStudio(), DARK_STUDIO, LIGHT_STUDIO, LightCard, detectTier(), gpuName(), PRESETS (+3 more)

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
Nodes (17): setFixtureGlow(), BUMP, House, metreUVs(), skirtingGeo(), skirtingGeos, FloorOpening, pointInPoly() (+9 more)

### Community 34 - "Architectural floor plan drawing conventions for automatic parsing (Vietnamese residential focus)"
Cohesion: 0.06
Nodes (31): Architectural floor plan drawing conventions for automatic parsing (Vietnamese residential focus), Cited Findings, Cited Findings, Cited Findings, Cited Findings, Cited Findings, Cited Findings, Cut walls vs projection lines: line weights, hatches, structure vs masonry, wall thicknesses (+23 more)

### Community 35 - "RenderLoop"
Cohesion: 0.13
Nodes (21): Hero3D(), sized(), Story(), startBoxStudio(), startChair(), Framing, NUMERIC, Pose (+13 more)

### Community 36 - "RoomcraftApi"
Cohesion: 0.20
Nodes (4): RoomcraftApi, RoomcraftOptions, Selection, Plan

### Community 38 - "furniture.ts"
Cohesion: 0.15
Nodes (23): Add, artwork(), Build, buildCustom(), builders, buildFurniture(), cached(), customMat() (+15 more)

### Community 39 - "Learned floor plan understanding and floor-plan-to-model tools (state of the art, transferability, expected accuracy)"
Cohesion: 0.06
Nodes (31): Cited findings, Cited findings, Cited findings, Cited findings, Cited findings, Cited findings, Commercial products and their approach (what they ask the user, how they handle errors), Datasets and models: input, output, reported metrics, licence, browser feasibility (+23 more)

### Community 40 - "Combining vision-language models with geometric parsing for floor plan understanding"
Cohesion: 0.07
Nodes (26): 1. Measured capabilities and failure modes of VLMs on floor plans and technical drawings, 2. Coordinate grounding techniques (Set-of-Mark, grids, IDs, tiling, image plus structured list), 3. Division of labour between the VLM and the geometry (and existing systems), 4. Prompt patterns, output formats, image budgets, cost and latency, 5. Limits, risks and geometric validation of VLM output, Cited findings, Cited findings, Cited findings (+18 more)

### Community 41 - "editor2d.ts"
Cohesion: 0.18
Nodes (16): OPENING_WIDTH, Tool, AUTO, BACK, designLighting(), edgeDistance(), kelvinColor(), closestOnSegment() (+8 more)

### Community 42 - "BaseLayout.astro"
Cohesion: 0.13
Nodes (3): base, canonical, Props

### Community 43 - "estimate.ts"
Cohesion: 0.18
Nodes (13): DEFAULT_STYLE, Finish, FLOORS, FURNITURE, FURNITURE_PRICE, GROUPS, OPENING_PRICE, ROOM_DEFAULTS (+5 more)

### Community 44 - "$"
Cohesion: 0.21
Nodes (12): $, announce(), initCursor(), initRail(), initStickyNav(), liveRegion, toast(), usd() (+4 more)

### Community 45 - "watch/stage.ts"
Cohesion: 0.10
Nodes (27): buildWatch(), createInk(), createMaterials(), dauphine(), ExplodedPart, gearShape(), lathe(), sweptStrap() (+19 more)

### Community 46 - "setupThree"
Cohesion: 0.26
Nodes (5): setupThree(), createLook(), DOOR_HEIGHT, solidsOf(), Walker

### Community 48 - "watch/index.astro"
Cohesion: 0.33
Nodes (4): initReveals(), chapters, configurator, gauges

### Community 49 - "store.ts"
Cohesion: 0.26
Nodes (12): samplePlan(), autosave(), clearLinkHash(), compact(), fromB64(), isPlan(), loadInitial(), normalise() (+4 more)

### Community 50 - "Để hình học đếm, để Claude đọc bản vẽ"
Cohesion: 0.25
Nodes (7): Bản vẽ Việt Nam mã hóa ngữ nghĩa bằng độ dày nét chứ không bằng layer, Claude giỏi đọc chữ và phán đoán, kém đếm ký hiệu, Ghép cặp song song là đúng hướng, nhưng phải dựa trên histogram độ dày, Kết luận, Mô hình học máy đạt 90 điểm trong phòng thí nghiệm nhưng chưa vào được trình duyệt, Mười kỹ thuật xếp theo tác động lên ba lỗi thật của khách, Để hình học đếm, để Claude đọc bản vẽ

### Community 51 - "Duy Q. — 3D portfolio & product demos"
Cohesion: 0.50
Nodes (3): Develop, Duy Q. — 3D portfolio & product demos, Stack

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 461 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$` connect `$` to `watch/catalog.ts`, `RenderLoop`, `studio/app.ts`, `configurator.ts`, `setupThree`, `watch/index.astro`, `box/studio.ts`, `assembly/app.ts`, `pages/index.astro`, `room/app.ts`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `startRoomcraft()` (e.g. with `.deleteSelection()` and `.draw()`) actually correct?**
  _`startRoomcraft()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08994708994708994 - nodes in this community are weakly interconnected._
- **Why does `startRoomcraft()` connect `room/app.ts` to `house.ts`, `studio/app.ts`, `RoomcraftApi`, `editor2d.ts`, `$`, `setupThree`, `export.ts`, `store.ts`, `PlanEditor`, `plan.ts`, `room/ai.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `startStudio()` (e.g. with `.cancelCalibration()` and `.draw()`) actually correct?**
  _`startStudio()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Should `shopify.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0586340206185567 - nodes in this community are weakly interconnected._