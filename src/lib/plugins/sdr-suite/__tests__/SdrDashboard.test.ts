import { render } from '@testing-library/svelte';
import { vi } from 'vitest';
import SdrDashboard from '../SdrDashboard.svelte';

// Mock Tauri API
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn()
}));

describe('SdrDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders without errors', () => {
    const { getByTestId } = render(SdrDashboard);
    expect(getByTestId('sdr-dashboard')).toBeInTheDocument();
  });

  test('displays correct initial state', () => {
    const { getByText } = render(SdrDashboard);

    expect(getByText('SDR Suite')).toBeInTheDocument();
    expect(getByText('Disconnected')).toBeInTheDocument();
    expect(getByText('100.000 MHz')).toBeInTheDocument(); // Default center frequency
    expect(getByText('2.048 MS/s')).toBeInTheDocument(); // Default sample rate
  });

  test('renders spectrum and waterfall components', () => {
    const { getByTestId } = render(SdrDashboard);

    expect(getByTestId('spectrum-visualizer')).toBeInTheDocument();
    expect(getByTestId('waterfall-visualizer')).toBeInTheDocument();
  });

  test('initializes with proper component structure', () => {
    const { container } = render(SdrDashboard);

    expect(container.querySelector('.sdr-header')).toBeInTheDocument();
    expect(container.querySelector('.sdr-content')).toBeInTheDocument();
    expect(container.querySelector('.spectrum-container')).toBeInTheDocument();
    expect(container.querySelector('.waterfall-container')).toBeInTheDocument();
  });

  test('displays status indicator with correct initial state', () => {
    const { container } = render(SdrDashboard);
    const statusIndicator = container.querySelector('.status-indicator');

    expect(statusIndicator).toHaveClass('disconnected');
    expect(statusIndicator).not.toHaveClass('connected');
  });

  test('displays frequency and sample rate information', () => {
    const { getByText } = render(SdrDashboard);

    expect(getByText('Center Frequency:')).toBeInTheDocument();
    expect(getByText('Sample Rate:')).toBeInTheDocument();
    expect(getByText('100.000 MHz')).toBeInTheDocument();
    expect(getByText('2.048 MS/s')).toBeInTheDocument();
  });

  test('does not show error banner initially', () => {
    const { container } = render(SdrDashboard);
    const errorBanner = container.querySelector('[data-testid="sdr-error"]');

    expect(errorBanner).not.toBeInTheDocument();
  });

  test('has correct CSS classes for theme integration', () => {
    const { container } = render(SdrDashboard);
    const dashboard = container.querySelector('.sdr-dashboard');

    expect(dashboard).toHaveClass('sdr-dashboard');
    expect(dashboard).toBeInTheDocument();
  });
});
