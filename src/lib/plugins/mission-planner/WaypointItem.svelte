<!--
  Waypoint Item Component
  Individual waypoint component with parameter editing
  Requirements: 4.8, 4.9, 6.9
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { updateWaypointParams } from '$lib/stores/mission';
  import type { MissionItem, WaypointParams } from './types';

  // ===== PROPS =====
  export let item: MissionItem;
  export let isSelected: boolean = false;

  // ===== EVENT DISPATCHER =====
  const dispatch = createEventDispatcher<{
    update: { itemId: string; params: WaypointParams };
    minimize: void;
    select: void;
    error: string;
  }>();

  // ===== STATE =====
  let editingParams: WaypointParams = { ...item.params };
  let isEditing = false;
  let hasChanges = false;
  let saving = false;
  let error: string | null = null;

  // ===== REACTIVE STATEMENTS =====
  $: editingParams = { ...item.params };
  $: hasChanges = JSON.stringify(editingParams) !== JSON.stringify(item.params);

  // ===== FUNCTIONS =====

  /**
   * Handle parameter input changes
   */
  function handleParamChange(field: keyof WaypointParams, value: string | number): void {
    editingParams = {
      ...editingParams,
      [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
    };
    error = null;
  }

  /**
   * Validate parameters
   */
  function validateParams(params: WaypointParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate latitude
    if (params.lat !== undefined && Math.abs(params.lat) > 90) {
      errors.push('Latitude must be between -90 and 90 degrees');
    }

    // Validate longitude
    if (params.lng !== undefined && Math.abs(params.lng) > 180) {
      errors.push('Longitude must be between -180 and 180 degrees');
    }

    // Validate altitude
    if (params.alt !== undefined && (params.alt < -1000 || params.alt > 50000)) {
      errors.push('Altitude must be between -1000 and 50000 meters');
    }

    // Validate speed
    if (params.speed !== undefined && (params.speed < 0 || params.speed > 100)) {
      errors.push('Speed must be between 0 and 100 m/s');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Save parameter changes
   */
  async function saveChanges(): Promise<void> {
    if (!hasChanges) return;

    const validation = validateParams(editingParams);
    if (!validation.valid) {
      error = validation.errors.join(', ');
      return;
    }

    saving = true;
    error = null;

    try {
      await updateWaypointParams(item.id, editingParams);
      dispatch('update', { itemId: item.id, params: editingParams });
      isEditing = false;
      console.log(`Updated waypoint ${item.id} parameters`);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to update waypoint';
      dispatch('error', error);
      console.error('Failed to update waypoint params:', err);
    } finally {
      saving = false;
    }
  }

  /**
   * Cancel parameter changes
   */
  function cancelChanges(): void {
    editingParams = { ...item.params };
    isEditing = false;
    error = null;
  }

  /**
   * Handle keyboard shortcuts
   */
  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      saveChanges();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelChanges();
    }
  }

  /**
   * Format coordinate for display
   */
  function formatCoordinate(value: number, precision: number = 6): string {
    return value.toFixed(precision);
  }

  /**
   * Get type-specific parameters
   */
  function getTypeSpecificParams(type: MissionItem['type']): Array<{
    key: keyof WaypointParams;
    label: string;
    unit?: string;
    min?: number;
    max?: number;
    step?: number;
  }> {
    const common = [
      { key: 'lat' as const, label: 'Latitude', unit: '°', min: -90, max: 90, step: 0.000001 },
      { key: 'lng' as const, label: 'Longitude', unit: '°', min: -180, max: 180, step: 0.000001 },
      { key: 'alt' as const, label: 'Altitude', unit: 'm', min: -1000, max: 50000, step: 1 }
    ];

    switch (type) {
      case 'takeoff':
        return [
          ...common,
          { key: 'speed' as const, label: 'Climb Rate', unit: 'm/s', min: 1, max: 10, step: 0.1 }
        ];
      case 'waypoint':
        return [
          ...common,
          { key: 'speed' as const, label: 'Speed', unit: 'm/s', min: 1, max: 50, step: 0.1 }
        ];
      case 'loiter':
        return [
          ...common,
          { key: 'speed' as const, label: 'Loiter Speed', unit: 'm/s', min: 1, max: 20, step: 0.1 }
        ];
      case 'land':
        return [
          ...common,
          { key: 'speed' as const, label: 'Descent Rate', unit: 'm/s', min: 0.5, max: 5, step: 0.1 }
        ];
      default:
        return common;
    }
  }
</script>

<!-- ===== TEMPLATE ===== -->
<div class="waypoint-item" data-testid="waypoint-item-{item.id}">
  <div class="item-content">
    <div class="item-summary">
      <div class="summary-info">
        <h4>{item.name}</h4>
        <div class="item-meta">
          <span class="item-type">{item.type.toUpperCase()}</span>
          {#if item.position}
            <span class="coordinates">
              {formatCoordinate(item.position.lat, 4)}, {formatCoordinate(item.position.lng, 4)}
            </span>
          {/if}
          <span class="altitude">{item.params.alt}m</span>
        </div>
      </div>

      <div class="item-actions">
        <button
          class="edit-button"
          class:active={isEditing}
          on:click={() => (isEditing = !isEditing)}
          title={isEditing ? 'Close editor' : 'Edit parameters'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064l6.286-6.286z"
            />
          </svg>
        </button>

        <button
          class="minimize-button"
          on:click={() => dispatch('minimize')}
          title="Minimize to coin"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 6h12v4H2z" />
          </svg>
        </button>
      </div>
    </div>

    {#if isEditing}
      <form class="parameter-editor" on:submit|preventDefault={saveChanges}>
        <div class="editor-header">
          <h5>Edit Parameters</h5>
          {#if hasChanges}
            <span class="changes-indicator">Unsaved changes</span>
          {/if}
        </div>

        {#if error}
          <div class="error-message" data-testid="waypoint-error">
            {error}
          </div>
        {/if}

        <div class="parameter-grid">
          {#each getTypeSpecificParams(item.type) as param}
            <div class="parameter-field">
              <label for="{item.id}-{param.key}">{param.label}</label>
              <div class="input-group">
                <input
                  id="{item.id}-{param.key}"
                  type="number"
                  value={editingParams[param.key] || ''}
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  on:input={(e) => handleParamChange(param.key, e.currentTarget.value)}
                  on:keydown={handleKeyDown}
                  disabled={saving}
                />
                {#if param.unit}
                  <span class="input-unit">{param.unit}</span>
                {/if}
              </div>
            </div>
          {/each}

          {#if item.type === 'loiter' && editingParams.action}
            <div class="parameter-field">
              <label for="{item.id}-action">Action</label>
              <select
                id="{item.id}-action"
                value={editingParams.action || 'loiter'}
                on:change={(e) => handleParamChange('action', e.currentTarget.value)}
                disabled={saving}
              >
                <option value="loiter">Loiter</option>
                <option value="orbit_cw">Orbit Clockwise</option>
                <option value="orbit_ccw">Orbit Counter-Clockwise</option>
              </select>
            </div>
          {/if}
        </div>

        <div class="editor-actions">
          <button
            type="button"
            class="cancel-button"
            on:click={cancelChanges}
            disabled={saving}
            title="Cancel changes (Esc)"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="save-button"
            disabled={!hasChanges || saving}
            title="Save changes (Ctrl+Enter)"
          >
            {#if saving}
              <span class="saving-spinner"></span>
              Saving...
            {:else}
              Save
            {/if}
          </button>
        </div>
      </form>
    {/if}
  </div>
</div>

<style>
  .waypoint-item {
    background-color: var(--color-background_primary);
    border-radius: var(--layout-border_radius);
  }

  .item-content {
    padding: var(--layout-spacing_unit);
  }

  .item-summary {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--layout-spacing_unit);
  }

  .summary-info {
    flex: 1;
    min-width: 0;
  }

  .summary-info h4 {
    margin: 0 0 calc(var(--layout-spacing_unit) / 2) 0;
    color: var(--color-text_primary);
    font-size: var(--typography-font_size_base);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--layout-spacing_unit);
    font-size: var(--typography-font_size_sm);
  }

  .item-type {
    color: var(--color-accent_blue);
    font-weight: 600;
    background-color: rgba(0, 191, 255, 0.1);
    padding: calc(var(--layout-spacing_unit) / 4) calc(var(--layout-spacing_unit) / 2);
    border-radius: calc(var(--layout-border_radius) / 2);
  }

  .coordinates {
    color: var(--color-text_secondary);
    font-family: var(--typography-font_family_mono);
  }

  .altitude {
    color: var(--color-text_secondary);
    font-family: var(--typography-font_family_mono);
  }

  .item-actions {
    display: flex;
    gap: calc(var(--layout-spacing_unit) / 2);
  }

  .edit-button,
  .minimize-button {
    background: transparent;
    border: var(--layout-border_width) solid var(--component-accordion-border_color);
    color: var(--color-text_disabled);
    cursor: pointer;
    padding: calc(var(--layout-spacing_unit) / 2);
    border-radius: var(--layout-border_radius);
    transition: all var(--animation-transition_duration) var(--animation-easing_function);
  }

  .edit-button:hover,
  .minimize-button:hover {
    color: var(--color-text_secondary);
    border-color: var(--color-text_secondary);
    transform: scale(var(--animation-hover_scale));
  }

  .edit-button.active {
    color: var(--color-accent_blue);
    border-color: var(--color-accent_blue);
    background-color: rgba(0, 191, 255, 0.1);
  }

  .parameter-editor {
    margin-top: var(--layout-spacing_unit);
    padding-top: var(--layout-spacing_unit);
    border-top: var(--layout-border_width) solid var(--component-accordion-border_color);
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--layout-spacing_unit);
  }

  .editor-header h5 {
    margin: 0;
    color: var(--color-text_primary);
    font-size: var(--typography-font_size_base);
    font-weight: 600;
  }

  .changes-indicator {
    font-size: var(--typography-font_size_sm);
    color: var(--color-accent_yellow);
    background-color: rgba(255, 215, 0, 0.1);
    padding: calc(var(--layout-spacing_unit) / 4) calc(var(--layout-spacing_unit) / 2);
    border-radius: calc(var(--layout-border_radius) / 2);
  }

  .error-message {
    background-color: rgba(255, 68, 68, 0.1);
    color: var(--color-accent_red);
    padding: var(--layout-spacing_unit);
    border-radius: var(--layout-border_radius);
    margin-bottom: var(--layout-spacing_unit);
    font-size: var(--typography-font_size_sm);
    border: var(--layout-border_width) solid var(--color-accent_red);
  }

  .parameter-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--layout-spacing_unit);
    margin-bottom: calc(var(--layout-spacing_unit) * 2);
  }

  .parameter-field {
    display: flex;
    flex-direction: column;
    gap: calc(var(--layout-spacing_unit) / 2);
  }

  .parameter-field label {
    font-size: var(--typography-font_size_sm);
    color: var(--color-text_secondary);
    font-weight: 500;
  }

  .input-group {
    display: flex;
    align-items: center;
    position: relative;
  }

  .input-group input,
  select {
    flex: 1;
    background-color: var(--color-background_secondary);
    border: var(--layout-border_width) solid var(--component-accordion-border_color);
    color: var(--color-text_primary);
    padding: calc(var(--layout-spacing_unit) * 0.75);
    border-radius: var(--layout-border_radius);
    font-size: var(--typography-font_size_sm);
    font-family: var(--typography-font_family_mono);
    transition: border-color var(--animation-transition_duration) var(--animation-easing_function);
  }

  .input-group input:focus,
  select:focus {
    outline: none;
    border-color: var(--color-accent_blue);
    box-shadow: 0 0 0 2px rgba(0, 191, 255, 0.2);
  }

  .input-group input:disabled,
  select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .input-unit {
    position: absolute;
    right: calc(var(--layout-spacing_unit) * 0.75);
    color: var(--color-text_disabled);
    font-size: var(--typography-font_size_sm);
    pointer-events: none;
  }

  .editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--layout-spacing_unit);
  }

  .cancel-button,
  .save-button {
    padding: calc(var(--layout-spacing_unit) * 0.75) calc(var(--layout-spacing_unit) * 1.5);
    border-radius: var(--layout-border_radius);
    font-size: var(--typography-font_size_sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--animation-transition_duration) var(--animation-easing_function);
    display: flex;
    align-items: center;
    gap: calc(var(--layout-spacing_unit) / 2);
  }

  .cancel-button {
    background: transparent;
    border: var(--layout-border_width) solid var(--component-accordion-border_color);
    color: var(--color-text_secondary);
  }

  .cancel-button:hover:not(:disabled) {
    border-color: var(--color-text_secondary);
    background-color: var(--color-background_tertiary);
  }

  .save-button {
    background-color: var(--component-button-background_accent);
    color: var(--component-button-text_color_accent);
    border: none;
  }

  .save-button:hover:not(:disabled) {
    transform: scale(var(--animation-hover_scale));
  }

  .save-button:active:not(:disabled) {
    transform: scale(var(--animation-button_press_scale));
  }

  .save-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .saving-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .parameter-grid {
      grid-template-columns: 1fr;
    }

    .item-summary {
      flex-direction: column;
      gap: calc(var(--layout-spacing_unit) / 2);
    }

    .item-actions {
      align-self: flex-end;
    }

    .editor-actions {
      flex-direction: column-reverse;
    }

    .cancel-button,
    .save-button {
      width: 100%;
      justify-content: center;
    }
  }
</style>
