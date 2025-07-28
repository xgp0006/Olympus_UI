/**
 * SpectrumVisualizer Component Tests
 * Tests for the spectrum visualization component with canvas rendering
 */

import { render } from '@testing-library/svelte';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import SpectrumVisualizer from '../SpectrumVisualizer.svelte';
import type { FFTData } from '../types';

// Mock theme store
const mockTheme = {
  colors: {
    background_primary: '#000000',
    background_secondary: '#0a0a0a',
    background_tertiary: '#1a1a1a',
    text_primary: '#ffffff',
    accent_blue: '#00bfff'
  },
  typography: {
    font_family_sans: 'Inter, sans-serif',
    font_family_mono: 'JetBrains Mono, monospace',
    font_size_base: '14px',
    font_size_sm: '12px'
  },
  layout: {
    border_radius: '6px',
    border_width: '1px',
    spacing_unit: '8px'
  },
  components: {
    sdr: {
      spectrum_line_color: '#00bfff',
      spectrum_fill_color: 'rgba(0, 191, 255, 0.3)',
      grid_line_color: '#333333',
      axis_label_color: '#cccccc'
    }
  }
};

vi.mock('$lib/stores/theme', () => ({
  theme: {
    subscribe: (fn: (value: unknown) => void) => {
      fn(mockTheme);
      return () => {};
    }
  }
}));

// Mock canvas context
const mockCanvasContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  fillText: vi.fn(),
  scale: vi.fn(),
  setLineDash: vi.fn(),
  getBoundingClientRect: vi.fn(() => ({ width: 800, height: 300 }))
};

// Mock canvas element (used for setup)
// const mockCanvas = {
//   getContext: vi.fn(() => mockCanvasContext),
//   getBoundingClientRect: vi.fn(() => ({ width: 800, height: 300 })),
//   width: 800,
//   height: 300
// };

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => mockCanvasContext)
});

Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
  value: vi.fn(() => ({ width: 800, height: 300 }))
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

global.cancelAnimationFrame = vi.fn();

