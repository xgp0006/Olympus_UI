<!--
  Measuring Tools Component
  Simplified version for map distance and area measurements
  Target: 1.0ms frame budget
-->
<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import type { MapViewport } from '../types';

  export let viewport: MapViewport;
  export let activeTool: 'line' | 'area' | null = null;
  export let unit: 'metric' | 'imperial' = 'metric';

  const dispatch = createEventDispatcher<{
    measurementComplete: { type: string; value: number; unit: string };
  }>();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let points: Array<{ lat: number; lng: number }> = [];
  let isDrawing = false;
  let currentDistance = 0;
  let currentArea = 0;

  // Style constants
  const POINT_RADIUS = 6;
  const LINE_WIDTH = 2;
  const POINT_COLOR = '#ffffff';
  const LINE_COLOR = '#00ff88';
  const FILL_COLOR = 'rgba(0, 255, 136, 0.2)';
  const TEXT_COLOR = '#ffffff';
  const TEXT_BACKGROUND = 'rgba(0, 0, 0, 0.8)';

  onMount(() => {
    const context = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true
    });

    if (context) {
      ctx = context;
      setupCanvas();
      canvas.addEventListener('click', handleClick);
      canvas.addEventListener('dblclick', handleDoubleClick);
      canvas.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('resize', setupCanvas);
    }

    return () => {
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('dblclick', handleDoubleClick);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', setupCanvas);
    };
  });

  // NASA JPL Rule 6: Guarded canvas setup
  function setupCanvas() {
    const rect = canvas?.parentElement?.getBoundingClientRect();
    if (rect && ctx && canvas) {
      // NASA JPL Rule 5: Validate dimensions
      const width = Math.max(1, Math.min(rect.width, 8192));
      const height = Math.max(1, Math.min(rect.height, 8192));
      canvas.width = width;
      canvas.height = height;
      render();
    }
  }

  function handleClick(event: MouseEvent) {
    if (!activeTool || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // NASA JPL Rule 6: Guarded coordinate conversion
    if (!canvas) return; // NASA JPL Rule 6: Guard against null canvas

    const canvasWidth = canvas.width || 1;
    const canvasHeight = canvas.height || 1;
    const lat =
      viewport.center.lat +
      ((y - canvasHeight / 2) * (viewport.bounds.north - viewport.bounds.south)) / canvasHeight;
    const lng =
      viewport.center.lng +
      ((x - canvasWidth / 2) * (viewport.bounds.east - viewport.bounds.west)) / canvasWidth;

    if (!isDrawing) {
      isDrawing = true;
      points = [{ lat, lng }];
    } else {
      points.push({ lat, lng });
    }

    updateMeasurements();
    render();
  }

  function handleDoubleClick(event: MouseEvent) {
    if (isDrawing && points.length > 1) {
      event.preventDefault();
      event.stopPropagation();
      completeMeasurement();
    }
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isDrawing || points.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Update preview
    render();

    if (ctx) {
      // Draw preview line
      const lastPoint = points[points.length - 1];
      const lastScreen = latLngToScreen(lastPoint.lat, lastPoint.lng);

      ctx.strokeStyle = LINE_COLOR;
      ctx.lineWidth = LINE_WIDTH;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(lastScreen.x, lastScreen.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // NASA JPL Rule 6: Guarded coordinate conversion
  function latLngToScreen(lat: number, lng: number): { x: number; y: number } {
    if (!canvas) return { x: 0, y: 0 }; // NASA JPL Rule 6: Guard against null canvas

    const canvasWidth = canvas.width || 1;
    const canvasHeight = canvas.height || 1;
    const x =
      canvasWidth / 2 +
      ((lng - viewport.center.lng) * canvasWidth) / (viewport.bounds.east - viewport.bounds.west);
    const y =
      canvasHeight / 2 +
      ((lat - viewport.center.lat) * canvasHeight) /
        (viewport.bounds.north - viewport.bounds.south);
    return { x, y };
  }

  function updateMeasurements() {
    if (points.length < 2) {
      currentDistance = 0;
      currentArea = 0;
      return;
    }

    // Calculate distance
    currentDistance = 0;
    for (let i = 1; i < points.length; i++) {
      currentDistance += haversineDistance(points[i - 1], points[i]);
    }

    // Calculate area if polygon
    if (activeTool === 'area' && points.length >= 3) {
      currentArea = calculateArea(points);
    }
  }

  function haversineDistance(
    p1: { lat: number; lng: number },
    p2: { lat: number; lng: number }
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (p1.lat * Math.PI) / 180;
    const φ2 = (p2.lat * Math.PI) / 180;
    const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
    const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  function calculateArea(points: Array<{ lat: number; lng: number }>): number {
    // Simplified area calculation using shoelace formula
    // Convert to projected coordinates for better accuracy
    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].lng * points[j].lat;
      area -= points[j].lng * points[i].lat;
    }

    area = Math.abs(area) / 2;

    // Convert from degrees² to m²
    const latCenter = points.reduce((sum, p) => sum + p.lat, 0) / n;
    const metersPerDegree = 111320 * Math.cos((latCenter * Math.PI) / 180);

    return area * metersPerDegree * metersPerDegree;
  }

  function formatDistance(meters: number): string {
    if (unit === 'imperial') {
      const feet = meters * 3.28084;
      if (feet < 5280) {
        return `${feet.toFixed(1)} ft`;
      } else {
        return `${(feet / 5280).toFixed(2)} mi`;
      }
    } else {
      if (meters < 1000) {
        return `${meters.toFixed(1)} m`;
      } else {
        return `${(meters / 1000).toFixed(2)} km`;
      }
    }
  }

  function formatArea(squareMeters: number): string {
    if (unit === 'imperial') {
      const squareFeet = squareMeters * 10.7639;
      if (squareFeet < 43560) {
        return `${squareFeet.toFixed(0)} ft²`;
      } else {
        const acres = squareFeet / 43560;
        if (acres < 640) {
          return `${acres.toFixed(2)} acres`;
        } else {
          return `${(acres / 640).toFixed(2)} mi²`;
        }
      }
    } else {
      if (squareMeters < 10000) {
        return `${squareMeters.toFixed(0)} m²`;
      } else if (squareMeters < 1000000) {
        return `${(squareMeters / 10000).toFixed(2)} ha`;
      } else {
        return `${(squareMeters / 1000000).toFixed(2)} km²`;
      }
    }
  }

  // NASA JPL Rule 3: Split render into smaller functions
  function drawAreaFill() {
    if (activeTool !== 'area' || points.length < 3 || !ctx) return;

    ctx.fillStyle = FILL_COLOR;
    ctx.beginPath();

    const firstPoint = latLngToScreen(points[0].lat, points[0].lng);
    ctx.moveTo(firstPoint.x, firstPoint.y);

    for (let i = 1; i < points.length; i++) {
      const point = latLngToScreen(points[i].lat, points[i].lng);
      ctx.lineTo(point.x, point.y);
    }

    ctx.closePath();
    ctx.fill();
  }

  function drawLines() {
    if (points.length <= 1 || !ctx) return;

    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = LINE_WIDTH;
    ctx.beginPath();

    const firstPoint = latLngToScreen(points[0].lat, points[0].lng);
    ctx.moveTo(firstPoint.x, firstPoint.y);

    for (let i = 1; i < points.length; i++) {
      const point = latLngToScreen(points[i].lat, points[i].lng);
      ctx.lineTo(point.x, point.y);
    }

    if (activeTool === 'area' && points.length >= 3) {
      ctx.closePath();
    }

    ctx.stroke();
  }

  function drawPoints() {
    if (!ctx) return;

    ctx.fillStyle = POINT_COLOR;
    for (const point of points) {
      const screen = latLngToScreen(point.lat, point.lng);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, POINT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMeasurementLabel() {
    if (!isDrawing || points.length <= 1 || !ctx) return;

    const lastPoint = latLngToScreen(points[points.length - 1].lat, points[points.length - 1].lng);

    let label = '';
    if (activeTool === 'line') {
      label = formatDistance(currentDistance);
    } else if (activeTool === 'area' && points.length >= 3) {
      label = `${formatArea(currentArea)}`;
      if (currentDistance > 0) {
        label += ` (${formatDistance(currentDistance)} perimeter)`;
      }
    }

    if (label) {
      ctx.font = '14px monospace';
      const metrics = ctx.measureText(label);
      const padding = 6;
      const boxWidth = metrics.width + padding * 2;
      const boxHeight = 20;

      ctx.fillStyle = TEXT_BACKGROUND;
      ctx.fillRect(
        lastPoint.x - boxWidth / 2,
        lastPoint.y - POINT_RADIUS - boxHeight - 5,
        boxWidth,
        boxHeight
      );

      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lastPoint.x, lastPoint.y - POINT_RADIUS - boxHeight / 2 - 5);
    }
  }

  function render() {
    if (!ctx || !canvas) return; // NASA JPL Rule 6: Guard both context and canvas

    const startTime = performance.now();

    // NASA JPL Rule 6: Guarded canvas clear
    ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);

    if (points.length === 0) return;

    // NASA JPL Rule 3: Delegate to smaller functions
    drawAreaFill();
    drawLines();
    drawPoints();
    drawMeasurementLabel();

    const renderTime = performance.now() - startTime;
    if (renderTime > 1.0) {
      console.warn(`Measuring tools render exceeded budget: ${renderTime.toFixed(2)}ms`);
    }
  }

  function completeMeasurement() {
    if (points.length < 2) return;

    isDrawing = false;

    const measurementData = {
      type: activeTool!,
      value: activeTool === 'area' ? currentArea : currentDistance,
      unit:
        activeTool === 'area' ? (unit === 'metric' ? 'm²' : 'ft²') : unit === 'metric' ? 'm' : 'ft'
    };

    dispatch('measurementComplete', measurementData);

    // Clear after a delay
    setTimeout(() => {
      points = [];
      currentDistance = 0;
      currentArea = 0;
      render();
    }, 2000);
  }

  export function clear() {
    points = [];
    currentDistance = 0;
    currentArea = 0;
    isDrawing = false;
    if (ctx && canvas) {
      // NASA JPL Rule 6: Guard both context and canvas
      ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
    }
  }

  // Re-render when viewport changes
  $: if (viewport && ctx) {
    render();
  }
</script>

<div class="measuring-container">
  <canvas
    bind:this={canvas}
    class="measuring-canvas"
    style:cursor={activeTool ? 'crosshair' : 'default'}
    style:pointer-events={activeTool ? 'auto' : 'none'}
  />
</div>

<style>
  .measuring-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 101;
  }

  .measuring-canvas {
    width: 100%;
    height: 100%;
  }
</style>
