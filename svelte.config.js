import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess({
    typescript: {
      // Override TypeScript options to fix the deprecated options issue
      compilerOptions: {
        verbatimModuleSyntax: true,
        // Explicitly remove deprecated options
        importsNotUsedAsValues: undefined,
        preserveValueImports: undefined
      }
    }
  }),

  kit: {
    // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
    // If your environment is not supported or you settled on a specific environment, switch out the adapter.
    // See https://kit.svelte.dev/docs/adapters for more information about adapters.
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
      strict: false
    }),

    // Configure for Tauri
    prerender: {
      handleMissingId: 'warn'
    },

    // NASA JPL Compliant CSP Configuration
    csp: {
      mode: 'hash', // Use hash mode for scripts (no unsafe-inline)
      directives: {
        'default-src': ['self'],
        'script-src': ['self'], // Hash mode automatically adds hashes
        'style-src': ['self', 'unsafe-inline', 'https://unpkg.com', 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net'],
        'font-src': ['self', 'https://fonts.gstatic.com', 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net', 'data:'],
        'img-src': ['self', 'data:', 'blob:', 'https:'],
        'connect-src': ['self', 'ws:', 'wss:', 'https://a.tile.openstreetmap.org', 'https://b.tile.openstreetmap.org', 'https://c.tile.openstreetmap.org', 'https://fonts.openmaptiles.org', 'https://asset.localhost', 'asset:', 'tauri:'],
        'media-src': ['self'],
        'object-src': ['none'],
        'frame-src': ['none'],
        'worker-src': ['self', 'blob:'],
        'form-action': ['self'],
        'base-uri': ['self'],
        'manifest-src': ['self']
      }
    }
  }
};

export default config;
