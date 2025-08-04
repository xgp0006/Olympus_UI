<!--
  Parameter Container Component
  NASA JPL Rule 4 compliant - orchestrates all parameter sub-components
  Component size: <60 lines per function
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { droneParameterStore } from '../../stores/drone-parameters';
  import ParameterSearch from './ParameterSearch.svelte';
  import ParameterGroup from './ParameterGroup.svelte';
  import type { DroneParameter } from '../../types/drone-types';

  // Props
  export let showAdvanced: boolean = false;
  export let readonly: boolean = false;

  // Local state
  let searchTerm: string = '';
  let expandedGroups: Set<string> = new Set(['BASIC']);
  let filteredParameters: DroneParameter[] = [];

  // Subscribe to parameter store
  $: parameters = $droneParameterStore.parameters;
  $: loading = $droneParameterStore.loading;
  $: error = $droneParameterStore.error;

  // NASA JPL compliant function: Filter parameters
  function filterParameters(): void {
    if (!parameters || !Array.isArray(parameters)) {
      filteredParameters = [];
      return;
    }

    filteredParameters = parameters.filter(
      (param) =>
        param.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (param.description && param.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  // NASA JPL compliant function: Group parameters
  function groupParameters(params: DroneParameter[]): Record<string, DroneParameter[]> {
    return params.reduce(
      (groups, param) => {
        const group = param.group || 'MISC';
        if (!groups[group]) groups[group] = [];
        groups[group].push(param);
        return groups;
      },
      {} as Record<string, DroneParameter[]>
    );
  }

  // NASA JPL compliant function: Toggle group expansion
  function toggleGroup(event: CustomEvent): void {
    const { groupName } = event.detail;
    if (expandedGroups.has(groupName)) {
      expandedGroups.delete(groupName);
    } else {
      expandedGroups.add(groupName);
    }
    expandedGroups = expandedGroups; // Trigger reactivity
  }

  // NASA JPL compliant function: Update parameter
  async function updateParameter(event: CustomEvent): Promise<void> {
    if (readonly) return;

    const { parameter, value } = event.detail;
    try {
      await droneParameterStore.setParameter(parameter.name, value);
    } catch (error) {
      console.error('Failed to update parameter:', error);
    }
  }

  // NASA JPL compliant function: Handle search change
  function handleSearchChange(event: CustomEvent): void {
    searchTerm = event.detail.searchTerm;
  }

  // NASA JPL compliant function: Handle advanced toggle
  function handleAdvancedToggle(event: CustomEvent): void {
    showAdvanced = event.detail.showAdvanced;
  }

  // NASA JPL compliant function: Handle refresh
  function handleRefresh(): void {
    droneParameterStore.loadParameters();
  }

  onMount(() => {
    droneParameterStore.loadParameters();
  });

  // Reactive statements
  $: {
    filterParameters();
  }

  $: groupedParameters = groupParameters(filteredParameters);
</script>

<div class="parameter-panel">
  <!-- Search and controls header -->
  <ParameterSearch
    {searchTerm}
    {showAdvanced}
    {loading}
    on:searchChange={handleSearchChange}
    on:advancedToggle={handleAdvancedToggle}
    on:refresh={handleRefresh}
  />

  <!-- Error display -->
  {#if error}
    <div class="error-message">
      <span class="error-icon">⚠️</span>
      {error}
    </div>
  {/if}

  <!-- Parameter groups -->
  <div class="parameter-groups">
    {#each Object.entries(groupedParameters) as [groupName, groupParams]}
      <ParameterGroup
        {groupName}
        parameters={groupParams}
        expanded={expandedGroups.has(groupName)}
        {showAdvanced}
        {readonly}
        {loading}
        on:toggleGroup={toggleGroup}
        on:parameterUpdate={updateParameter}
      />
    {/each}
  </div>

  <!-- Loading indicator -->
  {#if loading}
    <div class="loading-overlay">
      <div class="loading-spinner"></div>
      Loading parameters...
    </div>
  {/if}
</div>

<style>
  .parameter-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-background_primary);
    border-radius: 8px;
    overflow: hidden;
  }

  .error-message {
    padding: 1rem;
    background: var(--color-status_error_bg);
    color: var(--color-status_error);
    border-left: 4px solid var(--color-status_error);
    margin: 1rem;
    border-radius: 4px;
  }

  .parameter-groups {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-overlay_medium, rgba(0, 0, 0, 0.5));
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--color-text_primary);
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border_primary);
    border-top: 3px solid var(--color-accent_blue);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
