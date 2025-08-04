<script lang="ts">
  import MissionPlanner from '$lib/plugins/mission-planner/MissionPlanner.svelte';
</script>

<svelte:head>
  <title>Mission Planner Demo - Draggable Tools</title>
</svelte:head>

<div class="demo-container">
  <div class="header">
    <h1>Mission Planner with Draggable Tools</h1>
    <p>All components are draggable, dockable, and minimizable</p>
  </div>

  <div class="mission-planner-wrapper">
    <MissionPlanner />
  </div>

  <div class="instructions">
    <h2>Features:</h2>
    <ul>
      <li>
        <strong>Map Tools:</strong> Enter coordinates in multiple formats (Lat/Long, UTM, MGRS)
      </li>
      <li><strong>Mission Items:</strong> Manage waypoints and mission sequences</li>
      <li><strong>Draggable:</strong> Click and drag title bars to move components</li>
      <li><strong>Resizable:</strong> Drag edges and corners to resize</li>
      <li><strong>Minimizable:</strong> Click minimize button to collapse to title bar</li>
      <li><strong>Snap to Grid:</strong> Components snap to 8px grid for alignment</li>
      <li><strong>Edge Snapping:</strong> Components snap to screen edges</li>
      <li><strong>Persistent:</strong> Positions are saved in localStorage</li>
    </ul>
  </div>
</div>

<style>
  .demo-container {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--color-background);
  }

  .header {
    padding: 1rem 2rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    z-index: 100;
  }

  .header h1 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--color-text);
  }

  .header p {
    margin: 0.5rem 0 0;
    color: var(--color-text-secondary);
  }

  .mission-planner-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .instructions {
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    max-width: 300px;
    padding: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 50;
    opacity: 0.9;
  }

  .instructions h2 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    color: var(--color-text);
  }

  .instructions ul {
    margin: 0;
    padding-left: 1.5rem;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .instructions li {
    margin: 0.25rem 0;
  }

  .instructions strong {
    color: var(--color-text);
  }

  /* Hide instructions on small screens */
  @media (max-width: 768px) {
    .instructions {
      display: none;
    }
  }
</style>
