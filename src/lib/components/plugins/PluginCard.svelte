<!--
  Plugin Card Component for the Modular C2 Frontend
  Displays individual plugin information in a card format
  Requirements: 1.6, 1.7
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Plugin } from '../../types/plugin';

  // Props
  export let plugin: Plugin;
  export let disabled = false;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    click: { pluginId: string };
    toggle: { pluginId: string; enabled: boolean };
  }>();

  // Handle card click
  function handleCardClick() {
    if (!disabled && plugin.enabled) {
      dispatch('click', { pluginId: plugin.id });
    }
  }

  // Handle plugin toggle
  function handleToggle(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    dispatch('toggle', { pluginId: plugin.id, enabled: !plugin.enabled });
  }

  // Get plugin icon based on category or ID
  function getPluginIcon(plugin: Plugin): string {
    // Return appropriate icon based on plugin category or ID
    switch (plugin.category || plugin.id) {
      case 'mission':
      case 'mission-planner':
        return 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';
      case 'communication':
      case 'sdr-suite':
        return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z';
      case 'navigation':
        return 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z';
      case 'monitoring':
        return 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';
      case 'analysis':
        return 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z';
      case 'utility':
        return 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z';
      default:
        return 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';
    }
  }

  // Get status indicator color
  function getStatusColor(plugin: Plugin): string {
    if (!plugin.enabled) return 'var(--color-text_disabled)';
    return 'var(--color-accent_green)';
  }

  // Get category display name
  function getCategoryName(category?: string): string {
    switch (category) {
      case 'mission':
        return 'Mission';
      case 'communication':
        return 'Communication';
      case 'navigation':
        return 'Navigation';
      case 'monitoring':
        return 'Monitoring';
      case 'analysis':
        return 'Analysis';
      case 'utility':
        return 'Utility';
      default:
        return 'General';
    }
  }
</script>

<div
  class="plugin-card {disabled ? 'disabled' : ''} {!plugin.enabled ? 'plugin-disabled' : ''}"
  data-testid="plugin-card"
  data-plugin-id={plugin.id}
  on:click={handleCardClick}
  on:keydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  }}
  role="button"
  tabindex={disabled ? -1 : 0}
  aria-label="Open {plugin.name} plugin"
  aria-disabled={disabled || !plugin.enabled}
