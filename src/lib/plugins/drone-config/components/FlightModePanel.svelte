<!--
  Flight Mode Panel - NASA JPL Rule 4 Compliant
  Refactored to use modular sub-components for maintainability and compliance
-->
<script lang="ts">
  import FlightModeContainer from './flight-mode/FlightModeContainer.svelte';

  // Props
  export let readonly: boolean = false;
  export let showAdvanced: boolean = false;
</script>

<FlightModeContainer {readonly} {showAdvanced} />
