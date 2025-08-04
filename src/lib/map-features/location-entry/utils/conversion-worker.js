// Web Worker for heavy coordinate conversion calculations
// NASA JPL Power of 10 compliant with bounded operations

// Constants for WGS84 datum
const WGS84 = {
  a: 6378137.0, // Semi-major axis
  b: 6356752.314245, // Semi-minor axis
  f: 1 / 298.257223563, // Flattening
  e: 0.08181919084262, // First eccentricity
  e2: 0.00669437999014, // First eccentricity squared
  n: 0.00167922039463, // Third flattening
  k0: 0.9996 // UTM scale factor
};

// Pre-calculated constants for performance
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// NASA JPL Rule 2: Bounded lookup tables
const UTM_ZONES = new Float32Array(60);
const MGRS_BAND_LETTERS = 'CDEFGHJKLMNPQRSTUVWXX';
const MGRS_COL_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MGRS_ROW_LETTERS = 'ABCDEFGHJKLMNPQRSTUV';

// Initialize UTM zone central meridians
for (let i = 0; i < 60; i++) {
  UTM_ZONES[i] = (i + 1) * 6 - 183;
}

// NASA JPL Rule 2: Fixed-size buffer pool for batch operations
const BUFFER_POOL_SIZE = 10;
const BUFFER_SIZE = 1024; // Max coordinates per buffer
let bufferPool = [];
let activeBuffers = 0;

// Initialize buffer pool if SharedArrayBuffer is available
if (typeof SharedArrayBuffer !== 'undefined') {
  try {
    for (let i = 0; i < BUFFER_POOL_SIZE; i++) {
      bufferPool.push({
        input: new SharedArrayBuffer(BUFFER_SIZE * 16), // 4 floats per coordinate
        output: new SharedArrayBuffer(BUFFER_SIZE * 16),
        inUse: false
      });
    }
  } catch (e) {
    // SharedArrayBuffer may be disabled in some environments
    bufferPool = [];
  }
}

// NASA JPL Rule 5: Runtime assertions
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// NASA JPL Rule 1: Simple control flow - no recursion
function latLngToUTM(lat, lng) {
  // Validate inputs
  assert(!isNaN(lat) && !isNaN(lng), 'Invalid lat/lng values');
  assert(Math.abs(lat) <= 90, 'Latitude out of range');
  assert(Math.abs(lng) <= 180, 'Longitude out of range');

  // Calculate UTM zone
  const zone = Math.floor((lng + 180) / 6) + 1;
  const centralMeridian = UTM_ZONES[zone - 1];
  
  // Convert to radians
  const latRad = lat * DEG_TO_RAD;
  const lngRad = lng * DEG_TO_RAD;
  const centralMeridianRad = centralMeridian * DEG_TO_RAD;
  
  // Calculate UTM parameters using bounded iterations
  const N = WGS84.a / Math.sqrt(1 - WGS84.e2 * Math.sin(latRad) * Math.sin(latRad));
  const T = Math.tan(latRad) * Math.tan(latRad);
  const C = WGS84.e2 * Math.cos(latRad) * Math.cos(latRad) / (1 - WGS84.e2);
  const A = (lngRad - centralMeridianRad) * Math.cos(latRad);
  
  // Calculate meridional arc (bounded Taylor series)
  const M = WGS84.a * (
    (1 - WGS84.e2 / 4 - 3 * WGS84.e2 * WGS84.e2 / 64 - 5 * WGS84.e2 * WGS84.e2 * WGS84.e2 / 256) * latRad
    - (3 * WGS84.e2 / 8 + 3 * WGS84.e2 * WGS84.e2 / 32 + 45 * WGS84.e2 * WGS84.e2 * WGS84.e2 / 1024) * Math.sin(2 * latRad)
    + (15 * WGS84.e2 * WGS84.e2 / 256 + 45 * WGS84.e2 * WGS84.e2 * WGS84.e2 / 1024) * Math.sin(4 * latRad)
    - (35 * WGS84.e2 * WGS84.e2 * WGS84.e2 / 3072) * Math.sin(6 * latRad)
  );
  
  // Calculate UTM coordinates (bounded power series)
  const easting = WGS84.k0 * N * (
    A + (1 - T + C) * A * A * A / 6
    + (5 - 18 * T + T * T + 72 * C - 58 * WGS84.e2) * A * A * A * A * A / 120
  ) + 500000; // False easting
  
  const northing = WGS84.k0 * (
    M + N * Math.tan(latRad) * (
      A * A / 2
      + (5 - T + 9 * C + 4 * C * C) * A * A * A * A / 24
      + (61 - 58 * T + T * T + 600 * C - 330 * WGS84.e2) * A * A * A * A * A * A / 720
    )
  );
  
  // Apply false northing for southern hemisphere
  const adjustedNorthing = lat < 0 ? northing + 10000000 : northing;
  
  return {
    zone,
    hemisphere: lat >= 0 ? 'N' : 'S',
    easting: Math.round(easting * 100) / 100,
    northing: Math.round(adjustedNorthing * 100) / 100
  };
}

