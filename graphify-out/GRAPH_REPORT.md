# Graph Report - meridian-tryon  (2026-11-13)

## Corpus Check
- 27 files · ~43,191 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .woff2 1, .css 1)

## Summary
- 442 nodes · 695 edges · 25 communities (15 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `27c1c6c1`
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
8. `Story()` - 9 edges
9. `Pic()` - 9 edges
10. `compilerOptions` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Before starting any task: build the graphify graph` --references--> `box()`  [INFERRED]
  CLAUDE.md → .graphify-inline/index.js
- `buildBox()` --indirect_call--> `box()`  [INFERRED]
  .graphify-inline/box__index.js → .graphify-inline/index.js
- `Hero3D()` --calls--> `Price()`  [EXTRACTED]
  store-src/src/Hero3D.tsx → store-src/src/ui.tsx
- `Lookbook()` --calls--> `Price()`  [EXTRACTED]
  store-src/src/Lookbook.tsx → store-src/src/ui.tsx
- `Customize()` --calls--> `reducedMotion()`  [EXTRACTED]
  store-src/src/pages/Customize.tsx → store-src/src/scroll.ts

## Import Cycles
- None detected.

## Communities (25 total, 10 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.09
Nodes (28): react-dom, @shopify/hydrogen-react, three, @types/react, @types/react-dom, @types/three, typescript, vite (+20 more)

### Community 1 - "shopify.ts"
Cohesion: 0.09
Nodes (41): CartCtx, CartProvider(), Ctx, load(), save(), useCart(), COLORS, FIXTURE_COLLECTIONS (+33 more)

### Community 2 - "ui.tsx"
Cohesion: 0.15
Nodes (30): react, react-router-dom, Hero3D(), sized(), Collection, getCollection(), getCollections(), getProducts() (+22 more)

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
Cohesion: 0.33
Nodes (6): Before starting any task: build the graphify graph, Project notes for Claude, box(), carton(), mesh(), monitor()

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

- **Why does `three` connect `package.json` to `shopify.ts`, `ui.tsx`, `index.js`, `tryon__index.js`, `watch__index.js`, `box__index.js`, `chair__index.js`?**
  _High betweenness centrality (0.738) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0896551724137931 - nodes in this community are weakly interconnected._
- **Why does `react` connect `ui.tsx` to `package.json`, `shopify.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Should `shopify.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08627450980392157 - nodes in this community are weakly interconnected._
- **Why does `box()` connect `box` to `index.js`, `box__index.js`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.02531645569620253 - nodes in this community are weakly interconnected._
- **Should `tryon__index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.03571428571428571 - nodes in this community are weakly interconnected._