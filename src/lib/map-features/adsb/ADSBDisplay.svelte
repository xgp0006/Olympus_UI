<!--
  ADS-B Display Component
  Simplified aircraft tracking display
  Target: 2.0ms frame budget
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { MapViewport } from '../types';
  import { safeTauriInvoke } from '$lib/utils/tauri';
  import { debounce, FRAME_144FPS } from '$lib/utils/performance-utils';

  export let viewport: MapViewport;
  export let showLabels = true;
  export let showTrails = true;
  export let maxAircraft = 100;

  interface Aircraft {
    id: string;
    callsign: string;
    lat: number;
    lng: number;
    altitude: number;
    heading: number;
    speed: number;
    lastUpdate: number;
    trail: Array<{ lat: number; lng: number; time: number }>;
  }

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let aircraft: Map<string, Aircraft> = new Map();
  let animationFrame: number | null = null;
  let updateInterval: number | null = null;
  let loading = false;
  let error: string | null = null;

  // Style constants
  const AIRCRAFT_SIZE = 20;
  const TRAIL_LENGTH = 20;
  const TRAIL_FADE_TIME = 30000; // 30 seconds
  const LABEL_OFFSET = 25;

  // Fetch ADS-B data from backend
  async function fetchADSBData() {
    loading = true;
    error = null;

    try {
      // NASA JPL Rule 5: Validate viewport bounds
      if (!viewport || !viewport.bounds) {
        throw new Error('Invalid viewport');
      }

      // Use the batched map data fetch from backend
      const batch = await safeTauriInvoke<{
        adsb_aircraft: Array<{
          id: string;
          callsign: string;
          position: { lat: number; lng: number; alt?: number };
          heading: number;
          speed: number;
          altitude: number;
          aircraft_type: string;
        }>;
      }>('fetch_map_data_batch', {
        viewport: {
          bounds: viewport.bounds,
          zoom: viewport.zoom || 10,
          center: viewport.center
        },
        options: {
          include_gps: false,
          include_adsb: true,
          include_weather: false,
          include_measurements: false
        }
      });

      if (batch && batch.adsb_aircraft && Array.isArray(batch.adsb_aircraft)) {
        // Update aircraft map with new data
        const newAircraft = new Map<string, Aircraft>();
        batch.adsb_aircraft.forEach(ac => {
          const newAc: Aircraft = {
            id: ac.id,
            callsign: ac.callsign,
            lat: ac.position.lat,
            lng: ac.position.lng,
            altitude: ac.altitude,
            heading: ac.heading,
            speed: ac.speed,
            lastUpdate: Date.now(),
            trail: []
          };

          // Preserve trail data from existing aircraft
          const existing = aircraft.get(ac.id);
          if (existing && showTrails) {
            newAc.trail = existing.trail;
          }
          
          newAircraft.set(newAc.id, newAc);
        });
        aircraft = newAircraft;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to fetch ADS-B data';
      console.error('ADS-B data fetch error:', err);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    const context = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true
    });

    if (context) {
      ctx = context;
      setupCanvas();
      startAnimation();

      // Fetch initial ADS-B data
      fetchADSBData();

      // Update ADS-B data every 5 seconds
      updateInterval = window.setInterval(() => {
        fetchADSBData();
        updateAircraftTrails();
      }, 5000);

      // Create debounced resize handler for 144fps performance
      const debouncedSetupCanvas = debounce(setupCanvas, FRAME_144FPS * 2, { leading: false, trailing: true });
      
      window.addEventListener('resize', debouncedSetupCanvas);

      return () => {
        if (updateInterval) {
          clearInterval(updateInterval);
        }
        debouncedSetupCanvas.cancel();
        window.removeEventListener('resize', debouncedSetupCanvas);
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
      };
    }
  });

  // NASA JPL Rule 6: Guarded pointer dereference for canvas setup
  function setupCanvas() {
    const rect = canvas?.parentElement?.getBoundingClientRect();
    if (rect && ctx && canvas) {
      // NASA JPL Rule 5: Validate dimensions before assignment
      const width = Math.max(1, Math.min(rect.width, 8192));
      const height = Math.max(1, Math.min(rect.height, 8192));
      canvas.width = width;
      canvas.height = height;
    }
  }

  function updateAircraftTrails() {
    // Update aircraft trails only (positions come from backend)
    aircraft.forEach((ac) => {
      // Add current position to trail
      if (showTrails) {
        ac.trail.push({
          lat: ac.lat,
          lng: ac.lng,
          time: Date.now()
        });

        // Limit trail length
        if (ac.trail.length > TRAIL_LENGTH) {
          ac.trail.shift();
        }

        // Remove old trail points
        ac.trail = ac.trail.filter((point) => Date.now() - point.time < TRAIL_FADE_TIME);
      }
    });
  }

  // NASA JPL Rule 6: Guarded coordinate conversion with bounds checking
  function latLngToScreen(lat: number, lng: number): { x: number; y: number } {
    if (!canvas) return { x: 0, y: 0 }; // NASA JPL Rule 6: Guard against null canvas

    const canvasWidth = canvas.width || 1;
    const canvasHeight = canvas.height || 1;
    const x =
      canvasWidth / 2 +
      ((lng - viewport.center.lng) * canvasWidth) / (viewport.bounds.east - viewport.bounds.west);
    const y =
      canvasHeight / 2 -
      ((lat - viewport.center.lat) * canvasHeight) /
        (viewport.bounds.north - viewport.bounds.south);
    return { x, y };
  }

  // NASA JPL Rule 3: Split aircraft drawing into smaller functions
  function drawAircraftTrail(ac: Aircraft, pos: { x: number; y: number }) {
    if (!ctx || !showTrails || ac.trail.length <= 1) return;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
    ctx.lineWidth = 2;

    for (let i = 0; i < ac.trail.length; i++) {
      const point = ac.trail[i];
      const pointPos = latLngToScreen(point.lat, point.lng);
      const age = Date.now() - point.time;
      const opacity = Math.max(0, 1 - age / TRAIL_FADE_TIME);

      if (i === 0) {
        ctx.moveTo(pointPos.x, pointPos.y);
      } else {
        ctx.lineTo(pointPos.x, pointPos.y);
      }
    }

    ctx.stroke();
  }

  function drawAircraftIcon(ac: Aircraft, pos: { x: number; y: number }) {
    if (!ctx) return;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(((ac.heading - 90) * Math.PI) / 180);

    // Simple triangle shape
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.moveTo(0, -AIRCRAFT_SIZE / 2);
    ctx.lineTo(-AIRCRAFT_SIZE / 3, AIRCRAFT_SIZE / 2);
    ctx.lineTo(AIRCRAFT_SIZE / 3, AIRCRAFT_SIZE / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawAircraftLabel(ac: Aircraft, pos: { x: number; y: number }) {
    if (!ctx || !showLabels) return;

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';

    const labelY = pos.y + LABEL_OFFSET;

    // Background for readability
    const text = `${ac.callsign}`;
    const altText = `FL${Math.round(ac.altitude / 100)}`;
    const metrics = ctx.measureText(text);
    const altMetrics = ctx.measureText(altText);
    const maxWidth = Math.max(metrics.width, altMetrics.width);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(pos.x - maxWidth / 2 - 4, labelY - 10, maxWidth + 8, 25);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, pos.x, labelY);
    ctx.fillText(altText, pos.x, labelY + 12);
  }

  function drawAircraft(ac: Aircraft) {
    if (!ctx) return;

    const pos = latLngToScreen(ac.lat, ac.lng);

    // NASA JPL Rule 3: Delegate to smaller functions
    drawAircraftTrail(ac, pos);
    drawAircraftIcon(ac, pos);
    drawAircraftLabel(ac, pos);
  }

  function render() {
    if (!ctx || !canvas) return; // NASA JPL Rule 6: Guard both context and canvas

    const startTime = performance.now();

    // NASA JPL Rule 6: Guarded canvas clear with bounds validation
    ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);

    // Draw all aircraft
    aircraft.forEach((ac) => {
      drawAircraft(ac);
    });

    // Performance check
    const renderTime = performance.now() - startTime;
    if (renderTime > 2.0) {
      console.warn(`ADS-B render exceeded budget: ${renderTime.toFixed(2)}ms`);
    }
  }

  function startAnimation() {
    const animate = () => {
      render();
      animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }

  // Re-render when viewport changes and fetch new data
  $: if (viewport && ctx) {
    fetchADSBData();
  }
</script>

<div class="adsb-container">
  <canvas bind:this={canvas} class="adsb-canvas" />
  
  {#if loading && aircraft.size === 0}
    <div class="adsb-status">
      <div class="loading-spinner"></div>
      <span>Scanning for aircraft...</span>
    </div>
  {/if}
  
  {#if error && aircraft.size === 0}
    <div class="adsb-status error">
      <span>ADS-B data unavailable</span>
    </div>
  {/if}
  
  {#if !loading && !error && aircraft.size === 0}
    <div class="adsb-status info">
      <span>No aircraft in range</span>
    </div>
  {/if}
</div>

<style>
  .adsb-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 99;
  }

  .adsb-canvas {
    width: 100%;
    height: 100%;
  }

  .adsb-status {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .adsb-status.error {
    background: rgba(220, 38, 38, 0.8);
  }

  .adsb-status.info {
    background: rgba(59, 130, 246, 0.8);
  }

  .loading-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
