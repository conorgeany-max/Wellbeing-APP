import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Build for the Claude artifact preview: same app, but without the PWA service
// worker or Netlify functions, and with stable file names so each publish
// replaces the previous files instead of piling up hashed copies.
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
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
