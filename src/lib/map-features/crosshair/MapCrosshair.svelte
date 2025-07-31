<!--
  MapCrosshair Component
  High-performance crosshair overlay with distance rings and icon support
  Target: 1.5ms frame budget for all rendering
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { MapViewport, CrosshairSettings, MapIcon } from '../types';
  import { globalScheduler } from '../shared/performance';
  import { RingRenderer } from './renderers/ring-renderer';
  import { writable } from 'svelte/store';

  // Props
  export let viewport: MapViewport;
  export let showRing = false;
  export let ringDistance = 1000; // meters
  export let settings: Partial<CrosshairSettings> = {};
  export const icons: MapIcon[] = [];

  // State
  let crosshairCanvas: HTMLCanvasElement;
  let ringCanvas: HTMLCanvasElement;
  let crosshairCtx: CanvasRenderingContext2D | null = null;
  let ringRenderer: RingRenderer | null = null;
  
  // Animation state
  let animationId: string | null = null;
  let lastRenderTime = 0;
  const targetFPS = 144;
  const frameTime = 1000 / targetFPS;

  // Smooth zoom handling
  let smoothZoomHandler: SmoothZoomHandler | null = null;
  let currentRingDistance = ringDistance;
  let targetRingDistance = ringDistance;

  // Grid reference
  let gridReference = '';

  // Performance monitoring
  let frameMetrics = {
    crosshairTime: 0,
    ringTime: 0,
    totalTime: 0
  };

  class SmoothZoomHandler {
    private momentum = 0;
    private animating = false;
    private dampingFactor = 0.92;
    private minMomentum = 0.01;

    handleWheel(event: WheelEvent): void {
      if (!event.altKey) return;
      
      event.preventDefault();
      
      // Calculate zoom speed based on current zoom level
      const zoomSpeed = this.getZoomSpeed(viewport.zoom);
      const delta = -event.deltaY * zoomSpeed;
      
      // Add to momentum
      this.momentum += delta * 0.1;
      
      // Clamp momentum
      this.momentum = Math.max(-50, Math.min(50, this.momentum));
      
      // Start animation if not running
      if (!this.animating) {
        this.animate();
      }
    }

    private getZoomSpeed(zoom: number): number {
      // Adjust zoom speed based on current zoom level
      if (zoom < 5) return 10;
      if (zoom < 10) return 5;
      if (zoom < 15) return 2;
      return 1;
    }

    private animate(): void {
      this.animating = true;
      
      const update = () => {
        if (Math.abs(this.momentum) < this.minMomentum) {
          this.animating = false;
          this.momentum = 0;
          return;
        }

        // Update target distance
        targetRingDistance += this.momentum;
        targetRingDistance = Math.max(10, Math.min(50000, targetRingDistance));
        
        // Apply damping
        this.momentum *= this.dampingFactor;
        
        // Continue animation
        requestAnimationFrame(update);
      };
      
      update();
    }
  }

  // Crosshair styles
  const crosshairStyles = {
    simple: (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number) => {
      const halfSize = size / 2;
      
      // Horizontal line
      ctx.moveTo(centerX - halfSize, centerY);
      ctx.lineTo(centerX - 5, centerY);
      ctx.moveTo(centerX + 5, centerY);
      ctx.lineTo(centerX + halfSize, centerY);
      
      // Vertical line
      ctx.moveTo(centerX, centerY - halfSize);
      ctx.lineTo(centerX, centerY - 5);
      ctx.moveTo(centerX, centerY + 5);
      ctx.lineTo(centerX, centerY + halfSize);
    },
    
    'mil-dot': (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number) => {
      const dotSize = 2;
      const spacing = size / 8;
      
      // Draw mil dots
      for (let i = -3; i <= 3; i++) {
        if (i === 0) continue;
        
        // Horizontal dots
        ctx.beginPath();
        ctx.arc(centerX + i * spacing, centerY, dotSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Vertical dots
        ctx.beginPath();
        ctx.arc(centerX, centerY + i * spacing, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Center cross
      crosshairStyles.simple(ctx, centerX, centerY, size / 2);
    },
    
    aviation: (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number) => {
      const radius = size / 2;
      
      // Outer circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Cross hairs
      const gap = radius * 0.3;
      
      // Top
      ctx.moveTo(centerX, centerY - radius);
      ctx.lineTo(centerX, centerY - gap);
      
      // Right
      ctx.moveTo(centerX + radius, centerY);
      ctx.lineTo(centerX + gap, centerY);
      
      // Bottom
      ctx.moveTo(centerX, centerY + radius);
      ctx.lineTo(centerX, centerY + gap);
      
      // Left
      ctx.moveTo(centerX - radius, centerY);
      ctx.lineTo(centerX - gap, centerY);
      
      ctx.stroke();
    }
  };

  /**
   * Convert viewport coordinates to grid reference
   */
  function updateGridReference(): void {
    const format = settings.gridFormat?.type || 'decimal';
    const precision = settings.gridFormat?.precision || 6;
    
    switch (format) {
      case 'decimal':
        gridReference = `${viewport.center.lat.toFixed(precision)}, ${viewport.center.lng.toFixed(precision)}`;
        break;
      case 'dms':
        gridReference = convertToDMS(viewport.center.lat, viewport.center.lng);
        break;
      // Add more formats as needed
      default:
        gridReference = `${viewport.center.lat.toFixed(precision)}, ${viewport.center.lng.toFixed(precision)}`;
    }
  }

  /**
   * Convert decimal degrees to DMS format
   */
  function convertToDMS(lat: number, lng: number): string {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    
    lat = Math.abs(lat);
    lng = Math.abs(lng);
    
    const latDeg = Math.floor(lat);
    const latMin = Math.floor((lat - latDeg) * 60);
    const latSec = ((lat - latDeg - latMin / 60) * 3600).toFixed(1);
    
    const lngDeg = Math.floor(lng);
    const lngMin = Math.floor((lng - lngDeg) * 60);
    const lngSec = ((lng - lngDeg - lngMin / 60) * 3600).toFixed(1);
    
    return `${latDeg}°${latMin}'${latSec}"${latDir} ${lngDeg}°${lngMin}'${lngSec}"${lngDir}`;
  }

  /**
   * Get color based on settings or auto-detect
   */
  function getCrosshairColor(): string {
    const colorSetting = settings.style?.color || 'auto';
    
    if (colorSetting === 'auto') {
      // For now, use a bright green that's visible on most backgrounds
      return '#00ff00';
    }
    
    const colors = {
      white: '#ffffff',
      black: '#000000',
      red: '#ff0000'
    };
    
    return colors[colorSetting as keyof typeof colors] || '#00ff00';
  }

  /**
   * Render crosshair
   */
  function renderCrosshair(timestamp: number): void {
    if (!crosshairCtx) return;
    
    const start = performance.now();
    
    // Clear canvas
    crosshairCtx.clearRect(0, 0, crosshairCanvas.width, crosshairCanvas.height);
    
    // Get center point
    const centerX = crosshairCanvas.width / 2;
    const centerY = crosshairCanvas.height / 2;
    
    // Configure style
    const style = settings.style?.type || 'simple';
    const size = settings.style?.size || 40;
    const opacity = settings.style?.opacity || 0.8;
    const color = getCrosshairColor();
    
    crosshairCtx.strokeStyle = color;
    crosshairCtx.fillStyle = color;
    crosshairCtx.lineWidth = 2;
    crosshairCtx.globalAlpha = opacity;
    
    // Draw crosshair
    crosshairCtx.beginPath();
    crosshairStyles[style](crosshairCtx, centerX, centerY, size);
    crosshairCtx.stroke();
    
    // Draw grid reference
    if (gridReference) {
      crosshairCtx.font = '12px monospace';
      crosshairCtx.textAlign = 'center';
      crosshairCtx.textBaseline = 'top';
      
      // Background for text
      const metrics = crosshairCtx.measureText(gridReference);
      const padding = 4;
      const boxWidth = metrics.width + padding * 2;
      const boxHeight = 16 + padding * 2;
      
      crosshairCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      crosshairCtx.fillRect(
        centerX - boxWidth / 2,
        centerY + size / 2 + 10,
        boxWidth,
        boxHeight
      );
      
      // Text
      crosshairCtx.fillStyle = '#ffffff';
      crosshairCtx.fillText(gridReference, centerX, centerY + size / 2 + 14);
    }
    
    frameMetrics.crosshairTime = performance.now() - start;
  }

  /**
   * Render ring
   */
  function renderRing(timestamp: number): void {
    if (!ringRenderer || !showRing) return;
    
    const start = performance.now();
    
    // Smooth distance interpolation
    const deltaDistance = targetRingDistance - currentRingDistance;
    if (Math.abs(deltaDistance) > 0.1) {
      currentRingDistance += deltaDistance * 0.15; // Smooth factor
    } else {
      currentRingDistance = targetRingDistance;
    }
    
    // Render ring
    ringRenderer.render(
      viewport,
      currentRingDistance,
      settings.ringUnits || 'meters',
      {
        color: '#00ff88',
        strokeWidth: 2,
        opacity: 0.8,
        labelColor: '#ffffff',
        labelSize: 12,
        labelFont: 'monospace'
      }
    );
    
    frameMetrics.ringTime = performance.now() - start;
  }

  /**
   * Main render loop
   */
  function render(timestamp: number): void {
    const frameStart = performance.now();
    
    // Skip if too soon
    if (timestamp - lastRenderTime < frameTime * 0.8) {
      return;
    }
    
    // Update grid reference
    updateGridReference();
    
    // Render components
    renderCrosshair(timestamp);
    
    if (showRing) {
      renderRing(timestamp);
    }
    
    frameMetrics.totalTime = performance.now() - frameStart;
    
    // Warn if over budget
    if (frameMetrics.totalTime > 1.5) {
      console.warn(`Frame budget exceeded: ${frameMetrics.totalTime.toFixed(2)}ms`);
    }
    
    lastRenderTime = timestamp;
  }

  /**
   * Handle canvas resize
   */
  function handleResize(): void {
    if (!crosshairCanvas || !ringCanvas) return;
    
    const rect = crosshairCanvas.parentElement?.getBoundingClientRect();
    if (!rect) return;
    
    // Update canvas sizes
    crosshairCanvas.width = rect.width;
    crosshairCanvas.height = rect.height;
    ringCanvas.width = rect.width;
    ringCanvas.height = rect.height;
    
    // Force re-render
    render(performance.now());
  }

  /**
   * Handle wheel events for ring zoom
   */
  function handleWheel(event: WheelEvent): void {
    smoothZoomHandler?.handleWheel(event);
  }

  // Reactive updates
  $: if (ringDistance !== targetRingDistance) {
    targetRingDistance = ringDistance;
  }

  $: if (viewport && animationId) {
    // Trigger re-render on viewport change
    render(performance.now());
  }

  onMount(() => {
    // Get contexts
    crosshairCtx = crosshairCanvas.getContext('2d', {
      alpha: true,
      desynchronized: true
    });
    
    // Initialize renderers
    ringRenderer = new RingRenderer(ringCanvas);
    smoothZoomHandler = new SmoothZoomHandler();
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(crosshairCanvas.parentElement!);
    
    // Initial setup
    handleResize();
    
    // Schedule rendering
    animationId = 'crosshair-render';
    globalScheduler.schedule(animationId, render, 100);
    
    // Add wheel listener
    crosshairCanvas.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      resizeObserver.disconnect();
      crosshairCanvas.removeEventListener('wheel', handleWheel);
    };
  });

  onDestroy(() => {
    if (animationId) {
      globalScheduler.unschedule(animationId);
    }
    
    ringRenderer?.destroy();
    smoothZoomHandler = null;
  });
</script>

<div class="crosshair-container">
  <canvas 
    bind:this={ringCanvas}
    class="overlay-canvas ring-canvas"
    style:pointer-events={showRing ? 'none' : 'none'}
  />
  <canvas 
    bind:this={crosshairCanvas}
    class="overlay-canvas crosshair-canvas"
    style:pointer-events="none"
  />
</div>

<style>
  .crosshair-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 100;
  }

  .overlay-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .ring-canvas {
    z-index: 1;
  }

  .crosshair-canvas {
    z-index: 2;
  }
</style>