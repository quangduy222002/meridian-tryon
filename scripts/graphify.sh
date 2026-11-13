#!/usr/bin/env bash
# Build the graphify knowledge graph for this repo (no API key needed).
# All code is TypeScript/TSX/Astro now, so graphify parses it directly.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v graphify >/dev/null || pip install -q graphifyy
graphify update . "$@"
