<!--
  Drone Configuration Plugin - Main Dashboard Component
  Integrates with existing plugin system and infrastructure
  Aerospace-grade drone configuration interface
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import DraggableContainer from '$lib/components/ui/DraggableContainer.svelte';
  import { droneConnectionStore } from './stores/drone-connection';
  import { droneParameterStore } from './stores/drone-parameters';
  import ParameterPanel from './components/ParameterPanel.svelte';
  import PIDTuningPanel from './components/PIDTuningPanel.svelte';
  import MotorTestPanel from './components/MotorTestPanel.svelte';
  import CalibrationWizard from './components/CalibrationWizard.svelte';
  import FlightModePanel from './components/FlightModePanel.svelte';

  // Active tab management following existing patterns
  let activeTab: string = 'parameters';

  // Connection state
  let connected: boolean = false;
  let connectionStatus: string = 'Disconnected';

  // Subscribe to stores using existing patterns
  $: connected = $droneConnectionStore.connected;
  $: connectionStatus = connected ? 'Connected' : 'Disconnected';

  onMount(() => {
    // Initialize plugin following existing patterns from mission-planner and sdr-suite
    console.log('Drone Config Plugin initialized');
  });
</script>

<!-- Main plugin container using existing DraggableContainer system -->
<DraggableContainer
  id="drone-config"
  title="Drone Configuration"
  initialX={100}
  initialY={100}
  initialWidth={800}
  initialHeight={600}
>
  <!-- Connection status header -->
  <div class="connection-header">
    <div class="status-indicator" class:connected>
      <span class="status-dot"></span>
      {connectionStatus}
    </div>
    
    {#if !connected}
      <button class="connect-btn" on:click={() => droneConnectionStore.connect('udp:127.0.0.1:14550')}>
        Connect Drone
      </button>
    {/if}
  </div>

  <!-- Tab navigation following existing UI patterns -->
  <div class="tabs">
    <button class="tab" class:active={activeTab === 'parameters'} on:click={() => activeTab = 'parameters'}>
      Parameters
    </button>
    <button class="tab" class:active={activeTab === 'pid'} on:click={() => activeTab = 'pid'}>
      PID Tuning
    </button>
    <button class="tab" class:active={activeTab === 'motors'} on:click={() => activeTab = 'motors'}>
      Motor Test
    </button>
    <button class="tab" class:active={activeTab === 'calibration'} on:click={() => activeTab = 'calibration'}>
      Calibration
    </button>
    <button class="tab" class:active={activeTab === 'flight-modes'} on:click={() => activeTab = 'flight-modes'}>
      Flight Modes
    </button>
  </div>

  <!-- Tab content -->
  <div class="tab-content">
    {#if activeTab === 'parameters'}
      <ParameterPanel />
    {:else if activeTab === 'pid'}
      <PIDTuningPanel />
    {:else if activeTab === 'motors'}
      <MotorTestPanel />
    {:else if activeTab === 'calibration'}
      <CalibrationWizard />
    {:else if activeTab === 'flight-modes'}
      <FlightModePanel />
    {/if}
  </div>
</DraggableContainer>

<style>
  /* Follow existing theme system and CSS variable patterns */
  .connection-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border_primary);
    background: var(--color-background_secondary);
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
    color: var(--color-text_secondary);
  }

  .status-indicator.connected {
    color: var(--color-status_success);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-status_error);
  }

  .status-indicator.connected .status-dot {
    background: var(--color-status_success);
  }

  .connect-btn {
    padding: 0.5rem 1rem;
    background: var(--color-accent_blue);
    color: var(--color-text_inverse);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .connect-btn:hover {
    background: var(--color-accent_blue);
    filter: brightness(1.1);
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid var(--color-border_primary);
    background: var(--color-background_primary);
  }

  .tab {
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-weight: 500;
    color: var(--color-text_secondary);
    transition: all 0.2s;
  }

  .tab:hover {
    background: var(--color-background_tertiary);
    color: var(--color-text_primary);
  }

  .tab.active {
    color: var(--color-accent_blue);
    border-bottom-color: var(--color-accent_blue);
  }

  .tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }
</style>