# Agent Brief: Location Entry Specialist

## Mission
Implement a high-performance multi-format coordinate entry system supporting MGRS, UTM, Lat/Long, and What3Words formats.

## Performance Target
- **Frame Budget**: 0.5ms per frame
- **Conversion Time**: <10ms for any format
- **Input Validation**: <1ms

## Technical Requirements

### Core Component Structure
```svelte
<!-- src/lib/map-features/location-entry/LocationEntry.svelte -->
<script lang="ts">
  import type { Coordinate, CoordinateFormat } from '$lib/map-features/types';
  import { createEventDispatcher } from 'svelte';
  import { coordinateConverter } from './utils/converter';
  import { validateInput } from './utils/validator';
  
  export let formats: CoordinateFormat[] = ['latlong', 'utm', 'mgrs', 'what3words'];
  export let defaultFormat: CoordinateFormat = 'latlong';
  
  const dispatch = createEventDispatcher<{
    select: { coordinate: Coordinate };
    error: { message: string };
  }>();
</script>
```

### Key Features
1. **Format Auto-detection**: Intelligently detect input format
2. **Real-time Validation**: Validate as user types
3. **Format Conversion**: Convert between all formats seamlessly
4. **Copy/Paste Support**: Handle various clipboard formats
5. **Keyboard Navigation**: Full keyboard accessibility

### Coordinate Conversion Pipeline
```typescript
// Use Web Worker for heavy calculations
const conversionWorker = new Worker('./conversion-worker.js');

// Cache recent conversions
const conversionCache = new Map<string, Coordinate>();
```

### What3Words Integration
```typescript
// API integration with rate limiting
class What3WordsClient {
  private readonly apiKey: string;
  private readonly rateLimit = 60; // requests per minute
  private requestQueue: Promise<any>[] = [];
  
  async convertToCoords(words: string): Promise<LatLng> {
    // Implement with caching and error handling
  }
}
```

### Validation Rules
- **Lat/Long**: -90 to 90, -180 to 180, up to 8 decimal places
- **UTM**: Valid zone (1-60), appropriate easting/northing ranges
- **MGRS**: Valid grid reference format, precision 1-5
- **What3Words**: Three words separated by dots, valid word list

### UI Requirements
- Clean, minimal interface
- Clear format indicators
- Error states with helpful messages
- Loading states for API calls
- Smooth transitions (60fps minimum)

### Testing Requirements
```typescript
// Required test coverage
describe('LocationEntry', () => {
  test('converts between all format pairs');
  test('validates input in real-time');
  test('handles edge cases (poles, date line)');
  test('maintains performance under rapid input');
  test('gracefully handles API failures');
});
```

### Integration Points
- Emit `coordinate:select` event on valid input
- Subscribe to `viewport:change` for context
- Integrate with settings for unit preferences
- Connect to map click for reverse geocoding

### Performance Optimizations
1. Debounce validation (16ms)
2. Use requestIdleCallback for conversions
3. Precompile regex patterns
4. Minimize DOM updates
5. Use CSS transforms for animations

### Deliverables
1. `LocationEntry.svelte` - Main component
2. `converter.ts` - Conversion utilities
3. `validator.ts` - Input validation
4. `conversion-worker.js` - Web Worker
5. Comprehensive test suite
6. Performance benchmarks

Remember: Every millisecond counts at 144fps. Optimize aggressively while maintaining accuracy.