<!-- 
  MagnetometerCalibration - NASA JPL Rule 4 compliant (< 60 lines)
  Handles magnetometer/compass calibration workflow
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { showNotification } from '$lib/stores/notifications';
  import { safeTauriInvoke } from '$lib/utils/tauri';
  
  export let onComplete: (data: any) => void;
  export let isActive: boolean = false;
  
  let calibrating = false;
  let coverage = 0;
  let interference = false;
  let rotationData: number[][] = [];
  let updateInterval: number | null = null;
  
  async function startCalibration(): Promise<void> {
    calibrating = true;
    coverage = 0;
    rotationData = [];
    
    try {
      await safeTauriInvoke('start_mag_calibration');
      
      updateInterval = window.setInterval(async () => {
        const status = await safeTauriInvoke<any>('get_mag_calibration_status');
        coverage = status.coverage;
        interference = status.interference;
        
        if (status.complete) {
          completeCalibration(status.offsets);
        }
      }, 100);
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'Failed to start compass calibration',
        timeout: 3000
      });
      calibrating = false;
    }
  }
  
  async function completeCalibration(offsets: any): Promise<void> {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
    
    calibrating = false;
    onComplete({ magOffsets: offsets, coverage });
  }
  
  onDestroy(() => {
    if (updateInterval) clearInterval(updateInterval);
  });
</script>

{#if isActive}
  <div class="calibration-container">
    <h3>Compass Calibration</h3>
    
    {#if !calibrating}
      <p>Rotate the drone in all directions during calibration</p>
      <button on:click={startCalibration}>Start Calibration</button>
    {:else}
      <p>Rotate the drone slowly in figure-8 patterns</p>
      <div class="coverage-indicator">
        <div class="coverage-fill" style="width: {coverage}%"></div>
      </div>
      <p>Coverage: {coverage}%</p>
      
      {#if interference}
        <p class="warning">⚠️ Magnetic interference detected!</p>
      {/if}
    {/if}
  </div>
{/if}