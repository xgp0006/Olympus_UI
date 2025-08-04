<!--
  PID Tuning Chart Component
  NASA JPL Rule 4 compliant - handles real-time response visualization
  Component size: <60 lines per function
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  // Types
  interface StepResponse {
    time: number;
    setpoint: number;
    actual: number;
    error: number;
  }

  // Props
  export let responseHistory: StepResponse[] = [];

  // State
  let graphCanvas: HTMLCanvasElement;
  let animationFrame: number;

  // NASA JPL compliant function: Draw response graph
  function drawResponseGraph(): void {
    if (!graphCanvas) return;

    const ctx = graphCanvas.getContext('2d');
    if (!ctx) return;

    const width = graphCanvas.width;
    const height = graphCanvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    drawGrid(ctx, width, height);

    // Draw response data
    if (responseHistory.length > 1) {
      drawResponseLines(ctx, width, height);
    }

    // Draw oscillation indicator
    drawOscillationIndicator(ctx);
  }

  // NASA JPL compliant function: Draw grid
  function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.strokeStyle = 'var(--color-border_primary)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);

    // Draw grid lines
    for (let i = 0; i <= 10; i++) {
      const y = (height / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }

  // NASA JPL compliant function: Draw response lines
  function drawResponseLines(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const scaleX = width / responseHistory.length;
    const scaleY = height / 200;

    // Draw setpoint line
    ctx.strokeStyle = 'var(--color-accent_cyan)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    responseHistory.forEach((point, i) => {
      const x = i * scaleX;
      const y = height - point.setpoint * scaleY;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // NASA JPL compliant function: Draw oscillation indicator
  function drawOscillationIndicator(ctx: CanvasRenderingContext2D): void {
    const oscillation = detectOscillation();
    if (oscillation > 0.1) {
      ctx.fillStyle =
        oscillation > 0.3 ? 'var(--color-status_error)' : 'var(--color-status_warning)';
      ctx.font = '12px var(--typography-font_family_sans)';
      ctx.fillText(`Oscillation: ${(oscillation * 100).toFixed(0)}%`, 10, 20);
    }
  }

  // NASA JPL compliant function: Detect oscillation
  function detectOscillation(): number {
    if (responseHistory.length < 10) return 0;

    let crossings = 0;
    let prevError = responseHistory[0].error;

    for (let i = 1; i < responseHistory.length; i++) {
      const currentError = responseHistory[i].error;
      if (prevError * currentError < 0) crossings++;
      prevError = currentError;
    }

    return Math.min(crossings / responseHistory.length, 1);
  }

  // Animation loop
  function animate(): void {
    drawResponseGraph();
    animationFrame = requestAnimationFrame(animate);
  }

  onMount(() => {
    if (graphCanvas) {
      const resizeObserver = new ResizeObserver(() => {
        graphCanvas.width = graphCanvas.offsetWidth;
        graphCanvas.height = graphCanvas.offsetHeight;
      });
      resizeObserver.observe(graphCanvas);
      animate();
    }
  });

  onDestroy(() => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
  });
</script>

<div class="response-graph">
  <h3>Step Response</h3>
  <div class="graph-container">
    <canvas bind:this={graphCanvas}></canvas>
    <div class="graph-legend">
      <div class="legend-item">
        <span class="legend-color" style="background: var(--color-accent_cyan)"></span>
        <span>Setpoint</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: var(--color-accent_green)"></span>
        <span>Actual</span>
      </div>
    </div>
  </div>
</div>

<style>
  .response-graph {
    background: var(--color-background_tertiary);
    padding: 1rem;
    border-radius: var(--layout-border_radius);
    border: 1px solid var(--color-border_primary);
  }

  .graph-container {
    position: relative;
    height: 200px;
    background: var(--color-background_primary);
    border-radius: var(--layout-border_radius);
    overflow: hidden;
  }

  .graph-container canvas {
    width: 100%;
    height: 100%;
  }
</style>
