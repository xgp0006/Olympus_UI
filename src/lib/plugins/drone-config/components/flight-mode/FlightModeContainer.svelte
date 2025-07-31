<!--
  Flight Mode Container Component
  NASA JPL Rule 4 compliant - orchestrates all flight mode sub-components
  Component size: <60 lines per function
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { spring, tweened } from 'svelte/motion';
  import { BoundedArray } from '../BoundedArray';
  
  import FlightModeSelector from './FlightModeSelector.svelte';
  import SwitchAssignment from './SwitchAssignment.svelte';
  import ChannelMonitor from './ChannelMonitor.svelte';
  import ModeDetails from './ModeDetails.svelte';
  import ConfigurationModals from './ConfigurationModals.svelte';

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

  interface SwitchPosition {
    id: string;
    channelId: string;
    position: number;
    pwmMin: number;
    pwmMax: number;
    assignedModes: string[];
  }

  interface ReceiverChannel {
    id: string;
    number: number;
    value: number;
    min: number;
    max: number;
    center: number;
    reversed: boolean;
    failsafeValue: number;
    mapping?: 'roll' | 'pitch' | 'yaw' | 'throttle' | 'aux1' | 'aux2' | 'aux3' | 'aux4' | 'aux5' | 'aux6' | 'aux7' | 'aux8';
  }

  interface ReceiverConfig {
    protocol: 'PWM' | 'PPM' | 'SBUS' | 'IBUS' | 'CRSF' | 'DSM' | 'SPEKTRUM';
    channelCount: number;
    channelOrder: string;
    rssiChannel?: number;
    telemetryEnabled: boolean;
    failsafeMode: 'hold' | 'preset' | 'land' | 'rtl';
  }

  // Props
  export let readonly: boolean = false;
  export let showAdvanced: boolean = false;

  // State
  let flightModes: FlightMode[] = [];
  let switchPositions: SwitchPosition[] = [];
  let receiverChannels: ReceiverChannel[] = [];
  let receiverConfig: ReceiverConfig = {
    protocol: 'SBUS',
    channelCount: 16,
    channelOrder: 'AETR',
    telemetryEnabled: true,
    failsafeMode: 'land'
  };

  let selectedMode: FlightMode | null = null;
  let draggedMode: FlightMode | null = null;
  let draggedOverPosition: string | null = null;
  let editingSwitch: string | null = null;
  let showFailsafeConfig = false;
  let showReceiverConfig = false;

  // Animation states - NASA JPL Rule 2: Bounded memory
  const MAX_CHANNELS = 16;
  const channelBars = new BoundedArray<{ id: string; bar: any }>(MAX_CHANNELS);
  let updateInterval: number | null = null;

  // Default flight modes
  const defaultFlightModes: FlightMode[] = [
    { id: 'angle', name: 'ANGLE', description: 'Self-leveling mode with angle limits', icon: '📐', category: 'primary' },
    { id: 'horizon', name: 'HORIZON', description: 'Self-leveling with acrobatic capability', icon: '🌅', category: 'primary' },
    { id: 'acro', name: 'ACRO', description: 'Full manual control, no stabilization', icon: '🎯', category: 'primary' },
    { id: 'stabilize', name: 'STABILIZE', description: 'Manual throttle with self-leveling', icon: '⚖️', category: 'primary' },
    { id: 'althold', name: 'ALT HOLD', description: 'Maintains current altitude', icon: '📊', category: 'auxiliary', requirements: [{ type: 'gps', condition: 'min', value: 6 }] },
    { id: 'poshold', name: 'POS HOLD', description: 'GPS position hold', icon: '📍', category: 'auxiliary', requirements: [{ type: 'gps', condition: 'min', value: 8 }] },
    { id: 'rtl', name: 'RTL', description: 'Return to launch', icon: '🏠', category: 'safety', requirements: [{ type: 'gps', condition: 'min', value: 8 }] },
    { id: 'land', name: 'LAND', description: 'Automatic landing', icon: '🛬', category: 'safety' },
    { id: 'flip', name: 'FLIP', description: 'Automatic flip maneuver', icon: '🔄', category: 'advanced', conflictsWith: ['angle', 'horizon'] },
    { id: 'headfree', name: 'HEADFREE', description: 'Orientation-independent control', icon: '🧭', category: 'advanced' }
  ];

  onMount(() => {
    initializeFlightModes();
    initializeSwitchPositions();
    initializeReceiverChannels();
    startChannelMonitoring();
  });

  onDestroy(() => {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
    channelBars.clear();
  });

  // NASA JPL compliant function: Initialize flight modes
  function initializeFlightModes(): void {
    flightModes = [...defaultFlightModes];
  }

  // NASA JPL compliant function: Initialize switch positions
  function initializeSwitchPositions(): void {
    switchPositions = [
      ...createSwitchPosition('aux1', 3, 5),
      ...createSwitchPosition('aux2', 3, 6),
      ...createSwitchPosition('aux3', 2, 7),
      ...createSwitchPosition('aux4', 2, 8),
    ];
  }

  // NASA JPL compliant function: Create switch position configuration
  function createSwitchPosition(channelId: string, positionCount: number, channelNumber: number): SwitchPosition[] {
    const positions: SwitchPosition[] = [];
    const range = 1000;
    const step = range / positionCount;

    for (let i = 0; i < positionCount; i++) {
      positions.push({
        id: `${channelId}-pos${i}`,
        channelId,
        position: i,
        pwmMin: 1000 + (i * step),
        pwmMax: 1000 + ((i + 1) * step),
        assignedModes: []
      });
    }

    return positions;
  }

  // NASA JPL compliant function: Initialize receiver channels
  function initializeReceiverChannels(): void {
    receiverChannels = Array.from({ length: receiverConfig.channelCount }, (_, i) => ({
      id: `ch${i + 1}`,
      number: i + 1,
      value: i < 4 ? 1500 : 1000,
      min: 1000,
      max: 2000,
      center: 1500,
      reversed: false,
      failsafeValue: i === 2 ? 1000 : 1500,
      mapping: getDefaultMapping(i)
    }));
  }

  // NASA JPL compliant function: Get default channel mapping
  function getDefaultMapping(index: number): ReceiverChannel['mapping'] {
    const mappings: ReceiverChannel['mapping'][] = ['roll', 'pitch', 'throttle', 'yaw', 'aux1', 'aux2', 'aux3', 'aux4', 'aux5', 'aux6', 'aux7', 'aux8'];
    return index < mappings.length ? mappings[index] : undefined;
  }

  // NASA JPL compliant function: Start channel monitoring
  function startChannelMonitoring(): void {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
    
    updateInterval = window.setInterval(() => {
      receiverChannels = receiverChannels.map(ch => ({
        ...ch,
        value: ch.value + (Math.random() - 0.5) * 10
      }));
    }, 50);
  }

  // NASA JPL compliant function: Handle drag start
  function handleDragStart(event: CustomEvent): void {
    draggedMode = event.detail.mode;
  }

  // NASA JPL compliant function: Handle drag over
  function handleDragOver(event: CustomEvent): void {
    draggedOverPosition = event.detail.positionId;
  }

  // NASA JPL compliant function: Handle drag leave
  function handleDragLeave(): void {
    draggedOverPosition = null;
  }

  // NASA JPL compliant function: Handle drop
  function handleDrop(event: CustomEvent): void {
    if (!draggedMode) return;
    
    const position = event.detail.position;
    const conflicts = checkModeConflicts(draggedMode, position);
    
    if (conflicts.length > 0) {
      showConflictWarning(conflicts);
      return;
    }
    
    assignModeToPosition(draggedMode, position);
    draggedMode = null;
    draggedOverPosition = null;
  }

  // NASA JPL compliant function: Check mode conflicts
  function checkModeConflicts(mode: FlightMode, position: SwitchPosition): string[] {
    const conflicts: string[] = [];
    
    position.assignedModes.forEach(assignedModeId => {
      const assignedMode = flightModes.find(m => m.id === assignedModeId);
      if (assignedMode?.conflictsWith?.includes(mode.id)) {
        conflicts.push(`${mode.name} conflicts with ${assignedMode.name}`);
      }
    });
    
    return conflicts;
  }

  // NASA JPL compliant function: Assign mode to position
  function assignModeToPosition(mode: FlightMode, position: SwitchPosition): void {
    const posIndex = switchPositions.findIndex(p => p.id === position.id);
    if (posIndex === -1) return;
    
    switchPositions = switchPositions.map(pos => {
      if (pos.channelId === position.channelId && pos.id !== position.id) {
        return {
          ...pos,
          assignedModes: pos.assignedModes.filter(m => m !== mode.id)
        };
      }
      return pos;
    });
    
    switchPositions[posIndex] = {
      ...position,
      assignedModes: [...position.assignedModes, mode.id]
    };
  }

  // NASA JPL compliant function: Remove mode from position
  function removeModeFromPosition(event: CustomEvent): void {
    if (readonly) return;
    
    const { modeId, positionId } = event.detail;
    switchPositions = switchPositions.map(pos => {
      if (pos.id === positionId) {
        return {
          ...pos,
          assignedModes: pos.assignedModes.filter(m => m !== modeId)
        };
      }
      return pos;
    });
  }

  // NASA JPL compliant function: Show conflict warning
  function showConflictWarning(conflicts: string[]): void {
    alert(`Mode conflicts detected:\n${conflicts.join('\n')}`);
  }

  // NASA JPL compliant function: Save configuration
  async function saveConfiguration(): Promise<void> {
    if (readonly) return;
    console.log('Saving flight mode configuration:', {
      modes: flightModes,
      switches: switchPositions,
      receiver: receiverConfig,
      channels: receiverChannels
    });
  }

  // Event handlers
  function handleModeSelect(event: CustomEvent): void {
    selectedMode = event.detail.mode;
  }

  function handleEditSwitch(event: CustomEvent): void {
    editingSwitch = event.detail.positionId;
  }

  function handleUpdatePwm(event: CustomEvent): void {
    const { positionId, field, value } = event.detail;
    switchPositions = switchPositions.map(pos => {
      if (pos.id === positionId) {
        return { ...pos, [field]: value };
      }
      return pos;
    });
  }

  function handleUpdateReceiverConfig(event: CustomEvent): void {
    const { field, value } = event.detail;
    receiverConfig = { ...receiverConfig, [field]: value };
  }

  function handleUpdateChannelFailsafe(event: CustomEvent): void {
    const { channelId, value } = event.detail;
    receiverChannels = receiverChannels.map(ch => {
      if (ch.id === channelId) {
        return { ...ch, failsafeValue: value };
      }
      return ch;
    });
  }

  function handleCloseModal(event: CustomEvent): void {
    const { modalType } = event.detail;
    if (modalType === 'receiver') {
      showReceiverConfig = false;
    } else if (modalType === 'failsafe') {
      showFailsafeConfig = false;
    }
  }
