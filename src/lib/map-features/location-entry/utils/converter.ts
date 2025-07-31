import type { 
  Coordinate, 
  CoordinateFormat, 
  ConversionResult, 
  LatLng, 
  UTMCoordinate, 
  MGRSCoordinate,
  ConversionCacheEntry 
} from '$lib/map-features/types';
import { 
  performanceMonitor, 
  FastCoordinateParser, 
  MicroOpts, 
  enforceFrameBudget 
} from './performance';

// NASA JPL Rule 2: Bounded memory allocation for aerospace safety
import { BoundedLRUCache } from './performance';

// Performance-optimized conversion cache with bounded memory
class ConversionCache {
  private cache = new BoundedLRUCache<string, ConversionCacheEntry>(100); // NASA JPL Rule 2: Fixed limit
  private maxAge = 5 * 60 * 1000; // 5 minutes

  getCacheKey(value: string, format: CoordinateFormat): string {
    return `${format}:${value.toLowerCase().trim()}`;
  }

  get(value: string, format: CoordinateFormat): ConversionCacheEntry | null {
    const key = this.getCacheKey(value, format);
    const entry = this.cache.get(key);
    
    // NASA JPL Rule 7: Check return values and validate timestamps
    if (entry && Date.now() - entry.timestamp < this.maxAge) {
      return entry;
    }
    
    return null;
  }

