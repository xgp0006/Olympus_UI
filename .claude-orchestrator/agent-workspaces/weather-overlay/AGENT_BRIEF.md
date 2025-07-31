# Agent Brief: Weather Overlay Expert

## Mission
Create an AccuWeather-style weather visualization system with real-time meteorological data, animations, and flight-critical information at 144fps.

## Performance Target
- **Frame Budget**: 1.5ms per frame
- **Animation**: Smooth 144fps weather transitions
- **Data Updates**: Every 5 minutes from backend

## Technical Requirements

### Core Component Structure
```svelte
<!-- src/lib/map-features/weather/WeatherOverlay.svelte -->
<script lang="ts">
  import type { WeatherLayer, MapViewport } from '$lib/map-features/types';
  import { WeatherRenderer } from './renderers/WeatherRenderer';
  import { WeatherAnimator } from './WeatherAnimator';
  import { WeatherDataManager } from './WeatherDataManager';
  import { TimelineControls } from './TimelineControls.svelte';
  
  export let viewport: MapViewport;
  export let timeRange: { start: Date; end: Date };
  export let playbackSpeed = 1;
  
  const renderer = new WeatherRenderer();
  const animator = new WeatherAnimator();
</script>
```

### WebGL Weather Rendering
```typescript
class WeatherRenderer {
  private gl: WebGL2RenderingContext;
  private shaderPrograms: {
    clouds: WebGLProgram;
    precipitation: WebGLProgram;
    temperature: WebGLProgram;
    wind: WebGLProgram;
  };
  
  // Texture atlases for weather icons
  private textures: {
    cloudTypes: WebGLTexture;
    precipitationTypes: WebGLTexture;
  };
  
  renderWeatherLayer(layer: WeatherLayer, viewport: MapViewport): void {
    // Clear with alpha for overlay
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    
    // Render in correct order for visual hierarchy
    this.renderTemperature(layer.data.temperature);
    this.renderClouds(layer.data.clouds);
    this.renderPrecipitation(layer.data.precipitation);
    this.renderWind(layer.data.wind);
  }
  
  private renderClouds(cloudData: CloudData): void {
    // Use instanced rendering for cloud particles
    const shader = this.shaderPrograms.clouds;
    this.gl.useProgram(shader);
    
    // Upload cloud coverage data as texture
    const coverageTexture = this.createDataTexture(cloudData.coverage);
    
    // Render with alpha blending
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    
    // Draw instanced cloud sprites
    this.gl.drawArraysInstanced(
      this.gl.TRIANGLE_STRIP,
      0,
      4,
      cloudData.coverage.length * cloudData.coverage[0].length
    );
  }
}
```

### Meteorological Color Mapping
```typescript
class MeteorologicalColors {
  // Standard meteorological color scales
  private readonly temperatureScale = [
    { value: -40, color: [130, 22, 146] },    // Deep purple
    { value: -20, color: [34, 94, 168] },     // Deep blue
    { value: 0, color: [12, 160, 248] },      // Light blue
    { value: 20, color: [0, 200, 0] },        // Green
    { value: 30, color: [255, 255, 0] },      // Yellow
    { value: 40, color: [255, 126, 0] },      // Orange
    { value: 50, color: [255, 0, 0] }         // Red
  ];
  
  private readonly precipitationScale = [
    { value: 0, color: [0, 0, 0, 0] },        // Transparent
    { value: 0.1, color: [0, 255, 0, 80] },   // Light green
    { value: 1, color: [255, 255, 0, 120] },  // Yellow
    { value: 10, color: [255, 126, 0, 160] }, // Orange
    { value: 50, color: [255, 0, 0, 200] },   // Red
    { value: 100, color: [255, 0, 255, 255] } // Purple
  ];
  
  getColorForValue(value: number, scale: ColorScale): RGBA {
    // Interpolate between scale points
    for (let i = 1; i < scale.length; i++) {
      if (value <= scale[i].value) {
        return this.interpolateColor(
          scale[i - 1],
          scale[i],
          value
        );
      }
    }
    return scale[scale.length - 1].color;
  }
}
```

### Particle System for Precipitation
```typescript
class PrecipitationParticles {
  private particlePool: Particle[] = [];
  private activeParticles: Set<Particle> = new Set();
  private readonly maxParticles = 10000;
  
  update(deltaTime: number, precipData: PrecipitationData): void {
    // Spawn new particles based on intensity
    this.spawnParticles(precipData);
    
    // Update existing particles
    for (const particle of this.activeParticles) {
      particle.position.y -= particle.velocity * deltaTime;
      particle.life -= deltaTime;
      
      if (particle.life <= 0) {
        this.recycleParticle(particle);
      }
    }
  }
  
  private spawnParticles(precipData: PrecipitationData): void {
    // Spawn rate based on precipitation intensity
    for (let x = 0; x < precipData.intensity.length; x++) {
      for (let y = 0; y < precipData.intensity[0].length; y++) {
        const intensity = precipData.intensity[x][y];
        const type = precipData.type[x][y];
        
        if (intensity > 0 && Math.random() < intensity / 100) {
          this.spawnParticle(x, y, type, intensity);
        }
      }
    }
  }
}
```

