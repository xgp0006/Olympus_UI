<script lang="ts">
  import { onMount } from 'svelte';
  
  let results: string[] = [];
  
  onMount(async () => {
    // Test different fetch paths
    const paths = [
      '/themes/super_amoled_black_responsive.json',
      '/themes/super_amoled_black.json',
      './themes/super_amoled_black_responsive.json',
      'themes/super_amoled_black_responsive.json'
    ];
    
    for (const path of paths) {
      try {
        results = [...results, `Testing: ${path}`];
        const response = await fetch(path);
        results = [...results, `Status: ${response.status}, OK: ${response.ok}`];
        
        if (response.ok) {
          const text = await response.text();
          results = [...results, `Content length: ${text.length}`];
          const json = JSON.parse(text);
          results = [...results, `✓ Theme name: ${json.name}`];
        } else {
          results = [...results, `✗ Failed: ${response.statusText}`];
        }
      } catch (error) {
        results = [...results, `✗ Error: ${error instanceof Error ? error.message : 'Unknown'}`];
      }
      results = [...results, '---'];
    }
  });
</script>

<h1>Theme Loading Test</h1>

<div>
  {#each results as result}
    <p>{result}</p>
  {/each}
</div>

<style>
  h1 {
    color: white;
    padding: 1rem;
  }
  
  p {
    color: white;
    padding: 0.5rem 1rem;
    font-family: monospace;
  }
</style>