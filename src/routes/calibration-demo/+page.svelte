<script lang="ts">
  import CalibrationWizard from '$lib/plugins/drone-config/components/CalibrationWizard.svelte';
  import DraggableContainer from '$lib/components/ui/DraggableContainer.svelte';
  
  function handleCalibrationComplete(results: Record<string, any>) {
    console.log('Calibration completed with results:', results);
  }
</script>

<svelte:head>
  <title>Calibration Wizard Demo</title>
</svelte:head>

<div class="demo-container">
  <h1>Drone Sensor Calibration Wizard Demo</h1>
  
  <DraggableContainer
    id="calibration-wizard-demo"
    title="Sensor Calibration Wizard"
    initialX={50}
    initialY={50}
    initialWidth={900}
    initialHeight={700}
    minimizable={true}
    resizable={true}
  >
    <CalibrationWizard onComplete={handleCalibrationComplete} />
  </DraggableContainer>
</div>

<style>
  .demo-container {
    width: 100vw;
    height: 100vh;
    background: var(--surface-primary, #0a0a0a);
    color: var(--text-primary, #ffffff);
    padding: 2rem;
    overflow: hidden;
  }
  
  h1 {
    margin: 0 0 2rem 0;
    font-size: 1.5rem;
    color: var(--text-primary);
  }
</style>