// NASA JPL Rule 1: Simple control flow - no recursion
function utmToLatLng(zone, hemisphere, easting, northing) {
  // Validate inputs
  assert(zone >= 1 && zone <= 60, 'Invalid UTM zone');
  assert(hemisphere === 'N' || hemisphere === 'S', 'Invalid hemisphere');
  assert(!isNaN(easting) && !isNaN(northing), 'Invalid UTM coordinates');
  
  // Remove false northing/easting
  const x = easting - 500000;
  const y = hemisphere === 'S' ? northing - 10000000 : northing;
  
  // Calculate footpoint latitude (bounded iteration)
  const M = y / WGS84.k0;
  const mu = M / (WGS84.a * (1 - WGS84.e2 / 4 - 3 * WGS84.e2 * WGS84.e2 / 64 - 5 * WGS84.e2 * WGS84.e2 * WGS84.e2 / 256));
  
  const e1 = (1 - Math.sqrt(1 - WGS84.e2)) / (1 + Math.sqrt(1 - WGS84.e2));
  const footprintLat = mu
    + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu)
    + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu)
    + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu)
    + (1097 * e1 * e1 * e1 * e1 / 512) * Math.sin(8 * mu);
  
  // Calculate latitude and longitude (bounded series)
  const N = WGS84.a / Math.sqrt(1 - WGS84.e2 * Math.sin(footprintLat) * Math.sin(footprintLat));
  const T = Math.tan(footprintLat) * Math.tan(footprintLat);
  const C = WGS84.e2 * Math.cos(footprintLat) * Math.cos(footprintLat) / (1 - WGS84.e2);
  const R = WGS84.a * (1 - WGS84.e2) / Math.pow(1 - WGS84.e2 * Math.sin(footprintLat) * Math.sin(footprintLat), 1.5);
  const D = x / (N * WGS84.k0);
  
  const lat = footprintLat - (N * Math.tan(footprintLat) / R) * (
    D * D / 2
    - (5 + 3 * T + 10 * C - 4 * C * C - 9 * WGS84.e2) * D * D * D * D / 24
    + (61 + 90 * T + 298 * C + 45 * T * T - 252 * WGS84.e2 - 3 * C * C) * D * D * D * D * D * D / 720
  );
  
  const lng = UTM_ZONES[zone - 1] * DEG_TO_RAD + (
    D
    - (1 + 2 * T + C) * D * D * D / 6
    + (5 - 2 * C + 28 * T - 3 * C * C + 8 * WGS84.e2 + 24 * T * T) * D * D * D * D * D / 120
  ) / Math.cos(footprintLat);
  
  return {
    lat: lat * RAD_TO_DEG,
    lng: lng * RAD_TO_DEG
  };
}

// NASA JPL Rule 4: Short function for UTM to MGRS conversion
function utmToMGRS(zone, hemisphere, easting, northing, precision) {
  // Validate inputs
  assert(zone >= 1 && zone <= 60, 'Invalid UTM zone');
  assert(precision >= 1 && precision <= 5, 'Invalid MGRS precision');
  
  // Get latitude band letter
  const { lat } = utmToLatLng(zone, hemisphere, easting, northing);
  const bandIndex = Math.floor((lat + 80) / 8);
  const bandLetter = MGRS_BAND_LETTERS[Math.max(0, Math.min(bandIndex, MGRS_BAND_LETTERS.length - 1))];
  
  // Calculate 100km grid square
  const set = ((zone - 1) % 6) + 1;
  const colIndex = Math.floor(easting / 100000) - 1;
  const rowIndex = Math.floor(northing / 100000) % 20;
  
  // Apply MGRS letter shift rules (bounded lookup)
  const colLetter = MGRS_COL_LETTERS[(colIndex + (set - 1) * 8) % 24];
  const rowLetter = MGRS_ROW_LETTERS[(rowIndex + (set % 2 === 0 ? 5 : 0)) % 20];
  
  // Format coordinates based on precision
  const factor = Math.pow(10, 5 - precision);
  const mgrsEasting = Math.floor((easting % 100000) / factor);
  const mgrsNorthing = Math.floor((northing % 100000) / factor);
  
  return {
    gridZone: `${zone}${bandLetter}`,
    gridSquare: `${colLetter}${rowLetter}`,
    easting: mgrsEasting,
    northing: mgrsNorthing,
    precision
  };
}

