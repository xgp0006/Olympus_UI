<!-- 
  RadioCalibration - NASA JPL Rule 4 compliant (< 60 lines)
  Handles radio/transmitter calibration workflow
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { showNotification } from '$lib/stores/notifications';
  import { safeTauriInvoke } from '$lib/utils/tauri';
  
  export let onComplete: (data: any) => void;
  export let isActive: boolean = false;
  
  interface Channel {
    min: number;
    max: number;
    center: number;
    current: number;
  }
  
  let channels: Record<string, Channel> = {
    throttle: { min: 1000, max: 2000, center: 1500, current: 1500 },
    roll: { min: 1000, max: 2000, center: 1500, current: 1500 },
    pitch: { min: 1000, max: 2000, center: 1500, current: 1500 },
    yaw: { min: 1000, max: 2000, center: 1500, current: 1500 }
  };
  
  let calibrating = false;
  let updateInterval: number | null = null;
  
  async function startCalibration(): Promise<void> {
    calibrating = true;
    
    try {
      await safeTauriInvoke('start_radio_calibration');
      
      updateInterval = window.setInterval(async () => {
        const values = await safeTauriInvoke<any>('get_radio_values');
        Object.keys(channels).forEach(ch => {
          if (values[ch]) {
            channels[ch].current = values[ch];
            channels[ch].min = Math.min(channels[ch].min, values[ch]);
            channels[ch].max = Math.max(channels[ch].max, values[ch]);
          }
        });
      }, 50);
    } catch (error) {
      showNotification({ type: 'error', message: 'Failed to start radio calibration', timeout: 3000 });
      calibrating = false;
    }
  }
  
  async function completeCalibration(): Promise<void> {
    if (updateInterval) clearInterval(updateInterval);
    
    await safeTauriInvoke('complete_radio_calibration', { channels });
    calibrating = false;
    onComplete({ radioChannels: channels });
  }
  
  onDestroy(() => {
    if (updateInterval) clearInterval(updateInterval);
  });
</script>

{#if isActive}
  <div class="calibration-container">
    <h3>Radio Calibration</h3>
    <p>Move all sticks to their extremes</p>
    
    {#each Object.entries(channels) as [name, ch]}
      <div class="channel">
        <span>{name}: {ch.current}</span>
        <div class="channel-bar">
          <div class="channel-value" style="left: {((ch.current - 1000) / 10)}%"></div>
        </div>
      </div>
    {/each}
    
    {#if !calibrating}
      <button on:click={startCalibration}>Start Calibration</button>
    {:else}
      <button on:click={completeCalibration}>Complete Calibration</button>
    {/if}
  </div>
{/if}