<script lang="ts">
  import { onMount } from 'svelte';
  import { loadThemeSimple } from '$lib/stores/theme-simple';
  
  let status = 'Loading...';
  let themeData: any = null;
  let error: string | null = null;
  
  onMount(async () => {
    try {
      status = 'Starting theme load...';
      const theme = await loadThemeSimple('super_amoled_black_responsive');
      
      if (theme) {
        themeData = theme;
        status = 'Theme loaded successfully!';
      } else {
        status = 'Theme loading returned null';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      status = 'Error loading theme';
    }
  });
</script>

<div style="padding: 2rem; color: white; background: black; min-height: 100vh;">
  <h1>Simple Theme Test</h1>
  
  <h2>Status: {status}</h2>
  
  {#if error}
    <p style="color: red;">Error: {error}</p>
  {/if}
  
  {#if themeData}
    <h3>Theme Data:</h3>
    <pre style="background: #222; padding: 1rem; overflow: auto;">{JSON.stringify(themeData, null, 2)}</pre>
  {/if}
  
  <p>Check the browser console for detailed logs.</p>
</div>