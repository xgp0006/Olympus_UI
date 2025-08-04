<!--
  Configuration Modals Component
  NASA JPL Rule 4 compliant - handles receiver and failsafe configuration modals
  Component size: <60 lines per function
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Types
  interface ReceiverConfig {
    protocol: 'PWM' | 'PPM' | 'SBUS' | 'IBUS' | 'CRSF' | 'DSM' | 'SPEKTRUM';
    channelCount: number;
    channelOrder: string;
    rssiChannel?: number;
    telemetryEnabled: boolean;
    failsafeMode: 'hold' | 'preset' | 'land' | 'rtl';
  }

  interface ReceiverChannel {
    id: string;
    number: number;
    value: number;
    min: number;
    max: number;
    failsafeValue: number;
    mapping?: string;
  }

  // Props
  export let showReceiverConfig: boolean = false;
  export let showFailsafeConfig: boolean = false;
  export let receiverConfig: ReceiverConfig;
  export let receiverChannels: ReceiverChannel[] = [];
  export let readonly: boolean = false;

  const dispatch = createEventDispatcher();

  // Stop event propagation for modal content
  function handleModalContentClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  // NASA JPL compliant function: Update receiver config
  function updateReceiverConfig<K extends keyof ReceiverConfig>(
    field: K,
    value: ReceiverConfig[K]
  ): void {
    if (readonly) return;
    dispatch('updateReceiverConfig', { field, value });
  }

  // NASA JPL compliant function: Update channel failsafe
  function updateChannelFailsafe(channelId: string, value: number): void {
    if (readonly) return;
    dispatch('updateChannelFailsafe', { channelId, value });
  }

  // NASA JPL compliant function: Close modal
  function closeModal(modalType: 'receiver' | 'failsafe'): void {
    dispatch('closeModal', { modalType });
  }

  // NASA JPL compliant function: Handle receiver protocol change
  function handleProtocolChange(event: Event): void {
    const target = event.currentTarget as HTMLSelectElement;
    updateReceiverConfig('protocol', target.value as ReceiverConfig['protocol']);
  }

  // NASA JPL compliant function: Handle failsafe mode change
  function handleFailsafeModeChange(event: Event): void {
    const target = event.currentTarget as HTMLSelectElement;
    updateReceiverConfig('failsafeMode', target.value as ReceiverConfig['failsafeMode']);
  }
</script>

<!-- Receiver Configuration Modal -->
{#if showReceiverConfig}
  <div
    class="modal-overlay"
    on:click={() => closeModal('receiver')}
    on:keydown={(e) => {
      if (e.key === 'Escape') {
        closeModal('receiver');
      }
    }}
    role="button"
    tabindex="0"
    aria-label="Close modal overlay"
  >
    <div class="modal-content" on:click={handleModalContentClick} role="presentation">
      <h3>Receiver Configuration</h3>

      <div class="config-group">
        <label>
          Protocol:
          <select
            bind:value={receiverConfig.protocol}
            on:change={handleProtocolChange}
            disabled={readonly}
          >
            <option value="PWM">PWM</option>
            <option value="PPM">PPM</option>
            <option value="SBUS">SBUS</option>
            <option value="IBUS">IBUS</option>
            <option value="CRSF">CRSF (Crossfire)</option>
            <option value="DSM">DSM/DSM2/DSMX</option>
            <option value="SPEKTRUM">Spektrum</option>
          </select>
        </label>

        <label>
          Channel Order:
          <select
            bind:value={receiverConfig.channelOrder}
            on:change={(e) => updateReceiverConfig('channelOrder', e.currentTarget.value)}
            disabled={readonly}
          >
            <option value="AETR">AETR (Spektrum/JR)</option>
            <option value="TAER">TAER (FrSky/Futaba)</option>
            <option value="RTEA">RTEA</option>
            <option value="TEAR">TEAR</option>
          </select>
        </label>

        <label>
          RSSI Channel:
          <select
            bind:value={receiverConfig.rssiChannel}
            on:change={(e) =>
              updateReceiverConfig('rssiChannel', parseInt(e.currentTarget.value) || undefined)}
            disabled={readonly}
          >
            <option value="">None</option>
            {#each Array(16) as _, i}
              <option value={i + 1}>Channel {i + 1}</option>
            {/each}
          </select>
        </label>

        <label class="checkbox-label">
          <input
            type="checkbox"
            bind:checked={receiverConfig.telemetryEnabled}
            on:change={(e) => updateReceiverConfig('telemetryEnabled', e.currentTarget.checked)}
            disabled={readonly}
          />
          Enable Telemetry
        </label>
      </div>

      <button class="close-button" on:click={() => closeModal('receiver')}>Close</button>
    </div>
  </div>
{/if}

<!-- Failsafe Configuration Modal -->
{#if showFailsafeConfig}
  <div
    class="modal-overlay"
    on:click={() => closeModal('failsafe')}
    on:keydown={(e) => {
      if (e.key === 'Escape') {
        closeModal('failsafe');
      }
    }}
    role="button"
    tabindex="0"
    aria-label="Close modal overlay"
  >
    <div class="modal-content" on:click={handleModalContentClick} role="presentation">
      <h3>Failsafe Configuration</h3>

      <div class="config-group">
        <label>
          Failsafe Mode:
          <select
            bind:value={receiverConfig.failsafeMode}
            on:change={handleFailsafeModeChange}
            disabled={readonly}
          >
            <option value="hold">Hold Last Command</option>
            <option value="preset">Preset Values</option>
            <option value="land">Auto Land</option>
            <option value="rtl">Return to Launch</option>
          </select>
        </label>

        <h4>Channel Failsafe Values</h4>
        <div class="failsafe-channels">
          {#each receiverChannels.slice(0, 8) as channel}
            <div class="failsafe-channel">
              <span>CH{channel.number} {channel.mapping || ''}</span>
              <input
                type="range"
                min={channel.min}
                max={channel.max}
                value={channel.failsafeValue}
                on:input={(e) => updateChannelFailsafe(channel.id, parseInt(e.currentTarget.value))}
                disabled={readonly}
              />
              <span class="failsafe-value">{channel.failsafeValue}μs</span>
            </div>
          {/each}
        </div>
      </div>

      <button class="close-button" on:click={() => closeModal('failsafe')}>Close</button>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: var(--color-background_primary);
    border: 1px solid var(--color-border, var(--color-background_tertiary));
    border-radius: var(--layout-border_radius);
    padding: 2rem;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
  }

  .modal-content h3 {
    margin: 0 0 1.5rem 0;
    color: var(--color-accent_blue);
  }

  .config-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .config-group label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: var(--color-text_secondary);
  }

  .config-group select {
    padding: 0.5rem;
    border: 1px solid var(--color-border, var(--color-background_tertiary));
    border-radius: var(--layout-border_radius);
    background: var(--color-background_secondary);
    color: var(--color-text_primary);
    font-size: 0.875rem;
  }

  .close-button {
    margin-top: 1.5rem;
    padding: 0.75rem 1.5rem;
    background: var(--color-accent_blue);
    color: var(--color-background_primary);
    border: none;
    border-radius: var(--layout-border_radius);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
</style>
