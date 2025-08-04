<!-- 
  AccelerometerCalibration - NASA JPL Rule 4 compliant (< 60 lines)
  Handles accelerometer calibration workflow
-->
<script lang="ts">
  import { spring } from 'svelte/motion';
  import { showNotification } from '$lib/stores/notifications';
  import { safeTauriInvoke } from '$lib/utils/tauri';

  export let onComplete: (data: any) => void;
  export let isActive: boolean = false;

  type AccelPosition = 'level' | 'inverted' | 'left' | 'right' | 'nose_up' | 'nose_down';

  let currentPosition: AccelPosition = 'level';
  let positions: Record<AccelPosition, boolean> = {
    level: false,
    inverted: false,
    left: false,
    right: false,
    nose_up: false,
    nose_down: false
  };

  let droneRotation = spring(
    { x: 0, y: 0, z: 0 },
    {
      stiffness: 0.1,
      damping: 0.8
    }
  );

  const positionConfig = {
    level: { rotation: { x: 0, y: 0, z: 0 }, instruction: 'Place drone level' },
    inverted: { rotation: { x: 180, y: 0, z: 0 }, instruction: 'Turn upside down' },
    left: { rotation: { x: 0, y: 0, z: -90 }, instruction: 'Place on left side' },
    right: { rotation: { x: 0, y: 0, z: 90 }, instruction: 'Place on right side' },
    nose_up: { rotation: { x: -90, y: 0, z: 0 }, instruction: 'Point nose up' },
    nose_down: { rotation: { x: 90, y: 0, z: 0 }, instruction: 'Point nose down' }
  };

  async function capturePosition(): Promise<void> {
    try {
      await safeTauriInvoke('calibrate_accel_position', { position: currentPosition });
      positions[currentPosition] = true;

      const nextPos = Object.entries(positions).find(([_, done]) => !done)?.[0] as AccelPosition;
      if (nextPos) {
        currentPosition = nextPos;
        droneRotation.set(positionConfig[nextPos].rotation);
      } else {
        onComplete({ positions });
      }
    } catch (error) {
      showNotification({ type: 'error', message: 'Calibration failed', timeout: 3000 });
    }
  }

  $: if (isActive && currentPosition) {
    droneRotation.set(positionConfig[currentPosition].rotation);
  }
</script>

{#if isActive}
  <div class="calibration-container">
    <h3>Accelerometer Calibration</h3>
    <p>{positionConfig[currentPosition].instruction}</p>
    <div
      class="drone-visual"
      style="transform: rotateX({$droneRotation.x}deg) rotateY({$droneRotation.y}deg) rotateZ({$droneRotation.z}deg)"
    >
      <!-- 3D drone representation -->
    </div>
    <button on:click={capturePosition}>Capture Position</button>
    <div class="progress">
      {Object.values(positions).filter(Boolean).length} / 6 positions complete
    </div>
  </div>
{/if}
