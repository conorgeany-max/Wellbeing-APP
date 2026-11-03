import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';

// Optional private text to pre-fill "My guide" in the preview. It is read from
// a file outside the repo (STEADY_GUIDE_FILE), so personal words never land in git.
const guideFile = process.env.STEADY_GUIDE_FILE;
const starterGuide = guideFile && existsSync(guideFile) ? readFileSync(guideFile, 'utf8') : '';

// Build for the Claude artifact preview: same app, but without the PWA service
// worker or Netlify functions. File names keep their content hashes so a new
// version is never served from a stale cache; old files are removed on publish.
export default defineConfig({
  base: './',
  plugins: [react()],
  define: { 'import.meta.env.VITE_STARTER_GUIDE': JSON.stringify(starterGuide) },
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
