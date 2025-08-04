<!-- 
  CalibrationWizardContent - NASA JPL Rule 4 compliant
  Handles calibration wizard content and logic
-->
<script lang="ts">
  import { writable } from 'svelte/store';
  import { isConnected } from '../stores/drone-connection';
  import { showNotification } from '$lib/stores/notifications';

  // Import calibration components
  import AccelerometerCalibration from './calibration/AccelerometerCalibration.svelte';
  import GyroscopeCalibration from './calibration/GyroscopeCalibration.svelte';
  import MagnetometerCalibration from './calibration/MagnetometerCalibration.svelte';
  import ESCCalibration from './calibration/ESCCalibration.svelte';
  import RadioCalibration from './calibration/RadioCalibration.svelte';

  export let onComplete: ((results: Record<string, any>) => void) | null = null;

  type CalibrationStep = 'accelerometer' | 'gyroscope' | 'magnetometer' | 'esc' | 'radio';

  let currentStep = writable<CalibrationStep>('accelerometer');
  let results: Record<string, any> = {};

  const steps: CalibrationStep[] = ['accelerometer', 'gyroscope', 'magnetometer', 'esc', 'radio'];

  function handleStepComplete(step: CalibrationStep, data: any): void {
    results[step] = data;

    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      currentStep.set(steps[currentIndex + 1]);
    } else {
      onComplete?.(results);
      showNotification({
        type: 'success',
        message: 'Calibration complete!',
        timeout: 5000
      });
    }
  }

  function selectStep(step: CalibrationStep): void {
    if (!$isConnected) {
      showNotification({
        type: 'error',
        message: 'Please connect to drone first',
        timeout: 3000
      });
      return;
    }
    currentStep.set(step);
  }
</script>

<div class="wizard-container">
  <div class="step-selector">
    {#each steps as step}
      <button
        class="step-button"
        class:active={$currentStep === step}
        class:completed={results[step]}
        on:click={() => selectStep(step)}
      >
        {step}
      </button>
    {/each}
  </div>

  <div class="calibration-content">
    <AccelerometerCalibration
      isActive={$currentStep === 'accelerometer'}
      onComplete={(data) => handleStepComplete('accelerometer', data)}
    />
    <GyroscopeCalibration
      isActive={$currentStep === 'gyroscope'}
      onComplete={(data) => handleStepComplete('gyroscope', data)}
    />
    <MagnetometerCalibration
      isActive={$currentStep === 'magnetometer'}
      onComplete={(data) => handleStepComplete('magnetometer', data)}
    />
    <ESCCalibration
      isActive={$currentStep === 'esc'}
      onComplete={(data) => handleStepComplete('esc', data)}
    />
    <RadioCalibration
      isActive={$currentStep === 'radio'}
      onComplete={(data) => handleStepComplete('radio', data)}
    />
  </div>
</div>

<style>
  .wizard-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-background_primary);
    color: var(--color-text_primary);
  }

  .step-selector {
    display: flex;
    gap: 0.5rem;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border_primary);
  }

  .step-button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border_primary);
    background: var(--color-background_secondary);
    color: var(--color-text_secondary);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .step-button:hover {
    background: var(--color-background_tertiary);
  }

  .step-button.active {
    background: var(--color-accent_blue);
    color: var(--color-text_inverse);
  }

  .step-button.completed {
    background: var(--color-status_success);
    color: var(--color-text_inverse);
  }

  .calibration-content {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
  }
</style>
