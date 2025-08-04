<!-- 
  CalibrationWizard - NASA JPL Rule 4 compliant (< 60 lines)
  Main orchestrator for sensor calibration workflows
-->
<script lang="ts">
  import DraggableContainer from '$lib/components/ui/DraggableContainer.svelte';
  import CalibrationWizardContent from './CalibrationWizardContent.svelte';

  export let onComplete: ((results: Record<string, any>) => void) | null = null;
</script>

<DraggableContainer
  id="calibration-wizard"
  title="Sensor Calibration Wizard"
  initialWidth={700}
  initialHeight={500}
>
  <CalibrationWizardContent {onComplete} />
</DraggableContainer>
