/**
 * Parameter service for drone configuration management
 * Handles validation, type conversion, batch operations, and profiles
 * References ArduPilot parameter system and QGroundControl metadata format
 *
 * Theme variables used by consuming components:
 * - --color-param-valid: Valid parameter indicator
 * - --color-param-invalid: Invalid parameter indicator
 * - --color-param-modified: Modified parameter indicator
 * - --color-surface-param-group: Parameter group background
 */

import { invokeTauriCommand, safeTauriInvoke } from '$lib/utils/tauri';
import { showError, showSuccess, showWarning, showInfo } from '$lib/stores/notifications';
import { BoundedArray } from '$lib/utils/bounded-array';
import { ParameterType, DEFAULT_PARAMETER_CONSTRAINTS } from '../types/drone-types';
import type {
  DroneParameter,
  ParameterMetadata,
  ParameterConstraint,
  ParameterGroup,
  ParameterProfile,
  BatchParameterOperation,
  ParameterComparison
} from '../types/drone-types';
import {
  assert,
  assertParam,
  assertDefined,
  assertState,
  assertBounds,
  assertRange,
  assertString,
  assertFinite,
  assertInvariant,
  assertArray,
  assertMemoryLimit,
  AssertionCategory,
  AssertionErrorCode,
  NUMERIC_CONSTANTS,
  MEMORY_LIMITS,
  PERFORMANCE_BUDGETS
} from '$lib/utils/assert';

/**
 * NASA JPL Rule 2: Bounded memory allocation
 */
const MAX_VALIDATION_ERRORS = 50;
const MAX_CONVERSION_CACHE = 200;
const MAX_METADATA_CACHE = 500;
const MAX_PARAMETER_NAME_LENGTH = 64;
const MAX_PARAMETER_DESCRIPTION_LENGTH = 1024;
const MAX_BATCH_OPERATIONS = 100;
const MAX_PROFILE_NAME_LENGTH = 128;
const MAX_STRING_PARAMETER_LENGTH = 256;

/**
 * Critical parameter bounds for safety
 */
const CRITICAL_PARAMETER_BOUNDS = {
  // PID parameters must be positive and bounded
  PID_MIN: 0.0,
  PID_MAX: 50.0,
  // Motor limits
  MOTOR_MIN: 0.0,
  MOTOR_MAX: 1.0,
  // Failsafe thresholds
  VOLTAGE_MIN: 0.0,
  VOLTAGE_MAX: 60.0, // 14S max
  // GPS parameters
  GPS_MIN_SATS: 4,
  GPS_MAX_SATS: 32,
  // Timeout parameters (milliseconds)
  TIMEOUT_MIN: 100,
  TIMEOUT_MAX: 30000
};

/**
 * Parameter metadata cache for performance
 */
const metadataCache = new Map<string, ParameterMetadata>();

/**
 * Type conversion cache
 */
const conversionCache = new Map<string, { from: number; to: number; type: ParameterType }>();

/**
 * Validation error tracking
 */
const validationErrors = new BoundedArray<{
  parameter: string;
  error: string;
  timestamp: number;
}>(MAX_VALIDATION_ERRORS);

// Validate cache initialization
assertParam(metadataCache instanceof Map, 'Metadata cache must be a Map instance');
assertParam(conversionCache instanceof Map, 'Conversion cache must be a Map instance');
assertDefined(validationErrors, 'Validation errors array must be defined');

/**
 * Common parameter groups based on ArduPilot
 */
export const PARAMETER_GROUPS: ParameterGroup[] = [
  // Core groups
  {
    name: 'AHRS',
    description: 'Attitude Heading Reference System',
    parameters: ['AHRS_EKF_TYPE', 'AHRS_GPS_USE', 'AHRS_ORIENTATION', 'AHRS_COMP_BETA'],
    icon: 'compass',
    priority: 1
  },
  {
    name: 'ARMING',
    description: 'Arming checks and safety',
    parameters: ['ARMING_CHECK', 'ARMING_ACCTHRESH', 'ARMING_RUDDER', 'ARMING_MIN_VOLT'],
    icon: 'shield',
    priority: 2
  },
  {
    name: 'BATTERY',
    description: 'Battery monitoring and failsafes',
    parameters: [
      'BATT_MONITOR',
      'BATT_CAPACITY',
      'BATT_LOW_VOLT',
      'BATT_CRT_VOLT',
      'BATT_FS_VOLTSRC'
    ],
    icon: 'battery',
    priority: 3
  },
  {
    name: 'COMPASS',
    description: 'Compass configuration',
    parameters: ['COMPASS_USE', 'COMPASS_AUTODEC', 'COMPASS_MOTCT', 'COMPASS_ORIENT'],
    icon: 'compass',
    priority: 4
  },
  {
    name: 'EKF',
    description: 'Extended Kalman Filter',
    parameters: ['EK3_ENABLE', 'EK3_GPS_TYPE', 'EK3_ALT_SOURCE', 'EK3_MAG_CAL'],
    icon: 'filter',
    priority: 5
  },
  {
    name: 'FAILSAFE',
    description: 'Failsafe behaviors',
    parameters: ['FS_THR_ENABLE', 'FS_THR_VALUE', 'FS_BATT_ENABLE', 'FS_GCS_ENABLE'],
    icon: 'warning',
    priority: 6
  },
  {
    name: 'GPS',
    description: 'GPS configuration',
    parameters: ['GPS_TYPE', 'GPS_HDOP_GOOD', 'GPS_MIN_SATS', 'GPS_RATE_MS'],
    icon: 'satellite',
    priority: 7
  },
  {
    name: 'INS',
    description: 'Inertial Navigation System',
    parameters: ['INS_ACC_BODYFIX', 'INS_ACCEL_FILTER', 'INS_GYRO_FILTER', 'INS_FAST_SAMPLE'],
    icon: 'gyroscope',
    priority: 8
  },
  {
    name: 'MOTORS',
    description: 'Motor and ESC configuration',
    parameters: ['MOT_SPIN_MIN', 'MOT_SPIN_ARM', 'MOT_SPIN_MAX', 'MOT_THST_EXPO', 'MOT_PWM_TYPE'],
    icon: 'motor',
    priority: 9
  },
  {
    name: 'RC',
    description: 'Radio control settings',
    parameters: ['RC1_MIN', 'RC1_MAX', 'RC1_TRIM', 'RC_SPEED', 'RC_PROTOCOLS'],
    icon: 'radio',
    priority: 10
  },
  {
    name: 'TUNE',
    description: 'PID tuning parameters',
    parameters: ['ATC_RAT_RLL_P', 'ATC_RAT_PIT_P', 'ATC_RAT_YAW_P', 'ATC_ANG_RLL_P'],
    icon: 'tune',
    priority: 11
  }
];

/**
 * Parameter validation rules based on ArduPilot
 */
