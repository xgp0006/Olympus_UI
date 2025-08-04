export type CoordinateFormat = 'latlong' | 'utm' | 'mgrs' | 'what3words';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface UTMCoordinate {
  zone: number;
  hemisphere: 'N' | 'S';
  easting: number;
  northing: number;
}

export interface MGRSCoordinate {
  gridZone: string;
  gridSquare: string;
  easting: number;
  northing: number;
  precision: 1 | 2 | 3 | 4 | 5;
}

export interface What3WordsCoordinate {
  words: string;
  lat?: number;
  lng?: number;
}

export interface Coordinate {
  format: CoordinateFormat;
  value: LatLng | UTMCoordinate | MGRSCoordinate | What3WordsCoordinate;
  raw: string;
}

export interface ConversionResult {
  success: boolean;
  coordinate?: Coordinate;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  suggestions?: string[];
}

export interface LocationEntryEvents {
  select: { coordinate: Coordinate };
  error: { message: string };
  formatChange: { format: CoordinateFormat };
  validation: { result: ValidationResult };
}

export interface ConversionCacheEntry {
  from: Coordinate;
  to: Record<CoordinateFormat, Coordinate>;
  timestamp: number;
}

export interface PerformanceMetrics {
  conversionTime: number;
  validationTime: number;
  renderTime: number;
  frameTime: number;
}

// Map viewport and overlay types
export interface MapViewport {
  center: { lng: number; lat: number };
  zoom: number;
  bearing: number;
  pitch: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  width: number;
  height: number;
}

export interface MapIcon {
  id: string;
  position: { lng: number; lat: number };
  type: 'nato' | 'civilian' | 'nerdfont';
  symbol: string;
  size: number;
  color: string;
  rotation?: number;
  metadata?: Record<string, any>;
}

export interface CrosshairStyle {
  type: 'simple' | 'mil-dot' | 'aviation';
  color: 'auto' | 'white' | 'black' | 'red';
  size: number;
  opacity: number;
}

export interface RingStyle {
  color: string;
  strokeWidth: number;
  opacity: number;
  labelColor: string;
  labelSize: number;
  labelFont: string;
}

export interface CrosshairSettings {
  style: CrosshairStyle;
  ringUnits: 'meters' | 'feet' | 'nautical-miles';
  gridFormat: {
    type: 'decimal' | 'dms' | 'mgrs' | 'utm';
    precision: number;
  };
  iconPacks: {
    nato: boolean;
    civilian: boolean;
    nerdfont: boolean;
  };
  showRing: boolean;
  ringDistance: number;
  keybindings: Record<string, string>;
}
