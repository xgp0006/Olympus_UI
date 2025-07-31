/**
 * Shared Type Definitions for Map Features
 * NASA JPL Compliant - All data structures bounded
 */

// Coordinate Systems
export interface LatLng {
  lat: number;
  lng: number;
}

export interface UTM {
  zone: number;
  easting: number;
  northing: number;
  hemisphere: 'N' | 'S';
}

export interface MGRS {
  zone: number;
  band: string;
  e100k: string;
  n100k: string;
  easting: number;
  northing: number;
  precision: number;
}

export type CoordinateFormat = 'latlong' | 'utm' | 'mgrs' | 'what3words';

export interface Coordinate {
  format: CoordinateFormat;
  value: LatLng | UTM | MGRS | string;
  toLatLng(): LatLng;
  toString(): string;
}

// Map Display Types
export interface MapViewport {
  center: LatLng;
  zoom: number;
  bearing: number;
  pitch: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface MapLayer {
  id: string;
  type: 'base' | 'overlay' | 'interactive';
  visible: boolean;
  opacity: number;
  zIndex: number;
}

// Icon Systems
export type IconPack = 'nato' | 'civilian' | 'nerdfont';

export interface MapIcon {
  id: string;
  pack: IconPack;
  symbol: string;
  size: number;
  color: string;
  rotation?: number;
}

// Waypoint Types
export type WaypointType = 
  | 'orbit'
  | 'mapping'
  | 'attack'
  | 'loiter'
  | 'hold'
  | 'rth'
  | 'waypoint';

export interface Waypoint {
  id: string;
  type: WaypointType;
  position: LatLng;
  altitude?: number;
  speed?: number;
  icon?: MapIcon;
  label?: string;
}

// Measurement Types
export type MeasurementType = 
  | 'line'
  | 'box'
  | 'circle'
  | 'triangle'
  | 'polygon'
  | 'spline';

export interface MeasurementNode {
  id: string;
  position: LatLng;
  editable: boolean;
  canConvertToWaypoint: boolean;
}

export interface Measurement {
  id: string;
  type: MeasurementType;
  nodes: MeasurementNode[];
  style: {
    strokeColor: string;
    strokeWidth: number;
    fillColor?: string;
    fillOpacity?: number;
    dashArray?: number[];
  };
  metrics: {
    distance?: number;
    area?: number;
    perimeter?: number;
  };
}

// Message System Types
export type MessageCategory = 
  | 'notam'
  | 'adsb-warning'
  | 'faa-alert'
  | 'weather-warning'
  | 'system';

export type MessagePriority = 'low' | 'medium' | 'high' | 'critical';

export interface Message {
  id: string;
  category: MessageCategory;
  priority: MessagePriority;
  timestamp: Date;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  actions?: MessageAction[];
  expires?: Date;
}

export interface MessageAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

// ADS-B Types
export interface ADSBTarget {
  icao: string;
  callsign?: string;
  position: LatLng;
  altitude: number; // feet
  heading: number; // degrees
  speed: number; // knots
  verticalRate: number; // feet/min
  squawk?: string;
  registration?: string;
  aircraft?: {
    type: string;
    manufacturer: string;
    model: string;
  };
  flight?: {
    origin?: string;
    destination?: string;
    route?: LatLng[];
  };
  lastUpdate: Date;
}

export interface ADSBFilter {
  minAltitude?: number;
  maxAltitude?: number;
  types?: string[];
  showOnlyInView: boolean;
  maxTargets: number;
}

// Weather Types
export interface WeatherLayer {
  timestamp: Date;
  bounds: MapViewport['bounds'];
  data: {
    clouds?: CloudData;
    precipitation?: PrecipitationData;
    wind?: WindData;
    temperature?: TemperatureData;
    pressure?: PressureData;
  };
}

export interface CloudData {
  coverage: number[][]; // 0-100 percentage grid
  altitude: number[][]; // cloud base altitude
  type: ('clear' | 'few' | 'scattered' | 'broken' | 'overcast')[][];
}

export interface PrecipitationData {
  type: ('none' | 'rain' | 'snow' | 'sleet' | 'hail')[][];
  intensity: number[][]; // mm/hr
  accumulation?: number[][]; // mm
}

export interface WindData {
  speed: number[][]; // m/s
  direction: number[][]; // degrees
  gusts?: number[][]; // m/s
}

export interface TemperatureData {
  surface: number[][]; // Celsius
  altitude?: Map<number, number[][]>; // altitude -> temperature grid
}

export interface PressureData {
  surface: number[][]; // hPa
  altitude?: Map<number, number[][]>;
}

// Performance Types
export interface RenderStats {
  fps: number;
  frameTime: number;
  drawCalls: number;
  vertices: number;
  textureMemory: number;
}

// Settings Types
export interface MapSettings {
  units: {
    distance: 'metric' | 'imperial' | 'nautical';
    altitude: 'feet' | 'meters';
    speed: 'kts' | 'mph' | 'kph' | 'mps';
    temperature: 'celsius' | 'fahrenheit';
  };
  display: {
    showGrid: boolean;
    showScale: boolean;
    showCompass: boolean;
    showCrosshair: boolean;
    antialiasing: boolean;
    use144fps: boolean;
  };
  icons: {
    packs: IconPack[];
    defaultSize: number;
    scalingWithZoom: boolean;
  };
  performance: {
    maxRenderTargets: number;
    useDirtyRects: boolean;
    useWebGL: boolean;
    useWorkers: boolean;
  };
}

// Event Types
export interface MapEvent<T = any> {
  type: string;
  timestamp: number;
  data: T;
  source: string;
}

export type MapEventType = 
  | 'viewport:change'
  | 'waypoint:create'
  | 'waypoint:update'
  | 'waypoint:delete'
  | 'measurement:start'
  | 'measurement:complete'
  | 'adsb:select'
  | 'adsb:update'
  | 'weather:update'
  | 'crosshair:move'
  | 'coordinate:select';

// Validation Types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}