const PARAMETER_VALIDATION_RULES: Record<string, ParameterConstraint> = {
  // Motor parameters
  MOT_SPIN_MIN: {
    min: 0.0,
    max: 0.3,
    errorMessage: 'Motor spin minimum must be between 0 and 0.3'
  },
  MOT_SPIN_ARM: {
    min: 0.0,
    max: 0.3,
    validator: (value) => value >= getParameterValue('MOT_SPIN_MIN'),
    errorMessage: 'Motor spin armed must be >= MOT_SPIN_MIN'
  },
  MOT_SPIN_MAX: {
    min: 0.9,
    max: 1.0,
    errorMessage: 'Motor spin maximum must be between 0.9 and 1.0'
  },

  // Battery parameters
  BATT_LOW_VOLT: {
    min: 0.0,
    max: 50.0,
    validator: (value) => value > getParameterValue('BATT_CRT_VOLT'),
    errorMessage: 'Low voltage must be > critical voltage'
  },
  BATT_CRT_VOLT: {
    min: 0.0,
    max: 50.0,
    errorMessage: 'Critical voltage must be between 0 and 50V'
  },

  // GPS parameters
  GPS_MIN_SATS: {
    min: 4,
    max: 10,
    errorMessage: 'Minimum satellites must be between 4 and 10'
  },
  GPS_HDOP_GOOD: {
    min: 100,
    max: 900,
    errorMessage: 'HDOP good must be between 100 and 900'
  }
};

/**
 * NASA JPL Rule 4: Split function - Get parameter value for validation
 */
function getParameterValue(name: string): number {
  // Validate parameter name
  assertString(name, 1, MAX_PARAMETER_NAME_LENGTH);

  // This would interface with the parameter store
  // Simplified for now - in production this would access the actual store
  const value = 0; // Placeholder

  // Validate returned value
  assertFinite(value, `Parameter ${name} value must be finite`);

  return value;
}

/**
 * NASA JPL Rule 4: Split function - Convert parameter value by type
 */
function convertParameterValue(
  value: number,
  fromType: ParameterType,
  toType: ParameterType
): number {
  // Validate inputs
  assertFinite(value, 'Conversion input value must be finite');
  assertDefined(fromType, 'From type must be defined');
  assertDefined(toType, 'To type must be defined');
  assertParam(Object.values(ParameterType).includes(fromType), `Invalid from type: ${fromType}`);
  assertParam(Object.values(ParameterType).includes(toType), `Invalid to type: ${toType}`);

  // Check cache
  const cacheKey = `${value}_${fromType}_${toType}`;
  assertString(cacheKey, 1, 256);

  const cached = conversionCache.get(cacheKey);
  if (cached) {
    assertFinite(cached.to, 'Cached conversion value must be finite');
    return cached.to;
  }

  let converted = value;

  // Type conversion logic with validation
  if (fromType === toType) {
    converted = value;
  } else if (toType === ParameterType.UINT8) {
    assertRange(value, -1e10, 1e10, 'Value too large for UINT8 conversion');
    converted = Math.max(0, Math.min(255, Math.round(value)));
    assertRange(converted, 0, 255, 'UINT8 conversion out of bounds');
  } else if (toType === ParameterType.INT8) {
    assertRange(value, -1e10, 1e10, 'Value too large for INT8 conversion');
    converted = Math.max(-128, Math.min(127, Math.round(value)));
    assertRange(converted, -128, 127, 'INT8 conversion out of bounds');
  } else if (toType === ParameterType.UINT16) {
    assertRange(value, -1e10, 1e10, 'Value too large for UINT16 conversion');
    converted = Math.max(0, Math.min(65535, Math.round(value)));
    assertRange(converted, 0, 65535, 'UINT16 conversion out of bounds');
  } else if (toType === ParameterType.INT16) {
    assertRange(value, -1e10, 1e10, 'Value too large for INT16 conversion');
    converted = Math.max(-32768, Math.min(32767, Math.round(value)));
    assertRange(converted, -32768, 32767, 'INT16 conversion out of bounds');
  } else if (toType === ParameterType.UINT32) {
    assertRange(value, -1e10, 1e10, 'Value too large for UINT32 conversion');
    converted = Math.max(0, Math.min(4294967295, Math.round(value)));
    assertRange(converted, 0, 4294967295, 'UINT32 conversion out of bounds');
  } else if (toType === ParameterType.INT32) {
    assertRange(value, -1e10, 1e10, 'Value too large for INT32 conversion');
    converted = Math.max(-2147483648, Math.min(2147483647, Math.round(value)));
    assertRange(converted, -2147483648, 2147483647, 'INT32 conversion out of bounds');
  } else if (toType === ParameterType.FLOAT || toType === ParameterType.DOUBLE) {
    assertFinite(value, 'Float/Double conversion requires finite value');
    converted = value; // No conversion needed for floats
  } else {
    throw new Error(`Unsupported parameter type: ${toType}`);
  }

  // Validate conversion result
  assertFinite(converted, 'Conversion result must be finite');

  // Cache result with size validation
  assertBounds(conversionCache.size, 0, MAX_CONVERSION_CACHE + 1, 'Conversion cache size exceeded');

  if (conversionCache.size < MAX_CONVERSION_CACHE) {
    conversionCache.set(cacheKey, { from: value, to: converted, type: toType });

    // Validate cache entry
    const cached = conversionCache.get(cacheKey);
    assertDefined(cached, 'Failed to cache conversion result');
    assertParam(
      cached.from === value && cached.to === converted && cached.type === toType,
      'Cache entry validation failed'
    );
  }

  return converted;
}

/**
 * NASA JPL Rule 4: Validate type constraints
 */
function validateTypeConstraints(
  parameter: DroneParameter,
  value: number,
  errors: string[]
): void {
  const typeConstraint = DEFAULT_PARAMETER_CONSTRAINTS[parameter.type];
  assertDefined(typeConstraint, `No default constraints for type ${parameter.type}`);

  if (typeConstraint.min !== undefined && typeConstraint.max !== undefined) {
    assertFinite(typeConstraint.min, 'Type constraint min must be finite');
    assertFinite(typeConstraint.max, 'Type constraint max must be finite');
    assertParam(typeConstraint.min <= typeConstraint.max, 'Type constraint min must be <= max');

    if (value < typeConstraint.min || value > typeConstraint.max) {
      errors.push(`Value must be between ${typeConstraint.min} and ${typeConstraint.max}`);
    }
  }
}

/**
 * NASA JPL Rule 4: Validate custom constraints
 */
