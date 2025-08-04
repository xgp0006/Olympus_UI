# Agent Brief: Measuring Tools Developer

## Mission

Create a comprehensive measuring toolkit with shapes, spline curves, and waypoint conversion capabilities at 144fps.

## Performance Target

- **Frame Budget**: 1.0ms per frame
- **Shape Updates**: Real-time dragging at 144fps
- **Spline Calculation**: <5ms for complex paths

## Technical Requirements

### Core Component Structure

```svelte
<!-- src/lib/map-features/measuring/MeasuringTools.svelte -->
<script lang="ts">
  import type { Measurement, MeasurementType, Waypoint } from '$lib/map-features/types';
  import { ShapeRenderer } from './renderers/ShapeRenderer';
  import { SplineEditor } from './SplineEditor';
  import { waypointStore } from '$lib/stores/waypoints';

  export let activeTool: MeasurementType | null = null;
  export let onMeasurementComplete: (measurement: Measurement) => void;
</script>
```

### Shape System Architecture

```typescript
abstract class Shape {
  abstract type: MeasurementType;
  protected nodes: MeasurementNode[] = [];
  protected style: ShapeStyle;

  abstract calculateMetrics(): ShapeMetrics;
  abstract render(ctx: CanvasRenderingContext2D): void;
  abstract hitTest(point: DOMPoint): HitTestResult;

  // Convert to waypoints with intelligent spacing
  abstract toWaypoints(options: WaypointConversionOptions): Waypoint[];
}

class LineShape extends Shape {
  calculateMetrics(): { distance: number } {
    // Haversine distance calculation
  }

  toWaypoints(options): Waypoint[] {
    // Sample along line at specified intervals
  }
}
```

### Spline Curve Implementation

```typescript
class SplinePathEditor {
  private controlPoints: ControlPoint[] = [];
  private splineCache: DOMPoint[] = [];
  private subdivisions = 100;

  // Catmull-Rom spline for smooth flight paths
  calculateSpline(): DOMPoint[] {
    if (this.controlPoints.length < 4) return [];

    // Cached calculation with bounded iterations
    const points: DOMPoint[] = new Array(this.subdivisions);

    for (let i = 0; i < this.subdivisions; i++) {
      const t = i / (this.subdivisions - 1);
      points[i] = this.catmullRom(t);
    }

    return points;
  }

  // Convert spline to flight path with altitude
  toFlightPath(options: FlightPathOptions): Waypoint[] {
    const spline = this.calculateSpline();
    const waypoints: Waypoint[] = [];

    // Intelligent waypoint placement
    // - Denser at curves
    // - Altitude interpolation
    // - Speed constraints

    return waypoints;
  }
}
```

### Interactive Editing

```typescript
class NodeEditor {
  private draggedNode: MeasurementNode | null = null;
  private ghostNode: MeasurementNode | null = null;

  handleMouseDown(event: MouseEvent): void {
    const hit = this.hitTestNodes(event);
    if (hit.node) {
      this.startDrag(hit.node);
    }
  }

  handleMouseMove(event: MouseEvent): void {
    if (this.draggedNode) {
      // Update with 144fps smoothness
      requestAnimationFrame(() => {
        this.updateNodePosition(this.draggedNode, event);
        this.renderer.markDirty(this.getDirtyRect());
      });
    }
  }
}
```

### Measurement Features

1. **Line Tool**: Distance measurement with bearing
2. **Box Tool**: Area and perimeter calculation
3. **Circle Tool**: Radius and area with center point
4. **Triangle Tool**: Area with angle measurements
5. **Polygon Tool**: Complex area calculation
6. **Spline Tool**: Smooth curve creation

### Visual Styling System

```typescript
interface SegmentStyle {
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
  fillOpacity?: number;
  dashArray?: number[];

  // Per-segment coloring
  segmentColors?: string[];

  // Animation properties
  animated?: boolean;
  animationSpeed?: number;
}
```

### Waypoint Conversion

```typescript
interface WaypointConversionOptions {
  spacing: number; // meters between waypoints
  altitude: number | ((progress: number) => number);
  speed: number | ((progress: number) => number);
  waypointType: WaypointType;

  // Smart placement
  densityAtCurves: boolean;
  maxAngleChange: number; // degrees
}
```

### Integration with Waypoint Manager

```typescript
// Bidirectional sync with waypoint accordion
class MeasurementWaypointSync {
  syncToWaypoints(measurement: Measurement): void {
    const waypoints = measurement.toWaypoints(this.options);
    waypointStore.addBatch(waypoints);
  }

  syncFromWaypoints(waypoints: Waypoint[]): void {
    // Create measurement from waypoint changes
  }
}
```

### Performance Optimizations

1. **Spatial Indexing**: R-tree for fast hit testing
2. **Level of Detail**: Simplify shapes when zoomed out
3. **Canvas Layers**: Separate active/inactive shapes
4. **Geometry Caching**: Pre-calculate expensive operations
5. **Web Workers**: Offload complex calculations

### Testing Requirements

```typescript
describe('MeasuringTools', () => {
  test('all shapes render at 144fps');
  test('spline calculation under 5ms');
  test('accurate distance/area calculations');
  test('smooth node dragging without lag');
  test('waypoint conversion maintains path accuracy');
});
```

### Deliverables

1. `MeasuringTools.svelte` - Main component
2. `ShapeRenderer.ts` - Shape rendering system
3. `SplineEditor.ts` - Curve editing tools
4. `NodeEditor.ts` - Interactive editing
5. `MeasurementCalculator.ts` - Geometry calculations
6. Comprehensive test suite

Remember: Precision and performance. Every measurement accurate, every interaction smooth.
