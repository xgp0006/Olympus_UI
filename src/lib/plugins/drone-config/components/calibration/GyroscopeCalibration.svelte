<!-- 
  GyroscopeCalibration - NASA JPL Rule 4 compliant (< 60 lines)
  Handles gyroscope calibration workflow
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { showNotification } from '$lib/stores/notifications';
  import { safeTauriInvoke } from '$lib/utils/tauri';

  export let onComplete: (data: any) => void;
  export let isActive: boolean = false;

  let calibrating = false;
  let progress = 0;
  let progressInterval: number | null = null;
  let sensorData = { x: 0, y: 0, z: 0 };

  async function startCalibration(): Promise<void> {
    calibrating = true;
    progress = 0;

    try {
      await safeTauriInvoke('start_gyro_calibration');

      progressInterval = window.setInterval(() => {
        progress += 20;
        if (progress >= 100) {
          completeCalibration();
        }
      }, 1000);
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'Failed to start gyroscope calibration',
        timeout: 3000
      });
      calibrating = false;
    }
  }

  async function completeCalibration(): Promise<void> {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    const result = await safeTauriInvoke('complete_gyro_calibration');
    calibrating = false;
    onComplete({ gyroOffsets: result });
  }

  onDestroy(() => {
    if (progressInterval) clearInterval(progressInterval);
  });
</script>

{#if isActive}
  <div class="calibration-container">
    <h3>Gyroscope Calibration</h3>
    <p>Keep the drone perfectly still</p>

    {#if !calibrating}
      <button on:click={startCalibration}>Start Calibration</button>
    {:else}
      <div class="progress-bar">
        <div class="progress-fill" style="width: {progress}%"></div>
      </div>
      <p>Calibrating... {progress}%</p>
    {/if}

    <div class="sensor-values">
      <span>X: {sensorData.x.toFixed(3)}</span>
      <span>Y: {sensorData.y.toFixed(3)}</span>
      <span>Z: {sensorData.z.toFixed(3)}</span>
    </div>
  </div>
{/if}
