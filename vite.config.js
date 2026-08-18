import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Standard Tauri + Vite setup (see https://v2.tauri.app/start/frontend/vite/).
// Same React/Tailwind plugin stack as the original electron-forge renderer
// config (vite.renderer.config.mjs) - only the dev-server/env bits below are
// new, and they exist purely so `tauri dev` can drive Vite correctly.
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    tailwindcss(),
  ],

  // Prevent Vite from obscuring Rust errors.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    watch: {
      // Don't watch src-tauri, the Rust build has its own watcher.
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    target:
      process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
