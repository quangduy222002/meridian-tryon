// @ts-check
import { defineConfig } from 'astro/config';

// Served from GitHub Pages under /meridian-tryon/. ARTIFACT=1 builds a copy for a claude.ai Artifact instead (see
// scripts/artifact.mjs): served from an unknown path, so every asset URL is relative.
const artifact =
  /** @type {{ process?: { env: Record<string, string | undefined> } }} */ (globalThis).process?.env.ARTIFACT === '1';

export default defineConfig({
  site: 'https://quangduy222002.github.io',
  base: artifact ? '/' : '/meridian-tryon',
  ...(artifact ? { outDir: './dist-artifact' } : {}),
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  prefetch: { defaultStrategy: 'hover' },
  vite: {
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 700,
      // Fonts stay separate files: inlined base64 would bloat the render-blocking CSS.
      assetsInlineLimit: (file) => (/\.(woff2?|ttf)$/.test(file) ? false : undefined),
      rollupOptions: {
        // One long-lived, shared chunk for three.js: cached once, reused by every 3D page. Editor-only addons
        // (the build-guide studio's gizmo) stay out of it so pages that never open the studio don't pay for them.
        output: {
          manualChunks: (id) =>
            id.includes('node_modules/three/') && !id.includes('TransformControls') ? 'three' : undefined,
        },
      },
    },
    worker: { format: 'es' },
    ...(artifact
      ? {
          experimental: {
            renderBuiltUrl: (_file, { hostType }) => (hostType === 'html' ? undefined : { relative: true }),
          },
        }
      : {}),
  },
});
