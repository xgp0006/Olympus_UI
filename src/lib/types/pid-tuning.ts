/**
 * PID Tuning Type Definitions for Drone Configuration Plugin
 * Comprehensive type system for flight controller PID configuration
 * Requirements: Aerospace-grade type safety and validation
 */

// ============================================================================
// Core PID Configuration Types
// ============================================================================

/**
 * PID coefficient types for flight control
 */
export type PIDType = 'P' | 'I' | 'D';

/**
 * Flight control axes
 */
export type FlightAxis = 'pitch' | 'roll' | 'yaw';

/**
 * Individual PID coefficient configuration
 */
export interface PIDCoefficient {
  readonly P: number;
  readonly I: number;
  readonly D: number;
}

/**
 * Complete PID configuration for all axes
 */
export interface PIDConfiguration {
  readonly pitch: PIDCoefficient;
  readonly roll: PIDCoefficient;
  readonly yaw: PIDCoefficient;
  readonly timestamp: number;
  readonly version: string;
}

/**
 * PID parameter validation constraints
 */
export interface PIDConstraints {
  readonly P: { min: number; max: number; precision: number };
  readonly I: { min: number; max: number; precision: number };
  readonly D: { min: number; max: number; precision: number };
}

// ============================================================================
// Flight Profile Types
// ============================================================================

/**
 * Flight style categories for preset filtering
 */
export type FlightStyle = 'freestyle' | 'racing' | 'cinematic' | 'long-range' | 'custom';

/**
 * Pilot skill levels for preset recommendations
 */
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Drone configuration specifications
 */
export interface DroneSpecifications {
  readonly frameSize: number; // in mm
  readonly weight: number; // in grams
  readonly motorKv: number;
  readonly propSize: string; // e.g., "5x4.3"
  readonly batteryVoltage: number;
  readonly flightController: string;
  readonly gyroType: string;
}

/**
 * Rate configuration for stick response
 */
export interface RateConfiguration {
  readonly rcRate: number;
  readonly expo: number;
  readonly superRate: number;
  readonly curveType: 'linear' | 'expo' | 'natural' | 'custom';
}

/**
 * Complete flight profile containing all configuration
 */
export interface FlightProfile {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly pidConfig: PIDConfiguration;
  readonly rateConfig: RateConfiguration;
  readonly filterConfig: FilterConfiguration;
  readonly flightModes: string[];
  readonly droneSpecs?: DroneSpecifications;
  readonly flightStyle: FlightStyle;
  readonly skillLevel: SkillLevel;
  readonly author?: string;
  readonly rating?: number;
  readonly downloads?: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly isReadonly: boolean;
}

// ============================================================================
// Filter Configuration Types
// ============================================================================

/**
 * Filter types available in flight controllers
 */
export type FilterType = 'lowpass' | 'notch' | 'highpass' | 'bandpass' | 'kalman';

/**
 * Individual filter configuration
 */
export interface FilterConfig {
  readonly type: FilterType;
  readonly frequency: number;
  readonly q?: number; // Quality factor for notch filters
  readonly enabled: boolean;
}

/**
 * Notch filter specific configuration
 */
export interface NotchFilterConfig extends FilterConfig {
  readonly type: 'notch';
  readonly q: number;
  readonly bandwidth?: number;
}

/**
 * Dynamic notch filter configuration
 */
export interface DynamicNotchConfig {
  readonly enabled: boolean;
  readonly count: number;
  readonly minFreq: number;
  readonly maxFreq: number;
  readonly q: number;
}

/**
 * Complete filter configuration system
 */
export interface FilterConfiguration {
  readonly gyroLowpass: FilterConfig;
  readonly gyroLowpass2: FilterConfig;
  readonly dtermLowpass: FilterConfig;
  readonly dtermLowpass2: FilterConfig;
  readonly notchFilters: NotchFilterConfig[];
  readonly dynamicNotch: DynamicNotchConfig;
}

// ============================================================================
// Flight Mode Types
// ============================================================================

/**
 * Available flight modes
 */
export type FlightModeType =
  | 'angle'
  | 'horizon'
  | 'acro'
  | 'air'
  | 'arm'
  | 'beeper'
  | 'blackbox'
  | 'failsafe'
  | 'flipoveraftercrash'
  | 'gps'
  | 'headfree'
  | 'mag'
  | 'osd'
  | 'paralyze'
  | 'servo'
  | 'telemetry'
  | 'user1'
  | 'user2';

/**
 * Flight mode configuration
 */
