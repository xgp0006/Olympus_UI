<!-- 
  MotorTestContent - Component content wrapper (NASA JPL compliant)
  Handles the layout and composition of motor test components
-->
<script lang="ts">
  import type { Readable } from 'svelte/store';
  import type { MotorConfig } from '../types/motor-types';
  import { isConnected } from '../stores/drone-connection';
  
  // Sub-components
  import SafetyGate from './SafetyGate.svelte';
  import MotorTestUI from './MotorTestUI.svelte';
  import TestModeSelector from './TestModeSelector.svelte';
  import EmergencyOverlay from './EmergencyOverlay.svelte';
  import MotorDiagram from './MotorDiagram.svelte';
  import MotorControls from './MotorControls.svelte';
  import TelemetryDisplay from './TelemetryDisplay.svelte';
  
  export let store: any;
  export let service: any;
</script>

<div class="p-4 flex flex-col gap-4 h-full bg-background_primary">
  <SafetyGate 
    currentStage={store.currentStage}
    propellerRemoved={store.propellerRemoved}
    onProgressStage={stage => service.progressStage(stage)}
  />
  
  <MotorTestUI 
    {isConnected} 
    countdownTime={store.countdownTime} 
    currentStage={$store.currentStage} 
  />
  
  <MotorDiagram
    motorConfig={$store.motorConfig}
    motors={$store.motors}
    selectedMotors={$store.selectedMotors}
    testActive={$store.testActive}
    onToggleMotorSelection={(id) => service.toggleMotorSelection(id)}
    onChangeMotorConfig={(config) => service.changeMotorConfig(config)}
  />
  
  <TestModeSelector
    canTest={store.canTest}
    testActive={store.testActive}
    onRunDirectionTest={() => service.runDirectionTest()}
    onRunRampTest={() => service.runRampTest()}
    onEmergencyStop={() => service.emergencyStop()}
  />
  
  <MotorControls
    motors={$store.motors}
    selectedMotors={$store.selectedMotors}
    canTest={$store.canTest}
    testActive={$store.testActive}
    maxThrottle={service.getMaxThrottle($store.currentStage)}
    onSetMotorThrottle={(id, throttle) => service.setMotorThrottle(id, throttle)}
    onSetAllMotorsThrottle={throttle => service.setAllMotorsThrottle(throttle)}
    onRunDirectionTest={() => service.runDirectionTest()}
    onRunRampTest={() => service.runRampTest()}
  />
  
  <TelemetryDisplay motors={$store.motors} totalCurrent={$store.totalCurrent} />
  
  <EmergencyOverlay 
    isEmergencyStopping={store.isEmergencyStopping}
    onEmergencyStop={() => service.emergencyStop()}
  />
</div>