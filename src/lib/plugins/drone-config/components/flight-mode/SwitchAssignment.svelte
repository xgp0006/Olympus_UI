<!--
  Switch Assignment Component
  NASA JPL Rule 4 compliant - handles switch assignment interface
  Component size: <60 lines per function
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { flip } from 'svelte/animate';
  import { slide } from 'svelte/transition';

  // Types
  interface FlightMode {
    id: string;
    name: string;
    icon: string;
    category: 'primary' | 'auxiliary' | 'safety' | 'advanced';
  }

  interface SwitchPosition {
    id: string;
    channelId: string;
    position: number;
    pwmMin: number;
    pwmMax: number;
    assignedModes: string[];
  }

  // Props
  export let switchPositions: SwitchPosition[] = [];
  export let flightModes: FlightMode[] = [];
  export let draggedOverPosition: string | null = null;
  export let editingSwitch: string | null = null;
  export let readonly: boolean = false;

  const dispatch = createEventDispatcher();

  // Mode category colors
  const categoryColors = {
    primary: 'var(--color-accent_blue)',
    auxiliary: 'var(--color-accent_green)',
    safety: 'var(--color-accent_yellow)',
    advanced: 'var(--color-accent_red)',
    default: 'var(--color-text_secondary)'
  };

  // NASA JPL compliant function: Handle drag over
  function handleDragOver(event: DragEvent, positionId: string): void {
    if (readonly) return;
    
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
    dispatch('dragOver', { positionId });
  }

  // NASA JPL compliant function: Handle drag leave
  function handleDragLeave(): void {
    dispatch('dragLeave');
  }

  // NASA JPL compliant function: Handle drop
  function handleDrop(event: DragEvent, position: SwitchPosition): void {
    if (readonly) return;
    
    event.preventDefault();
    dispatch('drop', { position });
  }

  // NASA JPL compliant function: Remove mode from position
  function removeModeFromPosition(modeId: string, positionId: string): void {
    if (readonly) return;
    dispatch('removeMode', { modeId, positionId });
  }

  // NASA JPL compliant function: Toggle switch editing
  function toggleSwitchEdit(positionId: string): void {
    const newEditingSwitch = editingSwitch === positionId ? null : positionId;
    dispatch('editSwitch', { positionId: newEditingSwitch });
  }

  // NASA JPL compliant function: Update PWM range
  function updatePwmRange(positionId: string, field: 'pwmMin' | 'pwmMax', value: number): void {
    if (readonly) return;
    dispatch('updatePwm', { positionId, field, value });
  }

  // Group positions by channel
  $: groupedPositions = switchPositions.reduce((acc, pos) => {
    if (!acc[pos.channelId]) acc[pos.channelId] = [];
    acc[pos.channelId].push(pos);
    return acc;
  }, {} as Record<string, SwitchPosition[]>);
</script>

<div class="switches-section">
  <h4 class="section-title">Switch Assignment</h4>
  <div class="switch-channels">
    {#each Object.entries(groupedPositions) as [channelId, positions]}
      <div class="switch-channel">
        <h5 class="channel-name">{channelId.toUpperCase()}</h5>
        <div class="switch-positions">
          {#each positions as position (position.id)}
            <div
              class="switch-position"
              class:drag-over={draggedOverPosition === position.id}
              on:dragover={(e) => handleDragOver(e, position.id)}
              on:dragleave={handleDragLeave}
              on:drop={(e) => handleDrop(e, position)}
              role="region"
              aria-label="Switch position {position.position + 1}"
            >
              <div class="position-header">
                <span class="position-label">Position {position.position + 1}</span>
                <button
                  class="edit-button"
                  on:click={() => toggleSwitchEdit(position.id)}
                  aria-label="Edit switch settings"
                >
                  ⚙️
                </button>
              </div>
              
              <!-- PWM Range Editor -->
              {#if editingSwitch === position.id}
                <div class="pwm-editor" transition:slide>
                  <label>
                    Min PWM:
                    <input
                      type="number"
                      min="900"
                      max="2100"
                      value={position.pwmMin}
                      on:input={(e) => updatePwmRange(position.id, 'pwmMin', parseInt(e.currentTarget.value))}
                      disabled={readonly}
                    />
                  </label>
                  <label>
                    Max PWM:
                    <input
                      type="number"
                      min="900"
                      max="2100"
                      value={position.pwmMax}
                      on:input={(e) => updatePwmRange(position.id, 'pwmMax', parseInt(e.currentTarget.value))}
                      disabled={readonly}
                    />
                  </label>
                </div>
              {/if}
              
              <!-- Assigned Modes -->
              <div class="assigned-modes">
                {#each position.assignedModes.filter(modeId => flightModes.find(m => m.id === modeId)) as modeId (modeId)}
                  {@const mode = flightModes.find(m => m.id === modeId)}
                  <div
                    class="assigned-mode"
                    style="background-color: {categoryColors[mode?.category || 'default']}"
                    animate:flip={{ duration: 200 }}
                  >
                    <span>{mode?.icon} {mode?.name}</span>
                    <button
                      class="remove-button"
                      on:click={() => removeModeFromPosition(modeId, position.id)}
                      disabled={readonly}
                      aria-label="Remove {mode?.name}"
                    >
                      ×
                    </button>
                  </div>
                {/each}
                {#if position.assignedModes.length === 0}
                  <div class="empty-position">Drop modes here</div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .switches-section {
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

  .switch-channels {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .switch-channel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .channel-name {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-accent_green);
  }

  .switch-positions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .switch-position {
    background: var(--color-background_secondary);
    border: 2px dashed var(--color-border, var(--color-background_tertiary));
    border-radius: var(--layout-border_radius);
    padding: 0.75rem;
    min-height: 60px;
    transition: all 0.2s ease;
  }

  .switch-position.drag-over {
    border-color: var(--color-accent_blue);
    background: var(--color-background_tertiary);
  }

  .position-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .position-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text_secondary);
  }

  .edit-button {
    padding: 0.25rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    opacity: 0.6;
    transition: opacity 0.2s ease;
  }

  .edit-button:hover {
    opacity: 1;
  }
</style>