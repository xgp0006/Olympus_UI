<!--
  Parameter Group Component
  NASA JPL Rule 4 compliant - handles parameter group display and expansion
  Component size: <60 lines per function
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { slide } from 'svelte/transition';
  import ParameterEditor from './ParameterEditor.svelte';

  // Types
  import type { DroneParameter } from '../../types/drone-types';

  // Props
  export let groupName: string = '';
  export let parameters: DroneParameter[] = [];
  export let expanded: boolean = false;
  export let showAdvanced: boolean = false;
  export let readonly: boolean = false;
  export let loading: boolean = false;

  const dispatch = createEventDispatcher();

  // NASA JPL compliant function: Toggle group expansion
  function toggleGroup(): void {
    dispatch('toggleGroup', { groupName });
  }

  // NASA JPL compliant function: Handle parameter update
  function handleParameterUpdate(event: CustomEvent): void {
    dispatch('parameterUpdate', event.detail);
  }

  // Filter parameters based on advanced setting
  $: visibleParameters = parameters.filter((param) => showAdvanced || !param.advanced);
</script>

<div class="parameter-group">
  <!-- Group header -->
  <div
    class="group-header"
    class:expanded
    on:click={toggleGroup}
    on:keydown={(e) => e.key === 'Enter' && toggleGroup()}
    role="button"
    tabindex="0"
  >
    <span class="group-icon">
      {expanded ? '▼' : '▶'}
    </span>
    <span class="group-name">{groupName}</span>
    <span class="group-count">({parameters.length})</span>
  </div>

  <!-- Group parameters -->
  {#if expanded}
    <div class="group-parameters" transition:slide>
      {#each visibleParameters as parameter}
        <ParameterEditor
          {parameter}
          {readonly}
          {loading}
          on:parameterUpdate={handleParameterUpdate}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .parameter-group {
    margin-bottom: 1rem;
    border: 1px solid var(--color-border_primary);
    border-radius: 8px;
    overflow: hidden;
  }

  .group-header {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--color-background_secondary);
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s;
  }

  .group-header:hover {
    background: var(--color-background_quaternary);
  }

  .group-header.expanded {
    border-bottom: 1px solid var(--color-border_primary);
  }

  .group-icon {
    margin-right: 0.5rem;
    font-size: 0.8rem;
    transition: transform 0.2s;
  }

  .group-name {
    flex: 1;
    font-weight: 600;
    color: var(--color-text_primary);
  }

  .group-count {
    font-size: 0.8rem;
    color: var(--color-text_secondary);
  }

  .group-parameters {
    background: var(--color-background_primary);
  }
</style>