export interface FlightMode {
  readonly id: FlightModeType;
  readonly name: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly switchAssignment?: string;
  readonly dependencies?: FlightModeType[];
  readonly conflicts?: FlightModeType[];
  readonly settings?: Record<string, unknown>;
}

/**
 * Switch assignment for flight modes
 */
export interface SwitchAssignment {
  readonly switchId: string;
  readonly modeId: FlightModeType;
  readonly position: number; // 0, 1, or 2 for 3-position switches
  readonly range: { min: number; max: number };
}

/**
 * Physical switch configuration
 */
export interface Switch {
  readonly id: string;
  readonly name: string;
  readonly positions: number; // 2 or 3
  readonly currentValue: number; // Raw PWM value
}

// ============================================================================
// Telemetry and Real-time Data Types
// ============================================================================

/**
 * Real-time PID output data
 */
export interface PIDOutputData {
  readonly timestamp: number;
  readonly axis: FlightAxis;
  readonly setpoint: number;
  readonly measurement: number;
  readonly error: number;
  readonly pTerm: number;
  readonly iTerm: number;
  readonly dTerm: number;
  readonly output: number;
}

/**
 * Sensor data from flight controller
 */
export interface SensorData {
  readonly timestamp: number;
  readonly gyro: { x: number; y: number; z: number };
  readonly accel: { x: number; y: number; z: number };
  readonly mag?: { x: number; y: number; z: number };
  readonly baro?: { pressure: number; altitude: number };
  readonly gps?: { lat: number; lon: number; alt: number; satellites: number };
}

/**
 * Motor output data
 */
export interface MotorData {
  readonly timestamp: number;
  readonly motors: number[]; // Array of motor values (1000-2000 PWM)
  readonly battery: {
    voltage: number;
    current: number;
    consumption: number;
  };
}

/**
 * Combined telemetry data packet
 */
export interface TelemetryData {
  readonly timestamp: number;
  readonly pidOutput?: PIDOutputData;
  readonly sensors: SensorData;
  readonly motors: MotorData;
  readonly flightMode: string;
  readonly armed: boolean;
}

/**
 * PID performance analysis metrics
 */
export interface PIDPerformanceMetrics {
  readonly oscillationDetected: boolean;
  readonly settlingTime: number; // in milliseconds
  readonly overshoot: number; // percentage
  readonly riseTime: number; // in milliseconds
  readonly steadyStateError: number;
  readonly stability: 'stable' | 'marginal' | 'unstable';
}

/**
 * Oscillation detection data
 */
export interface OscillationData {
  readonly detected: boolean;
  readonly frequency: number; // Hz
  readonly amplitude: number;
  readonly axis: FlightAxis;
  readonly confidence: number; // 0-1
}

// ============================================================================
// Preset System Types
// ============================================================================

/**
 * Preset categories for organization
 */
export interface PresetCategory {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon?: string;
  readonly color?: string;
}

/**
 * PID preset with metadata
 */
export interface PIDPreset extends FlightProfile {
  readonly category: string;
  readonly tags: string[];
  readonly compatibility: {
    frameSize: { min: number; max: number };
    weight: { min: number; max: number };
    flightControllers: string[];
  };
  readonly performance: {
    smoothness: number; // 1-10
    responsiveness: number; // 1-10
    stability: number; // 1-10
  };
  readonly reviews: PresetReview[];
}

/**
 * User review for presets
 */
export interface PresetReview {
  readonly userId: string;
  readonly username: string;
  readonly rating: number; // 1-5
  readonly comment: string;
  readonly droneSpecs: DroneSpecifications;
  readonly createdAt: number;
}

// ============================================================================
// Tuning Wizard Types
// ============================================================================

/**
 * Tuning wizard step types
 */
export type TuningStepType =
  | 'setup'
  | 'safety'
  | 'baseline'
  | 'autotune'
  | 'validation'
  | 'finalization';

/**
 * Individual tuning step configuration
 */
export interface TuningStep {
  readonly id: string;
  readonly type: TuningStepType;
  readonly title: string;
  readonly description: string;
  readonly instructions: string[];
  readonly duration: number; // estimated time in minutes
  readonly isSkippable: boolean;
  readonly safetyChecks: SafetyCheck[];
  readonly parameters: TuningParameter[];
}

/**
 * Tuning parameter definition
 */
export interface TuningParameter {
  readonly id: string;
  readonly name: string;
  readonly type: 'slider' | 'input' | 'select' | 'toggle';
  readonly defaultValue: unknown;
  readonly validation: ValidationRule[];
  readonly dependencies?: string[];
}

/**
 * Safety check definition
 */
