import type { CoordinateFormat, ValidationResult } from '$lib/map-features/types';

// Pre-compiled regex patterns for performance
const VALIDATION_PATTERNS = {
  latlong: {
    decimal: /^(-?\d{1,3}(?:\.\d{1,8})?)[,\s]+(-?\d{1,3}(?:\.\d{1,8})?)$/,
    dms: /^(\d{1,3})°(\d{1,2})'(\d{1,2}(?:\.\d+)?)"([NS])\s+(\d{1,3})°(\d{1,2})'(\d{1,2}(?:\.\d+)?)"([EW])$/i,
    ddm: /^(\d{1,3})°(\d{1,2}(?:\.\d+)?)'([NS])\s+(\d{1,3})°(\d{1,2}(?:\.\d+)?)'([EW])$/i
  },
  utm: {
    standard: /^(\d{1,2})([A-Z])\s+(\d{1,7})\s+(\d{1,7})$/i,
    compact: /^(\d{1,2})([A-Z])(\d{1,7})(\d{1,7})$/i
  },
  mgrs: {
    full: /^(\d{1,2}[A-Z])([A-Z]{2})(\d{2,10})$/i
  },
  what3words: {
    standard: /^[a-z]+\.[a-z]+\.[a-z]+$/i
  }
};

// Validation bounds
const BOUNDS = {
  lat: { min: -90, max: 90 },
  lng: { min: -180, max: 180 },
  utmZone: { min: 1, max: 60 },
  utmEasting: { min: 100000, max: 900000 },
  utmNorthing: { min: 0, max: 10000000 }
};

