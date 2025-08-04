# Agent Brief: ADS-B Display Specialist

## Mission

Implement real-time ADS-B aircraft tracking with flight path estimation, tooltips, and viewport-based rendering at 144fps.

## Performance Target

- **Frame Budget**: 2.0ms per frame
- **Aircraft Capacity**: 500+ simultaneous targets
- **Update Rate**: 60Hz from backend, 144fps display

## Technical Requirements

### Core Component Structure

```svelte
<!-- src/lib/map-features/adsb/ADSBDisplay.svelte -->
<script lang="ts">
  import type { ADSBTarget, MapViewport } from '$lib/map-features/types';
  import { ADSBRenderer } from './renderers/ADSBRenderer';
  import { FlightPathEstimator } from './FlightPathEstimator';
  import { ADSBDataManager } from './ADSBDataManager';
  import { invoke } from '@tauri-apps/api';

  export let viewport: MapViewport;
  export let filter: ADSBFilter;

  const renderer = new ADSBRenderer();
  const dataManager = new ADSBDataManager();
</script>
```

### High-Performance Rendering

```typescript
import * as THREE from 'three';

class ADSBRenderer {
  private scene: THREE.Scene;
  private instancedMesh: THREE.InstancedMesh;
  private readonly maxInstances = 1000;

  // Pre-allocated buffers
  private positionBuffer = new Float32Array(this.maxInstances * 3);
  private rotationBuffer = new Float32Array(this.maxInstances * 4);
  private colorBuffer = new Float32Array(this.maxInstances * 3);

  constructor() {
    // Aircraft icon geometry (optimized low-poly)
    const geometry = this.createAircraftGeometry();

    // Instanced rendering for all aircraft
    const material = new THREE.ShaderMaterial({
      vertexShader: this.getVertexShader(),
      fragmentShader: this.getFragmentShader(),
      uniforms: {
        viewportScale: { value: 1.0 },
        time: { value: 0 }
      }
    });

    this.instancedMesh = new THREE.InstancedMesh(geometry, material, this.maxInstances);
  }

  updateTargets(targets: ADSBTarget[], viewport: MapViewport): void {
    // Viewport culling first
    const visibleTargets = this.cullTargets(targets, viewport);

    // Update instance matrices
    for (let i = 0; i < visibleTargets.length; i++) {
      this.updateInstance(i, visibleTargets[i], viewport);
    }

    this.instancedMesh.count = visibleTargets.length;
  }
}
```

### Tauri Backend Integration

```typescript
class ADSBDataManager {
  private targets = new Map<string, ADSBTarget>();
  private updateStream: WebSocket;

  async initialize(): Promise<void> {
    // Get initial data from Rust backend
    const initialTargets = await invoke<ADSBTarget[]>('get_adsb_targets', {
      bounds: this.viewport.bounds
    });

    this.updateTargets(initialTargets);

    // Stream updates via WebSocket
    this.updateStream = await this.connectToStream();
  }

  private async connectToStream(): Promise<WebSocket> {
    const ws = new WebSocket('ws://localhost:8766/adsb');

    ws.onmessage = (event) => {
      const update: ADSBUpdate = JSON.parse(event.data);
      this.handleUpdate(update);
    };

    return ws;
  }

  private handleUpdate(update: ADSBUpdate): void {
    // Efficient delta updates
    switch (update.type) {
      case 'position':
        this.updatePosition(update.icao, update.data);
        break;
      case 'new':
        this.addTarget(update.data);
        break;
      case 'remove':
        this.removeTarget(update.icao);
        break;
    }
  }
}
```

### Flight Path Estimation

```typescript
class FlightPathEstimator {
  // Kalman filter for smooth trajectory prediction
  private kalmanFilters = new Map<string, KalmanFilter>();

  estimatePath(target: ADSBTarget): LatLng[] {
    let filter = this.kalmanFilters.get(target.icao);

    if (!filter) {
      filter = new KalmanFilter({
        observation: 2, // lat, lng
        state: 4 // lat, lng, velocity_lat, velocity_lng
      });
      this.kalmanFilters.set(target.icao, filter);
    }

    // Update filter with current position
    const observation = [target.position.lat, target.position.lng];
    filter.update(observation);

    // Predict future positions
    const path: LatLng[] = [];
    const predictions = 60; // 1 minute ahead

    for (let i = 0; i < predictions; i++) {
      const prediction = filter.predict();
      path.push({
        lat: prediction[0],
        lng: prediction[1]
      });
    }

    return path;
  }

  // Great circle path to destination
  calculateGreatCirclePath(origin: LatLng, destination: LatLng, steps = 100): LatLng[] {
    // Efficient great circle interpolation
  }
}
```

