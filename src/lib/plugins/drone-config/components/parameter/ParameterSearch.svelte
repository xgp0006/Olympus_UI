<!--
  Parameter Search Component
  NASA JPL Rule 4 compliant - handles parameter search and filtering
  Component size: <60 lines per function
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Props
  export let searchTerm: string = '';
  export let showAdvanced: boolean = false;
  export let loading: boolean = false;

  const dispatch = createEventDispatcher();

  // NASA JPL compliant function: Handle search input
  function handleSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    dispatch('searchChange', { searchTerm: target.value });
  }

  // NASA JPL compliant function: Handle advanced toggle
  function handleAdvancedToggle(event: Event): void {
    const target = event.target as HTMLInputElement;
    dispatch('advancedToggle', { showAdvanced: target.checked });
  }

  // NASA JPL compliant function: Handle refresh
  function handleRefresh(): void {
    dispatch('refresh');
  }
</script>

<div class="panel-header">
  <div class="search-container">
    <input
      type="text"
      placeholder="Search parameters..."
      value={searchTerm}
      on:input={handleSearchInput}
      class="search-input"
    />
  </div>
  
  <div class="controls">
    <label class="checkbox-label">
      <input
        type="checkbox"
        checked={showAdvanced}
        on:change={handleAdvancedToggle}
      />
      Show Advanced
    </label>
    
    <button
      class="refresh-btn"
      on:click={handleRefresh}
      disabled={loading}
    >
      {loading ? 'Loading...' : 'Refresh'}
    </button>
  </div>
</div>

<style>
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border_primary);
    background: var(--color-background_secondary);
  }

  .search-container {
    flex: 1;
    margin-right: 1rem;
  }

  .search-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--color-border_primary);
    border-radius: 4px;
    background: var(--color-background_primary);
    color: var(--color-text_primary);
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: var(--color-text_secondary);
  }

  .refresh-btn {
    padding: 0.5rem 1rem;
    background: var(--color-accent_blue);
    color: var(--color-text_inverse);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>