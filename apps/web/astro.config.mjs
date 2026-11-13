// @ts-check
import { defineConfig } from 'astro/config';

// Served from GitHub Pages under /meridian-tryon/.
export default defineConfig({
  site: 'https://quangduy222002.github.io',
  base: '/meridian-tryon',
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
        // One long-lived, shared chunk for three.js: cached once, reused by every 3D page.
        output: { manualChunks: (id) => (id.includes('node_modules/three/') ? 'three' : undefined) },
      },
    },
    worker: { format: 'es' },
  },
});