export interface SafetyCheck {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly severity: 'info' | 'warning' | 'critical';
  readonly autoCheck: boolean;
  readonly checkFunction?: () => Promise<boolean>;
}

/**
 * Step execution results
 */
export interface StepResults {
  readonly stepId: string;
  readonly success: boolean;
  readonly duration: number; // actual time taken
  readonly data: Record<string, unknown>;
  readonly errors: string[];
  readonly warnings: string[];
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation rule types
 */
export type ValidationRuleType = 'range' | 'required' | 'pattern' | 'custom' | 'dependency';

/**
 * Generic validation rule
 */
export interface ValidationRule {
  readonly type: ValidationRuleType;
  readonly message: string;
  readonly params?: Record<string, unknown>;
}

/**
 * Range validation rule
 */
export interface RangeValidationRule extends ValidationRule {
  readonly type: 'range';
  readonly params: {
    min: number;
    max: number;
    precision?: number;
  };
}

/**
 * Validation result
 */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ValidationError[];
  readonly warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly severity: 'error' | 'warning';
  readonly code?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  readonly field: string;
  readonly message: string;
  readonly recommendation?: string;
}

// ============================================================================
// Component Prop Types
// ============================================================================

/**
 * Base component props
 */
export interface BaseComponentProps {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly readonly?: boolean;
  readonly testId?: string;
}

/**
 * PID Slider component props
 */
export interface PIDSliderProps extends BaseComponentProps {
  readonly axis: FlightAxis;
  readonly pidType: PIDType;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly label: string;
  readonly unit?: string;
  readonly precision: number;
  readonly showNumericInput: boolean;
  readonly expertMode: boolean;
  readonly warningThreshold?: number;
  readonly criticalThreshold?: number;
  readonly onChange: (value: number) => void;
  readonly onWarning?: (message: string) => void;
  readonly onCritical?: (message: string) => void;
}

/**
 * Rate Profile Selector component props
 */
export interface RateProfileSelectorProps extends BaseComponentProps {
  readonly profiles: FlightProfile[];
  readonly activeProfileId: string;
  readonly maxProfiles: number;
  readonly allowRename: boolean;
  readonly allowDelete: boolean;
  readonly allowCopy: boolean;
  readonly onProfileSelect: (profileId: string) => void;
  readonly onProfileCreate: (profile: FlightProfile) => void;
  readonly onProfileUpdate: (profileId: string, updates: Partial<FlightProfile>) => void;
  readonly onProfileDelete: (profileId: string) => void;
  readonly onProfileCopy: (sourceId: string, targetName: string) => void;
}

/**
 * Response Curve Editor component props
 */
export interface ResponseCurveEditorProps extends BaseComponentProps {
  readonly curveType: RateConfiguration['curveType'];
  readonly expoValue: number;
  readonly superRate: number;
  readonly rcRate: number;
  readonly showGrid: boolean;
  readonly showPreview: boolean;
  readonly enable3DPreview: boolean;
  readonly stickPosition: { x: number; y: number };
  readonly simulationSpeed: number;
  readonly onCurveChange: (config: RateConfiguration) => void;
  readonly onStickMove: (position: { x: number; y: number }) => void;
}

// ============================================================================
// Graph and Visualization Types
// ============================================================================

/**
 * Graph channel configuration
 */
export interface GraphChannel {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly unit: string;
  readonly scale: { min: number; max: number };
  readonly visible: boolean;
}

/**
 * Time range for graph display
 */
export interface TimeRange {
  readonly start: number;
  readonly end: number;
}

/**
 * Trigger condition for data analysis
 */
export interface TriggerCondition {
  readonly id: string;
  readonly name: string;
  readonly channel: string;
  readonly operator: '>' | '<' | '==' | '!=' | 'rising' | 'falling';
  readonly threshold: number;
  readonly enabled: boolean;
}

/**
 * Real-time graph component props
 */
export interface RealTimeGraphProps extends BaseComponentProps {
  readonly graphType: 'time-series' | 'frequency' | 'phase' | '3d-trajectory';
  readonly channels: GraphChannel[];
  readonly timeWindow: number;
  readonly sampleRate: number;
  readonly showMarkers: boolean;
  readonly enableZoom: boolean;
  readonly showStatistics: boolean;
  readonly overlayMode: 'separate' | 'combined';
  readonly enableFFT: boolean;
  readonly enablePSDAnalysis: boolean;
  readonly triggerConditions: TriggerCondition[];
  readonly onMarkerAdd: (timestamp: number, note: string) => void;
  readonly onZoomChange: (range: TimeRange) => void;
  readonly onTrigger: (condition: TriggerCondition, data: TelemetryData) => void;
}

