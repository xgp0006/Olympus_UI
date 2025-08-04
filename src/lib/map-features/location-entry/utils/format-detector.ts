import type { CoordinateFormat } from '$lib/map-features/types';

// Pre-compiled patterns for performance
const FORMAT_PATTERNS = {
  // Lat/Long patterns
  decimalDegrees: /^-?\d{1,3}\.?\d*[,\s]+-?\d{1,3}\.?\d*$/,
  dms: /^\d{1,3}°\d{1,2}'\d{1,2}(\.\d+)?"[NS]\s+\d{1,3}°\d{1,2}'\d{1,2}(\.\d+)?"[EW]$/i,
  ddm: /^\d{1,3}°\d{1,2}(\.\d+)?'[NS]\s+\d{1,3}°\d{1,2}(\.\d+)?'[EW]$/i,

  // UTM patterns
  utmStandard: /^\d{1,2}[A-Z]\s+\d{3,7}\s+\d{3,7}$/i,
  utmCompact: /^\d{1,2}[A-Z]\d{6,14}$/i,

  // MGRS pattern
  mgrs: /^\d{1,2}[A-Z]{3}\d{2,10}$/i,

  // What3Words pattern
  what3words: /^[a-z]+\.[a-z]+\.[a-z]+$/i
};

class FormatDetector {
  private detectionCache = new Map<string, CoordinateFormat | null>();
  private cacheSize = 50;

  detect(input: string): CoordinateFormat | null {
    const trimmedInput = input.trim();

    // Check cache first
    const cached = this.detectionCache.get(trimmedInput);
    if (cached !== undefined) {
      return cached;
    }

    let format: CoordinateFormat | null = null;

    // Check What3Words first (most specific pattern)
    if (this.isWhat3Words(trimmedInput)) {
      format = 'what3words';
    }
    // Check MGRS (specific alphanumeric pattern)
    else if (this.isMGRS(trimmedInput)) {
      format = 'mgrs';
    }
    // Check UTM
    else if (this.isUTM(trimmedInput)) {
      format = 'utm';
    }
    // Check Lat/Long last (most general)
    else if (this.isLatLong(trimmedInput)) {
      format = 'latlong';
    }

    // Cache result
    this.cacheResult(trimmedInput, format);

    return format;
  }

  private isLatLong(input: string): boolean {
    return !!(
      FORMAT_PATTERNS.decimalDegrees.test(input) ||
      FORMAT_PATTERNS.dms.test(input) ||
      FORMAT_PATTERNS.ddm.test(input)
    );
  }

  private isUTM(input: string): boolean {
    return !!(FORMAT_PATTERNS.utmStandard.test(input) || FORMAT_PATTERNS.utmCompact.test(input));
  }

  private isMGRS(input: string): boolean {
    return FORMAT_PATTERNS.mgrs.test(input);
  }

  private isWhat3Words(input: string): boolean {
    if (!FORMAT_PATTERNS.what3words.test(input)) {
      return false;
    }

    // Additional validation: exactly 3 words
    const words = input.split('.');
    if (words.length !== 3) {
      return false;
    }

    // Each word should be reasonable length
    return words.every((word) => word.length >= 1 && word.length <= 40);
  }

  private cacheResult(input: string, format: CoordinateFormat | null): void {
    // LRU cache eviction
    if (this.detectionCache.size >= this.cacheSize) {
      const firstKey = this.detectionCache.keys().next().value;
      if (firstKey) {
        this.detectionCache.delete(firstKey);
      }
    }

    this.detectionCache.set(input, format);
  }

  // Performance optimization: batch detection for multiple inputs
  detectBatch(inputs: string[]): (CoordinateFormat | null)[] {
    return inputs.map((input) => this.detect(input));
  }

  // Get confidence score for format detection
  getConfidence(input: string, format: CoordinateFormat): number {
    const detected = this.detect(input);
    if (detected === format) {
      return 1.0;
    }

    // Check if input could potentially match the specified format
    const trimmedInput = input.trim();

    switch (format) {
      case 'latlong':
        // Check if it has characteristics of lat/long
        if (trimmedInput.includes(',') || trimmedInput.includes('°')) {
          return 0.5;
        }
        break;

      case 'utm':
        // Check if it starts with numbers and has a letter
        if (/^\d{1,2}[A-Z]/i.test(trimmedInput)) {
          return 0.5;
        }
        break;

      case 'mgrs':
        // Check if it matches partial MGRS pattern
        if (/^\d{1,2}[A-Z]/i.test(trimmedInput)) {
          return 0.3;
        }
        break;

      case 'what3words':
        // Check if it has dots
        if (trimmedInput.includes('.')) {
          return 0.3;
        }
        break;
    }

    return 0;
  }

  // Clear detection cache
  clearCache(): void {
    this.detectionCache.clear();
  }
}

// Export singleton for optimal performance
export const formatDetector = new FormatDetector();