  set(coordinate: Coordinate, conversions: Record<CoordinateFormat, Coordinate>): void {
    // NASA JPL Rule 5: Validate all inputs
    if (!coordinate || !coordinate.raw || !coordinate.format) {
      throw new Error('Invalid coordinate for caching');
    }
    if (!conversions) {
      throw new Error('Invalid conversions for caching');
    }

    const key = this.getCacheKey(coordinate.raw, coordinate.format);
    
    // NASA JPL Rule 2: Bounded cache handles eviction automatically
    this.cache.set(key, {
      from: coordinate,
      to: conversions,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export class CoordinateConverter {
  private cache = new ConversionCache();
  private worker: Worker | null = null;

  constructor() {
    // Initialize worker for heavy calculations
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('./conversion-worker.js', import.meta.url),
          { type: 'module' }
        );
      } catch (error) {
        console.warn('Web Worker initialization failed:', error);
      }
    }
  }

  async convert(value: string, format: CoordinateFormat): Promise<ConversionResult> {
    // NASA JPL Rule 5: Validate all input parameters
    if (typeof value !== 'string') {
      return {
        success: false,
        error: 'Input value must be a string'
      };
    }
    if (!format || typeof format !== 'string') {
      return {
        success: false,
        error: 'Format must be specified'
      };
    }

    return enforceFrameBudget(async () => {
      try {
        const trimmedValue = MicroOpts.fastTrim(value);
        
        if (!trimmedValue) {
          return {
            success: false,
            error: 'Input cannot be empty'
          };
        }
        
        // Check cache first
        const cached = this.cache.get(trimmedValue, format);
        if (cached) {
          return {
            success: true,
            coordinate: cached.from
          };
        }

        // Parse input based on format using optimized parsers
        let coordinate: Coordinate;
        
        switch (format) {
          case 'latlong':
            coordinate = this.parseLatLongOptimized(trimmedValue);
            break;
          case 'utm':
            coordinate = this.parseUTMOptimized(trimmedValue);
            break;
          case 'mgrs':
            coordinate = this.parseMGRSOptimized(trimmedValue);
            break;
          case 'what3words':
            coordinate = await this.parseWhat3Words(trimmedValue);
            break;
          default:
            return {
              success: false,
              error: `Unsupported format: ${format}`
            };
        }

        // NASA JPL Rule 7: Validate parsing result
        if (!coordinate) {
          return {
            success: false,
            error: 'Failed to parse coordinate'
          };
        }

        // Convert to all other formats
        const conversions = await this.convertToAllFormats(coordinate);
        
        // NASA JPL Rule 7: Validate conversion result
        if (!conversions) {
          return {
            success: false,
            error: 'Failed to convert to other formats'
          };
        }
        
        // Cache the result
        this.cache.set(coordinate, conversions);

        return {
          success: true,
          coordinate
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown conversion error'
        };
      }
    });
  }

  private parseLatLongOptimized(value: string): Coordinate {
    // Try fast decimal degrees parser first
    const fastResult = FastCoordinateParser.parseDecimalDegrees(value);
    if (fastResult) {
      return MicroOpts.createCoordinate('latlong', fastResult, value);
    }
    
    // Fall back to full parser for complex formats
    return this.parseLatLong(value);
  }

  private parseUTMOptimized(value: string): Coordinate {
    const fastResult = FastCoordinateParser.parseUTM(value);
    if (fastResult) {
      const utmCoord: UTMCoordinate = {
        zone: fastResult.zone,
        hemisphere: fastResult.hemisphere as 'N' | 'S',
        easting: fastResult.easting,
        northing: fastResult.northing
      };
      return MicroOpts.createCoordinate('utm', utmCoord, value);
    }
    
    return this.parseUTM(value);
  }

  private parseMGRSOptimized(value: string): Coordinate {
    const fastResult = FastCoordinateParser.parseMGRS(value);
    if (fastResult) {
      const mgrsCoord: MGRSCoordinate = {
        gridZone: fastResult.gridZone,
        gridSquare: fastResult.gridSquare,
        easting: fastResult.easting,
        northing: fastResult.northing,
        precision: fastResult.precision as 1 | 2 | 3 | 4 | 5
      };
      return MicroOpts.createCoordinate('mgrs', mgrsCoord, value);
    }
    
    return this.parseMGRS(value);
  }

  private parseLatLong(value: string): Coordinate {
    // Multiple format support:
    // DD: 40.7128, -74.0060
    // DMS: 40°42'46.0"N 74°00'21.6"W
    // DDM: 40°42.767'N 74°0.360'W
    
    const cleanValue = value.trim();
    
    // Try decimal degrees first
    const ddMatch = cleanValue.match(
      /^(-?\d{1,3}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/
    );
    
    if (ddMatch) {
      const lat = parseFloat(ddMatch[1]);
      const lng = parseFloat(ddMatch[2]);
      
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        throw new Error('Coordinates out of range');
      }
      
      return {
        format: 'latlong',
        value: { lat, lng },
        raw: value
      };
    }

    // Try DMS format
    const dmsMatch = cleanValue.match(
      /^(\d{1,3})°(\d{1,2})'(\d{1,2}(?:\.\d+)?)"([NS])\s+(\d{1,3})°(\d{1,2})'(\d{1,2}(?:\.\d+)?)"([EW])$/i
    );
    
    if (dmsMatch) {
      const latDeg = parseInt(dmsMatch[1]);
      const latMin = parseInt(dmsMatch[2]);
      const latSec = parseFloat(dmsMatch[3]);
      const latDir = dmsMatch[4].toUpperCase();
      
      const lngDeg = parseInt(dmsMatch[5]);
      const lngMin = parseInt(dmsMatch[6]);
      const lngSec = parseFloat(dmsMatch[7]);
      const lngDir = dmsMatch[8].toUpperCase();
      
      const lat = this.dmsToDecimal(latDeg, latMin, latSec, latDir);
      const lng = this.dmsToDecimal(lngDeg, lngMin, lngSec, lngDir);
      
      return {
        format: 'latlong',
        value: { lat, lng },
        raw: value
      };
    }

    throw new Error('Invalid lat/long format');
  }

  private parseUTM(value: string): Coordinate {
    // Format: 18T 585628 4511322
    const match = value.trim().match(
      /^(\d{1,2})([A-Z])\s+(\d+)\s+(\d+)$/i
    );
    
    if (!match) {
      throw new Error('Invalid UTM format');
    }
    
    const zone = parseInt(match[1]);
    const hemisphere = match[2].toUpperCase() >= 'N' ? 'N' : 'S';
    const easting = parseInt(match[3]);
    const northing = parseInt(match[4]);
    
    if (zone < 1 || zone > 60) {
      throw new Error('UTM zone must be between 1 and 60');
    }
    
    const utmCoord: UTMCoordinate = {
      zone,
      hemisphere,
      easting,
      northing
    };
    
    return {
      format: 'utm',
      value: utmCoord,
      raw: value
    };
  }

  private parseMGRS(value: string): Coordinate {
    // Format: 18TWL8562811322 (varying precision)
    const match = value.trim().match(
      /^(\d{1,2}[A-Z])([A-Z]{2})(\d{2,10})$/i
    );
    
    if (!match) {
      throw new Error('Invalid MGRS format');
    }
    
    const gridZone = match[1].toUpperCase();
    const gridSquare = match[2].toUpperCase();
    const digits = match[3];
    
    if (digits.length % 2 !== 0) {
      throw new Error('MGRS coordinates must have even number of digits');
    }
    
    const precision = (digits.length / 2) as 1 | 2 | 3 | 4 | 5;
    const halfLength = digits.length / 2;
    const easting = parseInt(digits.substring(0, halfLength));
    const northing = parseInt(digits.substring(halfLength));
    
    const mgrsCoord: MGRSCoordinate = {
      gridZone,
      gridSquare,
      easting,
      northing,
      precision
    };
    
    return {
      format: 'mgrs',
      value: mgrsCoord,
      raw: value
    };
  }

  private async parseWhat3Words(value: string): Promise<Coordinate> {
    // Format: word.word.word
    const match = value.trim().match(/^(\w+)\.(\w+)\.(\w+)$/);
    
    if (!match) {
      throw new Error('Invalid What3Words format');
    }
    
    // This would normally call the What3Words API
    // For now, return a placeholder
    return {
      format: 'what3words',
      value: {
        words: value.toLowerCase()
      },
      raw: value
    };
  }

  private dmsToDecimal(deg: number, min: number, sec: number, dir: string): number {
    let decimal = deg + min / 60 + sec / 3600;
    if (dir === 'S' || dir === 'W') {
      decimal = -decimal;
    }
    return decimal;
  }

  private async convertToAllFormats(
    coordinate: Coordinate
  ): Promise<Record<CoordinateFormat, Coordinate>> {
    // This would perform conversions between all formats
    // For now, return the original coordinate
    return {
      latlong: coordinate,
      utm: coordinate,
      mgrs: coordinate,
      what3words: coordinate
    };
  }

  async convertToLatLng(coordinate: Coordinate): Promise<LatLng> {
    if (coordinate.format === 'latlong' && 'lat' in coordinate.value) {
      return coordinate.value as LatLng;
    }
    
    // Perform conversion based on format
    // This is a placeholder - real implementation would handle all conversions
    throw new Error('Conversion not implemented');
  }

  destroy(): void {
    this.worker?.terminate();
    this.cache.clear();
  }
}

// Export singleton instance for optimal performance
export const coordinateConverter = new CoordinateConverter();