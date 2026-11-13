# Graph Report - meridian-tryon  (2026-11-13)

## Corpus Check
- 26 files · ~43,054 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .woff2 1, .css 1)

## Summary
- 439 nodes · 692 edges · 25 communities (15 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `586b9cb8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- shopify.ts
- ui.tsx
- index.js
- tryon__index.js
- watch__index.js
- box__index.js
- compilerOptions
- README.md
- store-src/README.md
- chair__index.js
- onResults
- computeGoal
- refresh
- box
- sampleKF
- pins
- layout
- add
- applyStyle
- layout
- startCamera
- hand
- graphify.sh

## God Nodes (most connected - your core abstractions)
1. `react` - 14 edges
2. `Home()` - 13 edges
3. `Price()` - 12 edges
4. `react-router-dom` - 11 edges
5. `three` - 10 edges
6. `CartProvider()` - 9 edges
7. `Customize()` - 9 edges
8. `Pic()` - 9 edges
9. `Story()` - 9 edges
10. `compilerOptions` - 9 edges

## Surprising Connections (you probably didn't know these)
- `buildBox()` --indirect_call--> `box()`  [INFERRED]
  .graphify-inline/box__index.js → .graphify-inline/index.js
- `Price()` --calls--> `Money`  [EXTRACTED]
  store-src/src/ui.tsx → store-src/src/lib/shopify.ts
- `CartProvider()` --calls--> `cartAdd()`  [EXTRACTED]
  store-src/src/cart.tsx → store-src/src/lib/shopify.ts
- `CartProvider()` --calls--> `cartCreate()`  [EXTRACTED]
  store-src/src/cart.tsx → store-src/src/lib/shopify.ts
- `CartProvider()` --calls--> `cartGet()`  [EXTRACTED]
  store-src/src/cart.tsx → store-src/src/lib/shopify.ts

## Import Cycles
- None detected.

## Communities (25 total, 10 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.09
Nodes (27): react-dom, @shopify/hydrogen-react, @types/react, @types/react-dom, @types/three, typescript, vite, @vitejs/plugin-react (+19 more)

### Community 1 - "shopify.ts"
Cohesion: 0.16
Nodes (21): CartCtx, CartProvider(), Ctx, load(), save(), FIXTURE_COLLECTIONS, FIXTURE_PRODUCTS, garment() (+13 more)

### Community 2 - "ui.tsx"
Cohesion: 0.09
Nodes (51): react, react-router-dom, three, useCart(), Hero3D(), sized(), COLORS, Collection (+43 more)

### Community 3 - "index.js"
Cohesion: 0.03
Nodes (72): arm1, arm2, art, back, black, boxes, bulb, camera (+64 more)

### Community 4 - "tryon__index.js"
Cohesion: 0.04
Nodes (50): accentMat, adj, AX_X, AX_Y, AX_Z, base, bezelMat, buckle (+42 more)

### Community 5 - "watch__index.js"
Cohesion: 0.04
Nodes (43): accentMat, bezel, bezelMat, brassMat, camera, canvas, caseback, caseGroup (+35 more)

### Community 6 - "box__index.js"
Cohesion: 0.07
Nodes (33): applyFold(), applyMaterial(), buildBox(), camera, clock, controls, decal(), DISCOUNT (+25 more)

### Community 7 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, jsx, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+2 more)

### Community 11 - "chair__index.js"
Cohesion: 0.07
Nodes (33): add(), armPad, armPost, arms, back, buildOptions(), camera, chair (+25 more)

### Community 12 - "onResults"
Cohesion: 0.28
Nodes (9): detect(), drawSource(), frame(), initHands(), matchLighting(), onResults(), placeManual(), resetAdj() (+1 more)

### Community 13 - "computeGoal"
Cohesion: 0.33
Nodes (7): computeGoal(), damp(), drawCode(), lerp(), smooth(), targetShot(), tick()

### Community 14 - "refresh"
Cohesion: 0.40
Nodes (5): applyTargets(), buildSwatches(), drawLogo(), refresh(), usd()

### Community 15 - "box"
Cohesion: 0.67
Nodes (4): box(), carton(), mesh(), monitor()

### Community 16 - "sampleKF"
Cohesion: 0.50
Nodes (4): frame(), portrait(), sampleKF(), smooth()

### Community 17 - "pins"
Cohesion: 0.67
Nodes (3): go(), pins, setHover()

## Knowledge Gaps
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `ui.tsx` to `package.json`, `index.js`, `tryon__index.js`, `watch__index.js`, `box__index.js`, `chair__index.js`?**
  _High betweenness centrality (0.739) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09113300492610837 - nodes in this community are weakly interconnected._
- **Why does `react` connect `ui.tsx` to `package.json`, `shopify.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Should `ui.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09000452284034374 - nodes in this community are weakly interconnected._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.02531645569620253 - nodes in this community are weakly interconnected._
- **Should `tryon__index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.03571428571428571 - nodes in this community are weakly interconnected._
- **Should `watch__index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._