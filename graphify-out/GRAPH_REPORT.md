# Graph Report - meridian-tryon  (2026-11-13)

## Corpus Check
- 26 files · ~45,554 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .woff2 1, .css 1)

## Summary
- 418 nodes · 684 edges · 20 communities (15 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e260d610`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- shopify.ts
- ui.tsx
- index.js
- cv
- watch__index.js
- box__index.js
- compilerOptions
- README.md
- store-src/README.md
- chair__index.js
- add
- computeGoal
- refresh
- box
- frame
- pins
- layout
- graphify.sh

## God Nodes (most connected - your core abstractions)
1. `react` - 14 edges
2. `Home()` - 13 edges
3. `Price()` - 12 edges
4. `react-router-dom` - 11 edges
5. `CartProvider()` - 9 edges
6. `Customize()` - 9 edges
7. `Story()` - 9 edges
8. `Pic()` - 9 edges
9. `three` - 9 edges
10. `compilerOptions` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Before starting any task: build the graphify graph` --references--> `box()`  [INFERRED]
  CLAUDE.md → .graphify-inline/index.js
- `buildBox()` --indirect_call--> `box()`  [INFERRED]
  .graphify-inline/box__index.js → .graphify-inline/index.js
- `Price()` --calls--> `Money`  [EXTRACTED]
  store-src/src/ui.tsx → store-src/src/lib/shopify.ts
- `CartProvider()` --calls--> `cartAdd()`  [EXTRACTED]
  store-src/src/cart.tsx → store-src/src/lib/shopify.ts
- `CartProvider()` --calls--> `cartCreate()`  [EXTRACTED]
  store-src/src/cart.tsx → store-src/src/lib/shopify.ts

## Import Cycles
- None detected.

## Communities (20 total, 5 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.09
Nodes (26): react-dom, @types/react, @types/react-dom, @types/three, typescript, vite, @vitejs/plugin-react, dependencies (+18 more)

### Community 1 - "shopify.ts"
Cohesion: 0.12
Nodes (26): CartCtx, CartProvider(), Ctx, load(), save(), COLORS, FIXTURE_COLLECTIONS, FIXTURE_PRODUCTS (+18 more)

### Community 2 - "ui.tsx"
Cohesion: 0.10
Nodes (47): react, react-router-dom, @shopify/hydrogen-react, three, useCart(), Hero3D(), sized(), getCollection() (+39 more)

### Community 3 - "index.js"
Cohesion: 0.03
Nodes (72): arm1, arm2, art, back, black, boxes, bulb, camera (+64 more)

### Community 4 - "cv"
Cohesion: 0.38
Nodes (10): brushTex, cotesTex, cv(), dialTex, engraveTex, grainTex, perlageTex, rand32() (+2 more)

### Community 5 - "watch__index.js"
Cohesion: 0.03
Nodes (71): accentMat, backG, backGlassMat, balance, bezelG, blueMat, brassMat, bridgeMat (+63 more)

### Community 6 - "box__index.js"
Cohesion: 0.07
Nodes (33): applyFold(), applyMaterial(), buildBox(), camera, clock, controls, decal(), DISCOUNT (+25 more)

### Community 7 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, jsx, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+2 more)

### Community 11 - "chair__index.js"
Cohesion: 0.07
Nodes (33): add(), armPad, armPost, arms, back, buildOptions(), camera, chair (+25 more)

### Community 12 - "add"
Cohesion: 0.40
Nodes (5): add(), dauphine(), gear(), gearShape(), mkHand()

### Community 13 - "computeGoal"
Cohesion: 0.33
Nodes (7): computeGoal(), damp(), drawCode(), lerp(), smooth(), targetShot(), tick()

### Community 14 - "refresh"
Cohesion: 0.40
Nodes (6): applyTargets(), buildSwatches(), drawInk(), refresh(), tweenPrice(), usd()

### Community 15 - "box"
Cohesion: 0.29
Nodes (7): After finishing a change: ship it to `main`, Before starting any task: build the graphify graph, Project notes for Claude, box(), carton(), mesh(), monitor()

### Community 16 - "frame"
Cohesion: 0.53
Nodes (6): damp(), frame(), goalPose(), lerp(), shot(), smooth()

### Community 17 - "pins"
Cohesion: 0.67
Nodes (3): go(), pins, setHover()

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `ui.tsx` to `package.json`, `index.js`, `watch__index.js`, `box__index.js`, `chair__index.js`?**
  _High betweenness centrality (0.695) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09259259259259259 - nodes in this community are weakly interconnected._
- **Why does `react` connect `ui.tsx` to `package.json`, `shopify.ts`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `shopify.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12413793103448276 - nodes in this community are weakly interconnected._
- **Why does `box()` connect `box` to `index.js`, `box__index.js`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Should `ui.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09882232462877624 - nodes in this community are weakly interconnected._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.02531645569620253 - nodes in this community are weakly interconnected._