// NASA JPL Rule 4: Short function for MGRS to UTM conversion
function mgrsToUTM(gridZone, gridSquare, easting, northing, precision) {
  // Validate inputs
  assert(gridZone && gridZone.match(/^\d{1,2}[A-Z]$/), 'Invalid MGRS grid zone');
  assert(gridSquare && gridSquare.match(/^[A-Z]{2}$/), 'Invalid MGRS grid square');
  assert(precision >= 1 && precision <= 5, 'Invalid MGRS precision');
  
  // Parse zone and band
  const zone = parseInt(gridZone.slice(0, -1));
  const bandLetter = gridZone.slice(-1);
  const bandIndex = MGRS_BAND_LETTERS.indexOf(bandLetter);
  
  assert(zone >= 1 && zone <= 60, 'Invalid UTM zone in MGRS');
  assert(bandIndex >= 0, 'Invalid band letter in MGRS');
  
  // Parse grid square letters
  const colLetter = gridSquare[0];
  const rowLetter = gridSquare[1];
  const set = ((zone - 1) % 6) + 1;
  
  // Calculate 100km square indices (bounded search)
  let colIndex = -1;
  let rowIndex = -1;
  
  // NASA JPL Rule 2: Bounded loop
  for (let i = 0; i < 24; i++) {
    if (MGRS_COL_LETTERS[(i + (set - 1) * 8) % 24] === colLetter) {
      colIndex = i;
      break;
    }
  }
  
  // NASA JPL Rule 2: Bounded loop
  for (let i = 0; i < 20; i++) {
    if (MGRS_ROW_LETTERS[(i + (set % 2 === 0 ? 5 : 0)) % 20] === rowLetter) {
      rowIndex = i;
      break;
    }
  }
  
  assert(colIndex >= 0 && rowIndex >= 0, 'Invalid MGRS grid square letters');
  
  // Calculate UTM coordinates
  const factor = Math.pow(10, 5 - precision);
  const utmEasting = (colIndex + 1) * 100000 + easting * factor + factor / 2;
  const utmNorthing = rowIndex * 100000 + northing * factor + factor / 2;
  
  // Determine hemisphere from band letter
  const hemisphere = bandIndex >= 10 ? 'N' : 'S';
  
  return {
    zone,
    hemisphere,
    easting: utmEasting,
    northing: hemisphere === 'S' ? utmNorthing + 10000000 : utmNorthing
  };
}

