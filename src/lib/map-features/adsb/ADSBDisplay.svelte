<!--
  ADS-B Display Component
  Simplified aircraft tracking display
  Target: 2.0ms frame budget
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { MapViewport } from '../types';
  
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
  
  // Style constants
  const AIRCRAFT_SIZE = 20;
  const TRAIL_LENGTH = 20;
  const TRAIL_FADE_TIME = 30000; // 30 seconds
  const LABEL_OFFSET = 25;
  
  // Mock data generator for demo
  function generateMockAircraft() {
    const id = `MOCK${Math.floor(Math.random() * 1000)}`;
    const centerLat = viewport.center.lat;
    const centerLng = viewport.center.lng;
    
    return {
      id,
      callsign: `UAL${Math.floor(Math.random() * 999)}`,
      lat: centerLat + (Math.random() - 0.5) * 2,
      lng: centerLng + (Math.random() - 0.5) * 2,
      altitude: 10000 + Math.random() * 30000,
      heading: Math.random() * 360,
      speed: 400 + Math.random() * 200,
      lastUpdate: Date.now(),
      trail: []
    };
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
      
      // Add some mock aircraft for demo
      for (let i = 0; i < 5; i++) {
        const mockAircraft = generateMockAircraft();
        aircraft.set(mockAircraft.id, mockAircraft);
      }
      
      // Update positions periodically
      const updateInterval = setInterval(updateAircraft, 1000);
      
      window.addEventListener('resize', setupCanvas);
      
      return () => {
        clearInterval(updateInterval);
        window.removeEventListener('resize', setupCanvas);
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
  
  function updateAircraft() {
    // Update aircraft positions
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
        ac.trail = ac.trail.filter(point => 
          Date.now() - point.time < TRAIL_FADE_TIME
        );
      }
      
      // Update position based on heading and speed
      const distance = (ac.speed * 0.514444) / 3600; // knots to m/s to degrees
      ac.lat += distance * Math.cos(ac.heading * Math.PI / 180) / 111;
      ac.lng += distance * Math.sin(ac.heading * Math.PI / 180) / (111 * Math.cos(ac.lat * Math.PI / 180));
      
      // Add some random heading changes
      ac.heading += (Math.random() - 0.5) * 5;
      ac.lastUpdate = Date.now();
    });
    
    // Remove aircraft that are too far away
    aircraft.forEach((ac, id) => {
      const distance = Math.sqrt(
        Math.pow(ac.lat - viewport.center.lat, 2) + 
        Math.pow(ac.lng - viewport.center.lng, 2)
      );
      if (distance > 3) {
        aircraft.delete(id);
      }
    });
    
    // Add new aircraft if below limit
    if (aircraft.size < maxAircraft && Math.random() < 0.1) {
      const newAircraft = generateMockAircraft();
      aircraft.set(newAircraft.id, newAircraft);
    }
  }
  
  // NASA JPL Rule 6: Guarded coordinate conversion with bounds checking
  function latLngToScreen(lat: number, lng: number): { x: number; y: number } {
    if (!canvas) return { x: 0, y: 0 }; // NASA JPL Rule 6: Guard against null canvas
    
    const canvasWidth = canvas.width || 1;
    const canvasHeight = canvas.height || 1;
    const x = canvasWidth / 2 + (lng - viewport.center.lng) * canvasWidth / (viewport.bounds.east - viewport.bounds.west);
    const y = canvasHeight / 2 - (lat - viewport.center.lat) * canvasHeight / (viewport.bounds.north - viewport.bounds.south);
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
    ctx.rotate((ac.heading - 90) * Math.PI / 180);
    
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
    ctx.fillRect(
      pos.x - maxWidth / 2 - 4,
      labelY - 10,
      maxWidth + 8,
      25
    );
    
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
    aircraft.forEach(ac => {
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
  
  // Re-render when viewport changes
  $: if (viewport && ctx) {
    render();
  }
</script>

<div class="adsb-container">
  <canvas 
    bind:this={canvas}
    class="adsb-canvas"
  />
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
</style>