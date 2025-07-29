<script lang="ts">
  import { onMount } from 'svelte';

  let fetchResults: any[] = [];
  let themeData: any = null;

  async function testFetch(url: string) {
    const startTime = Date.now();
    try {
      const response = await fetch(url);
      const elapsed = Date.now() - startTime;

      if (response.ok) {
        const data = await response.text();
        fetchResults = [
          ...fetchResults,
          {
            url,
            status: response.status,
            statusText: response.statusText,
            elapsed,
            success: true,
            dataLength: data.length,
            preview: data.substring(0, 100) + '...'
          }
        ];

        // Try to parse as JSON
        try {
          themeData = JSON.parse(data);
        } catch (e) {
          console.error('Failed to parse JSON:', e);
        }
      } else {
        fetchResults = [
          ...fetchResults,
          {
            url,
            status: response.status,
            statusText: response.statusText,
            elapsed,
            success: false,
            error: `HTTP ${response.status}`
          }
        ];
      }
    } catch (error) {
      const elapsed = Date.now() - startTime;
      fetchResults = [
        ...fetchResults,
        {
          url,
          status: 'Error',
          statusText: error instanceof Error ? error.message : String(error),
          elapsed,
          success: false,
          error: error instanceof Error ? error.toString() : String(error)
        }
      ];
    }
  }

  onMount(async () => {
    // Test different URL patterns
    const urls = [
      '/themes/super_amoled_black_responsive.json',
      './themes/super_amoled_black_responsive.json',
      'themes/super_amoled_black_responsive.json',
      '/static/themes/super_amoled_black_responsive.json',
      window.location.origin + '/themes/super_amoled_black_responsive.json',
      '/themes/super_amoled_black.json'
    ];

    for (const url of urls) {
      await testFetch(url);
    }
  });
</script>

<div class="test-container">
  <h1>Direct Theme Fetch Test</h1>

  <div class="info">
    <h2>Environment Info:</h2>
    <p>Location: {typeof window !== 'undefined' ? window.location.href : 'SSR'}</p>
    <p>Origin: {typeof window !== 'undefined' ? window.location.origin : 'SSR'}</p>
    <p>Protocol: {typeof window !== 'undefined' ? window.location.protocol : 'SSR'}</p>
  </div>

  <div class="results">
    <h2>Fetch Results:</h2>
    {#each fetchResults as result}
      <div class="result {result.success ? 'success' : 'error'}">
        <h3>{result.url}</h3>
        <p>Status: {result.status} {result.statusText}</p>
        <p>Time: {result.elapsed}ms</p>
        {#if result.success}
          <p>Data length: {result.dataLength} bytes</p>
          <details>
            <summary>Preview</summary>
            <pre>{result.preview}</pre>
          </details>
        {:else}
          <p>Error: {result.error}</p>
        {/if}
      </div>
    {/each}
  </div>

  {#if themeData}
    <div class="theme-data">
      <h2>Theme Data Loaded:</h2>
      <p>Name: {themeData.name}</p>
      <p>Version: {themeData.metadata?.version}</p>
      <p>Author: {themeData.metadata?.author}</p>
    </div>
  {/if}
</div>

<style>
  .test-container {
    padding: 2rem;
    font-family: sans-serif;
    background: #000;
    color: #fff;
    min-height: 100vh;
  }

  h1,
  h2 {
    color: #00bfff;
  }

  .info,
  .results,
  .theme-data {
    background: #1a1a1a;
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 6px;
  }

  .result {
    background: #2a2a2a;
    padding: 1rem;
    margin: 0.5rem 0;
    border-radius: 4px;
    border-left: 4px solid;
  }

  .result.success {
    border-color: #00ff00;
  }

  .result.error {
    border-color: #ff4444;
  }

  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.9em;
    word-break: break-all;
  }

  p {
    margin: 0.25rem 0;
    font-size: 0.85em;
  }

  pre {
    background: #0a0a0a;
    padding: 0.5rem;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.8em;
    margin: 0.5rem 0 0 0;
  }

  details {
    margin-top: 0.5rem;
  }

  summary {
    cursor: pointer;
    font-size: 0.85em;
    color: #00bfff;
  }
</style>
