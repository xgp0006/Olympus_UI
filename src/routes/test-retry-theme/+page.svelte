<script lang="ts">
  import { onMount } from 'svelte';
  import { loadThemeWithRetry } from '$lib/stores/theme-loader';

  let status = 'Not started';
  let logs: string[] = [];
  let theme: any = null;

  function log(message: string) {
    logs = [...logs, `${new Date().toISOString().split('T')[1].slice(0, -1)} - ${message}`];
  }

  onMount(async () => {
    log('Component mounted');
    status = 'Loading theme with retry...';

    try {
      // Test loading the responsive theme
      theme = await loadThemeWithRetry('super_amoled_black_responsive', 5);

      if (theme) {
        status = `✅ Theme loaded: ${theme.name}`;
        log(`Successfully loaded theme: ${theme.name}`);
      }
    } catch (error) {
      status = `❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`;
      log(`Failed to load theme: ${error}`);
    }
  });
</script>

<div
  style="padding: 2rem; background: #111; color: #fff; min-height: 100vh; font-family: monospace;"
>
  <h1>Theme Loading with Retry Test</h1>

  <h2>Status: {status}</h2>

  <h3>Logs:</h3>
  <div
    style="background: #222; padding: 1rem; border-radius: 4px; max-height: 400px; overflow-y: auto;"
  >
    {#each logs as log}
      <div style="margin: 0.25rem 0;">{log}</div>
    {/each}
  </div>

  {#if theme}
    <h3>Theme Data:</h3>
    <details>
      <summary>Click to expand theme JSON</summary>
      <pre
        style="background: #222; padding: 1rem; overflow: auto; max-height: 400px;">{JSON.stringify(
          theme,
          null,
          2
        )}</pre>
    </details>
  {/if}

  <p style="margin-top: 2rem;">Check browser console for detailed logs.</p>
</div>
