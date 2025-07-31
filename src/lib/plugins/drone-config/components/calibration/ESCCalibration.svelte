<!-- 
  ESCCalibration - NASA JPL Rule 4 compliant (< 60 lines)
  Handles ESC calibration workflow with safety warnings
-->
<script lang="ts">
  import { showNotification } from '$lib/stores/notifications';
  import { safeTauriInvoke } from '$lib/utils/tauri';
  
  export let onComplete: (data: any) => void;
  export let isActive: boolean = false;
  
  let safetyConfirmed = false;
  let calibrationMode: 'all' | 'individual' = 'all';
  let calibrating = false;
  let throttlePosition = 0;
  let selectedESC = 1;
  
  async function startCalibration(): Promise<void> {
    if (!safetyConfirmed) {
      showNotification({
        type: 'error',
        message: 'Please confirm safety measures first',
        timeout: 3000
      });
      return;
    }
    
    calibrating = true;
    
    try {
      await safeTauriInvoke('start_esc_calibration', { mode: calibrationMode });
      
      // Calibration sequence
      throttlePosition = 100;
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      throttlePosition = 0;
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = await safeTauriInvoke('complete_esc_calibration');
      onComplete({ escCalibration: result });
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'ESC calibration failed',
        timeout: 3000
      });
    } finally {
      calibrating = false;
      throttlePosition = 0;
    }
  }
</script>

{#if isActive}
  <div class="calibration-container">
    <h3>ESC Calibration</h3>
    
    <div class="safety-warning">
      <h4>⚠️ WARNING: Remove propellers!</h4>
      <label>
        <input type="checkbox" bind:checked={safetyConfirmed} />
        I confirm propellers are removed
      </label>
    </div>
    
    {#if safetyConfirmed && !calibrating}
      <select bind:value={calibrationMode}>
        <option value="all">All ESCs</option>
        <option value="individual">Individual ESCs</option>
      </select>
      
      <button on:click={startCalibration}>Start Calibration</button>
    {/if}
    
    {#if calibrating}
      <p>Throttle: {throttlePosition}%</p>
      <div class="throttle-bar">
        <div class="throttle-fill" style="height: {throttlePosition}%"></div>
      </div>
    {/if}
  </div>
{/if}