/**
 * PluginDashboard Component Tests
 * Tests plugin dashboard functionality including search, filtering, and plugin management
 * Requirements: 1.5, 1.6, 1.7, 1.8
 */

import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import PluginDashboard from '../PluginDashboard.svelte';
import { plugins, pluginLoading, pluginError } from '../../../stores/plugins';
import { createMockPlugin } from '../../../test-utils/mock-factories';
import type { Plugin } from '../../../types/plugin';

// Mock stores
vi.mock('../../../stores/plugins', () => ({
  plugins: { subscribe: vi.fn() },
  pluginLoading: { subscribe: vi.fn() },
  pluginError: { subscribe: vi.fn() },
  setActivePlugin: vi.fn(),
  loadPlugin: vi.fn(),
  unloadPlugin: vi.fn(),
  initializePluginSystem: vi.fn()
}));

vi.mock('../../../stores/notifications', () => ({
  showNotification: vi.fn()
}));

describe('PluginDashboard Component', () => {
  const mockPlugins: Plugin[] = [
    createMockPlugin({
      id: 'mission-planner',
      name: 'Mission Planner',
      description: 'Plan and manage vehicle missions',
      category: 'mission',
      enabled: true,
      author: 'Aerospace Team',
      version: '1.0.0'
    }),
    createMockPlugin({
      id: 'sdr-suite',
      name: 'SDR Suite',
      description: 'Software Defined Radio analysis tools',
      category: 'communication',
      enabled: false,
      author: 'RF Team',
      version: '2.1.0'
    }),
    createMockPlugin({
      id: 'navigation-tools',
      name: 'Navigation Tools',
      description: 'GPS and navigation utilities',
      category: 'navigation',
      enabled: true,
      author: 'Nav Team',
      version: '1.5.0'
    })
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default store mocks
    vi.mocked(plugins.subscribe).mockImplementation((callback) => {
      callback(mockPlugins);
      return () => {};
    });

    vi.mocked(pluginLoading.subscribe).mockImplementation((callback) => {
      callback(false);
      return () => {};
    });

    vi.mocked(pluginError.subscribe).mockImplementation((callback) => {
      callback(null);
      return () => {};
    });
  });

  test('renders dashboard with correct structure', () => {
    const { getByTestId } = render(PluginDashboard);

    expect(getByTestId('plugin-dashboard')).toBeInTheDocument();
    expect(screen.getByText('Plugin Dashboard')).toBeInTheDocument();
    expect(
      screen.getByText('Manage and access your aerospace command & control plugins')
    ).toBeInTheDocument();
  });

  test('displays correct plugin statistics', () => {
    render(PluginDashboard);

    expect(screen.getByText('3')).toBeInTheDocument(); // Total
    expect(screen.getByText('2')).toBeInTheDocument(); // Enabled
    expect(screen.getByText('1')).toBeInTheDocument(); // Disabled
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  test('renders all plugins in grid view by default', () => {
    const { getByTestId } = render(PluginDashboard);

    const pluginsContainer = getByTestId('plugins-container');
    expect(pluginsContainer).toHaveClass('grid');

    // Should render all plugins
    expect(screen.getByText('Mission Planner')).toBeInTheDocument();
    expect(screen.getByText('SDR Suite')).toBeInTheDocument();
    expect(screen.getByText('Navigation Tools')).toBeInTheDocument();
  });

  test('filters plugins by search query', async () => {
    const { getByTestId } = render(PluginDashboard);

    const searchInput = getByTestId('plugin-search');
    await fireEvent.input(searchInput, { target: { value: 'mission' } });

    // Should only show Mission Planner
    expect(screen.getByText('Mission Planner')).toBeInTheDocument();
    expect(screen.queryByText('SDR Suite')).not.toBeInTheDocument();
    expect(screen.queryByText('Navigation Tools')).not.toBeInTheDocument();
  });

  test('filters plugins by category', async () => {
    const { getByTestId } = render(PluginDashboard);

    const categoryFilter = getByTestId('category-filter');
    await fireEvent.change(categoryFilter, { target: { value: 'communication' } });

    // Should only show SDR Suite
    expect(screen.queryByText('Mission Planner')).not.toBeInTheDocument();
    expect(screen.getByText('SDR Suite')).toBeInTheDocument();
    expect(screen.queryByText('Navigation Tools')).not.toBeInTheDocument();
  });

  test('sorts plugins by name', async () => {
    const { getByTestId } = render(PluginDashboard);

    const sortSelect = getByTestId('sort-select');
    await fireEvent.change(sortSelect, { target: { value: 'name' } });

    // Plugins should be sorted alphabetically
    const pluginCards = document.querySelectorAll('[data-testid="plugin-card"]');
    expect(pluginCards[0]).toHaveAttribute('data-plugin-id', 'mission-planner');
    expect(pluginCards[1]).toHaveAttribute('data-plugin-id', 'navigation-tools');
    expect(pluginCards[2]).toHaveAttribute('data-plugin-id', 'sdr-suite');
  });

  test('sorts plugins by category', async () => {
    const { getByTestId } = render(PluginDashboard);

    const sortSelect = getByTestId('sort-select');
    await fireEvent.change(sortSelect, { target: { value: 'category' } });

    // Should be sorted by category
    const pluginCards = document.querySelectorAll('[data-testid="plugin-card"]');
    // communication, mission, navigation (alphabetical order)
    expect(pluginCards[0]).toHaveAttribute('data-plugin-id', 'sdr-suite');
    expect(pluginCards[1]).toHaveAttribute('data-plugin-id', 'mission-planner');
    expect(pluginCards[2]).toHaveAttribute('data-plugin-id', 'navigation-tools');
  });

  test('sorts plugins by status (enabled first)', async () => {
    const { getByTestId } = render(PluginDashboard);

    const sortSelect = getByTestId('sort-select');
    await fireEvent.change(sortSelect, { target: { value: 'recent' } });

    // Enabled plugins should come first
    const pluginCards = document.querySelectorAll('[data-testid="plugin-card"]');
    expect(pluginCards[0]).toHaveAttribute('data-plugin-id', 'mission-planner');
    expect(pluginCards[1]).toHaveAttribute('data-plugin-id', 'navigation-tools');
    expect(pluginCards[2]).toHaveAttribute('data-plugin-id', 'sdr-suite');
  });

  test('toggles between grid and list view', async () => {
    const { getByTestId } = render(PluginDashboard);

    const pluginsContainer = getByTestId('plugins-container');
    const gridButton = getByTestId('grid-view-button');
    const listButton = getByTestId('list-view-button');

    // Should start in grid view
    expect(pluginsContainer).toHaveClass('grid');
    expect(gridButton).toHaveClass('active');
    expect(listButton).not.toHaveClass('active');

    // Switch to list view
    await fireEvent.click(listButton);
    expect(pluginsContainer).toHaveClass('list');
    expect(listButton).toHaveClass('active');
    expect(gridButton).not.toHaveClass('active');

    // Switch back to grid view
    await fireEvent.click(gridButton);
    expect(pluginsContainer).toHaveClass('grid');
    expect(gridButton).toHaveClass('active');
    expect(listButton).not.toHaveClass('active');
  });

  test('clears search when clear button is clicked', async () => {
    const { getByTestId } = render(PluginDashboard);

    const searchInput = getByTestId('plugin-search');
    await fireEvent.input(searchInput, { target: { value: 'test search' } });

    expect(searchInput).toHaveValue('test search');

    const clearButton = document.querySelector('.clear-search');
    expect(clearButton).toBeInTheDocument();

    await fireEvent.click(clearButton!);
    expect(searchInput).toHaveValue('');
  });

  test('shows clear filters button when filters are applied', async () => {
    const { getByTestId } = render(PluginDashboard);

    // Initially no clear filters button
    expect(screen.queryByTestId('clear-filters-button')).not.toBeInTheDocument();

    // Apply search filter
    const searchInput = getByTestId('plugin-search');
    await fireEvent.input(searchInput, { target: { value: 'test' } });

    expect(getByTestId('clear-filters-button')).toBeInTheDocument();

    // Clear filters
    await fireEvent.click(getByTestId('clear-filters-button'));
    expect(searchInput).toHaveValue('');
    expect(getByTestId('category-filter')).toHaveValue('all');
  });

  test('handles plugin activation', async () => {
    const { setActivePlugin } = await import('../../../stores/plugins');
    const { showNotification } = await import('../../../stores/notifications');

    render(PluginDashboard);

    // Find and click a plugin card
    const missionPlannerCard = screen
      .getByText('Mission Planner')
      .closest('[data-testid="plugin-card"]');
    expect(missionPlannerCard).toBeInTheDocument();

    await fireEvent.click(missionPlannerCard!);

    expect(setActivePlugin).toHaveBeenCalledWith('mission-planner');
    expect(showNotification).toHaveBeenCalledWith({
      type: 'info',
      message: 'Plugin Activated',
      details: 'Switched to Mission Planner'
    });
  });

  test('handles plugin toggle (enable)', async () => {
    const { loadPlugin } = await import('../../../stores/plugins');
    const { showNotification } = await import('../../../stores/notifications');

    vi.mocked(loadPlugin).mockResolvedValue(true);

    render(PluginDashboard);

    // Find the disabled SDR Suite plugin and toggle it
    const sdrCard = screen.getByText('SDR Suite').closest('[data-testid="plugin-card"]');
    const toggleButton = sdrCard!.querySelector('[data-testid="plugin-toggle"]');

    await fireEvent.click(toggleButton!);

    expect(loadPlugin).toHaveBeenCalledWith('sdr-suite');
    expect(showNotification).toHaveBeenCalledWith({
      type: 'success',
      message: 'Plugin Enabled',
      details: 'SDR Suite has been enabled'
    });
  });

  test('handles plugin toggle (disable)', async () => {
    const { unloadPlugin } = await import('../../../stores/plugins');
    const { showNotification } = await import('../../../stores/notifications');

    vi.mocked(unloadPlugin).mockResolvedValue(true);

    render(PluginDashboard);

    // Find the enabled Mission Planner plugin and toggle it
    const missionCard = screen.getByText('Mission Planner').closest('[data-testid="plugin-card"]');
    const toggleButton = missionCard!.querySelector('[data-testid="plugin-toggle"]');

    await fireEvent.click(toggleButton!);

    expect(unloadPlugin).toHaveBeenCalledWith('mission-planner');
    expect(showNotification).toHaveBeenCalledWith({
      type: 'info',
      message: 'Plugin Disabled',
      details: 'Mission Planner has been disabled'
    });
  });

  test('handles plugin toggle error', async () => {
    const { loadPlugin } = await import('../../../stores/plugins');
    const { showNotification } = await import('../../../stores/notifications');

    const error = new Error('Failed to load plugin');
    vi.mocked(loadPlugin).mockRejectedValue(error);

    render(PluginDashboard);

    // Try to enable SDR Suite
    const sdrCard = screen.getByText('SDR Suite').closest('[data-testid="plugin-card"]');
    const toggleButton = sdrCard!.querySelector('[data-testid="plugin-toggle"]');

    await fireEvent.click(toggleButton!);

    expect(showNotification).toHaveBeenCalledWith({
      type: 'error',
      message: 'Plugin Enable Failed',
      details: 'Failed to load plugin'
    });
  });

  test('handles refresh functionality', async () => {
    const { initializePluginSystem } = await import('../../../stores/plugins');
    const { showNotification } = await import('../../../stores/notifications');

    vi.mocked(initializePluginSystem).mockResolvedValue(true);

    const { getByTestId } = render(PluginDashboard);

    const refreshButton = getByTestId('refresh-button');
    await fireEvent.click(refreshButton);

    expect(initializePluginSystem).toHaveBeenCalled();
    expect(showNotification).toHaveBeenCalledWith({
      type: 'success',
      message: 'Plugins Refreshed',
      details: 'Plugin list has been updated'
    });
  });

  test('handles refresh error', async () => {
    const { initializePluginSystem } = await import('../../../stores/plugins');
    const { showNotification } = await import('../../../stores/notifications');

    const error = new Error('Refresh failed');
    vi.mocked(initializePluginSystem).mockRejectedValue(error);

    const { getByTestId } = render(PluginDashboard);

    const refreshButton = getByTestId('refresh-button');
    await fireEvent.click(refreshButton);

    expect(showNotification).toHaveBeenCalledWith({
      type: 'error',
      message: 'Refresh Failed',
      details: 'Refresh failed'
    });
  });

  test('disables refresh button during refresh', async () => {
    const { initializePluginSystem } = await import('../../../stores/plugins');

    // Mock a slow refresh
    vi.mocked(initializePluginSystem).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const { getByTestId } = render(PluginDashboard);

    const refreshButton = getByTestId('refresh-button');
    expect(refreshButton).not.toBeDisabled();

    fireEvent.click(refreshButton);

    // Should be disabled during refresh
    expect(refreshButton).toBeDisabled();
    expect(screen.getByText('Refreshing...')).toBeInTheDocument();

    await waitFor(() => {
      expect(refreshButton).not.toBeDisabled();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  test('shows loading state', () => {
    vi.mocked(pluginLoading.subscribe).mockImplementation((callback) => {
      callback(true);
      return () => {};
    });

    const { getByTestId } = render(PluginDashboard);

    expect(getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.getByText('Loading Plugins')).toBeInTheDocument();
    expect(screen.getByText('Discovering available plugins...')).toBeInTheDocument();
    expect(document.querySelector('.loading-spinner')).toBeInTheDocument();
  });

  test('shows error state', () => {
    const errorMessage = 'Failed to load plugins';
    vi.mocked(pluginError.subscribe).mockImplementation((callback) => {
      callback(errorMessage);
      return () => {};
    });

    const { getByTestId } = render(PluginDashboard);

    expect(getByTestId('error-state')).toBeInTheDocument();
    expect(screen.getByText('Plugin Loading Error')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('shows empty state when no plugins match filters', async () => {
    const { getByTestId } = render(PluginDashboard);

    // Apply a search that matches no plugins
    const searchInput = getByTestId('plugin-search');
    await fireEvent.input(searchInput, { target: { value: 'nonexistent' } });

    expect(getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No Matching Plugins')).toBeInTheDocument();
    expect(
      screen.getByText('Try adjusting your search criteria or filters to find plugins.')
    ).toBeInTheDocument();
  });

  test('shows empty state when no plugins available', () => {
    vi.mocked(plugins.subscribe).mockImplementation((callback) => {
      callback([]);
      return () => {};
    });

    const { getByTestId } = render(PluginDashboard);

    expect(getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No Plugins Available')).toBeInTheDocument();
    expect(
      screen.getByText(
        'No plugins are currently available. Check your plugin directory or refresh the list.'
      )
    ).toBeInTheDocument();
  });

  test('handles keyboard shortcuts', async () => {
    const { initializePluginSystem } = await import('../../../stores/plugins');
    vi.mocked(initializePluginSystem).mockResolvedValue(true);

    const { getByTestId } = render(PluginDashboard);

    // Test Ctrl+R for refresh
    await fireEvent.keyDown(document, { key: 'r', ctrlKey: true });
    expect(initializePluginSystem).toHaveBeenCalled();

    // Test Escape to clear search
    const searchInput = getByTestId('plugin-search');
    await fireEvent.input(searchInput, { target: { value: 'test' } });
    expect(searchInput).toHaveValue('test');

    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(searchInput).toHaveValue('');
  });

  test('handles complex search queries', async () => {
    const { getByTestId } = render(PluginDashboard);

    const searchInput = getByTestId('plugin-search');

    // Search by author
    await fireEvent.input(searchInput, { target: { value: 'RF Team' } });
    expect(screen.getByText('SDR Suite')).toBeInTheDocument();
    expect(screen.queryByText('Mission Planner')).not.toBeInTheDocument();

    // Search by description
    await fireEvent.input(searchInput, { target: { value: 'GPS' } });
    expect(screen.getByText('Navigation Tools')).toBeInTheDocument();
    expect(screen.queryByText('Mission Planner')).not.toBeInTheDocument();
    expect(screen.queryByText('SDR Suite')).not.toBeInTheDocument();
  });

  test('maintains filter state during plugin operations', async () => {
    const { getByTestId } = render(PluginDashboard);

    // Apply filters
    const searchInput = getByTestId('plugin-search');
    const categoryFilter = getByTestId('category-filter');

    await fireEvent.input(searchInput, { target: { value: 'mission' } });
    await fireEvent.change(categoryFilter, { target: { value: 'mission' } });

    // Perform plugin operation
    const missionCard = screen.getByText('Mission Planner').closest('[data-testid="plugin-card"]');
    const toggleButton = missionCard!.querySelector('[data-testid="plugin-toggle"]');
    await fireEvent.click(toggleButton!);

    // Filters should still be applied
    expect(searchInput).toHaveValue('mission');
    expect(categoryFilter).toHaveValue('mission');
  });
});
