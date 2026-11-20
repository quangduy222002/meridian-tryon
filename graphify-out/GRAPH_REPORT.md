# Graph Report - portfolio  (2026-11-20)

## Corpus Check
- 125 files · ~147,414 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: .css 9, (none) 7)

## Summary
- 1266 nodes · 2784 edges · 49 communities (45 shown, 4 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 122 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `224624a5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- store/package.json
- index.ts
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
- watch/model.ts
- pages/index.astro
- PlanEditor
- graphify.sh
- Geometric / rule-based algorithms for parsing vector floor plans (PDF/DXF segments + text) into walls, openings and rooms
- room/app.ts
- room/catalog.ts
- room/ai.ts
- store.ts
- studio/index.astro
- $
- watch/catalog.ts
- house.ts
- Architectural floor plan drawing conventions for automatic parsing (Vietnamese residential focus)
- RenderLoop
- quality.ts
- room/look.ts
- furniture.ts
- Learned floor plan understanding and floor-plan-to-model tools (state of the art, transferability, expected accuracy)
- Combining vision-language models with geometric parsing for floor plan understanding
- setupThree
- BaseLayout.astro
- room/textures.ts
- watch/index.astro
- Để hình học đếm, để Claude đọc bản vẽ
- RenderLoop
- plan.ts
- src/textures.ts

## God Nodes (most connected - your core abstractions)
1. `startRoomcraft()` - 54 edges
2. `PlanEditor` - 39 edges
3. `Plan` - 35 edges
4. `startStudio()` - 29 edges
5. `$` - 28 edges
6. `RenderLoop` - 27 edges
7. `startStudio()` - 27 edges
8. `Vec2` - 26 edges
9. `setupThree()` - 23 edges
10. `nodeMap()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `3D work: performance comes first` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `Layout` --references--> `RenderLoop`  [INFERRED]
  CLAUDE.md → packages/three-core/src/loop.ts
- `Performance rules for 3D` --references--> `AdaptiveResolution`  [INFERRED]
  README.md → packages/three-core/src/quality.ts
- `Layout` --references--> `ScrollDirector`  [INFERRED]
  CLAUDE.md → packages/three-core/src/scroll-director.ts
- `3D work: performance comes first` --references--> `getQuality()`  [INFERRED]
  CLAUDE.md → packages/three-core/src/quality.ts

## Import Cycles
- None detected.

## Communities (49 total, 4 thin omitted)

### Community 0 - "store/package.json"
Cohesion: 0.08
Nodes (32): dependencies, @meridian/three-core@*, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.30.6, @shopify/hydrogen-react@^2026.4.4, three@~0.187.0, devDependencies (+24 more)

### Community 1 - "index.ts"
Cohesion: 0.18
Nodes (10): boxSpecs(), BoxTexture, chairSpecs(), noise(), FrameCallback, LoopOptions, rand32(), smoothstep() (+2 more)

### Community 2 - "shopify.ts"
Cohesion: 0.07
Nodes (71): CartCtx, CartProvider(), Ctx, load(), save(), useCart(), COLORS, FIXTURE_COLLECTIONS (+63 more)

### Community 3 - "studio/app.ts"
Cohesion: 0.07
Nodes (39): DrawingShot, count(), emptyPlan(), SheetHost, SheetView, Stage, startStudio(), withoutMasks() (+31 more)

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
Nodes (23): buildBackdrops(), ARMREST_PRICE, BASE_PRICE, ChairConfig, COLORS, FabricKey, FABRICS, FrameKey (+15 more)

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
Nodes (16): add(), Arc, CRC, crc32(), draw(), esc(), LAYERS, opening() (+8 more)

### Community 18 - "4. Danh sách cảnh (bản chính ~88 giây)"
Cohesion: 0.10
Nodes (20): 1. Tóm tắt, 2. Nơi quay, 3. Chuẩn bị trước khi quay, 4. Danh sách cảnh (bản chính ~88 giây), 5. Phong cách hình ảnh khi dựng, 6. Những điều không được làm, 7. Bản ngắn 30 giây (mạng xã hội), 8. Kiểm tra trước khi xuất clip (+12 more)

### Community 19 - "box/studio.ts"
Cohesion: 0.09
Nodes (18): createDieline(), rebuild(), toVec(), createPallet(), PALLET, PalletPlan, DISCOUNT, MaterialKey (+10 more)

### Community 20 - "assembly/app.ts"
Cohesion: 0.05
Nodes (60): AiContext, AiMove, AiStep, generateStep(), Place, PLACES, schema(), systemPrompt() (+52 more)

### Community 21 - "watch/model.ts"
Cohesion: 0.11
Nodes (23): buildWatch(), createInk(), createMaterials(), dauphine(), ExplodedPart, gearShape(), lathe(), sweptStrap() (+15 more)

### Community 22 - "pages/index.astro"
Cohesion: 0.19
Nodes (7): Props, projects, services, stack, steps, UPWORK_URL, rail

### Community 23 - "PlanEditor"
Cohesion: 0.05
Nodes (50): RoomcraftApi, RoomcraftOptions, EditorHost, OPENING_WIDTH, paintStair(), PlanEditor, Selection, Drawing (+42 more)

### Community 25 - "Geometric / rule-based algorithms for parsing vector floor plans (PDF/DXF segments + text) into walls, openings and rooms"
Cohesion: 0.05
Nodes (36): 1. Wall detection (parallel-line pairing, skeletons, hatch/stroke/layer features, merging, junctions), 2. Openings (door arcs/leaves, windows, gap closing), 3. Room segmentation (noding, planar graph, face extraction, filtering, labels), 4. Annotation separation (dimensions, grids, leaders, hatches, title block, setbacks, furniture), 5. Scale inference, 6. Multi-plan sheets, alignment between floors, rotation, 7. Robustness, performance and evaluation, Cited Findings (+28 more)

### Community 26 - "room/app.ts"
Cohesion: 0.09
Nodes (18): hostClaude(), HostDownloads, hostDownloads(), HostError, HostSample, hostUse(), saveFile(), uses (+10 more)

### Community 27 - "room/catalog.ts"
Cohesion: 0.17
Nodes (11): DEFAULT_STYLE, Finish, FLOORS, FURNITURE, GROUPS, ROOM_DEFAULTS, WALLS, AUTO (+3 more)

### Community 28 - "room/ai.ts"
Cohesion: 0.08
Nodes (38): hostFailure(), adoptCustoms(), AiItem, AiQuestion, askJson(), Brain, cleanStyle(), compass() (+30 more)

### Community 29 - "store.ts"
Cohesion: 0.26
Nodes (12): samplePlan(), autosave(), clearLinkHash(), compact(), fromB64(), isPlan(), loadInitial(), normalise() (+4 more)

### Community 30 - "studio/index.astro"
Cohesion: 0.24
Nodes (4): Props, gl, gl, hasWebGL()

### Community 31 - "$"
Cohesion: 0.22
Nodes (11): $, announce(), initCursor(), initRail(), initStickyNav(), liveRegion, usd(), applyMaterial() (+3 more)

### Community 32 - "watch/catalog.ts"
Cohesion: 0.15
Nodes (17): toast(), BASE_PRICE, CaseKey, CaseOption, CASES, Config, DialKey, DialOption (+9 more)

### Community 33 - "house.ts"
Cohesion: 0.12
Nodes (13): setFixtureGlow(), BUMP, House, metreUVs(), skirtingGeo(), skirtingGeos, WallView, FloorOpening (+5 more)

### Community 34 - "Architectural floor plan drawing conventions for automatic parsing (Vietnamese residential focus)"
Cohesion: 0.06
Nodes (31): Architectural floor plan drawing conventions for automatic parsing (Vietnamese residential focus), Cited Findings, Cited Findings, Cited Findings, Cited Findings, Cited Findings, Cited Findings, Cut walls vs projection lines: line weights, hatches, structure vs masonry, wall thicknesses (+23 more)

### Community 35 - "RenderLoop"
Cohesion: 0.15
Nodes (16): Framing, NUMERIC, Pose, SECTION_OF, Shot, startRoom(), KEYS, Pose (+8 more)

### Community 36 - "quality.ts"
Cohesion: 0.32
Nodes (6): detectTier(), gpuName(), PRESETS, Quality, Tier, RendererOptions

### Community 37 - "room/look.ts"
Cohesion: 0.22
Nodes (3): BACKDROP, createLook(), Look

### Community 38 - "furniture.ts"
Cohesion: 0.15
Nodes (24): Add, artwork(), Build, buildCustom(), builders, buildFurniture(), cached(), customMat() (+16 more)

### Community 39 - "Learned floor plan understanding and floor-plan-to-model tools (state of the art, transferability, expected accuracy)"
Cohesion: 0.06
Nodes (31): Cited findings, Cited findings, Cited findings, Cited findings, Cited findings, Cited findings, Commercial products and their approach (what they ask the user, how they handle errors), Datasets and models: input, output, reported metrics, licence, browser feasibility (+23 more)

### Community 40 - "Combining vision-language models with geometric parsing for floor plan understanding"
Cohesion: 0.07
Nodes (26): 1. Measured capabilities and failure modes of VLMs on floor plans and technical drawings, 2. Coordinate grounding techniques (Set-of-Mark, grids, IDs, tiling, image plus structured list), 3. Division of labour between the VLM and the geometry (and existing systems), 4. Prompt patterns, output formats, image budgets, cost and latency, 5. Limits, risks and geometric validation of VLM output, Cited findings, Cited findings, Cited findings (+18 more)

### Community 41 - "setupThree"
Cohesion: 0.20
Nodes (8): setupThree(), ceilingOpenings(), DOOR_HEIGHT, floorOpenings(), itemCorners(), Solid, solidsOf(), Walker

### Community 42 - "BaseLayout.astro"
Cohesion: 0.12
Nodes (5): Props, Project, base, canonical, Props

### Community 48 - "watch/index.astro"
Cohesion: 0.24
Nodes (6): initReveals(), withBase(), chapters, configurator, gauges, initMetalButtons()

### Community 50 - "Để hình học đếm, để Claude đọc bản vẽ"
Cohesion: 0.25
Nodes (7): Bản vẽ Việt Nam mã hóa ngữ nghĩa bằng độ dày nét chứ không bằng layer, Claude giỏi đọc chữ và phán đoán, kém đếm ký hiệu, Ghép cặp song song là đúng hướng, nhưng phải dựa trên histogram độ dày, Kết luận, Mô hình học máy đạt 90 điểm trong phòng thí nghiệm nhưng chưa vào được trình duyệt, Mười kỹ thuật xếp theo tác động lên ba lỗi thật của khách, Để hình học đếm, để Claude đọc bản vẽ

### Community 51 - "RenderLoop"
Cohesion: 0.15
Nodes (13): Hero3D(), sized(), sized(), STEPS, Story(), startBoxStudio(), RenderLoop, getQuality() (+5 more)

### Community 52 - "plan.ts"
Cohesion: 0.17
Nodes (26): esc(), startRoomcraft(), renderInspector(), designLighting(), addStorey(), centroidOf(), emptyFloor(), findRooms() (+18 more)

### Community 53 - "src/textures.ts"
Cohesion: 0.18
Nodes (12): 3D work: performance comes first, After finishing a change: ship it to `main`, Before starting any task: build the graphify graph, Checks, Layout, Project notes for Claude, canPaintInWorker(), exposeTextureWorker() (+4 more)

## Knowledge Gaps
- **1 isolated node(s):** `astro/tsconfigs/strict`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 463 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$` connect `$` to `watch/catalog.ts`, `studio/app.ts`, `configurator.ts`, `setupThree`, `watch/index.astro`, `box/studio.ts`, `assembly/app.ts`, `RenderLoop`, `pages/index.astro`, `plan.ts`, `room/app.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `startRoomcraft()` (e.g. with `.deleteSelection()` and `.draw()`) actually correct?**
  _`startRoomcraft()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `store/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07563025210084033 - nodes in this community are weakly interconnected._
- **Why does `RenderLoop` connect `RenderLoop` to `index.ts`, `shopify.ts`, `RenderLoop`, `configurator.ts`, `box/studio.ts`, `assembly/app.ts`, `src/textures.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `startStudio()` (e.g. with `.cancelCalibration()` and `.draw()`) actually correct?**
  _`startStudio()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Should `shopify.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06602512697139802 - nodes in this community are weakly interconnected._