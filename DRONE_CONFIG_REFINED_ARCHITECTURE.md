# Drone Configuration Plugin - Refined Architecture

## Integration-First Approach

Based on comprehensive infrastructure analysis, the drone-config plugin will **integrate** with existing systems rather than duplicate functionality. This approach leverages our mature aerospace-grade frontend infrastructure.

## Plugin Registration (Existing System)

```typescript
// Add to src/lib/components/plugins/PluginContainer.svelte
const PLUGIN_COMPONENTS: Record<string, ComponentType> = {
  'mission-planner': MissionPlanner,
  'sdr-suite': SdrDashboard,
  'drone-config': DroneConfigDashboard // NEW - Main plugin component
};
```

## Core Plugin Structure (6 Components Only)

```
src/lib/plugins/drone-config/
├── DroneConfigDashboard.svelte     # Main plugin interface
├── components/
│   ├── ParameterPanel.svelte       # Parameter tree with search/filter
│   ├── PIDTuningPanel.svelte       # PID coefficient tuning
│   ├── MotorTestPanel.svelte       # Motor testing with safety controls
│   ├── CalibrationWizard.svelte    # Sensor calibration workflows
│   └── FlightModePanel.svelte      # Flight mode configuration
├── stores/
│   ├── drone-connection.ts         # MAVLink connection management
│   ├── drone-parameters.ts         # Parameter management with bounded arrays
│   └── drone-telemetry.ts          # Real-time telemetry streaming
├── services/
│   ├── mavlink-service.ts          # MAVLink protocol implementation
│   └── parameter-service.ts        # Parameter validation and management
├── types/
│   └── drone-types.ts              # Drone-specific TypeScript definitions
└── __tests__/                      # Component and integration tests
```

## Integration Points with Existing Infrastructure

### 1. Map Integration (Use Existing MapToolsController)

```typescript
// Add drone tab to src/lib/plugins/mission-planner/MapToolsController.svelte
<div class="tabs">
  <button class:active={activeTab === 'mission'}>Mission</button>
  <button class:active={activeTab === 'location'}>Location</button>
  <button class:active={activeTab === 'measuring'}>Tools</button>
  <button class:active={activeTab === 'adsb'}>ADSB</button>
  <button class:active={activeTab === 'weather'}>Weather</button>
  <button class:active={activeTab === 'drone'}>Drone Config</button> <!-- NEW -->
</div>

{#if activeTab === 'drone'}
  <DraggableContainer>
    <ParameterPanel />
  </DraggableContainer>
{/if}
```

### 2. State Management (Follow Existing Patterns)

```typescript
// src/lib/plugins/drone-config/stores/drone-parameters.ts
import { writable, derived } from 'svelte/store';
import { BoundedArray } from '$lib/utils/bounded-array'; // REUSE EXISTING

/**
 * NASA JPL Rule 2: Bounded memory allocation for drone parameters
 */
const MAX_PARAMETERS = 500; // Typical drone parameter count
const parametersPool = new BoundedArray<DroneParameter>(MAX_PARAMETERS);

const droneParameterState = writable({
  parameters: parametersPool.toArray(),
  loading: false,
  error: null,
  lastUpdated: 0
});

// Follow existing store patterns from mission.ts and plugins.ts
```

### 3. Communication Layer (Use Existing Tauri Patterns)

```typescript
// src/lib/plugins/drone-config/services/mavlink-service.ts
import { safeInvoke } from '$lib/utils/tauri'; // REUSE EXISTING

export class MAVLinkService {
  async getParameters(): Promise<DroneParameter[]> {
    return await safeInvoke('get_drone_parameters') || [];
  }
  
  async setParameter(paramId: string, value: number): Promise<boolean> {
    return await safeInvoke('set_drone_parameter', { paramId, value }) || false;
  }
}
```

### 4. UI Components (Use Existing DraggableContainer)

```typescript
// src/lib/plugins/drone-config/components/ParameterPanel.svelte
<script>
  import DraggableContainer from '$lib/components/ui/DraggableContainer.svelte'; // REUSE
  import { droneParameterStore } from '../stores/drone-parameters';
</script>

<DraggableContainer
  title="Drone Parameters"
  initialPosition={{ x: 20, y: 20 }}
  size={{ width: 400, height: 600 }}
>
  <!-- Parameter tree interface -->
</DraggableContainer>
```

