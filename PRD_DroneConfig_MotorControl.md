# PRD: Drone Configuration Plugin - Motor Control Components

## Overview

This PRD defines the motor control UI components for the Drone Configuration Plugin in our aerospace-grade Svelte/Tauri application. Based on analysis of Betaflight's motor testing and ESC configuration interfaces, these components implement safety-first motor management with progressive disclosure and multi-level confirmation systems.

## Component Architecture

### 1. MotorTestPanel Component

**Purpose**: Safe motor testing with progressive safety unlocks and real-time monitoring

**Key Features**:
- Multi-stage safety confirmation system
- Individual motor control sliders with visual feedback
- Master slider for synchronized motor testing
- Real-time RPM and current monitoring
- Emergency stop functionality
- Visual motor layout display with status indicators

**Safety Systems**:
- Stage 1: Propeller removal confirmation checkbox
- Stage 2: Battery connection verification
- Stage 3: Motor testing unlock with timeout
- Stage 4: Progressive power limiting (max 25% initially)
- Stage 5: Full power unlock with additional confirmation

**Interface Design**:
```typescript
interface MotorTestPanelProps {
  frameType: 'quad' | 'hex' | 'octo' | 'custom';
  motorCount: number;
  escProtocol: ESCProtocol;
  onMotorTest: (motorId: number, throttle: number) => void;
  onEmergencyStop: () => void;
  telemetryData?: MotorTelemetry[];
  safetyLocked: boolean;
}

interface MotorTelemetry {
  motorId: number;
  rpm: number;
  current: number;
  temperature: number;
  voltage: number;
  errors: string[];
  timestamp: number;
}
```

**Safety Features**:
- Automatic timeout after 30 seconds of inactivity
- Progressive throttle limiting (25% → 50% → 75% → 100%)
- Visual safety indicators (red/yellow/green status)
- Mandatory 3-second countdown before motor activation
- Mobile-safe UI (no accidental touch activation)

### 2. ESCConfigurator Component

**Purpose**: Comprehensive ESC protocol selection and parameter configuration

**Key Features**:
- Protocol selection with automatic capability detection
- DShot configuration (150/300/600/1200)
- Bidirectional DShot setup for telemetry
- ESC calibration wizard integration
- Protocol compatibility warnings
- Telemetry configuration options

**Interface Design**:
```typescript
interface ESCConfiguratorProps {
  currentProtocol: ESCProtocol;
  availableProtocols: ESCProtocol[];
  onProtocolChange: (protocol: ESCProtocol) => void;
  onCalibrationStart: () => void;
  telemetryEnabled: boolean;
  escCapabilities: ESCCapabilities[];
}

interface ESCProtocol {
  name: string;
  type: 'PWM' | 'ONESHOT125' | 'ONESHOT42' | 'MULTISHOT' | 'DSHOT150' | 'DSHOT300' | 'DSHOT600' | 'DSHOT1200';
  requiresCalibration: boolean;
  supportsTelemetry: boolean;
  maxUpdateRate: number;
  description: string;
}

interface ESCCapabilities {
  escId: number;
  firmware: string;
  version: string;
  supportedProtocols: string[];
  telemetryCapable: boolean;
  bidirectionalDshot: boolean;
  temperature: number;
  health: 'good' | 'warning' | 'error';
}
```

### 3. MotorLayoutVisualizer Component

**Purpose**: Interactive visual motor layout with drag-and-drop configuration

**Key Features**:
- Dynamic frame type selection (quad/hex/octo/custom)
- Drag-and-drop motor positioning
- Real-time motor status overlay
- Rotation direction indicators
- Motor numbering system (Betaflight standard)
- Visual health indicators

**Interface Design**:
```typescript
interface MotorLayoutVisualizerProps {
  frameType: FrameType;
  motorPositions: MotorPosition[];
  onMotorPositionChange: (motorId: number, position: MotorPosition) => void;
  onFrameTypeChange: (frameType: FrameType) => void;
  telemetryData?: MotorTelemetry[];
  showRotationDirection: boolean;
}

interface MotorPosition {
  motorId: number;
  x: number; // -1 to 1 (normalized coordinates)
  y: number; // -1 to 1 (normalized coordinates)
  rotation: 'cw' | 'ccw';
  active: boolean;
  color: string;
}

interface FrameType {
  name: string;
  motorCount: number;
  defaultPositions: MotorPosition[];
  rotationPattern: ('cw' | 'ccw')[];
}
```