function validateCustomConstraints(
  parameter: DroneParameter,
  value: number,
  constraint: ParameterConstraint | undefined,
  errors: string[]
): void {
  const customConstraint = constraint || PARAMETER_VALIDATION_RULES[parameter.name];
  if (!customConstraint) return;

  // Validate min constraint
  if (customConstraint.min !== undefined) {
    assertFinite(customConstraint.min, 'Custom constraint min must be finite');
    if (value < customConstraint.min) {
      const errorMsg = customConstraint.errorMessage || `Value must be >= ${customConstraint.min}`;
      assertString(errorMsg, 1, 256);
      errors.push(errorMsg);
    }
  }

  // Validate max constraint
  if (customConstraint.max !== undefined) {
    assertFinite(customConstraint.max, 'Custom constraint max must be finite');
    if (value > customConstraint.max) {
      const errorMsg = customConstraint.errorMessage || `Value must be <= ${customConstraint.max}`;
      assertString(errorMsg, 1, 256);
      errors.push(errorMsg);
    }
  }

  // Validate allowed values
  if (customConstraint.allowedValues) {
    assertArray(customConstraint.allowedValues, 1, 100);
    customConstraint.allowedValues.forEach((v) => {
      assertFinite(v, 'Allowed value must be finite');
    });

    if (!customConstraint.allowedValues.includes(value)) {
      errors.push(`Value must be one of: ${customConstraint.allowedValues.join(', ')}`);
    }
  }

  // Validate custom validator function
  if (customConstraint.validator) {
    assertParam(typeof customConstraint.validator === 'function', 'Validator must be a function');
    try {
      const isValid = customConstraint.validator(value);
      assertParam(typeof isValid === 'boolean', 'Validator must return boolean');

      if (!isValid) {
        const errorMsg = customConstraint.errorMessage || 'Value validation failed';
        assertString(errorMsg, 1, 256);
        errors.push(errorMsg);
      }
    } catch (error) {
      console.error('Validator function error:', error);
      errors.push('Validator function failed');
    }
  }
}

/**
 * NASA JPL Rule 4: Validate metadata constraints
 */
function validateMetadataConstraints(
  parameter: DroneParameter,
  value: number,
  errors: string[]
): void {
  if (!parameter.metadata) return;
  assertDefined(parameter.metadata, 'Parameter metadata is undefined');

  // Validate metadata min
  if (parameter.metadata.min !== undefined) {
    assertFinite(parameter.metadata.min, 'Metadata min must be finite');
    if (value < parameter.metadata.min) {
      const units = parameter.metadata.units || '';
      if (units) assertString(units, 0, 32);
      errors.push(`Value must be >= ${parameter.metadata.min} ${units}`.trim());
    }
  }

  // Validate metadata max
  if (parameter.metadata.max !== undefined) {
    assertFinite(parameter.metadata.max, 'Metadata max must be finite');
    if (value > parameter.metadata.max) {
      const units = parameter.metadata.units || '';
      if (units) assertString(units, 0, 32);
      errors.push(`Value must be <= ${parameter.metadata.max} ${units}`.trim());
    }
  }

  // Validate min <= max if both defined
  if (parameter.metadata.min !== undefined && parameter.metadata.max !== undefined) {
    assertParam(
      parameter.metadata.min <= parameter.metadata.max,
      `Metadata min ${parameter.metadata.min} must be <= max ${parameter.metadata.max}`
    );
  }
}

/**
 * NASA JPL Rule 4: Validate critical parameter safety
 */
function validateCriticalParameterSafety(
  parameter: DroneParameter,
  value: number,
  errors: string[]
): void {
  if (parameter.name.startsWith('MOT_')) {
    // Motor parameters must be within safe bounds
    assertRange(
      value,
      CRITICAL_PARAMETER_BOUNDS.MOTOR_MIN,
      CRITICAL_PARAMETER_BOUNDS.MOTOR_MAX,
      `Motor parameter ${parameter.name} out of safe bounds`
    );
  } else if (
    parameter.name.includes('_P') ||
    parameter.name.includes('_I') ||
    parameter.name.includes('_D')
  ) {
    // PID parameters must be positive and bounded
    assertRange(
      value,
      CRITICAL_PARAMETER_BOUNDS.PID_MIN,
      CRITICAL_PARAMETER_BOUNDS.PID_MAX,
      `PID parameter ${parameter.name} out of safe bounds`
    );
  } else if (parameter.name.includes('VOLT')) {
    // Voltage parameters must be within safe bounds
    assertRange(
      value,
      CRITICAL_PARAMETER_BOUNDS.VOLTAGE_MIN,
      CRITICAL_PARAMETER_BOUNDS.VOLTAGE_MAX,
      `Voltage parameter ${parameter.name} out of safe bounds`
    );
  } else if (parameter.name === 'GPS_MIN_SATS') {
    // GPS minimum satellites must be reasonable
    assertRange(
      value,
      CRITICAL_PARAMETER_BOUNDS.GPS_MIN_SATS,
      CRITICAL_PARAMETER_BOUNDS.GPS_MAX_SATS,
      `GPS parameter ${parameter.name} out of safe bounds`
    );
  }
}

/**
 * NASA JPL Rule 4: Split function - Validate parameter constraints
 */
