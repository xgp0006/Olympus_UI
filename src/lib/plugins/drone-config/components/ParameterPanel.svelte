<!--
  Parameter Panel - NASA JPL Rule 4 Compliant
  Refactored to use modular sub-components for maintainability and compliance
-->
<script lang="ts">
  import ParameterContainer from './parameter/ParameterContainer.svelte';

  // Props
  export let showAdvanced: boolean = false;
  export let readonly: boolean = false;
</script>

<ParameterContainer {showAdvanced} {readonly} />
