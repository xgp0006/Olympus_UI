<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    connectDrone,
    disconnectDrone,
    getVehicleInfo,
    getDroneParameters,
    setDroneParameter,
    testMotor,
    emergencyStop,
    calibrateAccelerometer,
    calibrateGyroscope,
    CONNECTION_PRESETS,
    type VehicleInfo,
    type Parameter,
  } from '$lib/api/mavlink';

  // State
  let connectionString = CONNECTION_PRESETS.SITL;
  let isConnected = false;
  let vehicleInfo: VehicleInfo | null = null;
  let parameters: Parameter[] = [];
  let selectedParam: Parameter | null = null;
  let paramValue = 0;
  let motorTestActive = false;
  let calibrationActive = false;
  let lastError = '';

  // Motor test settings
  let motorId = 1;
  let throttlePercent = 10;
  let testDurationMs = 1000;

  // Connection handling
  async function handleConnect() {
    try {
      lastError = '';
      const connected = await connectDrone(connectionString);
      if (connected) {
        isConnected = true;
        vehicleInfo = await getVehicleInfo();
        parameters = await getDroneParameters();
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Connection failed';
      console.error('Connection error:', error);
    }
  }

  async function handleDisconnect() {
    try {
      await disconnectDrone();
      isConnected = false;
      vehicleInfo = null;
      parameters = [];
      selectedParam = null;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Disconnect failed';
      console.error('Disconnect error:', error);
    }
  }

  // Parameter handling
  function selectParameter(param: Parameter) {
    selectedParam = param;
    paramValue = param.value;
  }

  async function updateParameter() {
    if (!selectedParam) return;
    
    try {
      await setDroneParameter(selectedParam.id, paramValue);
      // Update local state - null safety check for selectedParam
      if (selectedParam?.id) {
        const index = parameters.findIndex(p => p.id === selectedParam?.id);
        if (index >= 0) {
          parameters[index].value = paramValue;
          parameters = [...parameters];
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Parameter update failed';
      console.error('Parameter error:', error);
    }
  }

  // Motor testing
  async function handleMotorTest() {
    if (motorTestActive) return;
    
    try {
      motorTestActive = true;
      await testMotor(motorId, throttlePercent, testDurationMs);
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Motor test failed';
      console.error('Motor test error:', error);
    } finally {
      motorTestActive = false;
    }
  }

  // Emergency stop
  async function handleEmergencyStop() {
    try {
      await emergencyStop();
      motorTestActive = false;
      lastError = 'EMERGENCY STOP ACTIVATED';
    } catch (error) {
      console.error('CRITICAL: Emergency stop failed:', error);
      lastError = 'EMERGENCY STOP FAILED - MANUAL INTERVENTION REQUIRED';
    }
  }

  // Calibration
  async function handleAccelCalibration() {
    if (calibrationActive) return;
    
    try {
      calibrationActive = true;
      const result = await calibrateAccelerometer();
      if (result.success) {
        lastError = `Calibration successful: ${result.message}`;
      } else {
        lastError = `Calibration failed: ${result.message}`;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Calibration failed';
    } finally {
      calibrationActive = false;
    }
  }

  async function handleGyroCalibration() {
    if (calibrationActive) return;
    
    try {
      calibrationActive = true;
      const result = await calibrateGyroscope();
      if (result.success) {
        lastError = `Calibration successful: ${result.message}`;
      } else {
        lastError = `Calibration failed: ${result.message}`;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Calibration failed';
    } finally {
      calibrationActive = false;
    }
  }

  // Keyboard shortcuts for emergency stop
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' || (event.ctrlKey && event.key === 's')) {
      event.preventDefault();
      handleEmergencyStop();
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
    if (isConnected) {
      handleDisconnect();
    }
  });
</script>

<div class="drone-control p-4 space-y-4">
  <h2 class="text-2xl font-bold">Drone Control Panel</h2>

  <!-- Connection Section -->
  <div class="card p-4 space-y-2">
    <h3 class="text-lg font-semibold">Connection</h3>
    
    {#if !isConnected}
      <div class="flex gap-2">
        <select bind:value={connectionString} class="select flex-1">
          <option value={CONNECTION_PRESETS.SITL}>SITL (Simulation)</option>
          <option value={CONNECTION_PRESETS.MAVPROXY}>MAVProxy</option>
          <option value={CONNECTION_PRESETS.USB_PIXHAWK}>USB Pixhawk</option>
          <option value={CONNECTION_PRESETS.SERIAL_PIXHAWK}>Serial Pixhawk</option>
        </select>
        <input
          type="text"
          bind:value={connectionString}
          placeholder="Custom connection string"
          class="input flex-1"
        />
        <button
          on:click={handleConnect}
          class="btn btn-primary"
        >
          Connect
        </button>
      </div>
    {:else}
      <div class="flex justify-between items-center">
        <span class="text-green-600">Connected to {connectionString}</span>
        <button
          on:click={handleDisconnect}
          class="btn btn-secondary"
        >
          Disconnect
        </button>
      </div>
    {/if}
  </div>

  <!-- Vehicle Info -->
  {#if vehicleInfo}
    <div class="card p-4 space-y-2">
      <h3 class="text-lg font-semibold">Vehicle Information</h3>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <span>Type:</span><span>{vehicleInfo.vehicle_type}</span>
        <span>Autopilot:</span><span>{vehicleInfo.autopilot_type}</span>
        <span>Firmware:</span><span>{vehicleInfo.firmware_version}</span>
        <span>Armed:</span>
        <span class:text-red-600={vehicleInfo.armed}>
          {vehicleInfo.armed ? 'ARMED' : 'DISARMED'}
        </span>
        <span>Mode:</span><span>{vehicleInfo.flight_mode}</span>
      </div>
    </div>
  {/if}

  <!-- Emergency Stop -->
  <div class="card p-4 bg-red-50 border-red-500">
    <button
      on:click={handleEmergencyStop}
      class="btn btn-lg w-full bg-red-600 hover:bg-red-700 text-white"
      disabled={!isConnected}
    >
      EMERGENCY STOP (ESC)
    </button>
  </div>

  <!-- Motor Testing -->
  {#if isConnected && vehicleInfo && !vehicleInfo.armed}
    <div class="card p-4 space-y-2">
      <h3 class="text-lg font-semibold">Motor Testing</h3>
      <div class="grid grid-cols-3 gap-2">
        <label>
          Motor ID (1-8)
          <input
            type="number"
            bind:value={motorId}
            min="1"
            max="8"
            class="input w-full"
          />
        </label>
        <label>
          Throttle %
          <input
            type="number"
            bind:value={throttlePercent}
            min="0"
            max="100"
            class="input w-full"
          />
        </label>
        <label>
          Duration (ms)
          <input
            type="number"
            bind:value={testDurationMs}
            min="100"
            max="5000"
            step="100"
            class="input w-full"
          />
        </label>
      </div>
      <button
        on:click={handleMotorTest}
        disabled={motorTestActive || calibrationActive}
        class="btn btn-warning"
      >
        {motorTestActive ? 'Testing...' : 'Test Motor'}
      </button>
    </div>
  {/if}

  <!-- Calibration -->
  {#if isConnected && vehicleInfo && !vehicleInfo.armed}
    <div class="card p-4 space-y-2">
      <h3 class="text-lg font-semibold">Sensor Calibration</h3>
      <div class="flex gap-2">
        <button
          on:click={handleAccelCalibration}
          disabled={calibrationActive || motorTestActive}
          class="btn flex-1"
        >
          Calibrate Accelerometer
        </button>
        <button
          on:click={handleGyroCalibration}
          disabled={calibrationActive || motorTestActive}
          class="btn flex-1"
        >
          Calibrate Gyroscope
        </button>
      </div>
    </div>
  {/if}

  <!-- Parameters -->
  {#if isConnected && parameters.length > 0}
    <div class="card p-4 space-y-2">
      <h3 class="text-lg font-semibold">Parameters</h3>
      <div class="grid grid-cols-2 gap-2">
        <div class="space-y-1 max-h-64 overflow-y-auto">
          {#each parameters as param}
            <button
              on:click={() => selectParameter(param)}
              class="w-full text-left p-1 hover:bg-gray-100 rounded"
              class:bg-blue-100={selectedParam?.id === param.id}
            >
              <div class="font-mono text-sm">{param.id}</div>
              <div class="text-xs text-gray-600">
                {param.value} {param.units || ''}
              </div>
            </button>
          {/each}
        </div>
        
        {#if selectedParam}
          <div class="space-y-2">
            <h4 class="font-semibold">{selectedParam.id}</h4>
            {#if selectedParam.description}
              <p class="text-sm text-gray-600">{selectedParam.description}</p>
            {/if}
            <label>
              Value
              <input
                type="number"
                bind:value={paramValue}
                min={selectedParam.min_value}
                max={selectedParam.max_value}
                step="0.1"
                class="input w-full"
              />
            </label>
            {#if selectedParam.min_value !== undefined || selectedParam.max_value !== undefined}
              <div class="text-xs text-gray-500">
                Range: {selectedParam.min_value ?? '-∞'} to {selectedParam.max_value ?? '+∞'}
              </div>
            {/if}
            <button
              on:click={updateParameter}
              class="btn btn-primary btn-sm"
            >
              Update Parameter
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Error Display -->
  {#if lastError}
    <div class="alert" class:alert-error={lastError.includes('EMERGENCY')}>
      {lastError}
    </div>
  {/if}
</div>

<style>
  .card {
    background-color: white;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  }
  
  .btn {
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    font-weight: 500;
    transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .btn-primary {
    background-color: rgb(37 99 235);
    color: white;
  }
  
  .btn-primary:hover {
    background-color: rgb(29 78 216);
  }
  
  .btn-secondary {
    background-color: rgb(75 85 99);
    color: white;
  }
  
  .btn-secondary:hover {
    background-color: rgb(55 65 81);
  }
  
  .btn-warning {
    background-color: rgb(217 119 6);
    color: white;
  }
  
  .btn-warning:hover {
    background-color: rgb(180 83 9);
  }
  
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .input, .select {
    border: 1px solid rgb(209 213 219);
    border-radius: 0.25rem;
    padding: 0.25rem 0.5rem;
  }
  
  .alert {
    padding: 0.75rem;
    border-radius: 0.25rem;
  }
  
  .alert-error {
    background-color: rgb(254 226 226);
    color: rgb(153 27 27);
    font-weight: 700;
  }
</style>