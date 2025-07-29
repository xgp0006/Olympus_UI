<script lang="ts">
  import { onMount } from 'svelte';
  import ThemeProvider from '../../lib/components/theme/ThemeProvider.svelte';
  import { theme, themeError, themeLoading } from '../../lib/stores/theme';
  
  let showProvider = false;
  
  onMount(() => {
    // Delay showing the provider to test initialization
    setTimeout(() => {
      showProvider = true;
    }, 100);
  });
</script>

<div class="container">
  <h1>Final Theme Test</h1>
  
  <div class="status">
    <h2>Store Status (Direct):</h2>
    <p>Theme: {$theme ? $theme.name : 'Not loaded'}</p>
    <p>Loading: {$themeLoading}</p>
    <p>Error: {$themeError || 'None'}</p>
  </div>
  
  {#if showProvider}
    <div class="provider-test">
      <h2>Theme Provider Test:</h2>
      <ThemeProvider 
        themeName="super_amoled_black_responsive" 
        fallbackTheme="super_amoled_black"
        showLoadingIndicator={true}
        showErrorMessages={true}
      >
        <div class="themed-content">
          <h3>Themed Content</h3>
          <p>This content should have theme styles applied.</p>
          <div class="theme-demo">
            <div class="demo-box primary">Primary</div>
            <div class="demo-box secondary">Secondary</div>
            <div class="demo-box accent">Accent</div>
          </div>
        </div>
      </ThemeProvider>
    </div>
  {:else}
    <p>Initializing ThemeProvider...</p>
  {/if}
</div>

<style>
  .container {
    padding: 2rem;
    font-family: sans-serif;
    min-height: 100vh;
    background: #000;
    color: #fff;
  }
  
  h1 {
    color: #00bfff;
  }
  
  .status, .provider-test {
    background: #1a1a1a;
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 6px;
  }
  
  .themed-content {
    padding: 1rem;
    background: var(--color-background_primary, #000);
    color: var(--color-text_primary, #fff);
    border-radius: var(--layout-border_radius, 6px);
  }
  
  .theme-demo {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .demo-box {
    padding: 1rem;
    border-radius: var(--layout-border_radius, 6px);
    text-align: center;
  }
  
  .primary {
    background: var(--color-background_primary, #000);
    border: 1px solid var(--color-border_primary, #333);
  }
  
  .secondary {
    background: var(--color-background_secondary, #1a1a1a);
  }
  
  .accent {
    background: var(--color-accent_blue, #00bfff);
    color: #000;
  }
</style>