import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Build for the Claude artifact preview: same app, but without the PWA service
// worker or Netlify functions. File names keep their content hashes so a new
// version is never served from a stale cache; old files are removed on publish.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      'virtual:pwa-register': fileURLToPath(new URL('./artifact/pwa-register-stub.ts', import.meta.url)),
    },
  },
  build: {
    outDir: 'artifact/dist',
    emptyOutDir: true,
  },
});
