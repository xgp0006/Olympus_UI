<script lang="ts">
  import ThemeProviderFixed from '$lib/components/theme/ThemeProviderFixed.svelte';
  import { theme } from '$lib/stores/theme-fix';
</script>

<ThemeProviderFixed themeName="super_amoled_black_responsive">
  <div style="padding: 2rem;">
    <h1>Fixed Theme Provider Test</h1>

    <p>This page uses the simplified theme provider that should work correctly.</p>

    {#if $theme}
      <div
        style="margin-top: 2rem; padding: 1rem; background: var(--color-background_secondary); border-radius: 8px;"
      >
        <h2>Theme Loaded Successfully!</h2>
        <p>Theme Name: {$theme.name}</p>
        <p>Version: {$theme.metadata.version}</p>
        <p>Author: {$theme.metadata.author}</p>
      </div>

      <div style="margin-top: 1rem;">
        <h3>Color Test:</h3>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <div style="padding: 1rem; background: var(--color-accent_yellow); color: black;">
            Yellow
          </div>
          <div style="padding: 1rem; background: var(--color-accent_blue); color: white;">Blue</div>
          <div style="padding: 1rem; background: var(--color-accent_red); color: white;">Red</div>
          <div style="padding: 1rem; background: var(--color-accent_green); color: black;">
            Green
          </div>
        </div>
      </div>
    {:else}
      <p>Theme not loaded yet...</p>
    {/if}
  </div>
</ThemeProviderFixed>

<style>
  h1,
  h2,
  h3 {
    color: var(--color-text_primary);
  }

  p {
    color: var(--color-text_secondary);
  }
</style>
