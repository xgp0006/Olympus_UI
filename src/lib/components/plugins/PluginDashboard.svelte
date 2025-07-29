<!--
  Plugin Dashboard Component for the Modular C2 Frontend
  Displays a grid of available plugins with management capabilities
  Requirements: 1.5, 1.6, 1.7, 1.8
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    plugins,
    pluginLoading,
    pluginError,
    setActivePlugin,
    loadPlugin,
    unloadPlugin,
    initializePluginSystem
  } from '../../stores/plugins';
  import { showNotification } from '../../stores/notifications';
  import PluginCard from './PluginCard.svelte';
  import type { Plugin } from '../../types/plugin';

  // Component state
  let searchQuery = '';
  let selectedCategory = 'all';
  let sortBy: 'name' | 'category' | 'recent' = 'name';
  let viewMode: 'grid' | 'list' = 'grid';
  let refreshing = false;

  // Available categories
  const categories = [
    { id: 'all', name: 'All Plugins' },
    { id: 'mission', name: 'Mission' },
    { id: 'communication', name: 'Communication' },
    { id: 'navigation', name: 'Navigation' },
    { id: 'monitoring', name: 'Monitoring' },
    { id: 'analysis', name: 'Analysis' },
    { id: 'utility', name: 'Utility' }
  ];

  // Filtered and sorted plugins
  $: filteredPlugins = filterAndSortPlugins($plugins, searchQuery, selectedCategory, sortBy);

  // Plugin statistics
  $: pluginStats = {
    total: $plugins.length,
    enabled: $plugins.filter((p) => p.enabled).length,
    disabled: $plugins.filter((p) => !p.enabled).length
  };

  /**
   * Filter and sort plugins based on current criteria
   */
  function filterAndSortPlugins(
    plugins: Plugin[],
    query: string,
    category: string,
    sort: string
  ): Plugin[] {
    let filtered = [...plugins];

    // Apply search filter
    if (query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      filtered = filtered.filter(
        (plugin) =>
          plugin.name.toLowerCase().includes(searchTerm) ||
          plugin.description.toLowerCase().includes(searchTerm) ||
          plugin.author?.toLowerCase().includes(searchTerm) ||
          plugin.category?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply category filter
    if (category !== 'all') {
      filtered = filtered.filter((plugin) => plugin.category === category);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'recent':
          // Sort by enabled status first, then by name
          if (a.enabled !== b.enabled) {
            return a.enabled ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }

  /**
   * Handle plugin card click - activate plugin
   */
  async function handlePluginClick(event: CustomEvent<{ pluginId: string }>) {
    const { pluginId } = event.detail;

    try {
      console.log(`Activating plugin: ${pluginId}`);
      setActivePlugin(pluginId);

      showNotification({
        type: 'info',
        message: 'Plugin Activated',
        details: `Switched to ${$plugins.find((p) => p.id === pluginId)?.name || pluginId}`
      });
    } catch (error) {
      console.error('Failed to activate plugin:', error);
      showNotification({
        type: 'error',
        message: 'Plugin Activation Failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle plugin toggle - enable/disable plugin
   */
  async function handlePluginToggle(event: CustomEvent<{ pluginId: string; enabled: boolean }>) {
    const { pluginId, enabled } = event.detail;
    const plugin = $plugins.find((p) => p.id === pluginId);

    if (!plugin) {
      console.error(`Plugin not found: ${pluginId}`);
      return;
    }

    try {
      if (enabled) {
        console.log(`Enabling plugin: ${pluginId}`);
        await loadPlugin(pluginId);

        showNotification({
          type: 'success',
          message: 'Plugin Enabled',
          details: `${plugin.name} has been enabled`
        });
      } else {
        console.log(`Disabling plugin: ${pluginId}`);
        await unloadPlugin(pluginId);

        showNotification({
          type: 'info',
          message: 'Plugin Disabled',
          details: `${plugin.name} has been disabled`
        });
      }
    } catch (error) {
      console.error(`Failed to ${enabled ? 'enable' : 'disable'} plugin:`, error);
      showNotification({
        type: 'error',
        message: `Plugin ${enabled ? 'Enable' : 'Disable'} Failed`,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Refresh plugin list
   */
  async function handleRefresh() {
    if (refreshing) return;

    refreshing = true;

    try {
      console.log('Refreshing plugin list...');
      await initializePluginSystem();

      showNotification({
        type: 'success',
        message: 'Plugins Refreshed',
        details: 'Plugin list has been updated'
      });
    } catch (error) {
      console.error('Failed to refresh plugins:', error);
      showNotification({
        type: 'error',
        message: 'Refresh Failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      refreshing = false;
    }
  }

  /**
   * Clear search and filters
   */
  function clearFilters() {
    searchQuery = '';
    selectedCategory = 'all';
    sortBy = 'name';
  }

  /**
   * Handle keyboard shortcuts
   */
  function handleKeydown(event: KeyboardEvent) {
    // Ctrl/Cmd + R to refresh
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
      event.preventDefault();
      handleRefresh();
    }

    // Escape to clear search
    if (event.key === 'Escape' && searchQuery) {
      searchQuery = '';
    }
  }

  // Setup keyboard listeners
  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="plugin-dashboard" data-testid="plugin-dashboard">
  <!-- Dashboard Header -->
  <div class="dashboard-header">
    <div class="header-content">
      <div class="title-section">
        <h2 class="dashboard-title">Plugin Dashboard</h2>
        <p class="dashboard-subtitle">Manage and access your aerospace command & control plugins</p>
      </div>

      <div class="stats-section">
        <div class="stat-item">
          <span class="stat-value">{pluginStats.total}</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat-item">
          <span class="stat-value enabled">{pluginStats.enabled}</span>
          <span class="stat-label">Enabled</span>
        </div>
        <div class="stat-item">
          <span class="stat-value disabled">{pluginStats.disabled}</span>
          <span class="stat-label">Disabled</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Controls Section -->
  <div class="controls-section">
    <div class="controls-row">
      <!-- Search -->
      <div class="search-container">
        <div class="search-input-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search plugins..."
            bind:value={searchQuery}
            class="search-input"
            data-testid="plugin-search"
          />
          {#if searchQuery}
            <button
              class="clear-search"
              on:click={() => (searchQuery = '')}
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                />
              </svg>
            </button>
          {/if}
        </div>
      </div>

      <!-- Category Filter -->
      <div class="filter-container">
        <select bind:value={selectedCategory} class="category-select" data-testid="category-filter">
          {#each categories as category}
            <option value={category.id}>{category.name}</option>
          {/each}
        </select>
      </div>

      <!-- Sort Options -->
      <div class="sort-container">
        <select bind:value={sortBy} class="sort-select" data-testid="sort-select">
          <option value="name">Sort by Name</option>
          <option value="category">Sort by Category</option>
          <option value="recent">Sort by Status</option>
        </select>
      </div>

      <!-- View Mode Toggle -->
      <div class="view-toggle">
        <button
          class="view-button {viewMode === 'grid' ? 'active' : ''}"
          on:click={() => (viewMode = 'grid')}
          aria-label="Grid view"
          data-testid="grid-view-button"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z"
            />
          </svg>
        </button>
        <button
          class="view-button {viewMode === 'list' ? 'active' : ''}"
          on:click={() => (viewMode = 'list')}
          aria-label="List view"
          data-testid="list-view-button"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"
            />
          </svg>
        </button>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button
          class="refresh-button"
          on:click={handleRefresh}
          disabled={refreshing || $pluginLoading}
          aria-label="Refresh plugins"
          data-testid="refresh-button"
        >
          <svg
            class="refresh-icon {refreshing ? 'spinning' : ''}"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
            />
          </svg>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>

        {#if searchQuery || selectedCategory !== 'all'}
          <button
            class="clear-filters-button"
            on:click={clearFilters}
            data-testid="clear-filters-button"
          >
            Clear Filters
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Plugin Grid/List -->
  <div class="plugins-section">
    {#if $pluginLoading}
      <div class="loading-state" data-testid="loading-state">
        <div class="loading-spinner"></div>
        <h3 class="loading-title">Loading Plugins</h3>
        <p class="loading-message">Discovering available plugins...</p>
      </div>
    {:else if $pluginError}
      <div class="error-state" data-testid="error-state">
        <div class="error-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
            />
          </svg>
        </div>
        <h3 class="error-title">Plugin Loading Error</h3>
        <p class="error-message">{$pluginError}</p>
        <button class="retry-button" on:click={handleRefresh}> Retry </button>
      </div>
    {:else if filteredPlugins.length === 0}
      <div class="empty-state" data-testid="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
        </div>
        <h3 class="empty-title">
          {searchQuery || selectedCategory !== 'all'
            ? 'No Matching Plugins'
            : 'No Plugins Available'}
        </h3>
        <p class="empty-message">
          {#if searchQuery || selectedCategory !== 'all'}
            Try adjusting your search criteria or filters to find plugins.
          {:else}
            No plugins are currently available. Check your plugin directory or refresh the list.
          {/if}
        </p>
        {#if searchQuery || selectedCategory !== 'all'}
          <button class="clear-filters-button" on:click={clearFilters}> Clear Filters </button>
        {/if}
      </div>
    {:else}
      <div class="plugins-container {viewMode}" data-testid="plugins-container">
        {#each filteredPlugins as plugin (plugin.id)}
          <PluginCard
            {plugin}
            disabled={$pluginLoading}
            on:click={handlePluginClick}
            on:toggle={handlePluginToggle}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .plugin-dashboard {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--color-background_primary);
  }

  /* Dashboard Header */
  .dashboard-header {
    padding: calc(var(--layout-spacing_unit) * 2) calc(var(--layout-spacing_unit) * 2)
      var(--layout-spacing_unit);
    border-bottom: var(--layout-border_width) solid var(--color-background_tertiary);
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: calc(var(--layout-spacing_unit) * 2);
  }

  .title-section {
    flex: 1;
  }

  .dashboard-title {
    font-size: var(--typography-font_size_lg);
    font-weight: 600;
    color: var(--color-text_primary);
    margin: 0 0 calc(var(--layout-spacing_unit) / 2) 0;
  }

  .dashboard-subtitle {
    color: var(--color-text_secondary);
    margin: 0;
    font-size: var(--typography-font_size_sm);
  }

  .stats-section {
    display: flex;
    gap: calc(var(--layout-spacing_unit) * 2);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .stat-value {
    font-size: var(--typography-font_size_lg);
    font-weight: 700;
    color: var(--color-text_primary);
    line-height: 1;
  }

  .stat-value.enabled {
    color: var(--color-accent_green);
  }

  .stat-value.disabled {
    color: var(--color-text_disabled);
  }

  .stat-label {
    font-size: var(--typography-font_size_sm);
    color: var(--color-text_secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: calc(var(--layout-spacing_unit) / 4);
  }

  /* Controls Section */
  .controls-section {
    padding: var(--layout-spacing_unit) calc(var(--layout-spacing_unit) * 2);
    background-color: var(--color-background_secondary);
    border-bottom: var(--layout-border_width) solid var(--color-background_tertiary);
  }

  .controls-row {
    display: flex;
    align-items: center;
    gap: calc(var(--layout-spacing_unit) * 1.5);
    flex-wrap: wrap;
  }

  /* Search */
  .search-container {
    flex: 1;
    min-width: 200px;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: calc(var(--layout-spacing_unit) * 1.5);
    width: 16px;
    height: 16px;
    color: var(--color-text_disabled);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: calc(var(--layout-spacing_unit) * 1.5) calc(var(--layout-spacing_unit) * 1.5)
      calc(var(--layout-spacing_unit) * 1.5) calc(var(--layout-spacing_unit) * 5);
    background-color: var(--color-background_primary);
    border: var(--layout-border_width) solid var(--color-background_tertiary);
    border-radius: var(--layout-border_radius);
    color: var(--color-text_primary);
    font-family: inherit;
    font-size: var(--typography-font_size_sm);
    transition: border-color var(--animation-transition_duration);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--color-accent_blue);
  }

  .clear-search {
    position: absolute;
    right: calc(var(--layout-spacing_unit) * 1.5);
    background: none;
    border: none;
    color: var(--color-text_disabled);
    cursor: pointer;
    padding: calc(var(--layout-spacing_unit) / 2);
    border-radius: var(--layout-border_radius);
    transition: color var(--animation-transition_duration);
  }

  .clear-search:hover {
    color: var(--color-text_secondary);
  }

  .clear-search svg {
    width: 16px;
    height: 16px;
  }

  /* Filters and Controls */
  .filter-container,
  .sort-container {
    min-width: 150px;
  }

  .category-select,
  .sort-select {
    width: 100%;
    padding: calc(var(--layout-spacing_unit) * 1.5);
    background-color: var(--color-background_primary);
    border: var(--layout-border_width) solid var(--color-background_tertiary);
    border-radius: var(--layout-border_radius);
    color: var(--color-text_primary);
    font-family: inherit;
    font-size: var(--typography-font_size_sm);
    cursor: pointer;
  }

  .category-select:focus,
  .sort-select:focus {
    outline: none;
    border-color: var(--color-accent_blue);
  }

  /* View Toggle */
  .view-toggle {
    display: flex;
    border: var(--layout-border_width) solid var(--color-background_tertiary);
    border-radius: var(--layout-border_radius);
    overflow: hidden;
  }

  .view-button {
    background-color: var(--color-background_primary);
    border: none;
    padding: calc(var(--layout-spacing_unit) * 1.5);
    cursor: pointer;
    color: var(--color-text_secondary);
    transition: all var(--animation-transition_duration);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .view-button:hover {
    background-color: var(--color-background_tertiary);
    color: var(--color-text_primary);
  }

  .view-button.active {
    background-color: var(--color-accent_blue);
    color: white;
  }

  .view-button svg {
    width: 16px;
    height: 16px;
  }

  /* Action Buttons */
  .action-buttons {
    display: flex;
    gap: var(--layout-spacing_unit);
  }

  .refresh-button,
  .clear-filters-button {
    display: flex;
    align-items: center;
    gap: calc(var(--layout-spacing_unit) / 2);
    background-color: var(--color-background_primary);
    border: var(--layout-border_width) solid var(--color-background_tertiary);
    color: var(--color-text_secondary);
    padding: calc(var(--layout-spacing_unit) * 1.5);
    border-radius: var(--layout-border_radius);
    cursor: pointer;
    font-family: inherit;
    font-size: var(--typography-font_size_sm);
    transition: all var(--animation-transition_duration);
  }

  .refresh-button:hover,
  .clear-filters-button:hover {
    background-color: var(--color-background_tertiary);
    color: var(--color-text_primary);
    border-color: var(--color-accent_blue);
  }

  .refresh-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .refresh-icon {
    width: 16px;
    height: 16px;
    transition: transform var(--animation-transition_duration);
  }

  .refresh-icon.spinning {
    animation: spin 1s linear infinite;
  }

  /* Plugins Section */
  .plugins-section {
    flex: 1;
    overflow: auto;
    padding: calc(var(--layout-spacing_unit) * 2);
  }

  .plugins-container {
    display: grid;
    gap: var(--responsive-mobile-dashboard-mobile_gap, 12px);
  }

  .plugins-container.grid {
    grid-template-columns: var(--responsive-mobile-dashboard-mobile_columns, 1);
  }

  .plugins-container.list {
    grid-template-columns: 1fr;
    max-width: 800px;
    margin: 0 auto;
  }

  /* Loading State */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: calc(var(--layout-spacing_unit) * 6);
    text-align: center;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-text_disabled);
    border-top: 3px solid var(--color-accent_blue);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: calc(var(--layout-spacing_unit) * 2);
  }

  .loading-title {
    font-size: var(--typography-font_size_lg);
    color: var(--color-text_primary);
    margin-bottom: var(--layout-spacing_unit);
  }

  .loading-message {
    color: var(--color-text_secondary);
    margin: 0;
  }

  /* Error State */
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: calc(var(--layout-spacing_unit) * 6);
    text-align: center;
  }

  .error-icon {
    width: 48px;
    height: 48px;
    color: var(--color-accent_red);
    margin-bottom: calc(var(--layout-spacing_unit) * 2);
  }

  .error-title {
    font-size: var(--typography-font_size_lg);
    color: var(--color-accent_red);
    margin-bottom: var(--layout-spacing_unit);
  }

  .error-message {
    color: var(--color-text_secondary);
    margin-bottom: calc(var(--layout-spacing_unit) * 2);
    max-width: 400px;
    line-height: 1.5;
  }

  .retry-button {
    background-color: var(--color-accent_red);
    color: white;
    border: none;
    padding: calc(var(--layout-spacing_unit) * 1.5) calc(var(--layout-spacing_unit) * 2);
    border-radius: var(--layout-border_radius);
    cursor: pointer;
    font-family: inherit;
    font-size: var(--typography-font_size_base);
    transition: background-color var(--animation-transition_duration);
  }

  .retry-button:hover {
    filter: brightness(1.1);
  }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: calc(var(--layout-spacing_unit) * 6);
    text-align: center;
  }

  .empty-icon {
    width: 48px;
    height: 48px;
    color: var(--color-text_disabled);
    margin-bottom: calc(var(--layout-spacing_unit) * 2);
  }

  .empty-title {
    font-size: var(--typography-font_size_lg);
    color: var(--color-text_secondary);
    margin-bottom: var(--layout-spacing_unit);
  }

  .empty-message {
    color: var(--color-text_disabled);
    margin-bottom: calc(var(--layout-spacing_unit) * 2);
    max-width: 400px;
    line-height: 1.5;
  }

  /* Animations */
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  /* Tablet responsive design */
  @media (min-width: 768px) {
    .plugins-container.grid {
      grid-template-columns: var(--responsive-tablet-dashboard-tablet_columns, 2);
      gap: var(--responsive-tablet-dashboard-tablet_gap, 16px);
    }

    .dashboard-header {
      padding: var(--responsive-tablet-panel_padding, 16px);
    }

    .controls-section {
      padding: var(--responsive-tablet-panel_padding, 16px);
    }

    .plugins-section {
      padding: var(--responsive-tablet-panel_padding, 16px);
    }

    .header-content {
      flex-direction: row;
      align-items: flex-end;
      gap: calc(var(--layout-spacing_unit) * 2);
    }

    .stats-section {
      justify-content: flex-end;
    }

    .controls-row {
      flex-direction: row;
      align-items: center;
      gap: calc(var(--layout-spacing_unit) * 1.5);
    }

    .search-container {
      min-width: 200px;
    }
  }

  /* Desktop responsive design */
  @media (min-width: 1024px) {
    .plugins-container.grid {
      grid-template-columns: var(
        --responsive-desktop-dashboard-desktop_columns,
        repeat(auto-fill, minmax(300px, 1fr))
      );
      gap: var(--responsive-desktop-dashboard-desktop_gap, 20px);
    }

    .dashboard-header {
      padding: var(--responsive-desktop-panel_padding, 20px);
    }

    .controls-section {
      padding: var(--responsive-desktop-panel_padding, 20px);
    }

    .plugins-section {
      padding: var(--responsive-desktop-panel_padding, 20px);
    }
  }

  /* Mobile-first base styles */
  @media (max-width: 767px) {
    .dashboard-header {
      padding: var(--responsive-mobile-panel_padding, 12px);
    }

    .header-content {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--layout-spacing_unit);
    }

    .stats-section {
      align-self: stretch;
      justify-content: space-around;
    }

    .controls-section {
      padding: var(--responsive-mobile-panel_padding, 12px);
    }

    .controls-row {
      flex-direction: column;
      align-items: stretch;
      gap: var(--layout-spacing_unit);
    }

    .search-container {
      min-width: unset;
    }

    .plugins-section {
      padding: var(--responsive-mobile-panel_padding, 12px);
    }

    /* Touch-friendly controls on mobile */
    .search-input,
    .category-select,
    .sort-select {
      min-height: var(--responsive-mobile-touch_target_min, 44px);
      font-size: var(--responsive-mobile-font_size_base, 16px);
    }

    .view-button,
    .refresh-button,
    .clear-filters-button {
      min-height: var(--responsive-mobile-touch_target_min, 44px);
      font-size: var(--responsive-mobile-font_size_base, 16px);
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .loading-spinner,
    .refresh-icon.spinning {
      animation: none;
    }
  }
</style>
