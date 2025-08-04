<!-- 
  TestModeSelector Component - Test mode selection for motor testing
  NASA JPL Rule 4 compliant: < 60 lines
-->
<script lang="ts">
  import type { Readable } from 'svelte/store';

  export let canTest: Readable<boolean>;
  export let testActive: Readable<boolean>;
  export let onRunDirectionTest: () => Promise<void>;
  export let onRunRampTest: () => Promise<void>;
  export let onEmergencyStop: () => Promise<void>;

  type TestMode = 'direction' | 'ramp' | 'manual';
  let selectedMode: TestMode = 'manual';
</script>

<div class="test-mode-selector">
  <div class="mode-tabs">
    <button
      class="mode-tab"
      class:active={selectedMode === 'manual'}
      on:click={() => (selectedMode = 'manual')}
      disabled={$testActive}
    >
      Manual Control
    </button>
    <button
      class="mode-tab"
      class:active={selectedMode === 'direction'}
      on:click={() => (selectedMode = 'direction')}
      disabled={$testActive}
    >
      Direction Test
    </button>
    <button
      class="mode-tab"
      class:active={selectedMode === 'ramp'}
      on:click={() => (selectedMode = 'ramp')}
      disabled={$testActive}
    >
      Ramp Test
    </button>
  </div>

  {#if selectedMode === 'direction' || selectedMode === 'ramp'}
    <div class="test-controls">
      <button
        class="test-button"
        disabled={!$canTest || $testActive}
        on:click={selectedMode === 'direction' ? onRunDirectionTest : onRunRampTest}
      >
        {$testActive ? 'Test Running...' : `Start ${selectedMode} Test`}
      </button>

      {#if $testActive}
        <button class="stop-button" on:click={onEmergencyStop}> STOP TEST </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .test-mode-selector {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .mode-tabs {
    display: flex;
    gap: 0.5rem;
  }
</style>