### Wind Visualization
```typescript
class WindFieldRenderer {
  private windParticles: WindParticle[] = [];
  private flowField: Float32Array;
  
  renderWindField(windData: WindData): void {
    // Create flow field from wind data
    this.updateFlowField(windData);
    
    // Animate particles along flow field
    for (const particle of this.windParticles) {
      const flowVector = this.sampleFlowField(particle.position);
      particle.velocity = flowVector.multiplyScalar(0.1);
      particle.position.add(particle.velocity);
      
      // Wrap around edges
      this.wrapParticle(particle);
    }
    
    // Render streamlines
    this.renderStreamlines();
  }
  
  private renderStreamlines(): void {
    // Use WebGL lines with gradient colors
    // Color indicates wind speed
  }
}
```

### Timeline Animation System
```typescript
class WeatherAnimator {
  private timeline: WeatherLayer[] = [];
  private currentTime = 0;
  private playing = false;
  private playbackSpeed = 1;
  
  async loadTimeRange(start: Date, end: Date): Promise<void> {
    // Load weather data for time range
    const layers = await this.dataManager.getTimeRange(start, end);
    this.timeline = layers;
  }
  
  play(): void {
    this.playing = true;
    this.animate();
  }
  
  private animate(): void {
    if (!this.playing) return;
    
    const layer = this.interpolateLayers(this.currentTime);
    this.renderer.render(layer);
    
    this.currentTime += this.playbackSpeed / 60; // 60fps base
    
    if (this.currentTime >= this.timeline.length - 1) {
      this.currentTime = 0; // Loop
    }
    
    requestAnimationFrame(() => this.animate());
  }
  
  private interpolateLayers(time: number): WeatherLayer {
    // Smooth interpolation between layers
    const index = Math.floor(time);
    const fraction = time - index;
    
    const layer1 = this.timeline[index];
    const layer2 = this.timeline[index + 1] || layer1;
    
    return this.blendLayers(layer1, layer2, fraction);
  }
}
```

### Flight-Critical Weather Cards
```typescript
interface WeatherCard {
  id: string;
  type: 'temperature' | 'wind' | 'visibility' | 'pressure' | 'hazard';
  position: LatLng;
  data: any;
  priority: number;
}

class WeatherCardSystem {
  private cards: Map<string, WeatherCard> = new Map();
  
  generateFlightCriticalCards(
    weatherData: WeatherLayer,
    flightPath: LatLng[]
  ): WeatherCard[] {
    const cards: WeatherCard[] = [];
    
    // Check for hazards along flight path
    for (const point of flightPath) {
      const hazards = this.checkHazards(point, weatherData);
      
      if (hazards.length > 0) {
        cards.push({
          id: `hazard-${point.lat}-${point.lng}`,
          type: 'hazard',
          position: point,
          data: hazards,
          priority: 10
        });
      }
    }
    
    // Add temperature/pressure cards at waypoints
    // Add wind cards at altitude changes
    
    return cards;
  }
}
```

### Performance Optimizations
1. **Texture Atlasing**: All weather icons in single texture
2. **Level of Detail**: Reduce particle count when zoomed out
3. **Temporal Caching**: Pre-render common transitions
4. **GPU Particles**: All particle physics on GPU
5. **Tile-Based Loading**: Load weather data in tiles

### Visual Requirements
- Smooth gradients for temperature
- Realistic cloud rendering with transparency
- Animated precipitation particles
- Wind streamlines with speed indication
- Clear hazard highlighting

### Testing Requirements
```typescript
describe('WeatherOverlay', () => {
  test('maintains 144fps with all layers active');
  test('smooth timeline animations');
  test('accurate meteorological color mapping');
  test('particle system performance');
  test('flight-critical hazard detection');
});
```

### Deliverables
1. `WeatherOverlay.svelte` - Main component
2. `WeatherRenderer.ts` - WebGL rendering
3. `WeatherAnimator.ts` - Timeline system
4. `PrecipitationParticles.ts` - Particle effects
5. `WindFieldRenderer.ts` - Wind visualization
6. `WeatherCards.svelte` - Information cards

Remember: Aviation-grade accuracy with cinematic quality. Every pixel meteorologically correct.