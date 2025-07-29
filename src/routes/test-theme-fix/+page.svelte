<script lang="ts">
  import { onMount } from 'svelte';
  import { theme, themeError, themeLoading } from '../../lib/stores/theme';
  
  let logs: string[] = [];
  
  function addLog(message: string) {
    logs = [...logs, `${new Date().toISOString()}: ${message}`];
  }
  
  onMount(() => {
    addLog('Component mounted');
    
    // Monitor theme store
    const unsubTheme = theme.subscribe(t => {
      addLog(`Theme changed: ${t ? t.name : 'null'}`);
    });
    
    const unsubError = themeError.subscribe(e => {
      addLog(`Error state: ${e || 'none'}`);
    });
    
    const unsubLoading = themeLoading.subscribe(l => {
      addLog(`Loading state: ${l}`);
    });
    
    return () => {
      unsubTheme();
      unsubError();
      unsubLoading();
    };
  });
</script>

<div class="test-container">
  <h1>Theme Loading Test</h1>
  
  <div class="status">
    <h2>Current Status:</h2>
    <p>Theme: {$theme ? $theme.name : 'Not loaded'}</p>
    <p>Loading: {$themeLoading}</p>
    <p>Error: {$themeError || 'None'}</p>
  </div>
  
  <div class="theme-vars">
    <h2>Theme Variables Applied:</h2>
    <div class="color-test">
      <div class="color-box primary">Primary BG</div>
      <div class="color-box secondary">Secondary BG</div>
      <div class="color-box accent">Accent Blue</div>
    </div>
  </div>
  
  <div class="logs">
    <h2>Logs:</h2>
    <pre>{logs.join('\n')}</pre>
  </div>
</div>

<style>
  .test-container {
    padding: 2rem;
    font-family: var(--typography-font_family_sans, sans-serif);
    color: var(--color-text_primary, #fff);
    background: var(--color-background_primary, #000);
    min-height: 100vh;
  }
  
  h1, h2 {
    color: var(--color-accent_blue, #00bfff);
  }
  
  .status {
    background: var(--color-background_secondary, #1a1a1a);
    padding: 1rem;
    border-radius: var(--layout-border_radius, 6px);
    margin: 1rem 0;
  }
  
  .color-test {
    display: flex;
    gap: 1rem;
    margin: 1rem 0;
  }
  
  .color-box {
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
  
  .logs {
    background: var(--color-background_tertiary, #2a2a2a);
    padding: 1rem;
    border-radius: var(--layout-border_radius, 6px);
    margin: 1rem 0;
  }
  
  pre {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: var(--typography-font_family_mono, monospace);
    font-size: 0.9em;
    color: var(--color-text_secondary, #b0b0b0);
  }
</style>