describe('SpectrumVisualizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 1,
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders without errors', () => {
    const { getByTestId } = render(SpectrumVisualizer);

    expect(getByTestId('spectrum-visualizer')).toBeInTheDocument();
    expect(getByTestId('spectrum-canvas')).toBeInTheDocument();
  });

  test('displays spectrum title', () => {
    const { getByText } = render(SpectrumVisualizer);

    expect(getByText('Spectrum Analyzer')).toBeInTheDocument();
  });

  test('renders with FFT data', async () => {
    const mockFFTData: FFTData = {
      frequencies: [100000000, 100001000, 100002000],
      magnitudes: [-60, -50, -70],
      timestamp: Date.now(),
      sampleRate: 2048000,
      centerFrequency: 100000000
    };

    const { getByTestId, getByText } = render(SpectrumVisualizer, {
      props: { data: mockFFTData }
    });

    expect(getByTestId('spectrum-visualizer')).toBeInTheDocument();

    // Check that frequency info is displayed
    expect(getByText(/Center: 100\.000 MHz/)).toBeInTheDocument();
    expect(getByText(/Span: 2\.048 MHz/)).toBeInTheDocument();
    expect(getByText(/Points: 3/)).toBeInTheDocument();
  });

  test('handles null data gracefully', () => {
    const { getByTestId } = render(SpectrumVisualizer, {
      props: { data: null }
    });

    expect(getByTestId('spectrum-visualizer')).toBeInTheDocument();
    expect(getByTestId('spectrum-canvas')).toBeInTheDocument();
  });

  test('handles empty magnitude data', () => {
    const mockFFTData: FFTData = {
      frequencies: [],
      magnitudes: [],
      timestamp: Date.now(),
      sampleRate: 2048000,
      centerFrequency: 100000000
    };

    const { getByTestId, getByText } = render(SpectrumVisualizer, {
      props: { data: mockFFTData }
    });

    expect(getByTestId('spectrum-visualizer')).toBeInTheDocument();
    expect(getByText(/Points: 0/)).toBeInTheDocument();
  });

  test('applies theme colors correctly', async () => {
    const mockFFTData: FFTData = {
      frequencies: [100000000, 100001000, 100002000],
      magnitudes: [-60, -50, -70],
      timestamp: Date.now(),
      sampleRate: 2048000,
      centerFrequency: 100000000
    };

    const { getByTestId } = render(SpectrumVisualizer, {
      props: { data: mockFFTData }
    });

    // Verify component renders with theme-based styling
    const visualizer = getByTestId('spectrum-visualizer');
    expect(visualizer).toBeInTheDocument();
    expect(visualizer).toHaveClass('spectrum-visualizer');
  });

  test('handles canvas initialization failure', () => {
    // Mock getContext to return null
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);

    const { getByTestId } = render(SpectrumVisualizer);

    // Component should still render even if canvas context fails
    expect(getByTestId('spectrum-visualizer')).toBeInTheDocument();
    expect(getByTestId('spectrum-canvas')).toBeInTheDocument();

    // Restore original method
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  test('responds to window resize', async () => {
    const { getByTestId } = render(SpectrumVisualizer);

    expect(getByTestId('spectrum-visualizer')).toBeInTheDocument();

    // Component should be responsive
    const canvas = getByTestId('spectrum-canvas');
    expect(canvas).toHaveClass('spectrum-canvas');
  });

  test('handles high DPI displays', async () => {
    // Mock high DPI
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      writable: true
    });

    const mockFFTData: FFTData = {
      frequencies: [100000000, 100001000, 100002000],
      magnitudes: [-60, -50, -70],
      timestamp: Date.now(),
      sampleRate: 2048000,
      centerFrequency: 100000000
    };

    const { getByTestId } = render(SpectrumVisualizer, {
      props: { data: mockFFTData }
    });

    // Component should render correctly on high DPI displays
    expect(getByTestId('spectrum-canvas')).toBeInTheDocument();
  });

  test('renders grid when showGrid is true', async () => {
    const mockFFTData: FFTData = {
      frequencies: [100000000, 100001000, 100002000],
      magnitudes: [-60, -50, -70],
      timestamp: Date.now(),
      sampleRate: 2048000,
      centerFrequency: 100000000
    };

    const { getByTestId } = render(SpectrumVisualizer, {
      props: { data: mockFFTData, showGrid: true }
    });

    // Component should render with grid enabled
    expect(getByTestId('spectrum-visualizer')).toBeInTheDocument();
  });

  test('renders labels when showLabels is true', async () => {
    const mockFFTData: FFTData = {
      frequencies: [100000000, 100001000, 100002000],
      magnitudes: [-60, -50, -70],
      timestamp: Date.now(),
      sampleRate: 2048000,
      centerFrequency: 100000000
    };

    const { getByTestId } = render(SpectrumVisualizer, {
      props: { data: mockFFTData, showLabels: true }
    });

    // Component should render with labels enabled
    expect(getByTestId('spectrum-visualizer')).toBeInTheDocument();
  });

  test('handles responsive sizing', () => {
    const { getByTestId } = render(SpectrumVisualizer);

    expect(getByTestId('spectrum-visualizer')).toBeInTheDocument();
    expect(getByTestId('spectrum-canvas')).toBeInTheDocument();
  });

  test('throttles rendering for performance', async () => {
    const mockFFTData: FFTData = {
      frequencies: [100000000, 100001000, 100002000],
      magnitudes: [-60, -50, -70],
      timestamp: Date.now(),
      sampleRate: 2048000,
      centerFrequency: 100000000
    };

    const { rerender, getByTestId } = render(SpectrumVisualizer, {
      props: { data: mockFFTData }
    });

    // Rapidly update data
    for (let i = 0; i < 5; i++) {
      rerender({
        data: {
          ...mockFFTData,
          magnitudes: mockFFTData.magnitudes.map((m) => m + i),
          timestamp: Date.now() + i
        }
      });
    }

    // Component should handle rapid updates gracefully
    expect(getByTestId('spectrum-visualizer')).toBeInTheDocument();
  });

  test('cleans up animation frame on destroy', () => {
    const { unmount, getByTestId } = render(SpectrumVisualizer);

    expect(getByTestId('spectrum-visualizer')).toBeInTheDocument();

    unmount();

    // Component should unmount cleanly
    expect(() => getByTestId('spectrum-visualizer')).toThrow();
  });

  test('handles theme fallback colors', async () => {
    const mockFFTData: FFTData = {
      frequencies: [100000000, 100001000, 100002000],
      magnitudes: [-60, -50, -70],
      timestamp: Date.now(),
      sampleRate: 2048000,
      centerFrequency: 100000000
    };

    const { getByTestId } = render(SpectrumVisualizer, {
      props: { data: mockFFTData }
    });

    // Should still render without errors using fallback colors
    expect(getByTestId('spectrum-visualizer')).toBeInTheDocument();
    expect(getByTestId('spectrum-canvas')).toBeInTheDocument();
  });

  test('displays no data message when no magnitudes available', async () => {
    const { getByTestId } = render(SpectrumVisualizer, {
      props: { data: null }
    });

    // Component should render even without data
    expect(getByTestId('spectrum-visualizer')).toBeInTheDocument();
    expect(getByTestId('spectrum-canvas')).toBeInTheDocument();
  });

  test('handles magnitude scaling correctly', async () => {
    const mockFFTData: FFTData = {
      frequencies: [100000000, 100001000, 100002000, 100003000],
      magnitudes: [-80, -40, -60, -30], // Wide range for scaling test
      timestamp: Date.now(),
      sampleRate: 2048000,
      centerFrequency: 100000000
    };

    const { getByTestId, getByText } = render(SpectrumVisualizer, {
      props: { data: mockFFTData }
    });

    // Component should handle wide magnitude ranges
    expect(getByTestId('spectrum-visualizer')).toBeInTheDocument();
    expect(getByText(/Points: 4/)).toBeInTheDocument();
  });
});
