<!--
  Flight Mode Selector Component
  NASA JPL Rule 4 compliant - handles flight mode selection interface
  Component size: <60 lines per function
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { flip } from 'svelte/animate';

  // Types
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

  interface ModeRequirement {
    type: 'throttle' | 'gps' | 'battery' | 'altitude' | 'speed';
    condition: 'min' | 'max' | 'equals';
    value: number;
    unit?: string;
  }

  // Props
  export let flightModes: FlightMode[] = [];
  export let showAdvanced: boolean = false;
  export let selectedMode: FlightMode | null = null;
  export let readonly: boolean = false;

  const dispatch = createEventDispatcher();

  // Mode category colors
  const categoryColors = {
    primary: 'var(--color-accent_blue)',
    auxiliary: 'var(--color-accent_green)',
    safety: 'var(--color-accent_yellow)',
    advanced: 'var(--color-accent_red)'
  };

  // NASA JPL compliant function: Handle drag start
  function handleDragStart(event: DragEvent, mode: FlightMode): void {
    if (readonly) return;
    
    event.dataTransfer!.effectAllowed = 'copy';
    event.dataTransfer!.setData('text/plain', mode.id);
    dispatch('dragStart', { mode });
  }

  // NASA JPL compliant function: Select mode
  function selectMode(mode: FlightMode): void {
    dispatch('modeSelect', { mode });
  }
</script>

<div class="modes-section">
  <h4 class="section-title">Available Flight Modes</h4>
  <div class="modes-grid">
    {#each Object.entries(categoryColors) as [category, color]}
      <div class="mode-category">
        <h5 class="category-title" style="color: {color}">{category.toUpperCase()}</h5>
        <div class="mode-cards">
          {#each flightModes.filter(m => m.category === category && (showAdvanced || category !== 'advanced')) as mode (mode.id)}
            <div
              class="mode-card"
              class:active={mode.isActive}
              class:selected={selectedMode?.id === mode.id}
              draggable={!readonly}
              on:dragstart={(e) => handleDragStart(e, mode)}
              on:click={() => selectMode(mode)}
              style="border-color: {color}"
              animate:flip={{ duration: 200 }}
              role="button" 
              tabindex="0"
              on:keydown={(e) => e.key === 'Enter' && selectMode(mode)}
            >
              <span class="mode-icon">{mode.icon}</span>
              <span class="mode-name">{mode.name}</span>
              {#if mode.requirements?.length}
                <span class="mode-requirements" title="Has requirements">⚡</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .modes-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .section-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text_primary);
  }

  .modes-grid {
    display: grid;
    gap: 1rem;
  }

  .mode-category {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .category-title {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .mode-cards {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .mode-card {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-background_secondary);
    border: 2px solid;
    border-radius: var(--layout-border_radius);
    cursor: grab;
    transition: all 0.2s ease;
    position: relative;
  }

  .mode-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .mode-card.active {
    background: var(--color-background_tertiary);
  }

  .mode-card.selected {
    box-shadow: 0 0 0 2px var(--color-accent_blue);
  }

  .mode-icon {
    font-size: 1.25rem;
  }

  .mode-name {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .mode-requirements {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 16px;
    height: 16px;
    background: var(--color-accent_yellow);
    color: var(--color-background_primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.625rem;
  }
</style>