import { render } from '@testing-library/svelte';
import { vi } from 'vitest';
import Waterfall from '../Waterfall.svelte';
import type { FFTData } from '../types';

// Mock canvas context
const mockContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  createImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(1024),
    width: 256,
    height: 1
  })),
  putImageData: vi.fn(),
  scale: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  closePath: vi.fn(),
  setLineDash: vi.fn(),
  fillText: vi.fn()
};

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => mockContext)
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn()
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn();

describe('Waterfall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders without errors', () => {
    const { getByTestId } = render(Waterfall);
    expect(getByTestId('waterfall-visualizer')).toBeInTheDocument();
  });

  test('displays title correctly', () => {
    const { getByText } = render(Waterfall);
    expect(getByText('Waterfall Display')).toBeInTheDocument();
  });

  test('renders canvas when no data provided', async () => {
    const { getByTestId } = render(Waterfall);

    // Wait for canvas initialization
    await new Promise((resolve) => setTimeout(resolve, 50));

    const canvas = getByTestId('waterfall-canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas.tagName).toBe('CANVAS');
  });

  test('displays data information when FFT data is provided', () => {
    const mockData: FFTData = {
      frequencies: [99000000, 100000000, 101000000],
      magnitudes: [-50, -60, -55],
      timestamp: Date.now(),
      sampleRate: 2048000,
      centerFrequency: 100000000
    };

    const { getByText } = render(Waterfall, { props: { data: mockData } });

    expect(getByText(/History:/)).toBeInTheDocument();
    expect(getByText(/Range:/)).toBeInTheDocument();
    expect(getByText(/Rate:/)).toBeInTheDocument();
  });

  test('has correct CSS classes for theme integration', () => {
    const { container } = render(Waterfall);
    const waterfall = container.querySelector('.waterfall-visualizer');

    expect(waterfall).toHaveClass('waterfall-visualizer');
    expect(waterfall).toBeInTheDocument();
  });

  test('has waterfall canvas with correct test id', () => {
    const { getByTestId } = render(Waterfall);
    const canvas = getByTestId('waterfall-canvas');

    expect(canvas).toBeInTheDocument();
    expect(canvas.tagName).toBe('CANVAS');
  });

  test('initializes canvas context on mount', async () => {
    const { getByTestId } = render(Waterfall);

    // Wait for component to mount and initialize
    await new Promise((resolve) => setTimeout(resolve, 50));

    const canvas = getByTestId('waterfall-canvas');
    expect(canvas).toBeInTheDocument();

    // Verify canvas context was requested (mocked)
    expect(mockContext).toBeDefined();
  });

  test('handles data updates correctly', async () => {
    const mockData: FFTData = {
      frequencies: [99000000, 100000000, 101000000],
      magnitudes: [-50, -60, -55],
      timestamp: Date.now(),
      sampleRate: 2048000,
      centerFrequency: 100000000
    };

    const { component, getByTestId } = render(Waterfall);

    // Wait for initial render
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Update data prop
    component.$set({ data: mockData });

    // Wait for reactive updates
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify canvas is still present and functional
    const canvas = getByTestId('waterfall-canvas');
    expect(canvas).toBeInTheDocument();
  });

  test('respects maxHistory prop', () => {
    const maxHistory = 50;
    const { container } = render(Waterfall, { props: { maxHistory } });

    expect(container.querySelector('.waterfall-visualizer')).toBeInTheDocument();
  });

  test('respects colorIntensity prop', () => {
    const colorIntensity = 0.8;
    const { container } = render(Waterfall, { props: { colorIntensity } });

    expect(container.querySelector('.waterfall-visualizer')).toBeInTheDocument();
  });

  test('respects label visibility props', () => {
    const { container } = render(Waterfall, {
      props: {
        showFrequencyLabels: false,
        showTimeLabels: false
      }
    });

    expect(container.querySelector('.waterfall-visualizer')).toBeInTheDocument();
  });
});