## Required Tauri Backend Commands

```rust
// Add to src-tauri/src/main.rs
#[tauri::command]
async fn connect_drone(connection_string: String) -> Result<(), String> {
    // MAVLink connection implementation
}

#[tauri::command]
async fn get_drone_parameters() -> Result<Vec<Parameter>, String> {
    // Parameter list retrieval
}

#[tauri::command]
async fn set_drone_parameter(param_id: String, value: f32) -> Result<(), String> {
    // Parameter setting with validation
}

#[tauri::command]
async fn start_motor_test(motor_id: u8, throttle: u16) -> Result<(), String> {
    // Motor testing with safety checks
}

#[tauri::command]
async fn calibrate_sensor(sensor_type: String) -> Result<CalibrationResult, String> {
    // Sensor calibration procedures
}
```

## Component Details

### 1. DroneConfigDashboard.svelte (Main Plugin)
- Plugin registration and initialization
- Connection status display using existing notification system
- Tab interface for different configuration areas
- Integration with existing theme system

### 2. ParameterPanel.svelte
- Hierarchical parameter tree with search/filter
- Real-time parameter updates via WebSocket (existing pattern)
- Parameter validation using existing form patterns
- Backup/restore using existing file handling patterns

### 3. PIDTuningPanel.svelte
- PID coefficient sliders with live preview
- Rate profile management
- Response curve visualization
- Integration with existing chart libraries from mission-planner

### 4. MotorTestPanel.svelte
- Progressive safety unlock system
- Motor layout visualization
- Real-time telemetry display
- Emergency stop integration

### 5. CalibrationWizard.svelte
- Step-by-step calibration workflows
- 3D orientation visualization (could integrate with existing map 3D features)
- Progress tracking using existing notification system
- Results validation and storage

### 6. FlightModePanel.svelte
- Flight mode selection and configuration
- Switch assignment interface
- Failsafe configuration
- Mode-specific parameter tuning

## Integration with Mission Planner

The drone-config plugin will extend the existing mission planner by:

1. **Adding Drone Tab** to MapToolsController
2. **Telemetry Overlay** using existing telemetry visualization
3. **Real-time Position** display on existing map
4. **Parameter Monitoring** during mission execution
5. **Flight Mode Indicators** on existing mission interface

## Testing Strategy (Use Existing Infrastructure)

```typescript
// src/lib/plugins/drone-config/__tests__/ParameterPanel.test.ts
import { render } from '@testing-library/svelte'; // EXISTING PATTERN
import { vi } from 'vitest'; // EXISTING PATTERN
import ParameterPanel from '../components/ParameterPanel.svelte';
import { mockDroneParameters } from '../test-utils/mock-data'; // NEW

describe('ParameterPanel', () => {
  it('should display parameters in hierarchical tree', () => {
    // Test implementation following existing patterns
  });
});
```

## Development Phases

### Phase 1: Core Infrastructure (Week 1)
- Plugin registration in existing system
- Basic MAVLink service with Tauri commands
- DroneConfigDashboard component
- Integration with existing map tools

### Phase 2: Parameter Management (Week 2)
- ParameterPanel with tree interface
- Parameter validation and constraints
- Real-time parameter streaming
- Backup/restore using existing file patterns

### Phase 3: Configuration Interfaces (Week 3)
- PIDTuningPanel with sliders and visualization
- MotorTestPanel with safety controls
- FlightModePanel with mode management
- Integration testing with real hardware

### Phase 4: Advanced Features (Week 4)
- CalibrationWizard with step-by-step workflows
- Telemetry overlays on existing map
- Performance optimization and testing
- Documentation and tutorials

## Benefits of This Approach

1. **Zero Duplication** - Leverages all existing infrastructure
2. **Consistent UX** - Uses established UI patterns and theme system
3. **Faster Development** - Building on proven components
4. **Better Integration** - Seamless workflow with mission planning
5. **Maintainability** - Single source of truth for common functionality
6. **Aerospace Quality** - Inherits existing NASA JPL compliance

This refined architecture transforms the drone-config plugin from a standalone system into a focused extension of our existing aerospace-grade infrastructure.