### Tooltip System

```typescript
class ADSBTooltip {
  private activeTarget: ADSBTarget | null = null;
  private tooltipElement: HTMLElement;
  private expanded = false;

  show(target: ADSBTarget, screenPos: DOMPoint): void {
    this.activeTarget = target;

    // Position tooltip near aircraft
    this.updatePosition(screenPos);

    // Render condensed info
    this.renderContent(target, this.expanded);
  }

  private renderContent(target: ADSBTarget, expanded: boolean): void {
    if (!expanded) {
      // Basic: callsign, altitude, speed
      this.tooltipElement.innerHTML = `
        <div class="adsb-tooltip">
          <strong>${target.callsign || target.icao}</strong>
          <div>FL${Math.round(target.altitude / 100)}</div>
          <div>${target.speed}kts</div>
        </div>
      `;
    } else {
      // Expanded: full details
      this.tooltipElement.innerHTML = `
        <div class="adsb-tooltip expanded">
          <strong>${target.callsign || target.icao}</strong>
          <div>Registration: ${target.registration || 'Unknown'}</div>
          <div>Type: ${target.aircraft?.type || 'Unknown'}</div>
          <div>Altitude: ${target.altitude}ft</div>
          <div>Speed: ${target.speed}kts</div>
          <div>Heading: ${target.heading}°</div>
          <div>V/S: ${target.verticalRate}fpm</div>
          ${
            target.flight
              ? `
            <div>Route: ${target.flight.origin} → ${target.flight.destination}</div>
          `
              : ''
          }
        </div>
      `;
    }
  }
}
```

### Viewport-Based Optimization

```typescript
class ViewportCuller {
  private spatialIndex: RBush<ADSBTarget>;

  cullTargets(targets: ADSBTarget[], viewport: MapViewport, maxTargets: number): ADSBTarget[] {
    // Get targets in viewport bounds
    const bounds = this.expandBounds(viewport.bounds, 1.2); // 20% margin
    const inBounds = this.spatialIndex.search(bounds);

    // If too many, prioritize by:
    // 1. Proximity to center
    // 2. Altitude (lower = higher priority)
    // 3. Special squawk codes

    if (inBounds.length > maxTargets) {
      return this.prioritizeTargets(inBounds, viewport, maxTargets);
    }

    return inBounds;
  }
}
```

### ADS-B Tab View

```svelte
<!-- Tabular view of all aircraft -->
<div class="adsb-tab">
  <VirtualList items={sortedTargets} itemHeight={40} let:item>
    <div class="adsb-row">
      <span>{item.callsign}</span>
      <span>{item.altitude}</span>
      <span>{item.speed}</span>
      <span>{item.heading}</span>
      <button on:click={() => focusOnAircraft(item)}> Focus </button>
    </div>
  </VirtualList>
</div>
```

### Performance Optimizations

1. **WebGL Instancing**: Single draw call for all aircraft
2. **LOD System**: Reduce detail when zoomed out
3. **Spatial Indexing**: R-tree for fast queries
4. **Delta Updates**: Only send changes from backend
5. **Worker Threads**: Path calculations off main thread

### Testing Requirements

```typescript
describe('ADSBDisplay', () => {
  test('renders 500+ aircraft at 144fps');
  test('viewport culling reduces render count');
  test('flight path estimation accuracy');
  test('tooltip interactions remain responsive');
  test('handles rapid position updates');
});
```

### Deliverables

1. `ADSBDisplay.svelte` - Main component
2. `ADSBRenderer.ts` - WebGL rendering system
3. `ADSBDataManager.ts` - Backend integration
4. `FlightPathEstimator.ts` - Trajectory prediction
5. `ADSBTooltip.svelte` - Interactive tooltips
6. `ADSBTab.svelte` - Tabular view

Remember: Real-time accuracy at scale. Every aircraft tracked, every frame rendered.