</script>

<div class="flight-mode-panel">
  <!-- Header -->
  <div class="panel-header">
    <h3 class="panel-title">Flight Mode Configuration</h3>
    <div class="header-controls">
      <label class="toggle-label">
        <input type="checkbox" bind:checked={showAdvanced} disabled={readonly} />
        Show Advanced
      </label>
      <button class="config-button" on:click={() => showReceiverConfig = !showReceiverConfig}>
        Receiver Config
      </button>
      <button class="config-button" on:click={() => showFailsafeConfig = !showFailsafeConfig}>
        Failsafe Setup
      </button>
      <button class="save-button" on:click={saveConfiguration} disabled={readonly}>
        Save Config
      </button>
    </div>
  </div>

  <!-- Main Content -->
  <div class="panel-content">
    <!-- Flight Modes Grid -->
    <FlightModeSelector 
      {flightModes}
      {showAdvanced}
      {selectedMode}
      {readonly}
      on:dragStart={handleDragStart}
      on:modeSelect={handleModeSelect}
    />

    <!-- Mode Details -->
    <ModeDetails {selectedMode} />

    <!-- Switch Assignment -->
    <SwitchAssignment 
      {switchPositions}
      {flightModes}
      {draggedOverPosition}
      {editingSwitch}
      {readonly}
      on:dragOver={handleDragOver}
      on:dragLeave={handleDragLeave}
      on:drop={handleDrop}
      on:removeMode={removeModeFromPosition}
      on:editSwitch={handleEditSwitch}
      on:updatePwm={handleUpdatePwm}
    />

    <!-- Channel Monitor -->
    <ChannelMonitor {receiverChannels} />
  </div>

  <!-- Configuration Modals -->
  <ConfigurationModals
    {showReceiverConfig}
    {showFailsafeConfig}
    {receiverConfig}
    {receiverChannels}
    {readonly}
    on:updateReceiverConfig={handleUpdateReceiverConfig}
    on:updateChannelFailsafe={handleUpdateChannelFailsafe}
    on:closeModal={handleCloseModal}
  />
</div>

<style>
  .flight-mode-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-background_primary);
    color: var(--color-text_primary);
    font-family: var(--typography-font_family_sans);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--color-background_secondary);
    border-bottom: 1px solid var(--color-border, var(--color-background_tertiary));
  }

  .panel-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .header-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: grid;
    gap: 2rem;
  }
</style>