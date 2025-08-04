<!--
  PID Tuning Panel - NASA JPL Rule 4 Compliant
  Refactored to use modular sub-components for maintainability and compliance
-->
<script lang="ts">
  import PIDTuningContainer from './pid/PIDTuningContainer.svelte';

  // Props
  export let onClose: (() => void) | undefined = undefined;
</script>

<PIDTuningContainer {onClose} />