// NASA JPL Rule 4: Process single coordinate conversion
function processSingleConversion(data) {
  const { coordinates, fromFormat, toFormat, options } = data;
  
  try {
    let result;
    
    // Parse input based on format
    switch (fromFormat) {
      case 'latlong': {
        const match = coordinates.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
        assert(match, 'Invalid lat/long format');
        
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        
        if (toFormat === 'utm') {
          result = latLngToUTM(lat, lng);
        } else if (toFormat === 'mgrs') {
          const utm = latLngToUTM(lat, lng);
          result = utmToMGRS(utm.zone, utm.hemisphere, utm.easting, utm.northing, options.precision || 5);
        }
        break;
      }
      
      case 'utm': {
        const match = coordinates.match(/^(\d{1,2})([NS])\s+(\d+\.?\d*)\s+(\d+\.?\d*)$/i);
        assert(match, 'Invalid UTM format');
        
        const zone = parseInt(match[1]);
        const hemisphere = match[2].toUpperCase();
        const easting = parseFloat(match[3]);
        const northing = parseFloat(match[4]);
        
        if (toFormat === 'latlong') {
          result = utmToLatLng(zone, hemisphere, easting, northing);
        } else if (toFormat === 'mgrs') {
          result = utmToMGRS(zone, hemisphere, easting, northing, options.precision || 5);
        }
        break;
      }
      
      case 'mgrs': {
        const match = coordinates.match(/^(\d{1,2}[A-Z])([A-Z]{2})(\d+)$/i);
        assert(match, 'Invalid MGRS format');
        
        const gridZone = match[1].toUpperCase();
        const gridSquare = match[2].toUpperCase();
        const digits = match[3];
        
        assert(digits.length % 2 === 0, 'MGRS coordinates must have even number of digits');
        
        const precision = digits.length / 2;
        const halfLength = digits.length / 2;
        const easting = parseInt(digits.substring(0, halfLength));
        const northing = parseInt(digits.substring(halfLength));
        
        const utm = mgrsToUTM(gridZone, gridSquare, easting, northing, precision);
        
        if (toFormat === 'latlong') {
          result = utmToLatLng(utm.zone, utm.hemisphere, utm.easting, utm.northing);
        } else if (toFormat === 'utm') {
          result = utm;
        }
        break;
      }
      
      default:
        throw new Error(`Unsupported format: ${fromFormat}`);
    }
    
    return {
      success: true,
      result,
      format: toFormat
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// NASA JPL Rule 2: Process batch conversions with bounded operations
function processBatchConversion(data) {
  const { coordinates, fromFormat, toFormat, options } = data;
  const results = [];
  let processedCount = 0;
  
  // NASA JPL Rule 2: Limit batch size
  const maxBatchSize = 10000;
  const actualBatchSize = Math.min(coordinates.length, maxBatchSize);
  
  // Process in chunks to allow progress reporting
  const chunkSize = 100;
  const totalChunks = Math.ceil(actualBatchSize / chunkSize);
  
  // NASA JPL Rule 2: Bounded loop
  for (let chunk = 0; chunk < totalChunks; chunk++) {
    const start = chunk * chunkSize;
    const end = Math.min(start + chunkSize, actualBatchSize);
    
    // NASA JPL Rule 2: Bounded inner loop
    for (let i = start; i < end; i++) {
      const result = processSingleConversion({
        coordinates: coordinates[i],
        fromFormat,
        toFormat,
        options
      });
      
      results.push(result);
      processedCount++;
    }
    
    // Report progress every 100 items
    if (processedCount % 100 === 0 || processedCount === actualBatchSize) {
      self.postMessage({
        type: 'progress',
        data: {
          progress: processedCount / actualBatchSize,
          processed: processedCount,
          total: actualBatchSize
        }
      });
    }
  }
  
  return results;
}

// NASA JPL Rule 5: Message handler with input validation
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  // Validate message structure
  if (!type || !data) {
    self.postMessage({
      type: 'error',
      error: 'Invalid message format'
    });
    return;
  }
  
  try {
    switch (type) {
      case 'convert': {
        // Single coordinate conversion
        const result = processSingleConversion(data);
        
        self.postMessage({
          type: 'result',
          data: result
        });
        break;
      }
      
      case 'batch': {
        // Batch conversion with progress reporting
        assert(Array.isArray(data.coordinates), 'Batch conversion requires array of coordinates');
        
        const results = processBatchConversion(data);
        
        self.postMessage({
          type: 'batch-result',
          data: {
            success: true,
            results
          }
        });
        break;
      }
      
      case 'test': {
        // Self-test for validation
        const tests = [
          { lat: 40.7128, lng: -74.0060, utm: { zone: 18, hemisphere: 'N' } },
          { lat: -33.8688, lng: 151.2093, utm: { zone: 56, hemisphere: 'S' } },
          { lat: 51.5074, lng: -0.1278, utm: { zone: 30, hemisphere: 'N' } }
        ];
        
        const testResults = tests.map(test => {
          const utm = latLngToUTM(test.lat, test.lng);
          const backToLatLng = utmToLatLng(utm.zone, utm.hemisphere, utm.easting, utm.northing);
          
          return {
            input: test,
            utm,
            backToLatLng,
            error: Math.abs(backToLatLng.lat - test.lat) + Math.abs(backToLatLng.lng - test.lng)
          };
        });
        
        self.postMessage({
          type: 'test-result',
          data: testResults
        });
        break;
      }
      
      default:
        self.postMessage({
          type: 'error',
          error: `Unknown message type: ${type}`
        });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message || 'Unknown error occurred'
    });
  }
});
