# Agent Brief: Map Crosshair Engineer

## Mission
Develop a dynamic crosshair system with distance rings, NATO/civilian/nerdfont icons, and 144fps smooth interactions.

## Performance Target
- **Frame Budget**: 1.5ms per frame (includes all overlays)
- **Ring Updates**: <0.2ms per ALT-scroll event
- **Icon Rendering**: 100+ icons at 144fps

## Technical Requirements

### Core Component Structure
```svelte
<!-- src/lib/map-features/crosshair/MapCrosshair.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { MapViewport, MapIcon } from '$lib/map-features/types';
  import { globalScheduler } from '$lib/map-features/shared/performance';
  import { createRingRenderer } from './renderers/ring-renderer';
  import { IconManager } from './IconManager';
  
  export let viewport: MapViewport;
  export let showRing = false;
  export let ringDistance = 1000; // meters
</script>
```

### Distance Ring System
```typescript
class RingRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrame: number;
  
  // Pre-calculated values for performance
  private ringRadiusPixels: number;
  private labelPositions: { top: DOMPoint, bottom: DOMPoint };
  
  render(viewport: MapViewport, distance: number): void {
    // Use path caching for ring
    // Inverted color calculation
    // Efficient text rendering
  }
}
```

### ALT-Scroll Implementation
```typescript
// Smooth zoom with momentum
class SmoothZoomHandler {
  private momentum = 0;
  private targetDistance: number;
  private currentDistance: number;
  
  handleWheel(event: WheelEvent): void {
    if (!event.altKey) return;
    
    // Calculate zoom delta with acceleration
    const delta = event.deltaY * this.getZoomSpeed(viewport.zoom);
    this.momentum = delta * 0.1;
    
    // Schedule smooth update
    globalScheduler.schedule('ring-zoom', this.update.bind(this), 10);
  }
}
```

### Icon System Architecture
```typescript
interface IconSystem {
  packs: {
    nato: NATOIconSet;
    civilian: CivilianIconSet;
    nerdfont: NerdFontIconSet;
  };
  
  // WebGL instanced rendering for performance
  renderer: WebGLIconRenderer;
  
  // Spatial indexing for hit testing
  spatialIndex: QuadTree<MapIcon>;
}

// Icon rendering with atlases
class WebGLIconRenderer {
  private atlas: TextureAtlas;
  private instanceBuffer: Float32Array;
  private maxInstances = 1000;
  
  renderIcons(icons: MapIcon[], viewport: MapViewport): void {
    // Batch render all icons in one draw call
  }
}
```

### Crosshair Display Features
1. **Grid Reference**: Show current position in selected format
2. **Inverted Colors**: Ensure visibility on any background
3. **Dynamic Sizing**: Scale with zoom level
4. **Smooth Transitions**: No jarring movements

### Keybinding System
```typescript
const keybindings = {
  'Alt+R': 'toggleRing',
  'Alt+Scroll': 'adjustRingDistance',
  'Alt+C': 'cycleCrosshairStyle',
  'Alt+I': 'toggleIconPacks'
};
```

### Settings Integration
```typescript
interface CrosshairSettings {
  style: 'simple' | 'mil-dot' | 'aviation';
  color: 'auto' | 'white' | 'black' | 'red';
  ringUnits: 'meters' | 'feet' | 'nautical-miles';
  gridFormat: CoordinateFormat;
  iconPacks: {
    nato: boolean;
    civilian: boolean;
    nerdfont: boolean;
  };
}
```

### Performance Optimizations
1. **Canvas Layering**: Separate static and dynamic elements
2. **Dirty Rectangles**: Only redraw changed areas
3. **Icon Atlasing**: Single texture for all icons
4. **Path Caching**: Pre-calculate ring paths
5. **RAF Coordination**: Sync with global scheduler

### Visual Requirements
- Ring with distance labels at cardinal points
- Grid reference follows ring curve
- Smooth alpha blending for overlays
- Crisp rendering at all zoom levels
- No aliasing or shimmer effects

### Testing Requirements
```typescript
describe('MapCrosshair', () => {
  test('maintains 144fps with ring active');
  test('smooth ALT-scroll at all zoom levels');
  test('renders 100+ icons without frame drops');
  test('inverted colors visible on all backgrounds');
  test('accurate distance calculations');
});
```

### Deliverables
1. `MapCrosshair.svelte` - Main component
2. `RingRenderer.ts` - Distance ring rendering
3. `IconManager.ts` - Icon system management
4. `WebGLIconRenderer.ts` - GPU-accelerated icons
5. Performance benchmarks
6. Visual regression tests

Remember: Visual clarity at 144fps. Every pixel perfect, every frame on time.