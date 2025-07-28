<!--
  ThemeSelector component for the Modular C2 Frontend
  Provides UI for selecting and switching themes
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { loadTheme, theme, themeLoading } from '../../stores/theme';

  // Props
  export let availableThemes: string[] = ['super_amoled_black'];
  export let disabled: boolean = false;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    themeChanged: string;
    themeLoadError: string;
  }>();

  // Local state
  let selectedTheme = 'super_amoled_black';

  // Update selected theme when current theme changes
  $: if ($theme) {
    selectedTheme = $theme.name.toLowerCase().replace(/\s+/g, '_');
  }

  // Handle theme selection
  async function handleThemeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newTheme = target.value;

    if (newTheme === selectedTheme) return;

    try {
      await loadTheme({ themeName: newTheme });
      dispatch('themeChanged', newTheme);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch('themeLoadError', errorMessage);

      // Reset selection to current theme on error
      target.value = selectedTheme;
    }
  }

  // Format theme name for display
  function formatThemeName(themeName: string): string {
    return themeName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
</script>

<div class="theme-selector" data-testid="theme-selector">
  <label for="theme-select" class="theme-label"> Theme: </label>

  <div class="select-container">
    <select
      id="theme-select"
      bind:value={selectedTheme}
      on:change={handleThemeChange}
      disabled={disabled || $themeLoading}
      class="theme-select"
      data-testid="theme-select-input"
    >
      {#each availableThemes as themeName}
        <option value={themeName}>
          {formatThemeName(themeName)}
        </option>
      {/each}
    </select>

    {#if $themeLoading}
      <div class="loading-indicator" data-testid="theme-loading-indicator">
        <div class="spinner"></div>
      </div>
    {/if}
  </div>
</div>

<style>
  .theme-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--typography-font_family_sans, sans-serif);
  }

  .theme-label {
    font-size: var(--typography-font_size_sm, 12px);
    color: var(--color-text_secondary, #cccccc);
    font-weight: 500;
  }

  .select-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .theme-select {
    background-color: var(--color-background_secondary, #1a1a1a);
    color: var(--color-text_primary, #ffffff);
    border: var(--layout-border_width, 1px) solid var(--color-text_disabled, #666666);
    border-radius: var(--layout-border_radius, 6px);
    padding: 0.25rem 0.5rem;
    font-size: var(--typography-font_size_sm, 12px);
    font-family: inherit;
    cursor: pointer;
    transition: border-color var(--animation-transition_duration, 200ms);
    min-width: 150px;
  }

  .theme-select:hover:not(:disabled) {
    border-color: var(--color-accent_blue, #00bfff);
  }

  .theme-select:focus {
    outline: none;
    border-color: var(--color-accent_blue, #00bfff);
    box-shadow: 0 0 0 2px rgba(0, 191, 255, 0.2);
  }

  .theme-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .theme-select option {
    background-color: var(--color-background_secondary, #1a1a1a);
    color: var(--color-text_primary, #ffffff);
    padding: 0.25rem;
  }

  .loading-indicator {
    position: absolute;
    right: 0.5rem;
    display: flex;
    align-items: center;
    pointer-events: none;
  }

  .spinner {
    width: 12px;
    height: 12px;
    border: 1px solid var(--color-text_disabled, #666666);
    border-top: 1px solid var(--color-accent_blue, #00bfff);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
