<!-- 
  MotorTestPanel - NASA JPL Rule 4 compliant (< 60 lines)
  Main orchestrator for motor testing functionality
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import DraggableContainer from '$lib/components/ui/DraggableContainer.svelte';
  import { motorTestStore } from '../stores/motor-test';
  import { getMotorTestService } from '../services/motor-test-service';
  import MotorTestContent from './MotorTestContent.svelte';
  
  const service = getMotorTestService();
  
  onMount(() => {
    service.initialize();
    return () => service.shutdown();
  });
</script>

<DraggableContainer
  id="motor-test-panel"
  title="Motor Test Panel - SAFETY CRITICAL"
  initialWidth={800}
  initialHeight={600}
  minWidth={600}
  minHeight={500}
>
  <MotorTestContent store={motorTestStore} {service} />
</DraggableContainer>