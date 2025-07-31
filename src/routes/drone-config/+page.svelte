<script lang="ts">
  import DroneConfigDashboard from '$lib/plugins/drone-config/DroneConfigDashboard.svelte';
</script>

<svelte:head>
  <title>Drone Configuration Dashboard</title>
</svelte:head>

<div class="demo-container">
  <div class="header">
    <h1>Drone Configuration Dashboard</h1>
    <p>Comprehensive drone setup with motor testing and flight mode configuration</p>
  </div>

  <div class="drone-config-wrapper">
    <DroneConfigDashboard />
  </div>

  <div class="instructions">
    <h2>Features:</h2>
    <ul>
      <li><strong>Motor Test Panel:</strong> Safely test individual motors with multi-stage safety system</li>
      <li><strong>Flight Mode Config:</strong> Drag-and-drop flight mode assignment to switches</li>
      <li><strong>Parameter Editor:</strong> Tune PID controllers and flight parameters</li>
      <li><strong>Accelerometer Calibration:</strong> 6-point calibration with visual guidance</li>
      <li><strong>RC Transmitter Setup:</strong> Configure channels and endpoints</li>
      <li><strong>ESC Calibration:</strong> Automated ESC calibration sequence</li>
      <li><strong>Theme Compliant:</strong> All components follow the design system</li>
    </ul>

    <h3>Safety Features:</h3>
    <ul>
      <li>Emergency stop button always visible</li>
      <li>Multi-stage motor test progression</li>
      <li>Propeller removal confirmation</li>
      <li>Automatic timeout on motor tests</li>
      <li>Real-time telemetry monitoring</li>
    </ul>
  </div>
</div>

<style>
  .demo-container {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--color-background_primary);
  }

  .header {
    padding: 1rem 2rem;
    background: var(--color-background_secondary);
    border-bottom: 1px solid var(--color-border_primary);
    z-index: 100;
  }

  .header h1 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--color-text_primary);
  }

  .header p {
    margin: 0.5rem 0 0;
    color: var(--color-text_secondary);
  }

  .drone-config-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .instructions {
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    max-width: 400px;
    padding: 1rem;
    background: var(--color-background_secondary);
    border: 1px solid var(--color-border_primary);
    border-radius: var(--layout-border_radius);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    z-index: 50;
    opacity: 0.95;
  }

  .instructions h2,
  .instructions h3 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    color: var(--color-text_primary);
  }

  .instructions h3 {
    margin-top: 1rem;
    color: var(--color-accent_yellow);
  }

  .instructions ul {
    margin: 0;
    padding-left: 1.5rem;
    font-size: 0.875rem;
    color: var(--color-text_secondary);
  }

  .instructions li {
    margin: 0.25rem 0;
  }

  .instructions strong {
    color: var(--color-text_primary);
  }

  /* Hide instructions on small screens */
  @media (max-width: 768px) {
    .instructions {
      display: none;
    }
  }
</style>