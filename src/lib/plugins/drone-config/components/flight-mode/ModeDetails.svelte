<!--
  Mode Details Component
  NASA JPL Rule 4 compliant - displays selected mode information
  Component size: <60 lines per function
-->
<script lang="ts">
  import { slide } from 'svelte/transition';

  // Types
  interface ModeRequirement {
    type: 'throttle' | 'gps' | 'battery' | 'altitude' | 'speed';
    condition: 'min' | 'max' | 'equals';
    value: number;
    unit?: string;
  }

  interface FlightMode {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'primary' | 'auxiliary' | 'safety' | 'advanced';
    conflictsWith?: string[];
    requirements?: ModeRequirement[];
    isActive?: boolean;
  }

  // Props
  export let selectedMode: FlightMode | null = null;

  // NASA JPL compliant function: Format requirement text
  function formatRequirement(req: ModeRequirement): string {
    const conditionText =
      req.condition === 'min' ? 'minimum' : req.condition === 'max' ? 'maximum' : 'exactly';
    return `${req.type} ${conditionText} ${req.value}${req.unit || ''}`;
  }

  // NASA JPL compliant function: Format conflicts text
  function formatConflicts(conflicts: string[]): string {
    return conflicts.join(', ');
  }
</script>

{#if selectedMode}
  <div class="mode-details" transition:slide>
    <div class="mode-header">
      <span class="mode-icon-large">{selectedMode.icon}</span>
      <div class="mode-info">
        <h5 class="mode-title">{selectedMode.name}</h5>
        <span class="mode-category">{selectedMode.category}</span>
      </div>
    </div>

    <p class="mode-description">{selectedMode.description}</p>

    {#if selectedMode.requirements?.length}
      <div class="requirements">
        <strong class="requirements-title">Requirements:</strong>
        <ul class="requirements-list">
          {#each selectedMode.requirements as req}
            <li class="requirement-item">{formatRequirement(req)}</li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if selectedMode.conflictsWith?.length}
      <div class="conflicts">
        <strong class="conflicts-title">Conflicts with:</strong>
        <span class="conflicts-list">{formatConflicts(selectedMode.conflictsWith)}</span>
      </div>
    {/if}

    {#if selectedMode.isActive}
      <div class="status-active">
        <span class="status-indicator">●</span>
        Currently Active
      </div>
    {/if}
  </div>
{/if}

<style>
  .mode-details {
    padding: 1rem;
    background: var(--color-background_secondary);
    border-radius: var(--layout-border_radius);
    border: 1px solid var(--color-border, var(--color-background_tertiary));
  }

  .mode-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .mode-icon-large {
    font-size: 2rem;
  }

  .mode-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .mode-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-accent_blue);
  }

  .mode-category {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--color-text_secondary);
    font-weight: 500;
  }

  .mode-description {
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
    color: var(--color-text_secondary);
    line-height: 1.5;
  }

  .requirements,
  .conflicts {
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
  }

  .requirements-title,
  .conflicts-title {
    color: var(--color-text_primary);
    display: block;
    margin-bottom: 0.25rem;
  }

  .requirements-list {
    margin: 0;
    padding-left: 1.5rem;
    color: var(--color-text_secondary);
  }

  .requirement-item {
    margin-bottom: 0.25rem;
  }

  .conflicts-list {
    color: var(--color-text_secondary);
  }

  .status-active {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--color-status_success_bg);
    border: 1px solid var(--color-status_success);
    border-radius: var(--layout-border_radius);
    color: var(--color-status_success);
    font-size: 0.875rem;
    font-weight: 500;
  }

  .status-indicator {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
</style>
