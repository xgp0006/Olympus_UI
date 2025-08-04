import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],

  // Tauri expects a fixed port, fail if that port is not available
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost',
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**']
    },
    // Allow serving static files
    fs: {
      allow: ['..']
    }
  },

  // Public directory for static assets
  publicDir: 'static',

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,

  // 2. tauri expects a fixed port, fail if that port is not available
  envPrefix: ['VITE_', 'TAURI_'],

  build: {
    // Tauri supports es2021
    target: 'chrome105', // Default to Chrome 105 for Windows
    // don't minify for debug builds
    minify: 'esbuild',
    // produce sourcemaps for debug builds
    sourcemap: true
  },

  define: {
    // Define environment variables for browser
    'import.meta.env.VITE_STRICT_ASSERTIONS': JSON.stringify('false'),
    'import.meta.env.VITE_DEBUG_ASSERTIONS': JSON.stringify('true')
  }
});
