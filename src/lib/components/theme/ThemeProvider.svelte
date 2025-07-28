<!--
  ThemeProvider component for the Modular C2 Frontend
  Loads and applies themes to the application
  Requirements: 3.4, 3.5, 3.6
-->
<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { loadTheme, theme, themeLoading, themeError } from '../../stores/theme';
  import type { ThemeLoadOptions } from '../../types/theme';

  // Props
  export let themeName: string = 'super_amoled_black';
  export let fallbackTheme: string = 'super_amoled_black';
  export let autoLoad: boolean = true;
  export let showLoadingIndicator: boolean = false;
  export let showErrorMessages: boolean = true;

  // Local state
  let mounted = false;
  let currentThemeName = themeName;

  // Load theme function
  async function loadCurrentTheme() {
    if (!mounted) return;

    try {
      const options: ThemeLoadOptions = {
        themeName: currentThemeName,
        fallbackTheme,
        validateTheme: true
      };

      await loadTheme(options);
      await tick(); // Ensure DOM updates
    } catch (error) {
      console.error('Failed to load theme in ThemeProvider:', error);
    }
  }

  // Load theme on mount if autoLoad is enabled
  onMount(async () => {
    mounted = true;

    if (autoLoad) {
      await loadCurrentTheme();
    }
  });

  // Reactive statement to reload theme when themeName changes
  $: if (mounted && themeName !== currentThemeName) {
    currentThemeName = themeName;
    loadCurrentTheme();
  }

  // Cleanup on destroy
  onDestroy(() => {
    mounted = false;
  });
</script>

<!-- Loading indicator -->
{#if showLoadingIndicator && $themeLoading}
  <div class="theme-loading" data-testid="theme-loading">
    <div class="loading-spinner"></div>
    <span>Loading theme...</span>
  </div>
{/if}

<!-- Error message -->
{#if showErrorMessages && $themeError}
  <div class="theme-error" data-testid="theme-error">
    <span class="error-icon">⚠️</span>
    <span class="error-message">Theme Error: {$themeError}</span>
    <button class="retry-button" on:click={() => loadTheme({ themeName, fallbackTheme })}>
      Retry
    </button>
  </div>
{/if}

<!-- Main content - only render when theme is loaded -->
{#if $theme}
  <div class="theme-provider" data-theme={$theme.name} data-testid="theme-provider">
    <slot />
  </div>
{:else if !$themeLoading}
  <div class="theme-fallback" data-testid="theme-fallback">
    <slot />
  </div>
{/if}

<style>
  .theme-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    background-color: var(--color-background_secondary, #1a1a1a);
    color: var(--color-text_primary, #ffffff);
    border-radius: var(--layout-border_radius, 6px);
    margin-bottom: 1rem;
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--color-text_disabled, #666666);
    border-top: 2px solid var(--color-accent_blue, #00bfff);
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

  .theme-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background-color: var(--color-accent_red, #ff4444);
    color: white;
    border-radius: var(--layout-border_radius, 6px);
    margin-bottom: 1rem;
  }

  .error-icon {
    font-size: 1.2em;
  }

  .error-message {
    flex: 1;
    font-size: 0.9em;
  }

  .retry-button {
    background-color: transparent;
    border: 1px solid white;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: var(--layout-border_radius, 6px);
    cursor: pointer;
    font-size: 0.8em;
    transition: background-color var(--animation-transition_duration, 200ms);
  }

  .retry-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .theme-provider {
    /* Theme provider doesn't add any styling, just acts as a container */
    display: contents;
  }

  .theme-fallback {
    /* Fallback styling when no theme is loaded */
    background-color: #000000;
    color: #ffffff;
    min-height: 100vh;
  }
</style>
