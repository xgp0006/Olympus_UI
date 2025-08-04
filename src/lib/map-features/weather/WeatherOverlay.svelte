<!--
  Weather Overlay Component
  Simplified weather visualization
  Target: 1.5ms frame budget
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { MapViewport } from '../types';
  import { debounce, FRAME_144FPS } from '$lib/utils/performance-utils';
  import { safeTauriInvoke } from '$lib/utils/tauri';

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
  let updateInterval: number | null = null;

  // Weather data from backend
  interface WeatherCell {
    lat: number;
    lng: number;
    intensity: number; // 0-1
    type: 'clear' | 'light' | 'moderate' | 'heavy';
  }

  let weatherCells: WeatherCell[] = [];
  let loading = false;
  let error: string | null = null;

  onMount(() => {
    const context = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true
    });

    if (context) {
      ctx = context;
      setupCanvas();
      fetchWeatherData();
      startAnimation();

      // Update weather data every 30 seconds
      updateInterval = window.setInterval(fetchWeatherData, 30000);

      // Create debounced resize handler for 144fps performance  
      const debouncedSetupCanvas = debounce(setupCanvas, FRAME_144FPS * 2, { leading: false, trailing: true });
      
      window.addEventListener('resize', debouncedSetupCanvas);

      return () => {
        debouncedSetupCanvas.cancel();
        window.removeEventListener('resize', debouncedSetupCanvas);
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
        if (updateInterval) {
          clearInterval(updateInterval);
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

  async function fetchWeatherData() {
    loading = true;
    error = null;

    try {
      // NASA JPL Rule 5: Validate viewport bounds
      if (!viewport || !viewport.bounds) {
        throw new Error('Invalid viewport');
      }

      // Use the batched map data fetch from backend
      const batch = await safeTauriInvoke<{
        weather_tiles: Array<{
          id: string;
          bounds: { north: number; south: number; east: number; west: number };
          data_type: string;
          url: string;
        }>;
      }>('fetch_map_data_batch', {
        viewport: {
          bounds: viewport.bounds,
          zoom: viewport.zoom || 10,
          center: viewport.center
        },
        options: {
          include_gps: false,
          include_adsb: false,
          include_weather: true,
          include_measurements: false
        }
      });

      if (batch && batch.weather_tiles) {
        // Convert weather tiles to weather cells
        // In a real implementation, the backend would provide actual weather data
        // For now, we'll display an empty state since backend provides tiles
        weatherCells = [];
        
        // Log that we received weather tile info
        console.log(`Received ${batch.weather_tiles.length} weather tiles from backend`);
      } else {
        weatherCells = [];
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to fetch weather data';
      weatherCells = [];
      console.error('Weather data fetch error:', err);
    } finally {
      loading = false;
    }
  }

  function latLngToScreen(lat: number, lng: number): { x: number; y: number } {
    const x =
      canvas.width / 2 +
      ((lng - viewport.center.lng) * canvas.width) / (viewport.bounds.east - viewport.bounds.west);
    const y =
      canvas.height / 2 -
      ((lat - viewport.center.lat) * canvas.height) /
        (viewport.bounds.north - viewport.bounds.south);
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
    const cellSize = (canvas.width * 0.1) / (viewport.bounds.east - viewport.bounds.west);

    weatherCells.forEach((cell) => {
      const pos = latLngToScreen(cell.lat, cell.lng);

      // Create gradient for smooth weather visualization
      const gradient = context.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, cellSize);

      const color = getWeatherColor(cell.type, cell.intensity);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      context.fillStyle = gradient;
      context.fillRect(pos.x - cellSize, pos.y - cellSize, cellSize * 2, cellSize * 2);
    });
  }

  function renderWindLayer() {
    if (!ctx) return;
    const context = ctx; // Capture non-null ctx for nested loops

    // Wind layer is now disabled until backend provides wind data
    // This function remains as a placeholder for future backend integration
    
    // When backend wind data is available, it should provide:
    // - Wind vectors with position (lat/lng)
    // - Wind speed and direction
    // - Update via 'fetch_wind_data' Tauri command
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
    fetchWeatherData();
  }

  $: if (layers && ctx) {
    render();
  }
</script>

<div class="weather-container">
  <canvas bind:this={canvas} class="weather-canvas" />
  
  {#if loading}
    <div class="weather-status">
      <div class="loading-spinner"></div>
      <span>Loading weather data...</span>
    </div>
  {/if}
  
  {#if error}
    <div class="weather-status error">
      <span>Weather data unavailable</span>
    </div>
  {/if}
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

  .weather-status {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 1rem 2rem;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .weather-status.error {
    background: rgba(220, 38, 38, 0.8);
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