### 4. MotorCalibrationWizard Component

**Purpose**: Step-by-step ESC calibration with guided workflow

**Key Features**:
- Multi-step calibration process
- Visual progress indicator
- Automatic ESC detection
- Calibration verification
- Troubleshooting guidance
- Rollback capability

**Calibration Steps**:
1. Pre-calibration safety check
2. ESC protocol verification
3. Battery disconnection confirmation
4. Full throttle signal setup
5. Battery connection with audio cues
6. Throttle range completion
7. Calibration verification
8. Results summary

**Interface Design**:
```typescript
interface MotorCalibrationWizardProps {
  onCalibrationComplete: (results: CalibrationResults) => void;
  onCalibrationError: (error: CalibrationError) => void;
  escProtocol: ESCProtocol;
  motorCount: number;
}

interface CalibrationResults {
  success: boolean;
  calibratedMotors: number[];
  failedMotors: number[];
  minThrottle: number;
  maxThrottle: number;
  calibrationTime: number;
  warnings: string[];
}

interface CalibrationStep {
  id: string;
  title: string;
  description: string;
  instruction: string;
  safetyWarning?: string;
  duration?: number;
  canSkip: boolean;
  validation: () => Promise<boolean>;
}
```

### 5. SafetyInterlocks Component

**Purpose**: Multi-level confirmation system for motor operations

**Key Features**:
- Hierarchical safety levels
- Time-based confirmations
- Visual countdown timers
- Emergency stop always accessible
- Audio warnings for critical operations
- Gesture-based confirmations for mobile

**Safety Levels**:
- **Level 1**: Basic prop removal confirmation
- **Level 2**: Battery connection verification
- **Level 3**: Motor testing unlock with timer
- **Level 4**: Progressive power increase confirmation
- **Level 5**: Full power operation with continuous monitoring

**Interface Design**:
```typescript
interface SafetyInterlocksProps {
  currentLevel: SafetyLevel;
  onLevelChange: (level: SafetyLevel) => void;
  onEmergencyStop: () => void;
  timeoutDuration: number;
  requiresGesture: boolean;
}

interface SafetyLevel {
  level: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
  requirements: SafetyRequirement[];
  timeLimit: number;
  canAutoProgress: boolean;
  emergencyStopRequired: boolean;
}

interface SafetyRequirement {
  id: string;
  description: string;
  type: 'checkbox' | 'timer' | 'gesture' | 'confirmation';
  completed: boolean;
  mandatory: boolean;
}
```

### 6. MotorHealthMonitor Component

**Purpose**: Real-time ESC telemetry monitoring and diagnostics

**Key Features**:
- Real-time telemetry streaming
- Health status indicators
- Temperature monitoring with alerts
- Current consumption tracking
- Error detection and reporting
- Historical data visualization
- Predictive maintenance alerts

**Interface Design**:
```typescript
interface MotorHealthMonitorProps {
  telemetryData: MotorTelemetry[];
  onAlert: (alert: HealthAlert) => void;
  refreshRate: number;
  historicalData?: HistoricalTelemetry[];
}

interface HealthAlert {
  motorId: number;
  severity: 'info' | 'warning' | 'critical';
  type: 'temperature' | 'current' | 'voltage' | 'rpm' | 'error';
  message: string;
  timestamp: number;
  autoResolve: boolean;
}

interface HistoricalTelemetry {
  motorId: number;
  timestamp: number;
  rpm: number;
  current: number;
  temperature: number;
  voltage: number;
}
```

### 7. DirectionTester Component

**Purpose**: Motor rotation verification and automatic correction

**Key Features**:
- Individual motor spin testing
- Visual rotation direction indicators
- Automatic direction detection
- One-click direction correction
- Frame-aware rotation patterns
- Sound analysis for direction verification

