# Project notes for Claude

## Before starting any task: build the graphify graph
1. `pip install graphifyy` if `graphify` is not installed.
2. Run `./scripts/graphify.sh` from the repo root (re-run after code changes; no API key needed).
3. Read `graphify-out/GRAPH_REPORT.md` first to get the map of the codebase.
   Use `graphify query "<question>"`, `graphify explain "<symbol>"` or
   `graphify path "A" "B"` to navigate instead of reading whole files.

Notes:
- Most 3D code lives in inline `<script>` blocks of `index.html`, `watch/`, `tryon/`,
  `chair/` and `box/`. The script copies them to `.graphify-inline/*.js` so graphify can
  parse them — edit the `.html` files, never the copies.
- Each page is standalone: same-named functions on different pages (e.g. `box()`) are
  not related, even if the graph infers a link.
- `tryon/mp/`, `store/assets/` and `assets/` are vendored/built files and are skipped.

## After finishing a change: ship it to `main`
GitHub Pages builds the live site from `main`
(https://quangduy222002.github.io/meridian-tryon/). The owner wants every finished
change committed and pushed to `main` so it gets built:
1. Re-run `./scripts/graphify.sh` and commit the refreshed `graphify-out/` with the change.
2. Commit on the working branch, then fast-forward `main` to it and push both
   (`git push origin HEAD:main`). Never force-push `main`.
