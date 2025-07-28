/**
 * Test Setup - Global test configuration and mocks
 * Requirements: All - Comprehensive test setup for all components
 */

import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';

// Import custom matchers
import './lib/test-utils/custom-matchers';

// Import test utilities for global availability
import * as testUtils from './lib/test-utils';

// Make test utilities globally available
(globalThis as any).testUtils = testUtils;

// Mock Tauri API comprehensively
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
  emit: vi.fn()
}));

vi.mock('@tauri-apps/api/fs', () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  exists: vi.fn(),
  createDir: vi.fn(),
  removeFile: vi.fn(),
  removeDir: vi.fn()
}));

vi.mock('@tauri-apps/api/path', () => ({
  appDir: vi.fn(() => Promise.resolve('/app')),
  configDir: vi.fn(() => Promise.resolve('/config')),
  dataDir: vi.fn(() => Promise.resolve('/data'))
}));

// Mock xterm.js
vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => testUtils.createMockTerminal())
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn(),
    dispose: vi.fn()
  }))
}));

vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: vi.fn().mockImplementation(() => ({
    dispose: vi.fn()
  }))
}));

// Mock MapLibre GL
vi.mock('maplibre-gl', () => ({
  Map: vi.fn().mockImplementation(() => testUtils.createMockMap()),
  Marker: vi.fn().mockImplementation(() => ({
    setLngLat: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    getElement: vi.fn(() => document.createElement('div'))
  })),
  Popup: vi.fn().mockImplementation(() => ({
    setLngLat: vi.fn().mockReturnThis(),
    setHTML: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis()
  }))
}));

// Mock svelte-dnd-action
vi.mock('svelte-dnd-action', () => ({
  dndzone: vi.fn(() => ({
    destroy: vi.fn()
  }))
}));

// Setup DOM globals and APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Mock ResizeObserver
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: testUtils.createMockResizeObserver()
});

// Mock IntersectionObserver
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: testUtils.createMockIntersectionObserver()
});

// Mock Performance API
Object.defineProperty(window, 'performance', {
  writable: true,
  value: testUtils.createMockPerformance()
});

// Mock Canvas API
HTMLCanvasElement.prototype.getContext = vi.fn((contextType: string) => {
  if (contextType === '2d') {
    return testUtils.createMockCanvasContext() as unknown as CanvasRenderingContext2D;
  }
  return null;
}) as any;

// Mock requestAnimationFrame
Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: vi.fn((callback) => setTimeout(callback, 16))
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: vi.fn((id) => clearTimeout(id))
});

// Mock CSS custom properties
const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = vi.fn((element) => {
  const style = originalGetComputedStyle(element);
  
  // Add mock CSS custom properties
  const mockStyle = {
    ...style,
    getPropertyValue: vi.fn((property) => {
      if (property.startsWith('--')) {
        // Return mock theme values for CSS custom properties
        const themeMap: Record<string, string> = {
          '--color-background_primary': '#000000',
          '--color-background_secondary': '#111111',
          '--color-text_primary': '#ffffff',
          '--color-text_secondary': '#cccccc',
          '--color-accent_blue': '#0066ff',
          '--layout-border_radius': '4px',
          '--layout-spacing_unit': '8px'
        };
        return themeMap[property] || '';
      }
      return style.getPropertyValue(property);
    })
  };
  
  return mockStyle;
});

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  }
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  }
});

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mock-object-url')
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn()
});

// Mock Blob
Object.defineProperty(window, 'Blob', {
  writable: true,
  value: class MockBlob {
    constructor(public parts: any[], public options: any = {}) {}
    get size() { return 0; }
    get type() { return this.options.type || ''; }
    slice() { return new MockBlob([], {}); }
    stream() { return new ReadableStream(); }
    text() { return Promise.resolve(''); }
    arrayBuffer() { return Promise.resolve(new ArrayBuffer(0)); }
  }
});

// Mock File
Object.defineProperty(window, 'File', {
  writable: true,
  value: class MockFile extends (window as any).Blob {
    constructor(public parts: any[], public name: string, public options: unknown = {}) {
      super(parts, options);
    }
    get lastModified() { return Date.now(); }
    get webkitRelativePath() { return ''; }
  }
});

// Mock DataTransfer
Object.defineProperty(window, 'DataTransfer', {
  writable: true,
  value: class MockDataTransfer {
    items = {
      add: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      length: 0
    };
    files = [];
    types = [];
    
    setData = vi.fn();
    getData = vi.fn();
    clearData = vi.fn();
    setDragImage = vi.fn();
  }
});

// Mock console methods to reduce noise in tests (but keep them functional for debugging)
const originalConsole = { ...console };
Object.defineProperty(globalThis, 'console', {
  value: {
    ...originalConsole,
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
});

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
  
  // Reset DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // Reset timers
  vi.clearAllTimers();
  vi.useFakeTimers();
});

afterEach(() => {
  // Clean up after each test
  vi.clearAllMocks();
  vi.clearAllTimers();
  vi.useRealTimers();
  
  // Clean up DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export test utilities for easy importing in tests
export * from './lib/test-utils';
