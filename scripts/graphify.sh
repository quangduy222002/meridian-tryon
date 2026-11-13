#!/usr/bin/env bash
# Build the graphify knowledge graph for this repo.
# Most of the 3D code lives in <script> blocks inside .html pages, which graphify
# can't parse directly, so we copy each block out to .graphify-inline/ first.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf .graphify-inline && mkdir -p .graphify-inline
python3 - <<'PY'
import re, pathlib
for page in ["index.html", "watch/index.html", "chair/index.html", "box/index.html"]:
    html = pathlib.Path(page).read_text(encoding="utf-8")
    blocks = [m.group(1) for m in re.finditer(r"<script(?![^>]*\b(?:src|type=\"importmap\"))[^>]*>(.*?)</script>", html, re.S)]
    out = pathlib.Path(".graphify-inline") / (page.replace("/", "__").replace(".html", ".js"))
    out.write_text(f"// extracted from {page}\n" + "\n\n".join(blocks), encoding="utf-8")
    print(f"{page}: {len(blocks)} script block(s) -> {out}")
PY
graphify update . "$@"
