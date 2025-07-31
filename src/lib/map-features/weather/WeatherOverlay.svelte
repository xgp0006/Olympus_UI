<!--
  Weather Overlay Component
  Simplified weather visualization
  Target: 1.5ms frame budget
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { MapViewport } from '../types';
  
  export let viewport: MapViewport;
  export let layers = {
    radar: true,
    satellite: false,
    temperature: false,
    wind: false
  };
  export let opacity = 0.7;
  
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  
  // Mock weather data
  interface WeatherCell {
    lat: number;
    lng: number;
    intensity: number; // 0-1
    type: 'clear' | 'light' | 'moderate' | 'heavy';
  }
  
  let weatherCells: WeatherCell[] = [];
  
  onMount(() => {
    const context = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true
    });
    
    if (context) {
      ctx = context;
      setupCanvas();
      generateMockWeatherData();
      startAnimation();
      
      window.addEventListener('resize', setupCanvas);
      
      return () => {
        window.removeEventListener('resize', setupCanvas);
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
      };
    }
  });
  
  function setupCanvas() {
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect && ctx) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  }
  
  function generateMockWeatherData() {
    weatherCells = [];
    const gridSize = 0.1; // degrees
    
    // Create a grid of weather cells
    for (let lat = viewport.bounds.south; lat < viewport.bounds.north; lat += gridSize) {
      for (let lng = viewport.bounds.west; lng < viewport.bounds.east; lng += gridSize) {
        // Create some random weather patterns
        const noise = Math.random();
        if (noise > 0.7) {
          weatherCells.push({
            lat,
            lng,
            intensity: noise,
            type: noise > 0.9 ? 'heavy' : noise > 0.8 ? 'moderate' : 'light'
          });
        }
      }
    }
  }
  
  function latLngToScreen(lat: number, lng: number): { x: number; y: number } {
    const x = canvas.width / 2 + (lng - viewport.center.lng) * canvas.width / (viewport.bounds.east - viewport.bounds.west);
    const y = canvas.height / 2 - (lat - viewport.center.lat) * canvas.height / (viewport.bounds.north - viewport.bounds.south);
    return { x, y };
  }
  
  function getWeatherColor(type: string, intensity: number): string {
    const colors = {
      clear: 'rgba(255, 255, 255, 0)',
      light: `rgba(100, 200, 255, ${intensity * 0.3})`,
      moderate: `rgba(50, 150, 255, ${intensity * 0.5})`,
      heavy: `rgba(200, 50, 255, ${intensity * 0.7})`
    };
    return colors[type as keyof typeof colors] || colors.clear;
  }
  
  function render() {
    if (!ctx) return;
    const context = ctx; // Capture non-null ctx
    
    const startTime = performance.now();
    
    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set global opacity
    context.globalAlpha = opacity;
    
    // Render radar layer
    if (layers.radar) {
      renderRadarLayer();
    }
    
    // Render wind vectors
    if (layers.wind) {
      renderWindLayer();
    }
    
    // Reset opacity
    context.globalAlpha = 1;
    
    // Performance check
    const renderTime = performance.now() - startTime;
    if (renderTime > 1.5) {
      console.warn(`Weather render exceeded budget: ${renderTime.toFixed(2)}ms`);
    }
  }
  
  function renderRadarLayer() {
    if (!ctx) return;
    const context = ctx; // Capture non-null ctx for closure
    
    // Draw weather cells
    const cellSize = canvas.width * 0.1 / (viewport.bounds.east - viewport.bounds.west);
    
    weatherCells.forEach(cell => {
      const pos = latLngToScreen(cell.lat, cell.lng);
      
      // Create gradient for smooth weather visualization
      const gradient = context.createRadialGradient(
        pos.x, pos.y, 0,
        pos.x, pos.y, cellSize
      );
      
      const color = getWeatherColor(cell.type, cell.intensity);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      context.fillStyle = gradient;
      context.fillRect(
        pos.x - cellSize,
        pos.y - cellSize,
        cellSize * 2,
        cellSize * 2
      );
    });
  }
  
  function renderWindLayer() {
    if (!ctx) return;
    const context = ctx; // Capture non-null ctx for nested loops
    
    // Draw wind vectors
    const gridSpacing = 50; // pixels
    
    context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    context.lineWidth = 1;
    
    for (let x = 0; x < canvas.width; x += gridSpacing) {
      for (let y = 0; y < canvas.height; y += gridSpacing) {
        // Mock wind direction and speed
        const windSpeed = Math.random() * 20 + 10;
        const windDirection = Math.random() * Math.PI * 2;
        
        const endX = x + Math.cos(windDirection) * windSpeed;
        const endY = y + Math.sin(windDirection) * windSpeed;
        
        // Draw wind arrow
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(endX, endY);
        context.stroke();
        
        // Arrowhead
        const arrowSize = 5;
        const angle1 = windDirection - Math.PI / 6;
        const angle2 = windDirection + Math.PI / 6;
        
        context.beginPath();
        context.moveTo(endX, endY);
        context.lineTo(
          endX - Math.cos(angle1) * arrowSize,
          endY - Math.sin(angle1) * arrowSize
        );
        context.moveTo(endX, endY);
        context.lineTo(
          endX - Math.cos(angle2) * arrowSize,
          endY - Math.sin(angle2) * arrowSize
        );
        context.stroke();
      }
    }
  }
  
  function startAnimation() {
    const animate = () => {
      render();
      animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }
  
  // Re-render when viewport or settings change
  $: if (viewport && ctx) {
    generateMockWeatherData();
    render();
  }
  
  $: if (layers && ctx) {
    render();
  }
</script>

<div class="weather-container">
  <canvas 
    bind:this={canvas}
    class="weather-canvas"
  />
</div>

<style>
  .weather-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 98;
  }
  
  .weather-canvas {
    width: 100%;
    height: 100%;
  }
</style>