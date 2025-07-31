<!-- 
  SafetyGate Component - Safety state management for motor testing
  NASA JPL Rule 4 compliant: < 60 lines
-->
<script lang="ts">
  import { writable } from 'svelte/store';
  import type { Writable } from 'svelte/store';
  import { SafetyStage } from '../stores/motor-test';
  
  export let currentStage: Writable<SafetyStage>;
  export let propellerRemoved: Writable<boolean>;
  export let onProgressStage: (stage: SafetyStage) => void;
  
  function handlePropellerToggle(): void {
    propellerRemoved.update(value => !value);
  }
</script>

<div class="safety-gate">
  <div class="safety-requirement">
    <label class="safety-checkbox">
      <input 
        type="checkbox" 
        bind:checked={$propellerRemoved}
        on:change={handlePropellerToggle}
      />
      <span class="checkbox-label">
        Propellers removed (REQUIRED)
      </span>
    </label>
  </div>
  
  <div class="safety-stages">
    {#each [1, 2, 3, 4] as stage}
      <button
        class="stage-button"
        class:active={$currentStage >= stage}
        disabled={!$propellerRemoved || $currentStage < stage - 1}
        on:click={() => onProgressStage(stage)}
      >
        Stage {stage}
      </button>
    {/each}
  </div>
</div>

<style>
  .safety-gate {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .safety-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }
</style>