>
  <!-- Plugin Status Indicator -->
  <div class="status-indicator" style="background-color: {getStatusColor(plugin)}"></div>

  <!-- Plugin Header -->
  <div class="plugin-header">
    <div class="plugin-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d={getPluginIcon(plugin)} />
      </svg>
    </div>

    <div class="plugin-info">
      <h3 class="plugin-name">{plugin.name}</h3>
      {#if plugin.category}
        <span class="plugin-category">{getCategoryName(plugin.category)}</span>
      {/if}
    </div>

    <!-- Plugin Toggle -->
    <button
      class="plugin-toggle"
      on:click|stopPropagation={handleToggle}
      aria-label="{plugin.enabled ? 'Disable' : 'Enable'} {plugin.name}"
      data-testid="plugin-toggle"
      type="button"
    >
      <div class="toggle-switch {plugin.enabled ? 'enabled' : 'disabled'}">
        <div class="toggle-handle"></div>
      </div>
    </button>
  </div>

  <!-- Plugin Description -->
  <div class="plugin-description">
    <p>{plugin.description}</p>
  </div>

  <!-- Plugin Footer -->
  <div class="plugin-footer">
    {#if plugin.version}
      <span class="plugin-version">v{plugin.version}</span>
    {/if}
    {#if plugin.author}
      <span class="plugin-author">by {plugin.author}</span>
    {/if}
  </div>

  <!-- Hover Overlay -->
  <div class="hover-overlay" aria-hidden="true">
    <div class="hover-content">
      {#if plugin.enabled}
        <svg class="launch-icon" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"
          />
        </svg>
        <span>Open Plugin</span>
      {:else}
        <svg class="disabled-icon" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
          />
        </svg>
        <span>Plugin Disabled</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .plugin-card {
    position: relative;
    background-color: var(--component-plugin_card-background);
    border: var(--layout-border_width) solid transparent;
    border-radius: var(--component-plugin_card-border_radius);
    padding: calc(var(--layout-spacing_unit) * 2);
    cursor: pointer;
    transition: all var(--animation-transition_duration) var(--animation-easing_function);
    overflow: hidden;
    user-select: none;
    min-height: 180px;
    display: flex;
    flex-direction: column;
  }

  .plugin-card:hover:not(.disabled):not(.plugin-disabled) {
    background-color: var(--component-plugin_card-background_hover);
    border-color: var(--color-accent_blue);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 191, 255, 0.15);
  }

  .plugin-card:hover:not(.disabled):not(.plugin-disabled) .hover-overlay {
    opacity: 1;
  }

  .plugin-card:active:not(.disabled):not(.plugin-disabled) {
    transform: translateY(-1px) scale(var(--animation-button_press_scale));
  }

  .plugin-card:focus-visible {
    outline: 2px solid var(--color-accent_blue);
    outline-offset: 2px;
  }

  .plugin-card.disabled,
  .plugin-card.plugin-disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .plugin-card.plugin-disabled {
    background-color: var(--color-background_secondary);
  }

  /* Status Indicator */
  .status-indicator {
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    border-radius: var(--layout-border_radius) 0 0 var(--layout-border_radius);
  }

  /* Plugin Header */
  .plugin-header {
    display: flex;
    align-items: flex-start;
    gap: calc(var(--layout-spacing_unit) * 1.5);
    margin-bottom: calc(var(--layout-spacing_unit) * 1.5);
  }

  .plugin-icon {
    width: 40px;
    height: 40px;
    color: var(--component-plugin_card-icon_color);
    flex-shrink: 0;
  }

  .plugin-info {
    flex: 1;
    min-width: 0;
  }

  .plugin-name {
    font-size: var(--typography-font_size_base);
    font-weight: 600;
    color: var(--component-plugin_card-text_color);
    margin: 0 0 calc(var(--layout-spacing_unit) / 2) 0;
    line-height: 1.3;
  }

  .plugin-category {
    font-size: var(--typography-font_size_sm);
    color: var(--color-text_secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 500;
  }

  /* Plugin Toggle */
  .plugin-toggle {
    background: none;
    border: none;
    padding: calc(var(--layout-spacing_unit) / 2);
    cursor: pointer;
    border-radius: var(--layout-border_radius);
    transition: background-color var(--animation-transition_duration);
    position: relative;
    z-index: 10;
  }

  .plugin-toggle:hover {
    background-color: var(--color-background_tertiary);
  }

  .plugin-toggle:focus {
    outline: 2px solid var(--color-accent_blue);
    outline-offset: 2px;
  }

  .toggle-switch {
    width: 36px;
    height: 20px;
    border-radius: 10px;
    position: relative;
    transition: background-color var(--animation-transition_duration);
  }

  .toggle-switch.enabled {
    background-color: var(--color-accent_green);
  }

  .toggle-switch.disabled {
    background-color: var(--color-text_disabled);
  }

  .toggle-handle {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: white;
    position: absolute;
    top: 2px;
    transition: transform var(--animation-transition_duration);
  }

  .toggle-switch.enabled .toggle-handle {
    transform: translateX(18px);
  }

  .toggle-switch.disabled .toggle-handle {
    transform: translateX(2px);
  }

  /* Plugin Description */
  .plugin-description {
    flex: 1;
    margin-bottom: calc(var(--layout-spacing_unit) * 1.5);
  }

  .plugin-description p {
    font-size: var(--typography-font_size_sm);
    color: var(--color-text_secondary);
    line-height: 1.5;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Plugin Footer */
  .plugin-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--typography-font_size_sm);
    color: var(--color-text_disabled);
    margin-top: auto;
  }

  .plugin-version {
    font-weight: 500;
  }

  .plugin-author {
    font-style: italic;
  }

  /* Hover Overlay */
  .hover-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(0, 191, 255, 0.9), rgba(0, 191, 255, 0.7));
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity var(--animation-transition_duration);
    border-radius: var(--component-plugin_card-border_radius);
  }

  .hover-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: calc(var(--layout-spacing_unit) / 2);
    color: white;
    text-align: center;
  }

  .launch-icon,
  .disabled-icon {
    width: 32px;
    height: 32px;
  }

  .hover-content span {
    font-size: var(--typography-font_size_sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .plugin-card {
      padding: calc(var(--layout-spacing_unit) * 1.5);
      min-height: 160px;
    }

    .plugin-icon {
      width: 32px;
      height: 32px;
    }

    .plugin-name {
      font-size: var(--typography-font_size_sm);
    }

    .toggle-switch {
      width: 32px;
      height: 18px;
    }

    .toggle-handle {
      width: 14px;
      height: 14px;
    }

    .toggle-switch.enabled .toggle-handle {
      transform: translateX(16px);
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .plugin-card {
      border-color: var(--color-text_secondary);
    }

    .plugin-card:hover:not(.disabled):not(.plugin-disabled) {
      border-color: var(--color-accent_blue);
      border-width: 2px;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .plugin-card,
    .plugin-toggle,
    .toggle-switch,
    .toggle-handle,
    .hover-overlay {
      transition: none;
    }

    .plugin-card:hover:not(.disabled):not(.plugin-disabled) {
      transform: none;
    }

    .plugin-card:active:not(.disabled):not(.plugin-disabled) {
      transform: none;
    }
  }
</style>
