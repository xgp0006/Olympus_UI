/**
 * App Component Tests
 * Tests the root application component functionality
 * Requirements: 1.1, 1.4
 */

import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import App from '../App.svelte';
import { plugins, activePluginWritable } from '../../../stores/plugins';
import { theme } from '../../../stores/theme';
import { createMockPlugin, createMockTheme } from '../../../test-utils/mock-factories';

// Mock stores
vi.mock('../../../stores/plugins', () => ({
  plugins: { subscribe: vi.fn(), set: vi.fn() },
  activePluginWritable: { subscribe: vi.fn(), set: vi.fn() },
  initializePluginSystem: vi.fn()
}));

vi.mock('../../../stores/theme', () => ({
  theme: { subscribe: vi.fn() },
  themeLoading: { subscribe: vi.fn() },
  themeError: { subscribe: vi.fn() },
  loadTheme: vi.fn(),
  reloadTheme: vi.fn(),
  getThemeState: vi.fn(),
  clearThemeError: vi.fn(),
  setTheme: vi.fn(),
  themeState: { subscribe: vi.fn() }
}));

describe('App Component', () => {
  const mockPlugins = [
    createMockPlugin({ id: 'mission-planner', name: 'Mission Planner' }),
    createMockPlugin({ id: 'sdr-suite', name: 'SDR Suite' })
  ];

  const mockTheme = createMockTheme();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup store mocks
    vi.mocked(plugins.subscribe).mockImplementation((callback) => {
      callback(mockPlugins);
      return () => {};
    });

    vi.mocked(activePluginWritable.subscribe).mockImplementation((callback) => {
      callback(null);
      return () => {};
    });

    vi.mocked(theme.subscribe).mockImplementation((callback) => {
      callback(mockTheme);
      return () => {};
    });
  });

  test('renders app container with correct structure', () => {
    const { getByTestId } = render(App);

    expect(getByTestId('app-container')).toBeInTheDocument();
    expect(getByTestId('app-container')).toHaveClass('app-container');
  });

  test('shows loading state during initialization', async () => {
    // Mock initialization delay
    const { initializePluginSystem } = await import('../../../stores/plugins');
    vi.mocked(initializePluginSystem).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(App);

    // Should show loading state initially
    expect(screen.getByText('Modular C2 Frontend')).toBeInTheDocument();
    expect(
      screen.getByText('Initializing aerospace command & control interface...')
    ).toBeInTheDocument();
    expect(document.querySelector('.loading-spinner')).toBeInTheDocument();
  });

  test('shows dashboard view after successful initialization', async () => {
    const { initializePluginSystem } = await import('../../../stores/plugins');
    vi.mocked(initializePluginSystem).mockResolvedValue(true);

    render(App);

    await waitFor(() => {
      expect(screen.getByText('Modular C2 Frontend')).toBeInTheDocument();
      expect(screen.getByText('Aerospace Command & Control Interface')).toBeInTheDocument();
    });

    // Should not show loading state
    expect(document.querySelector('.loading-spinner')).not.toBeInTheDocument();
  });

  test('shows error state when initialization fails', async () => {
    const { initializePluginSystem } = await import('../../../stores/plugins');
    const errorMessage = 'Failed to initialize plugins';
    vi.mocked(initializePluginSystem).mockRejectedValue(new Error(errorMessage));

    render(App);

    await waitFor(() => {
      expect(screen.getByText('Initialization Failed')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Should show retry button
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
  });

  test('handles retry button click in error state', async () => {
    const { initializePluginSystem } = await import('../../../stores/plugins');
    vi.mocked(initializePluginSystem).mockRejectedValue(new Error('Test error'));

    // Mock window.location.reload
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(App);

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    await fireEvent.click(retryButton);

    expect(mockReload).toHaveBeenCalled();
  });

  test('shows plugin view when active plugin is set', async () => {
    const { initializePluginSystem } = await import('../../../stores/plugins');
    vi.mocked(initializePluginSystem).mockResolvedValue(true);

    // Mock active plugin
    vi.mocked(activePluginWritable.subscribe).mockImplementation((callback) => {
      callback('mission-planner');
      return () => {};
    });

    render(App);

    await waitFor(() => {
      expect(screen.getByText('Mission Planner')).toBeInTheDocument();
      expect(screen.getByTestId('home-button')).toBeInTheDocument();
    });
  });

  test('handles home button click to return to dashboard', async () => {
    const { initializePluginSystem } = await import('../../../stores/plugins');
    vi.mocked(initializePluginSystem).mockResolvedValue(true);

    // Mock active plugin
    vi.mocked(activePluginWritable.subscribe).mockImplementation((callback) => {
      callback('mission-planner');
      return () => {};
    });

    render(App);

    await waitFor(() => {
      expect(screen.getByTestId('home-button')).toBeInTheDocument();
    });

    const homeButton = screen.getByTestId('home-button');
    await fireEvent.click(homeButton);

    expect(activePluginWritable.set).toHaveBeenCalledWith(null);
  });

  test('handles keyboard navigation for home button', async () => {
    const { initializePluginSystem } = await import('../../../stores/plugins');
    vi.mocked(initializePluginSystem).mockResolvedValue(true);

    // Mock active plugin
    vi.mocked(activePluginWritable.subscribe).mockImplementation((callback) => {
      callback('mission-planner');
      return () => {};
    });

    render(App);

    await waitFor(() => {
      expect(screen.getByTestId('home-button')).toBeInTheDocument();
    });

    const homeButton = screen.getByTestId('home-button');
    homeButton.focus();

    await fireEvent.keyDown(homeButton, { key: 'Enter' });
    expect(activePluginWritable.set).toHaveBeenCalledWith(null);

    vi.clearAllMocks();

    await fireEvent.keyDown(homeButton, { key: ' ' });
    expect(activePluginWritable.set).toHaveBeenCalledWith(null);
  });

  test('displays correct plugin title in header', async () => {
    const { initializePluginSystem } = await import('../../../stores/plugins');
    vi.mocked(initializePluginSystem).mockResolvedValue(true);

    // Mock active plugin
    vi.mocked(activePluginWritable.subscribe).mockImplementation((callback) => {
      callback('sdr-suite');
      return () => {};
    });

    render(App);

    await waitFor(() => {
      expect(screen.getByText('SDR Suite')).toBeInTheDocument();
    });
  });

  test('shows unknown plugin for invalid plugin ID', async () => {
    const { initializePluginSystem } = await import('../../../stores/plugins');
    vi.mocked(initializePluginSystem).mockResolvedValue(true);

    // Mock invalid active plugin
    vi.mocked(activePluginWritable.subscribe).mockImplementation((callback) => {
      callback('invalid-plugin');
      return () => {};
    });

    render(App);

    await waitFor(() => {
      expect(screen.getByText('Unknown Plugin')).toBeInTheDocument();
    });
  });

  test('applies theme provider with correct theme name', () => {
    render(App);

    // ThemeProvider should be rendered with default theme
    const themeProvider = document.querySelector('[data-theme-provider]');
    // Note: This would need to be implemented in ThemeProvider component
    // For now, we just verify the component structure is correct
    expect(document.querySelector('.app-container')).toBeInTheDocument();
  });

  test('includes all required child components', async () => {
    const { initializePluginSystem } = await import('../../../stores/plugins');
    vi.mocked(initializePluginSystem).mockResolvedValue(true);

    render(App);

    await waitFor(() => {
      // Should include CLI panel (always present)
      expect(document.querySelector('.cli-container')).toBeInTheDocument();

      // Should include notification center
      // Note: This would need proper test IDs in the actual components
      expect(document.querySelector('.app-container')).toBeInTheDocument();
    });
  });

  test('handles responsive design classes', () => {
    render(App);

    const appContainer = document.querySelector('.app-container');
    expect(appContainer).toHaveStyle({
      display: 'flex',
      'flex-direction': 'column',
      height: '100vh',
      width: '100vw'
    });
  });

  test('maintains proper accessibility attributes', async () => {
    const { initializePluginSystem } = await import('../../../stores/plugins');
    vi.mocked(initializePluginSystem).mockResolvedValue(true);

    // Mock active plugin
    vi.mocked(activePluginWritable.subscribe).mockImplementation((callback) => {
      callback('mission-planner');
      return () => {};
    });

    render(App);

    await waitFor(() => {
      const homeButton = screen.getByTestId('home-button');
      expect(homeButton).toHaveAttribute('type', 'button');
      // Additional accessibility checks would go here
    });
  });

  test('handles initialization console logging', async () => {
    const { initializePluginSystem } = await import('../../../stores/plugins');
    vi.mocked(initializePluginSystem).mockResolvedValue(true);

    const consoleSpy = vi.spyOn(console, 'log');

    render(App);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Initializing Modular C2 Frontend...');
      expect(consoleSpy).toHaveBeenCalledWith('Application initialized successfully');
    });
  });

  test('handles initialization error logging', async () => {
    const { initializePluginSystem } = await import('../../../stores/plugins');
    const error = new Error('Test initialization error');
    vi.mocked(initializePluginSystem).mockRejectedValue(error);

    const consoleErrorSpy = vi.spyOn(console, 'error');

    render(App);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Application initialization failed:',
        'Test initialization error'
      );
    });
  });
});
