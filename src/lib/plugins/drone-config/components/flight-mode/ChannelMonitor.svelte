<!--
  Channel Monitor Component
  NASA JPL Rule 4 compliant - displays real-time channel values
  Component size: <60 lines per function
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { tweened } from 'svelte/motion';

  // Types
  interface ReceiverChannel {
    id: string;
    number: number;
    value: number;
    min: number;
    max: number;
    center: number;
    reversed: boolean;
    failsafeValue: number;
    mapping?:
      | 'roll'
      | 'pitch'
      | 'yaw'
      | 'throttle'
      | 'aux1'
      | 'aux2'
      | 'aux3'
      | 'aux4'
      | 'aux5'
      | 'aux6'
      | 'aux7'
      | 'aux8';
  }

  // Props
  export let receiverChannels: ReceiverChannel[] = [];
  export let maxChannels: number = 8;

  // State
  let channelBars = new Map<string, any>();

  // NASA JPL compliant function: Get channel bar width
  function getChannelBarWidth(channel: ReceiverChannel): string {
    const bar = channelBars.get(channel.id);
    if (!bar) return '50%';

    const value = bar.get ? bar.get() : bar;
    const percentage = ((value - channel.min) / (channel.max - channel.min)) * 100;
    return `${Math.max(0, Math.min(100, percentage))}%`;
  }

  // NASA JPL compliant function: Update channel animations
  function updateChannelBars(): void {
    receiverChannels.forEach((channel) => {
      let bar = channelBars.get(channel.id);
      if (!bar) {
        bar = tweened(channel.value, { duration: 50 });
        channelBars.set(channel.id, bar);
      }
      bar.set(channel.value);
    });
  }

  // NASA JPL compliant function: Start monitoring
  function startMonitoring(): () => void {
    const interval = setInterval(() => {
      updateChannelBars();
    }, 50); // 20Hz update rate

    return () => clearInterval(interval);
  }

  onMount(() => {
    return startMonitoring();
  });

  onDestroy(() => {
    channelBars.clear();
  });

  // Reactive updates
  $: updateChannelBars();
  $: displayChannels = receiverChannels.slice(0, maxChannels);
</script>

<div class="channel-monitor">
  <h4 class="section-title">Channel Monitor</h4>
  <div class="channel-bars">
    {#each displayChannels as channel}
      <div class="channel-bar-container">
        <span class="channel-label">CH{channel.number} {channel.mapping || ''}</span>
        <div class="channel-bar-track">
          <div class="channel-bar-fill" style="width: {getChannelBarWidth(channel)}" />
          <span class="channel-value">{Math.round(channel.value)}μs</span>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .channel-monitor {
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

  .channel-bars {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 0.75rem;
  }

  .channel-bar-container {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .channel-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text_secondary);
  }

  .channel-bar-track {
    position: relative;
    height: 24px;
    background: var(--color-background_secondary);
    border: 1px solid var(--color-border, var(--color-background_tertiary));
    border-radius: var(--layout-border_radius);
    overflow: hidden;
  }

  .channel-bar-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: linear-gradient(90deg, var(--color-accent_green) 0%, var(--color-accent_blue) 100%);
    transition: width 50ms ease-out;
  }

  .channel-value {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.625rem;
    font-weight: 600;
    color: var(--color-text_primary);
    text-shadow: 0 0 2px var(--color-background_primary);
  }
</style>