**Interface Design**:
```typescript
interface DirectionTesterProps {
  frameType: FrameType;
  motorPositions: MotorPosition[];
  onDirectionCorrection: (motorId: number, newDirection: 'cw' | 'ccw') => void;
  testDuration: number;
  audioAnalysisEnabled: boolean;
}

interface DirectionTestResult {
  motorId: number;
  detectedDirection: 'cw' | 'ccw';
  expectedDirection: 'cw' | 'ccw';
  confidence: number;
  needsCorrection: boolean;
  audioSignature?: AudioAnalysis;
}

interface AudioAnalysis {
  frequency: number;
  amplitude: number;
  rotationDirection: 'cw' | 'ccw';
  confidence: number;
}
```

### 8. OutputGraphs Component

**Purpose**: Real-time motor output visualization and analysis

**Key Features**:
- Real-time motor output graphs
- Multi-motor overlay view
- Zoom and pan capabilities
- Export functionality
- Threshold line indicators
- Performance analysis tools

**Interface Design**:
```typescript
interface OutputGraphsProps {
  telemetryData: MotorTelemetry[];
  graphType: 'rpm' | 'current' | 'temperature' | 'voltage' | 'all';
  onGraphTypeChange: (type: GraphType) => void;
  timeWindow: number;
  showThresholds: boolean;
}

interface GraphConfiguration {
  type: GraphType;
  yAxis: {
    min: number;
    max: number;
    unit: string;
    label: string;
  };
  colors: string[];
  thresholds: Threshold[];
}

interface Threshold {
  value: number;
  label: string;
  color: string;
  alertLevel: 'info' | 'warning' | 'critical';
}
```

## Integration Requirements

### Plugin System Integration
- Implements standard Plugin interface from `src/lib/types/plugin.ts`
- Category: `PLUGIN_CATEGORIES.MONITORING`
- Requires permissions for hardware access

### State Management
- Uses Svelte stores for component state
- Integrates with existing plugin store system
- Persistent configuration storage

### Tauri Integration
- Native hardware access for motor control
- System notifications for critical alerts
- File system access for configuration export/import

### Testing Requirements
- Comprehensive unit tests for all components
- Integration tests for safety systems
- E2E tests for complete calibration workflows
- Performance tests for real-time telemetry

## Safety and Compliance

### Aerospace-Grade Standards
- NASA JPL Power of 10 compliance
- Fail-safe operation in all conditions
- Comprehensive error handling
- Audit trail for all motor operations

### Mobile Safety
- Touch-safe interfaces with confirmation delays
- Gesture-based confirmations for critical operations
- Screen lock detection and auto-disable
- Orientation-aware safety features

### Emergency Procedures
- Always-accessible emergency stop
- Automatic shutdown on connection loss
- Battery monitoring with low-voltage protection
- Thermal protection with automatic shutdown

## Performance Requirements

### Real-time Telemetry
- Sub-10ms telemetry update rates
- GPU-accelerated graph rendering
- Efficient memory management for historical data
- WebGPU optimization for high-frequency updates

### Responsive Design
- Mobile-first responsive layout
- Touch-optimized controls with safety margins
- Keyboard navigation support
- Screen reader compatibility

## File Structure

```
src/lib/plugins/drone-config/
├── components/
│   ├── MotorTestPanel.svelte
│   ├── ESCConfigurator.svelte
│   ├── MotorLayoutVisualizer.svelte
│   ├── MotorCalibrationWizard.svelte
│   ├── SafetyInterlocks.svelte
│   ├── MotorHealthMonitor.svelte
│   ├── DirectionTester.svelte
│   └── OutputGraphs.svelte
├── stores/
│   ├── motor-control.ts
│   ├── safety-system.ts
│   └── telemetry-stream.ts
├── types/
│   └── motor-control.ts
├── utils/
│   ├── safety-utils.ts
│   ├── calibration-utils.ts
│   └── telemetry-utils.ts
└── __tests__/
    ├── MotorTestPanel.test.ts
    ├── ESCConfigurator.test.ts
    ├── SafetyInterlocks.test.ts
    └── integration/
        └── motor-control-flow.test.ts
```

This PRD provides the foundation for implementing a comprehensive, safety-first motor control system that matches and exceeds the capabilities found in Betaflight while maintaining aerospace-grade reliability and user experience standards.