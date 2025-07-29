<!--
  SvelteKit Layout Component for the Modular C2 Frontend
  Provides the basic page structure and theme initialization
  Requirements: 1.1, 1.4
-->
<script lang="ts">
  import '../app.css';
</script>

<svelte:head>
  <meta
    name="description"
    content="Modular Command & Control Frontend - Aerospace Operations Interface"
  />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover"
  />
</svelte:head>

<div class="app-layout" data-testid="app-layout">
  <slot />
</div>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
  }

  .app-layout {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    /* Theme variables will be applied by ThemeProvider */
    background-color: var(--color-background_primary, #000000);
    color: var(--color-text_primary, #ffffff);
    font-family: var(--typography-font_family_sans, 'Inter', sans-serif);
  }

  /* Ensure borderless application */
  :global(*) {
    box-sizing: border-box;
  }

  /* Remove default margins and paddings */
  :global(h1, h2, h3, h4, h5, h6, p, ul, ol, li) {
    margin: 0;
    padding: 0;
  }

  /* Ensure proper text rendering */
  :global(body) {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }
</style>