export async function validateInput(
  input: string, 
  format: CoordinateFormat
): Promise<ValidationResult> {
  const startTime = performance.now();
  
  try {
    const trimmedInput = input.trim();
    
    if (!trimmedInput) {
      return {
        valid: false,
        error: 'Input cannot be empty'
      };
    }

    let result: ValidationResult;
    
    switch (format) {
      case 'latlong':
        result = validateLatLong(trimmedInput);
        break;
      case 'utm':
        result = validateUTM(trimmedInput);
        break;
      case 'mgrs':
        result = validateMGRS(trimmedInput);
        break;
      case 'what3words':
        result = validateWhat3Words(trimmedInput);
        break;
      default:
        result = {
          valid: false,
          error: `Unknown format: ${format}`
        };
    }

    const duration = performance.now() - startTime;
    if (duration > 1) {
      console.warn(`Slow validation: ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation error'
    };
  }
}

// NASA JPL Rule 3: Split long function into smaller ones
function validateDecimalDegrees(input: string): ValidationResult | null {
  const ddMatch = input.match(VALIDATION_PATTERNS.latlong.decimal);
  if (!ddMatch) return null;
  
  const lat = parseFloat(ddMatch[1]);
  const lng = parseFloat(ddMatch[2]);
  
  if (lat < BOUNDS.lat.min || lat > BOUNDS.lat.max) {
    return {
      valid: false,
      error: `Latitude must be between ${BOUNDS.lat.min} and ${BOUNDS.lat.max}`,
      suggestions: [`${Math.max(BOUNDS.lat.min, Math.min(BOUNDS.lat.max, lat))}, ${lng}`]
    };
  }
  
  if (lng < BOUNDS.lng.min || lng > BOUNDS.lng.max) {
    return {
      valid: false,
      error: `Longitude must be between ${BOUNDS.lng.min} and ${BOUNDS.lng.max}`,
      suggestions: [`${lat}, ${Math.max(BOUNDS.lng.min, Math.min(BOUNDS.lng.max, lng))}`]
    };
  }
  
  return { valid: true };
}

function validateDMSFormat(input: string): ValidationResult | null {
  const dmsMatch = input.match(VALIDATION_PATTERNS.latlong.dms);
  if (!dmsMatch) return null;
  
  const latDeg = parseInt(dmsMatch[1]);
  const latMin = parseInt(dmsMatch[2]);
  const latSec = parseFloat(dmsMatch[3]);
  
  const lngDeg = parseInt(dmsMatch[5]);
  const lngMin = parseInt(dmsMatch[6]);
  const lngSec = parseFloat(dmsMatch[7]);
  
  // Validate time ranges
  if (latMin >= 60 || latSec >= 60 || lngMin >= 60 || lngSec >= 60) {
    return {
      valid: false,
      error: 'Minutes and seconds must be less than 60'
    };
  }
  
  // Validate degree ranges
  if (latDeg > 90 || (latDeg === 90 && (latMin > 0 || latSec > 0))) {
    return {
      valid: false,
      error: 'Latitude degrees cannot exceed 90°'
    };
  }
  
  if (lngDeg > 180 || (lngDeg === 180 && (lngMin > 0 || lngSec > 0))) {
    return {
      valid: false,
      error: 'Longitude degrees cannot exceed 180°'
    };
  }
  
  return { valid: true };
}

function validateLatLong(input: string): ValidationResult {
  // NASA JPL Rule 3: Function complexity reduced by delegation
  let result = validateDecimalDegrees(input);
  if (result) return result;
  
  result = validateDMSFormat(input);
  if (result) return result;
  
  // Try DDM format
  const ddmMatch = input.match(VALIDATION_PATTERNS.latlong.ddm);
  if (ddmMatch) {
    return { valid: true };
  }

  return {
    valid: false,
    error: 'Invalid coordinate format. Examples: 40.7128, -74.0060 or 40°42\'46.0"N 74°00\'21.6"W',
    suggestions: getLatLongSuggestions(input)
  };
}

function validateUTM(input: string): ValidationResult {
  const match = input.match(VALIDATION_PATTERNS.utm.standard) || 
                input.match(VALIDATION_PATTERNS.utm.compact);
  
  if (!match) {
    return {
      valid: false,
      error: 'Invalid UTM format. Example: 18T 585628 4511322',
      suggestions: getUTMSuggestions(input)
    };
  }
  
  const zone = parseInt(match[1]);
  const letter = match[2].toUpperCase();
  const easting = parseInt(match[3]);
  const northing = parseInt(match[4]);
  
  if (zone < BOUNDS.utmZone.min || zone > BOUNDS.utmZone.max) {
    return {
      valid: false,
      error: `UTM zone must be between ${BOUNDS.utmZone.min} and ${BOUNDS.utmZone.max}`
    };
  }
  
  // Validate grid zone letter
  const validLetters = 'CDEFGHJKLMNPQRSTUVWX';
  if (!validLetters.includes(letter)) {
    return {
      valid: false,
      error: 'Invalid UTM grid zone letter',
      suggestions: [`${zone}T ${easting} ${northing}`]
    };
  }
  
  if (easting < BOUNDS.utmEasting.min || easting > BOUNDS.utmEasting.max) {
    return {
      valid: false,
      error: `Easting must be between ${BOUNDS.utmEasting.min} and ${BOUNDS.utmEasting.max}`
    };
  }
  
  if (northing < BOUNDS.utmNorthing.min || northing > BOUNDS.utmNorthing.max) {
    return {
      valid: false,
      error: `Northing must be between ${BOUNDS.utmNorthing.min} and ${BOUNDS.utmNorthing.max}`
    };
  }
  
  return { valid: true };
}

function validateMGRS(input: string): ValidationResult {
  const match = input.match(VALIDATION_PATTERNS.mgrs.full);
  
  if (!match) {
    return {
      valid: false,
      error: 'Invalid MGRS format. Example: 18TWL8562811322',
      suggestions: getMGRSSuggestions(input)
    };
  }
  
  const gridZone = match[1].toUpperCase();
  const gridSquare = match[2].toUpperCase();
  const digits = match[3];
  
  // Validate grid zone
  const zoneNumber = parseInt(gridZone.slice(0, -1));
  const zoneLetter = gridZone.slice(-1);
  
  if (zoneNumber < 1 || zoneNumber > 60) {
    return {
      valid: false,
      error: 'MGRS zone number must be between 1 and 60'
    };
  }
  
  // Validate grid square letters
  const validSquareLetters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // No I or O
  if (!validSquareLetters.includes(gridSquare[0]) || 
      !validSquareLetters.includes(gridSquare[1])) {
    return {
      valid: false,
      error: 'Invalid MGRS grid square letters (I and O are not used)'
    };
  }
  
  // Validate digits (must be even number)
  if (digits.length % 2 !== 0) {
    return {
      valid: false,
      error: 'MGRS coordinates must have an even number of digits'
    };
  }
  
  const precision = digits.length / 2;
  if (precision < 1 || precision > 5) {
    return {
      valid: false,
      error: 'MGRS precision must be between 1 and 5 (2-10 digits)'
    };
  }
  
  return { valid: true };
}

function validateWhat3Words(input: string): ValidationResult {
  const match = input.match(VALIDATION_PATTERNS.what3words.standard);
  
  if (!match) {
    return {
      valid: false,
      error: 'Invalid What3Words format. Example: filled.count.soap',
      suggestions: getWhat3WordsSuggestions(input)
    };
  }
  
  const words = input.split('.');
  
  // Basic validation - each word should be reasonable length
  for (const word of words) {
    if (word.length < 1 || word.length > 40) {
      return {
        valid: false,
        error: 'What3Words must contain valid dictionary words'
      };
    }
  }
  
  // Note: Full validation would require API call to verify words exist
  return { valid: true };
}

// Suggestion helpers for better UX
function getLatLongSuggestions(input: string): string[] {
  const suggestions: string[] = [];
  
  // If it looks like they're trying decimal degrees
  if (input.includes(',') || input.includes(' ')) {
    const parts = input.split(/[,\s]+/);
    if (parts.length === 2) {
      suggestions.push(`${parts[0].trim()}, ${parts[1].trim()}`);
    }
  }
  
  // If it contains degree symbols, suggest DMS format
  if (input.includes('°')) {
    suggestions.push('40°42\'46.0"N 74°00\'21.6"W');
  }
  
  return suggestions;
}

function getUTMSuggestions(input: string): string[] {
  const suggestions: string[] = [];
  
  // If missing spaces
  const compactMatch = input.match(/^(\d{1,2})([A-Z])(\d+)$/i);
  if (compactMatch) {
    const [, zone, letter, rest] = compactMatch;
    const halfLength = Math.floor(rest.length / 2);
    suggestions.push(
      `${zone}${letter} ${rest.slice(0, halfLength)} ${rest.slice(halfLength)}`
    );
  }
  
  return suggestions;
}

function getMGRSSuggestions(input: string): string[] {
  const suggestions: string[] = [];
  
  // Common MGRS format issues
  if (input.includes(' ')) {
    suggestions.push(input.replace(/\s+/g, ''));
  }
  
  return suggestions;
}

function getWhat3WordsSuggestions(input: string): string[] {
  const suggestions: string[] = [];
  
  // If using wrong separator
  if (input.includes('-') || input.includes('_')) {
    suggestions.push(input.replace(/[-_]/g, '.'));
  }
  
  // If missing separators
  const words = input.split(/[.\s-_]+/);
  if (words.length === 3) {
    suggestions.push(words.join('.').toLowerCase());
  }
  
  return suggestions;
}