<script lang="ts">
  import DraggableContainer from './DraggableContainer.svelte';

  let containers = [
    {
      id: 'demo-1',
      title: 'Mission Control',
      content: 'Real-time telemetry data and system status',
      x: 50,
      y: 50,
      width: 400,
      height: 300
    },
    {
      id: 'demo-2',
      title: 'Flight Parameters',
      content: 'Altitude, velocity, and trajectory information',
      x: 500,
      y: 100,
      width: 350,
      height: 250
    },
    {
      id: 'demo-3',
      title: 'System Diagnostics',
      content: 'Component health and performance metrics',
      x: 200,
      y: 400,
      width: 450,
      height: 200
    }
  ];

  function handleFocus(event: CustomEvent) {
    console.log('Container focused:', event.detail.id);
  }

  function handleMinimize(event: CustomEvent) {
    console.log('Container minimized:', event.detail);
  }
</script>

<div class="demo-container">
  <h2>DraggableContainer Demo</h2>
  <p>Drag containers by their title bars, resize from corners/edges, minimize with the — button</p>
  <p>Use arrow keys when focused for keyboard navigation (Shift + Arrow for 1px movement)</p>

  {#each containers as container}
    <DraggableContainer
      id={container.id}
      title={container.title}
      initialX={container.x}
      initialY={container.y}
      initialWidth={container.width}
      initialHeight={container.height}
      on:focus={handleFocus}
      on:minimize={handleMinimize}
    >
      <div class="demo-content">
        <h3>{container.title}</h3>
        <p>{container.content}</p>
        <div class="metrics">
          <div class="metric">
            <span class="label">Status:</span>
            <span class="value operational">Operational</span>
          </div>
          <div class="metric">
            <span class="label">Performance:</span>
            <span class="value">144 FPS</span>
          </div>
          <div class="metric">
            <span class="label">Grid Snap:</span>
            <span class="value">8px</span>
          </div>
        </div>
      </div>
    </DraggableContainer>
  {/each}
</div>

<style>
  .demo-container {
    position: fixed;
    top: 20px;
    left: 20px;
    color: var(--color-text, #fff);
    z-index: 100;
    pointer-events: none;
  }

  .demo-container h2 {
    font-size: 24px;
    margin-bottom: 8px;
  }

  .demo-container p {
    font-size: 14px;
    opacity: 0.8;
    margin-bottom: 4px;
  }

  .demo-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
    pointer-events: auto;
  }

  .demo-content h3 {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
  }

  .demo-content p {
    font-size: 14px;
    opacity: 0.8;
    margin: 0;
  }

  .metrics {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 13px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  }

  .metric {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .label {
    opacity: 0.7;
  }

  .value {
    font-weight: 600;
  }

  .value.operational {
    color: #4ade80;
  }
</style>
