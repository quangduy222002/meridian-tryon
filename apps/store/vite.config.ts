import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Built into the web app's output so the whole site deploys as one artifact (served at /store/).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../web/dist/store',
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three';
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react';
          if (id.includes('node_modules/@shopify/')) return 'shopify';
          return undefined;
        },
      },
    },
  },
});
