<!--
  ThemeDemo component for testing ThemeProvider functionality
  Demonstrates theme application and CSS variable usage
  Requirements: 3.4, 3.5, 3.6
-->
<script lang="ts">
  import { theme } from '../../stores/theme';
  import ThemeProvider from './ThemeProvider.svelte';

  export let themeName: string = 'super_amoled_black';
  export let showControls: boolean = true;

  let currentThemeName = themeName;

  function handleThemeChange() {
    // For demo purposes, just reload the same theme
    currentThemeName = 'super_amoled_black';
  }
</script>

<ThemeProvider themeName={currentThemeName} showLoadingIndicator={true} showErrorMessages={true}>
  <div class="theme-demo" data-testid="theme-demo">
    <div class="demo-header">
      <h1 class="demo-title">Theme Demo</h1>
      {#if $theme}
        <p class="theme-info">
          Current Theme: <strong>{$theme.name}</strong> by {$theme.metadata.author}
        </p>
      {/if}
    </div>

    {#if showControls}
      <div class="demo-controls">
        <button class="demo-button primary" on:click={handleThemeChange}> Reload Theme </button>
        <button class="demo-button secondary"> Secondary Button </button>
        <button class="demo-button accent"> Accent Button </button>
      </div>
    {/if}

    <div class="demo-sections">
      <!-- Colors Section -->
      <section class="demo-section">
        <h2 class="section-title">Colors</h2>
        <div class="color-grid">
          <div class="color-item bg-primary">
            <span class="color-label">Primary Background</span>
          </div>
          <div class="color-item bg-secondary">
            <span class="color-label">Secondary Background</span>
          </div>
          <div class="color-item bg-tertiary">
            <span class="color-label">Tertiary Background</span>
          </div>
          <div class="color-item accent-yellow">
            <span class="color-label">Accent Yellow</span>
          </div>
          <div class="color-item accent-blue">
            <span class="color-label">Accent Blue</span>
          </div>
          <div class="color-item accent-red">
            <span class="color-label">Accent Red</span>
          </div>
          <div class="color-item accent-green">
            <span class="color-label">Accent Green</span>
          </div>
        </div>
      </section>

      <!-- Typography Section -->
      <section class="demo-section">
        <h2 class="section-title">Typography</h2>
        <div class="typography-samples">
          <p class="text-sans">Sans-serif text using theme font family</p>
          <p class="text-mono">Monospace text using theme font family</p>
          <p class="text-large">Large text size</p>
          <p class="text-base">Base text size</p>
          <p class="text-small">Small text size</p>
        </div>
      </section>

      <!-- Components Section -->
      <section class="demo-section">
        <h2 class="section-title">Component Styles</h2>
        <div class="component-samples">
          <div class="plugin-card-demo">
            <div class="plugin-icon">🚀</div>
            <h3>Plugin Card</h3>
            <p>Demonstrates plugin card styling</p>
          </div>

          <div class="cli-demo">
            <div class="cli-header">CLI Panel</div>
            <div class="cli-content">
              <span class="cli-prompt">$</span>
              <span class="cli-command">ls -la</span>
            </div>
          </div>

          <div class="hex-coin-demo">
            <div class="hex-coin">
              <span class="hex-icon">📍</span>
            </div>
            <span class="hex-label">Hex Coin</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</ThemeProvider>

<style>
  .theme-demo {
    padding: var(--layout-spacing_unit);
    background-color: var(--color-background_primary);
    color: var(--color-text_primary);
    font-family: var(--typography-font_family_sans);
    font-size: var(--typography-font_size_base);
    min-height: 100vh;
  }

  .demo-header {
    margin-bottom: calc(var(--layout-spacing_unit) * 3);
    text-align: center;
  }

  .demo-title {
    font-size: var(--typography-font_size_lg);
    color: var(--color-accent_blue);
    margin-bottom: var(--layout-spacing_unit);
  }

  .theme-info {
    color: var(--color-text_secondary);
    margin: 0;
  }

  .demo-controls {
    display: flex;
    gap: var(--layout-spacing_unit);
    justify-content: center;
    margin-bottom: calc(var(--layout-spacing_unit) * 3);
    flex-wrap: wrap;
  }

  .demo-button {
    padding: calc(var(--layout-spacing_unit) * 1.5) calc(var(--layout-spacing_unit) * 2);
    border: var(--layout-border_width) solid transparent;
    border-radius: var(--layout-border_radius);
    cursor: pointer;
    font-family: inherit;
    font-size: var(--typography-font_size_base);
    transition: all var(--animation-transition_duration) var(--animation-easing_function);
  }

  .demo-button:hover {
    transform: scale(var(--animation-hover_scale));
  }

  .demo-button:active {
    transform: scale(var(--animation-button_press_scale));
  }

  .demo-button.primary {
    background-color: var(--component-button-background_default);
    color: var(--component-button-text_color_default);
  }

  .demo-button.primary:hover {
    background-color: var(--component-button-background_hover);
  }

  .demo-button.secondary {
    background-color: var(--color-background_secondary);
    color: var(--color-text_primary);
    border-color: var(--color-text_disabled);
  }

  .demo-button.accent {
    background-color: var(--component-button-background_accent);
    color: var(--component-button-text_color_accent);
  }

  .demo-sections {
    display: grid;
    gap: calc(var(--layout-spacing_unit) * 3);
  }

  .demo-section {
    background-color: var(--color-background_secondary);
    padding: calc(var(--layout-spacing_unit) * 2);
    border-radius: var(--layout-border_radius);
  }

  .section-title {
    color: var(--color-accent_yellow);
    margin-bottom: calc(var(--layout-spacing_unit) * 2);
    font-size: var(--typography-font_size_lg);
  }

  .color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--layout-spacing_unit);
  }

  .color-item {
    padding: calc(var(--layout-spacing_unit) * 2);
    border-radius: var(--layout-border_radius);
    text-align: center;
  }

  .color-label {
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
  }

  .bg-primary {
    background-color: var(--color-background_primary);
  }
  .bg-secondary {
    background-color: var(--color-background_secondary);
  }
  .bg-tertiary {
    background-color: var(--color-background_tertiary);
  }
  .accent-yellow {
    background-color: var(--color-accent_yellow);
    color: #000;
  }
  .accent-blue {
    background-color: var(--color-accent_blue);
    color: #000;
  }
  .accent-red {
    background-color: var(--color-accent_red);
    color: #fff;
  }
  .accent-green {
    background-color: var(--color-accent_green);
    color: #000;
  }

  .typography-samples {
    display: grid;
    gap: var(--layout-spacing_unit);
  }

  .text-sans {
    font-family: var(--typography-font_family_sans);
  }

  .text-mono {
    font-family: var(--typography-font_family_mono);
    background-color: var(--color-background_tertiary);
    padding: var(--layout-spacing_unit);
    border-radius: var(--layout-border_radius);
  }

  .text-large {
    font-size: var(--typography-font_size_lg);
  }
  .text-base {
    font-size: var(--typography-font_size_base);
  }
  .text-small {
    font-size: var(--typography-font_size_sm);
  }

  .component-samples {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: calc(var(--layout-spacing_unit) * 2);
  }

  .plugin-card-demo {
    background-color: var(--component-plugin_card-background);
    color: var(--component-plugin_card-text_color);
    padding: calc(var(--layout-spacing_unit) * 2);
    border-radius: var(--component-plugin_card-border_radius);
    text-align: center;
    transition: background-color var(--animation-transition_duration);
  }

  .plugin-card-demo:hover {
    background-color: var(--component-plugin_card-background_hover);
  }

  .plugin-icon {
    font-size: calc(var(--typography-font_size_lg) * 1.5);
    color: var(--component-plugin_card-icon_color);
    margin-bottom: var(--layout-spacing_unit);
  }

  .cli-demo {
    background-color: var(--component-cli-background);
    border-radius: var(--layout-border_radius);
    overflow: hidden;
  }

  .cli-header {
    background-color: var(--color-background_tertiary);
    color: var(--color-text_secondary);
    padding: var(--layout-spacing_unit);
    font-size: var(--typography-font_size_sm);
  }

  .cli-content {
    padding: var(--layout-spacing_unit);
    font-family: var(--typography-font_family_mono);
    color: var(--component-cli-text_color);
  }

  .cli-prompt {
    color: var(--component-cli-cursor_color);
    margin-right: var(--layout-spacing_unit);
  }

  .hex-coin-demo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--layout-spacing_unit);
  }

  .hex-coin {
    width: 60px;
    height: 60px;
    background-color: var(--component-hex_coin-background);
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    display: flex;
    align-items: center;
    justify-content: center;
    border: var(--layout-border_width) solid var(--component-hex_coin-border_color_default);
  }

  .hex-icon {
    color: var(--component-hex_coin-icon_color);
    font-size: var(--typography-font_size_lg);
  }

  .hex-label {
    color: var(--color-text_secondary);
    font-size: var(--typography-font_size_sm);
  }

  @media (max-width: 768px) {
    .demo-controls {
      flex-direction: column;
      align-items: center;
    }

    .component-samples {
      grid-template-columns: 1fr;
    }

    .color-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