function validateConstraints(
  parameter: DroneParameter,
  value: number,
  constraint?: ParameterConstraint
): { valid: boolean; errors: string[] } {
  // Validate inputs
  assertDefined(parameter, 'Parameter must be defined for validation');
  assertString(parameter.name, 1, MAX_PARAMETER_NAME_LENGTH);
  assertFinite(value, `Value for ${parameter.name} must be finite`);

  const errors: string[] = [];

  // Validate parameter type
  assertParam(
    Object.values(ParameterType).includes(parameter.type),
    `Invalid parameter type: ${parameter.type}`
  );

  // Validate using helper functions
  validateTypeConstraints(parameter, value, errors);
  validateCustomConstraints(parameter, value, constraint, errors);
  validateMetadataConstraints(parameter, value, errors);
  validateCriticalParameterSafety(parameter, value, errors);

  // Record validation errors with bounds checking
  assertBounds(errors.length, 0, 100, 'Too many validation errors');

  errors.forEach((error) => {
    assertString(error, 1, 512);

    // Check validation errors array bounds
    assertBounds(validationErrors.size(), 0, MAX_VALIDATION_ERRORS, 'Validation error buffer full');

    validationErrors.push({
      parameter: parameter.name,
      error,
      timestamp: Date.now()
    });
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Parameter service class
 */
export class ParameterService {
  /**
   * Load parameter metadata from QGroundControl format
   */
  async loadParameterMetadata(): Promise<Map<string, ParameterMetadata>> {
    try {
      const metadata = await safeTauriInvoke<ParameterMetadata[]>(
        'get_parameter_metadata',
        undefined,
        { showNotification: false }
      );

      // Validate metadata array
      if (metadata) {
        assertArray(metadata, 0, 10000);

        // Clear and repopulate cache
        metadataCache.clear();

        metadata.forEach((meta, index) => {
          // Validate metadata entry
          assertDefined(meta, `Metadata entry ${index} is undefined`);
          assertString(meta.name, 1, MAX_PARAMETER_NAME_LENGTH);
          assertString(meta.description, 1, MAX_PARAMETER_DESCRIPTION_LENGTH);
          assertParam(
            Object.values(ParameterType).includes(meta.type),
            `Invalid parameter type: ${meta.type}`
          );
          assertFinite(meta.defaultValue, `Default value for ${meta.name} must be finite`);

          // Validate optional numeric fields
          if (meta.min !== undefined) {
            assertFinite(meta.min, `Min value for ${meta.name} must be finite`);
          }
          if (meta.max !== undefined) {
            assertFinite(meta.max, `Max value for ${meta.name} must be finite`);
          }
          if (meta.increment !== undefined) {
            assertFinite(meta.increment, `Increment for ${meta.name} must be finite`);
            assertParam(meta.increment > 0, `Increment for ${meta.name} must be positive`);
          }

          // Validate min <= max if both defined
          if (meta.min !== undefined && meta.max !== undefined) {
            assertParam(
              meta.min <= meta.max,
              `Min ${meta.min} must be <= max ${meta.max} for ${meta.name}`
            );
          }

          // Cache with size check
          assertBounds(metadataCache.size, 0, MAX_METADATA_CACHE, 'Metadata cache size exceeded');

          if (metadataCache.size < MAX_METADATA_CACHE) {
            metadataCache.set(meta.name, meta);

            // Verify cache entry
            const cached = metadataCache.get(meta.name);
            assertDefined(cached, `Failed to cache metadata for ${meta.name}`);
          }
        });

        showInfo('Metadata Loaded', `Loaded metadata for ${metadata.length} parameters`);
      }

      return metadataCache;
    } catch (error) {
      console.error('Failed to load parameter metadata:', error);
      return metadataCache;
    }
  }

  /**
   * Validate parameter value
   */
  validateParameter(
    parameter: DroneParameter,
    value: number,
    constraint?: ParameterConstraint
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    // Validate inputs
    assertDefined(parameter, 'Parameter must be defined');
    assertString(parameter.name, 1, MAX_PARAMETER_NAME_LENGTH);
    assertFinite(value, `Value for ${parameter.name} must be finite`);

    const warnings: string[] = [];

    // Basic validation
    const validation = validateConstraints(parameter, value, constraint);

    // Additional checks with validation
    if (parameter.metadata) {
      assertDefined(parameter.metadata, 'Parameter metadata is undefined');

      // Check if reboot required
      if (parameter.metadata.rebootRequired) {
        assertParam(
          typeof parameter.metadata.rebootRequired === 'boolean',
          'rebootRequired must be boolean'
        );
        warnings.push('Changing this parameter requires a reboot');
      }

      // Check if volatile
      if (parameter.metadata.volatile) {
        assertParam(typeof parameter.metadata.volatile === 'boolean', 'volatile must be boolean');
        warnings.push('This parameter may change during flight');
      }

      // Check increment
      if (parameter.metadata.increment) {
        assertFinite(parameter.metadata.increment, 'Increment must be finite');
        assertParam(parameter.metadata.increment > 0, 'Increment must be positive');

        const remainder = value % parameter.metadata.increment;
        if (Math.abs(remainder) > 0.0001) {
          warnings.push(`Value should be a multiple of ${parameter.metadata.increment}`);
        }
      }
    }

    // Validate warning array bounds
    assertBounds(warnings.length, 0, 50, 'Too many warnings generated');

    return {
      valid: validation.valid,
      errors: validation.errors,
      warnings
    };
  }

  /**
   * Convert parameter value between types
   */
  convertParameter(value: number, fromType: ParameterType, toType: ParameterType): number {
    // Validate inputs before delegation
    assertFinite(value, 'Conversion value must be finite');
    assertDefined(fromType, 'From type must be defined');
    assertDefined(toType, 'To type must be defined');

    return convertParameterValue(value, fromType, toType);
  }

  /**
   * Validate batch operation
   */
  async validateBatchOperation(
    operation: BatchParameterOperation,
    parameters: Map<string, DroneParameter>
  ): Promise<{ valid: boolean; errors: Map<string, string[]> }> {
    // Validate inputs
    assertDefined(operation, 'Batch operation must be defined');
    assertDefined(parameters, 'Parameters map must be defined');
    assertParam(parameters instanceof Map, 'Parameters must be a Map instance');
    assertArray(operation.parameters, 1, MAX_BATCH_OPERATIONS);

    const errors = new Map<string, string[]>();

    for (const [index, { name, value }] of operation.parameters.entries()) {
      // Validate batch parameter entry
      assertBounds(index, 0, operation.parameters.length);
      assertString(name, 1, MAX_PARAMETER_NAME_LENGTH);
      assertFinite(value, `Batch value for ${name} must be finite`);

      const parameter = parameters.get(name);
      if (!parameter) {
        errors.set(name, ['Parameter not found']);
        continue;
      }

      const validation = this.validateParameter(parameter, value);
      if (!validation.valid) {
        // Validate errors array
        assertArray(validation.errors, 1, 50);
        validation.errors.forEach((err) => assertString(err, 1, 512));

        errors.set(name, validation.errors);
      }
    }

    // Validate error map size
    assertBounds(
      errors.size,
      0,
      operation.parameters.length,
      'Error count exceeds parameter count'
    );

    return { valid: errors.size === 0, errors };
  }

  /**
   * Create parameter profile
   */
  async createProfile(
    name: string,
    description: string,
    parameters: Map<string, DroneParameter>
  ): Promise<ParameterProfile> {
    // Validate inputs
    assertString(name, 1, MAX_PROFILE_NAME_LENGTH);
    assertString(description, 0, MAX_PARAMETER_DESCRIPTION_LENGTH);
    assertDefined(parameters, 'Parameters map must be defined');
    assertParam(parameters instanceof Map, 'Parameters must be a Map instance');
    assertBounds(parameters.size, 0, 1000, 'Too many parameters in profile');

    const profile: ParameterProfile = {
      id: `profile-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name,
      description,
      parameters: {},
      created: Date.now(),
      modified: Date.now()
    };

    // Validate profile ID
    assertString(profile.id, 1, 128);

    // Add parameter values with validation
    parameters.forEach((param, key) => {
      assertDefined(param, `Parameter ${key} is undefined`);
      assertString(key, 1, MAX_PARAMETER_NAME_LENGTH);
      assertFinite(param.value, `Parameter ${key} value must be finite`);

      profile.parameters[key] = param.value;
    });

    // Validate profile parameters object
    assertDefined(profile.parameters, 'Profile parameters object is undefined');
    assertBounds(
      Object.keys(profile.parameters).length,
      0,
      1000,
      'Profile parameter count exceeded'
    );

    try {
      await invokeTauriCommand('save_parameter_profile', { profile });
      showSuccess('Profile Created', `Created parameter profile: ${name}`);
      return profile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create profile';
      showError('Profile Creation Failed', errorMessage);
      throw error;
    }
  }

  /**
   * Compare parameters between profiles
   */
  compareProfiles(profile1: ParameterProfile, profile2: ParameterProfile): ParameterComparison[] {
    // Validate inputs
    assertDefined(profile1, 'Profile 1 must be defined');
    assertDefined(profile2, 'Profile 2 must be defined');
    assertDefined(profile1.parameters, 'Profile 1 parameters must be defined');
    assertDefined(profile2.parameters, 'Profile 2 parameters must be defined');

    const comparisons: ParameterComparison[] = [];
    const allParams = new Set([
      ...Object.keys(profile1.parameters),
      ...Object.keys(profile2.parameters)
    ]);

    // Validate parameter count
    assertBounds(allParams.size, 0, 2000, 'Combined parameter count too large');

    allParams.forEach((name) => {
      assertString(name, 1, MAX_PARAMETER_NAME_LENGTH);

      const value1 = profile1.parameters[name] || 0;
      const value2 = profile2.parameters[name] || 0;

      assertFinite(value1, `Profile 1 value for ${name} must be finite`);
      assertFinite(value2, `Profile 2 value for ${name} must be finite`);

      const isDifferent = Math.abs(value1 - value2) > NUMERIC_CONSTANTS.EPSILON;

      let percentDifference: number | undefined;
      if (value2 !== 0) {
        percentDifference = Math.abs((value1 - value2) / value2) * 100;
        assertFinite(percentDifference, 'Percent difference must be finite');
        assertRange(percentDifference, 0, 1e6, 'Percent difference out of bounds');
      }

      comparisons.push({
        name,
        currentValue: value1,
        compareValue: value2,
        isDifferent,
        percentDifference
      });
    });

    // Validate comparisons array
    assertArray(comparisons, 0, 2000);

    return comparisons.sort((a, b) => {
      // Sort by difference magnitude
      const diffA = Math.abs(a.currentValue - a.compareValue);
      const diffB = Math.abs(b.currentValue - b.compareValue);
      return diffB - diffA;
    });
  }

  /**
   * Export parameters to ArduPilot format
   */
  async exportToArduPilot(
    parameters: Map<string, DroneParameter>,
    filename?: string
  ): Promise<void> {
    // Validate inputs
    assertDefined(parameters, 'Parameters map must be defined');
    assertParam(parameters instanceof Map, 'Parameters must be a Map instance');
    assertBounds(parameters.size, 0, 10000, 'Too many parameters to export');

    if (filename) {
      assertString(filename, 1, 256);
      // Validate filename format
      assertParam(
        /^[\w\-. ]+\.param$/i.test(filename),
        'Invalid filename format - must end with .param'
      );
    }

    const lines: string[] = ['# ArduPilot parameter file'];

    // Group parameters with validation
    const grouped = new Map<string, DroneParameter[]>();
    parameters.forEach((param, key) => {
      assertDefined(param, `Parameter ${key} is undefined`);
      assertString(param.name, 1, MAX_PARAMETER_NAME_LENGTH);
      assertFinite(param.value, `Parameter ${param.name} value must be finite`);

      const parts = param.name.split('_');
      assertArray(parts, 1, 10);

      const group = parts[0];
      assertString(group, 1, 32);

      if (!grouped.has(group)) {
        grouped.set(group, []);
      }

      const groupArray = grouped.get(group);
      assertDefined(groupArray, `Group array for ${group} is undefined`);
      assertBounds(groupArray.length, 0, 1000, `Too many parameters in group ${group}`);

      groupArray.push(param);
    });

    // Write grouped parameters with validation
    grouped.forEach((params, group) => {
      assertString(group, 1, 32);
      assertArray(params, 1, 1000);

      lines.push(`\n# ${group} Parameters`);

      // Sort with validation
      params.sort((a, b) => {
        assertDefined(a, 'Parameter a is undefined in sort');
        assertDefined(b, 'Parameter b is undefined in sort');
        assertString(a.name, 1, MAX_PARAMETER_NAME_LENGTH);
        assertString(b.name, 1, MAX_PARAMETER_NAME_LENGTH);
        return a.name.localeCompare(b.name);
      });

      params.forEach((param) => {
        assertDefined(param, 'Parameter is undefined during export');
        assertString(param.name, 1, MAX_PARAMETER_NAME_LENGTH);
        assertFinite(param.value, `Export value for ${param.name} must be finite`);

        const line = `${param.name},${param.value}`;
        assertString(line, 1, 256);
        lines.push(line);
      });
    });

    // Validate total line count
    assertBounds(lines.length, 1, 20000, 'Export file too large');

    const content = lines.join('\n');

    try {
      await invokeTauriCommand('export_parameters', {
        content,
        filename: filename || `params_${Date.now()}.param`,
        format: 'ardupilot'
      });

      showSuccess('Export Complete', 'Parameters exported in ArduPilot format');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      showError('Export Failed', errorMessage);
    }
  }

  /**
   * Import parameters from file
   */
  async importParameters(
    content: string,
    format: 'ardupilot' | 'qgc' | 'json' = 'ardupilot'
  ): Promise<BatchParameterOperation> {
    // Validate inputs
    assertString(content, 1, 1048576); // 1MB max
    assertParam(['ardupilot', 'qgc', 'json'].includes(format), `Invalid import format: ${format}`);

    const parameters: Array<{ name: string; value: number }> = [];

    if (format === 'ardupilot') {
      // Parse ArduPilot format with validation
      const lines = content.split('\n');
      assertArray(lines, 0, 20000);

      for (const [index, line] of lines.entries()) {
        assertBounds(index, 0, lines.length);
        assertString(line, 0, 512);

        if (line.startsWith('#') || !line.trim()) continue;

        const parts = line.split(',');
        if (parts.length >= 2) {
          const name = parts[0];
          const valueStr = parts[1];

          if (name && valueStr) {
            const trimmedName = name.trim();
            assertString(trimmedName, 1, MAX_PARAMETER_NAME_LENGTH);

            const value = parseFloat(valueStr);
            if (!isNaN(value)) {
              assertFinite(value, `Import value for ${trimmedName} must be finite`);

              // Validate parameter count
              assertBounds(
                parameters.length,
                0,
                MAX_BATCH_OPERATIONS,
                'Too many parameters in import'
              );

              parameters.push({ name: trimmedName, value });
            }
          }
        }
      }
    } else if (format === 'json') {
      // Parse JSON format with validation
      try {
        const data = JSON.parse(content);

        if (Array.isArray(data)) {
          assertArray(data, 0, MAX_BATCH_OPERATIONS);

          data.forEach((item, index) => {
            assertBounds(index, 0, data.length);
            assertDefined(item, `JSON array item ${index} is undefined`);

            if (item.name && typeof item.value === 'number') {
              assertString(item.name, 1, MAX_PARAMETER_NAME_LENGTH);
              assertFinite(item.value, `JSON value for ${item.name} must be finite`);

              // Validate parameter count
              assertBounds(
                parameters.length,
                0,
                MAX_BATCH_OPERATIONS,
                'Too many parameters in JSON import'
              );

              parameters.push({ name: item.name, value: item.value });
            }
          });
        } else if (typeof data === 'object' && data !== null) {
          const entries = Object.entries(data);
          assertBounds(entries.length, 0, MAX_BATCH_OPERATIONS, 'Too many entries in JSON object');

          entries.forEach(([name, value]) => {
            assertString(name, 1, MAX_PARAMETER_NAME_LENGTH);

            if (typeof value === 'number') {
              assertFinite(value, `JSON value for ${name} must be finite`);

              parameters.push({ name, value });
            }
          });
        } else {
          throw new Error('Invalid JSON structure - expected array or object');
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error('Invalid JSON format: ' + error.message);
        }
        throw error;
      }
    }

    // Validate import results
    assertArray(parameters, 0, MAX_BATCH_OPERATIONS);

    if (parameters.length === 0) {
      throw new Error('No valid parameters found in file');
    }

    // Final validation of all imported parameters
    parameters.forEach((param, index) => {
      assertBounds(index, 0, parameters.length);
      assertDefined(param, `Imported parameter ${index} is undefined`);
      assertString(param.name, 1, MAX_PARAMETER_NAME_LENGTH);
      assertFinite(param.value, `Imported value for ${param.name} must be finite`);
    });

    showInfo('Import Ready', `Found ${parameters.length} parameters to import`);

    return {
      parameters,
      atomic: false,
      validateFirst: true
    };
  }

  /**
   * Get parameter groups
   */
  getParameterGroups(): ParameterGroup[] {
    // Validate parameter groups on return
    assertArray(PARAMETER_GROUPS, 1, 100);

    PARAMETER_GROUPS.forEach((group, index) => {
      assertBounds(index, 0, PARAMETER_GROUPS.length);
      assertDefined(group, `Parameter group ${index} is undefined`);
      assertString(group.name, 1, 64);
      assertString(group.description, 1, 256);
      assertArray(group.parameters, 1, 100);

      group.parameters.forEach((paramName) => {
        assertString(paramName, 1, MAX_PARAMETER_NAME_LENGTH);
      });
    });

    return PARAMETER_GROUPS;
  }

  /**
   * Get parameter metadata
   */
  getParameterMetadata(name: string): ParameterMetadata | undefined {
    // Validate input
    assertString(name, 1, MAX_PARAMETER_NAME_LENGTH);

    const metadata = metadataCache.get(name);

    // Validate metadata if found
    if (metadata) {
      assertDefined(metadata, 'Cached metadata is undefined');
      assertString(metadata.name, 1, MAX_PARAMETER_NAME_LENGTH);
      assertFinite(metadata.defaultValue, 'Metadata default value must be finite');
    }

    return metadata;
  }

  /**
   * Get validation errors
   */
  getValidationErrors(): Array<{ parameter: string; error: string; timestamp: number }> {
    const errors = validationErrors.getAll();

    // Validate error array
    assertArray(errors, 0, MAX_VALIDATION_ERRORS);

    errors.forEach((err, index) => {
      assertBounds(index, 0, errors.length);
      assertDefined(err, `Validation error ${index} is undefined`);
      assertString(err.parameter, 1, MAX_PARAMETER_NAME_LENGTH);
      assertString(err.error, 1, 512);
      assertFinite(err.timestamp, 'Error timestamp must be finite');
      assertRange(err.timestamp, 0, Date.now() + 1000, 'Invalid timestamp');
    });

    return errors;
  }

  /**
   * Clear validation errors
   */
  clearValidationErrors(): void {
    validationErrors.clear();
  }

  /**
   * Load parameters from drone
   */
  async loadParameters(): Promise<DroneParameter[]> {
    try {
      const parameters = await safeTauriInvoke<DroneParameter[]>('get_all_parameters');

      if (parameters) {
        // Validate loaded parameters
        assertArray(parameters, 0, 10000);

        parameters.forEach((param, index) => {
          assertBounds(index, 0, parameters.length);
          assertDefined(param, `Loaded parameter ${index} is undefined`);
          assertString(param.name, 1, MAX_PARAMETER_NAME_LENGTH);
          assertFinite(param.value, `Parameter ${param.name} value must be finite`);
          assertParam(
            Object.values(ParameterType).includes(param.type),
            `Invalid parameter type: ${param.type}`
          );
          assertFinite(param.index, `Parameter ${param.name} index must be finite`);
          assertRange(param.index, 0, 65535, 'Parameter index out of MAVLink bounds');
        });
      }

      return parameters || [];
    } catch (error) {
      console.error('Failed to load parameters:', error);
      throw new Error(
        `Failed to load parameters: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Parse parameter value from string
   */
  parseValue(value: string, type: ParameterType): number {
    // Validate inputs
    assertString(value, 0, 256);
    assertDefined(type, 'Parameter type must be defined');
    assertParam(Object.values(ParameterType).includes(type), `Invalid parameter type: ${type}`);

    try {
      const trimmedValue = value.trim();
      if (trimmedValue.length === 0) {
        throw new Error('Empty value string');
      }

      const numValue = parseFloat(trimmedValue);
      if (isNaN(numValue)) {
        throw new Error(`Invalid numeric value: ${value}`);
      }

      assertFinite(numValue, 'Parsed value must be finite');

      // Apply type constraints with validation
      let result: number;

      switch (type) {
        case ParameterType.UINT8:
          result = Math.max(0, Math.min(255, Math.round(numValue)));
          assertRange(result, 0, 255, 'UINT8 parse result out of bounds');
          return result;

        case ParameterType.INT8:
          result = Math.max(-128, Math.min(127, Math.round(numValue)));
          assertRange(result, -128, 127, 'INT8 parse result out of bounds');
          return result;

        case ParameterType.UINT16:
          result = Math.max(0, Math.min(65535, Math.round(numValue)));
          assertRange(result, 0, 65535, 'UINT16 parse result out of bounds');
          return result;

        case ParameterType.INT16:
          result = Math.max(-32768, Math.min(32767, Math.round(numValue)));
          assertRange(result, -32768, 32767, 'INT16 parse result out of bounds');
          return result;

        case ParameterType.UINT32:
          result = Math.max(0, Math.min(4294967295, Math.round(numValue)));
          assertRange(result, 0, 4294967295, 'UINT32 parse result out of bounds');
          return result;

        case ParameterType.INT32:
          result = Math.max(-2147483648, Math.min(2147483647, Math.round(numValue)));
          assertRange(result, -2147483648, 2147483647, 'INT32 parse result out of bounds');
          return result;

        case ParameterType.FLOAT:
        case ParameterType.DOUBLE:
          assertFinite(numValue, 'Float/Double parse result must be finite');
          return numValue;

        default:
          throw new Error(`Unsupported parameter type: ${type}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to parse value "${value}" as ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Save parameter profile to file
   */
  async saveProfile(profile: ParameterProfile, filePath: string): Promise<void> {
    // Validate inputs
    assertDefined(profile, 'Profile must be defined');
    assertString(profile.id, 1, 128);
    assertString(profile.name, 1, MAX_PROFILE_NAME_LENGTH);
    assertDefined(profile.parameters, 'Profile parameters must be defined');
    assertFinite(profile.created, 'Profile created timestamp must be finite');
    assertFinite(profile.modified, 'Profile modified timestamp must be finite');
    assertString(filePath, 1, 512);

    // Validate profile parameters
    const paramCount = Object.keys(profile.parameters).length;
    assertBounds(paramCount, 0, 10000, 'Too many parameters in profile');

    Object.entries(profile.parameters).forEach(([name, value]) => {
      assertString(name, 1, MAX_PARAMETER_NAME_LENGTH);
      assertFinite(value, `Profile parameter ${name} value must be finite`);
    });

    try {
      const profileData = JSON.stringify(profile, null, 2);

      // Validate JSON string size
      assertMemoryLimit(
        profileData.length,
        MEMORY_LIMITS.MAX_STRING_LENGTH,
        'Profile JSON too large'
      );

      await safeTauriInvoke('write_file', { path: filePath, contents: profileData });
      showSuccess('Profile Saved', `Parameter profile saved to ${filePath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      showError('Save Failed', `Failed to save profile: ${message}`);
      throw error;
    }
  }

  /**
   * Load parameter profile from file
   */
  async loadProfile(filePath: string): Promise<ParameterProfile> {
    // Validate input
    assertString(filePath, 1, 512);

    try {
      const profileData = await safeTauriInvoke<string>('read_file', { path: filePath });
      if (!profileData) {
        throw new Error('No data returned from file read');
      }

      // Validate file size
      assertString(profileData, 1, MEMORY_LIMITS.MAX_STRING_LENGTH);

      const profile = JSON.parse(profileData) as ParameterProfile;

      // Validate loaded profile structure
      assertDefined(profile, 'Parsed profile is undefined');
      assertString(profile.id, 1, 128);
      assertString(profile.name, 1, MAX_PROFILE_NAME_LENGTH);

      if (profile.description !== undefined) {
        assertString(profile.description, 0, MAX_PARAMETER_DESCRIPTION_LENGTH);
      }

      assertDefined(profile.parameters, 'Profile parameters object is undefined');
      assertFinite(profile.created, 'Profile created timestamp must be finite');
      assertFinite(profile.modified, 'Profile modified timestamp must be finite');

      // Validate timestamps are reasonable
      const now = Date.now();
      assertRange(
        profile.created,
        0,
        now + 86400000, // Allow 1 day future for timezone issues
        'Profile created timestamp out of range'
      );
      assertRange(
        profile.modified,
        profile.created - 1000, // Allow small discrepancy
        now + 86400000,
        'Profile modified timestamp out of range'
      );

      // Validate all parameters
      const paramEntries = Object.entries(profile.parameters);
      assertBounds(paramEntries.length, 0, 10000, 'Too many parameters in loaded profile');

      paramEntries.forEach(([name, value]) => {
        assertString(name, 1, MAX_PARAMETER_NAME_LENGTH);
        assertFinite(value, `Loaded parameter ${name} value must be finite`);
      });

      showSuccess('Profile Loaded', `Parameter profile loaded from ${filePath}`);
      return profile;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      showError('Load Failed', `Failed to load profile: ${message}`);
      throw error;
    }
  }
}

// Create singleton instance
let parameterServiceInstance: ParameterService | null = null;

/**
 * Get parameter service instance
 */
export function getParameterService(): ParameterService {
  if (!parameterServiceInstance) {
    parameterServiceInstance = new ParameterService();

    // Validate instance creation
    assertDefined(parameterServiceInstance, 'Failed to create parameter service instance');
  }

  return parameterServiceInstance;
}

/**
 * Convenience function: Parse parameter value
 */
export function parseParameterValue(value: string, type: ParameterType): number {
  // Validate inputs at API boundary
  assertString(value, 0, 256);
  assertDefined(type, 'Parameter type must be defined');
  assertParam(Object.values(ParameterType).includes(type), `Invalid parameter type: ${type}`);

  const service = getParameterService();
  assertDefined(service, 'Parameter service is undefined');

  return service.parseValue(value, type);
}

/**
 * Convenience function: Get parameter constraints
 */
export function getParameterConstraints(type: ParameterType): ParameterConstraint {
  // Validate input
  assertDefined(type, 'Parameter type must be defined');
  assertParam(Object.values(ParameterType).includes(type), `Invalid parameter type: ${type}`);

  const constraint =
    DEFAULT_PARAMETER_CONSTRAINTS[type] || DEFAULT_PARAMETER_CONSTRAINTS[ParameterType.FLOAT];

  // Validate constraint structure
  assertDefined(constraint, 'Parameter constraint is undefined');
  if (constraint.min !== undefined) {
    assertFinite(constraint.min, 'Constraint min must be finite');
  }
  if (constraint.max !== undefined) {
    assertFinite(constraint.max, 'Constraint max must be finite');
  }
  if (constraint.min !== undefined && constraint.max !== undefined) {
    assertParam(constraint.min <= constraint.max, 'Constraint min must be <= max');
  }

  return constraint;
}

/**
 * Convenience function: Generate parameter diff
 */
export function generateParameterDiff(
  oldParams: Record<string, number>,
  newParams: Record<string, number>
): { added: string[]; modified: string[]; removed: string[] } {
  // Validate inputs
  assertDefined(oldParams, 'Old parameters object must be defined');
  assertDefined(newParams, 'New parameters object must be defined');

  const oldKeys = Object.keys(oldParams);
  const newKeys = Object.keys(newParams);

  assertBounds(oldKeys.length, 0, 10000, 'Too many old parameters');
  assertBounds(newKeys.length, 0, 10000, 'Too many new parameters');

  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];

  // Find added and modified with validation
  for (const key in newParams) {
    assertString(key, 1, MAX_PARAMETER_NAME_LENGTH);
    assertFinite(newParams[key], `New parameter ${key} value must be finite`);

    if (!(key in oldParams)) {
      assertBounds(added.length, 0, 10000, 'Too many added parameters');
      added.push(key);
    } else {
      assertFinite(oldParams[key], `Old parameter ${key} value must be finite`);

      // Use epsilon for floating point comparison
      const diff = Math.abs(oldParams[key] - newParams[key]);
      if (diff > NUMERIC_CONSTANTS.EPSILON) {
        assertBounds(modified.length, 0, 10000, 'Too many modified parameters');
        modified.push(key);
      }
    }
  }

  // Find removed with validation
  for (const key in oldParams) {
    assertString(key, 1, MAX_PARAMETER_NAME_LENGTH);
    assertFinite(oldParams[key], `Old parameter ${key} value must be finite`);

    if (!(key in newParams)) {
      assertBounds(removed.length, 0, 10000, 'Too many removed parameters');
      removed.push(key);
    }
  }

  // Validate diff results
  const totalChanges = added.length + modified.length + removed.length;
  assertBounds(totalChanges, 0, 20000, 'Too many total parameter changes');

  return { added, modified, removed };
}

/**
 * Convenience function: Export parameters to file
 */
export async function exportParametersToFile(
  parameters: Record<string, number>,
  filePath: string
): Promise<void> {
  // Validate inputs
  assertDefined(parameters, 'Parameters object must be defined');
  assertString(filePath, 1, 512);

  const paramEntries = Object.entries(parameters);
  assertBounds(paramEntries.length, 0, 10000, 'Too many parameters to export');

  // Validate all parameters
  paramEntries.forEach(([name, value]) => {
    assertString(name, 1, MAX_PARAMETER_NAME_LENGTH);
    assertFinite(value, `Export parameter ${name} value must be finite`);
  });

  const service = getParameterService();
  assertDefined(service, 'Parameter service is undefined');

  const now = Date.now();
  assertFinite(now, 'Current timestamp must be finite');

  const profile: ParameterProfile = {
    id: 'exported_' + now,
    name: 'Exported Parameters',
    description: 'Parameters exported from drone',
    parameters: parameters,
    created: now,
    modified: now
  };

  // Validate generated profile
  assertString(profile.id, 1, 128);
  assertString(profile.name, 1, MAX_PROFILE_NAME_LENGTH);

  await service.saveProfile(profile, filePath);
}

/**
 * Convenience function: Import parameters from file
 */
export async function importParametersFromFile(filePath: string): Promise<Record<string, number>> {
  // Validate input
  assertString(filePath, 1, 512);

  const service = getParameterService();
  assertDefined(service, 'Parameter service is undefined');

  const profile = await service.loadProfile(filePath);

  // Validate loaded profile
  assertDefined(profile, 'Loaded profile is undefined');
  assertDefined(profile.parameters, 'Profile parameters are undefined');

  // Validate parameters object
  const paramCount = Object.keys(profile.parameters).length;
  assertBounds(paramCount, 0, 10000, 'Too many parameters in imported profile');

  return profile.parameters;
}

/**
 * Quick parameter operations
 */
export const ParameterOps = {
  /**
   * Reset parameter to default
   */
  async resetToDefault(parameter: DroneParameter): Promise<boolean> {
    // Validate input
    assertDefined(parameter, 'Parameter must be defined');
    assertString(parameter.name, 1, MAX_PARAMETER_NAME_LENGTH);

    const metadata = metadataCache.get(parameter.name);
    if (!metadata) {
      showWarning('No Default Value', `No default value found for ${parameter.name}`);
      return false;
    }

    // Validate metadata and default value
    assertDefined(metadata, 'Metadata is undefined');
    assertFinite(metadata.defaultValue, 'Default value must be finite');

    try {
      // Validate parameter constraints before reset
      const validation = validateConstraints(parameter, metadata.defaultValue);
      if (!validation.valid) {
        console.error('Default value validation failed:', validation.errors);
        showError('Reset Failed', 'Default value fails validation');
        return false;
      }

      await invokeTauriCommand('set_drone_parameter', {
        name: parameter.name,
        value: metadata.defaultValue
      });

      showSuccess('Reset Complete', `${parameter.name} reset to ${metadata.defaultValue}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Reset failed';
      showError('Reset Failed', errorMessage);
      return false;
    }
  },

  /**
   * Refresh all parameters
   */
  async refreshAll(): Promise<void> {
    try {
      await invokeTauriCommand('refresh_all_parameters', undefined, {
        timeout: 60000 // This can take a while
      });

      showSuccess('Refresh Complete', 'All parameters refreshed from vehicle');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Refresh failed';
      showError('Refresh Failed', errorMessage);
    }
  },

  /**
   * Write all changed parameters
   */
  async writeAll(parameters: DroneParameter[]): Promise<{ success: number; failed: number }> {
    // Validate input
    assertArray(parameters, 0, 10000);

    // Validate each parameter
    parameters.forEach((param, index) => {
      assertBounds(index, 0, parameters.length);
      assertDefined(param, `Parameter ${index} is undefined`);
      assertString(param.name, 1, MAX_PARAMETER_NAME_LENGTH);
      assertFinite(param.value, `Parameter ${param.name} value must be finite`);

      if (param.isDirty !== undefined) {
        assertParam(
          typeof param.isDirty === 'boolean',
          `Parameter ${param.name} isDirty must be boolean`
        );
      }
    });

    const dirtyParams = parameters.filter((p) => p.isDirty);
    assertArray(dirtyParams, 0, 1000);

    if (dirtyParams.length === 0) {
      showInfo('No Changes', 'No parameters to write');
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    for (const [index, param] of dirtyParams.entries()) {
      assertBounds(index, 0, dirtyParams.length);
      assertDefined(param, `Dirty parameter ${index} is undefined`);
      assertString(param.name, 1, MAX_PARAMETER_NAME_LENGTH);
      assertFinite(param.value, `Parameter ${param.name} value must be finite`);

      // Validate parameter before writing
      const validation = validateConstraints(param, param.value);
      if (!validation.valid) {
        console.error(`Parameter ${param.name} validation failed:`, validation.errors);
        failed++;
        continue;
      }

      try {
        await invokeTauriCommand('set_drone_parameter', {
          name: param.name,
          value: param.value
        });
        success++;

        // Validate success counter
        assertRange(success, 0, dirtyParams.length, 'Success count out of bounds');
      } catch (error) {
        failed++;
        console.error(`Failed to write ${param.name}:`, error);

        // Validate failed counter
        assertRange(failed, 0, dirtyParams.length, 'Failed count out of bounds');
      }
    }

    // Validate final counts
    assertParam(success + failed === dirtyParams.length, 'Success + failed count mismatch');

    if (failed === 0) {
      showSuccess('Write Complete', `Successfully wrote ${success} parameters`);
    } else {
      showWarning('Write Partial', `Wrote ${success} parameters, ${failed} failed`);
    }

    return { success, failed };
  }
};
