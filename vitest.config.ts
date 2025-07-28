import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: [
      'src/**/*.{test,spec}.{js,ts}',
      'src/**/__tests__/**/*.{js,ts}',
      'tests/**/*.{test,spec}.{js,ts}'
    ],
    exclude: [
      'node_modules',
      'dist',
      'build',
      '.svelte-kit',
      'src-tauri'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-setup.ts',
        'src/lib/test-utils/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
        '**/build/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4
      }
    },
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './test-results.json'
    },
    watch: false,
    ui: false,
    open: false,
    logHeapUsage: true,
    allowOnly: false,
    passWithNoTests: false,
    bail: 0,
    retry: 0
  },
  resolve: {
    alias: {
      '$lib': new URL('./src/lib', import.meta.url).pathname,
      '$app': new URL('./node_modules/@sveltejs/kit/src/runtime/app', import.meta.url).pathname
    }
  }
});
