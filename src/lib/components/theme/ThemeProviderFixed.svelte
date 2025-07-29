<!--
  Fixed ThemeProvider that actually works
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { loadThemeFixed, theme, themeLoading, themeError } from '../../stores/theme-fix';
  
  export let themeName: string = 'super_amoled_black_responsive';
  export let showError: boolean = true;
  
  let mounted = false;
  let loadAttempted = false;
  
  onMount(() => {
    mounted = true;
    console.log('[ThemeProviderFixed] Mounted, browser:', browser);
    
    // Load theme after mount
    if (browser && !loadAttempted) {
      loadAttempted = true;
      loadThemeFixed(themeName);
    }
  });
</script>

<!-- Show loading state -->
{#if $themeLoading}
  <div class="theme-loading">
    Loading theme...
  </div>
{/if}

<!-- Show error if enabled -->
{#if showError && $themeError}
  <div class="theme-error">
    Theme Error: {$themeError}
  </div>
{/if}

<!-- Always render content, even without theme -->
<div class="theme-content" data-theme-loaded={$theme ? 'true' : 'false'}>
  <slot />
</div>

<style>
  .theme-loading {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    padding: 0.5rem;
    background: #333;
    color: white;
    text-align: center;
    z-index: 9999;
  }
  
  .theme-error {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    padding: 0.5rem;
    background: #f44;
    color: white;
    text-align: center;
    z-index: 9999;
  }
  
  .theme-content {
    /* Use fallback colors if theme not loaded */
    background-color: var(--color-background_primary, #000);
    color: var(--color-text_primary, #fff);
    min-height: 100vh;
  }
</style>