// ============================================================================
// Flight Controller Communication Types
// ============================================================================

/**
 * Supported communication protocols
 */
export type CommunicationProtocol = 'msp' | 'mavlink' | 'custom';

/**
 * Connection types
 */
export type ConnectionType = 'usb' | 'bluetooth' | 'wifi' | 'serial';

/**
 * Serial port configuration
 */
export interface SerialPort {
  readonly path: string;
  readonly manufacturer?: string;
  readonly serialNumber?: string;
  readonly vendorId?: string;
  readonly productId?: string;
  readonly baudRate: number;
}

/**
 * Flight controller API interface
 */
export interface FlightControllerAPI {
  readonly connect: (port: SerialPort) => Promise<boolean>;
  readonly disconnect: () => Promise<void>;
  readonly ping: () => Promise<boolean>;
  readonly readPIDConfig: () => Promise<PIDConfiguration>;
  readonly writePIDConfig: (config: PIDConfiguration) => Promise<boolean>;
  readonly readProfiles: () => Promise<FlightProfile[]>;
  readonly startTelemetry: (rate: number) => Promise<void>;
  readonly stopTelemetry: () => Promise<void>;
  readonly onTelemetryData: (callback: (data: TelemetryData) => void) => void;
  readonly emergencyStop: () => Promise<void>;
  readonly armDisarm: (arm: boolean) => Promise<boolean>;
}

// ============================================================================
// Store and State Management Types
// ============================================================================

/**
 * PID configuration store state
 */
export interface PIDConfigStore {
  readonly currentConfig: PIDConfiguration;
  readonly backupConfig: PIDConfiguration;
  readonly profiles: FlightProfile[];
  readonly activeProfileId: string;
  readonly validationErrors: ValidationError[];
  readonly isValid: boolean;
  readonly isDirty: boolean;
  readonly lastSyncTimestamp: number;
  readonly syncInProgress: boolean;
}

/**
 * Telemetry store state
 */
export interface TelemetryStore {
  readonly isConnected: boolean;
  readonly connectionType: ConnectionType;
  readonly lastHeartbeat: number;
  readonly pidOutput: PIDOutputData[];
  readonly sensorData: SensorData[];
  readonly motorOutputs: MotorData[];
  readonly pidPerformance: PIDPerformanceMetrics;
  readonly oscillationDetection: OscillationData;
}

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Type guard to check if an object is a valid PID configuration
 */
export function isPIDConfiguration(obj: unknown): obj is PIDConfiguration {
  if (!obj || typeof obj !== 'object') return false;

  const config = obj as Partial<PIDConfiguration>;
  return !!(
    config.pitch &&
    config.roll &&
    config.yaw &&
    typeof config.timestamp === 'number' &&
    typeof config.version === 'string'
  );
}

/**
 * Type guard to check if an object is a valid flight profile
 */
export function isFlightProfile(obj: unknown): obj is FlightProfile {
  if (!obj || typeof obj !== 'object') return false;

  const profile = obj as Partial<FlightProfile>;
  return !!(
    typeof profile.id === 'string' &&
    typeof profile.name === 'string' &&
    isPIDConfiguration(profile.pidConfig) &&
    profile.rateConfig &&
    profile.filterConfig
  );
}

/**
 * Default PID constraints for safety
 */
export const DEFAULT_PID_CONSTRAINTS: Record<FlightAxis, PIDConstraints> = {
  pitch: {
    P: { min: 0, max: 500, precision: 0.1 },
    I: { min: 0, max: 200, precision: 0.1 },
    D: { min: 0, max: 100, precision: 0.1 }
  },
  roll: {
    P: { min: 0, max: 500, precision: 0.1 },
    I: { min: 0, max: 200, precision: 0.1 },
    D: { min: 0, max: 100, precision: 0.1 }
  },
  yaw: {
    P: { min: 0, max: 500, precision: 0.1 },
    I: { min: 0, max: 200, precision: 0.1 },
    D: { min: 0, max: 100, precision: 0.1 }
  }
} as const;

/**
 * Default rate configuration limits
 */
export const RATE_LIMITS = {
  rcRate: { min: 0.01, max: 2.5 },
  expo: { min: 0, max: 100 },
  superRate: { min: 0, max: 2.0 }
} as const;

/**
 * Filter frequency limits
 */
export const FILTER_LIMITS = {
  frequency: { min: 10, max: 500 },
  q: { min: 0.1, max: 10.0 }
} as const;
