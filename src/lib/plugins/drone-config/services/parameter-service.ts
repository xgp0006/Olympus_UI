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
import {
  ParameterType,
  DEFAULT_PARAMETER_CONSTRAINTS
} from '../types/drone-types';
import type {
  DroneParameter,
  ParameterMetadata,
  ParameterConstraint,
  ParameterGroup,
  ParameterProfile,
  BatchParameterOperation,
  ParameterComparison
} from '../types/drone-types';

/**
 * NASA JPL Rule 2: Bounded memory allocation
 */
const MAX_VALIDATION_ERRORS = 50;
const MAX_CONVERSION_CACHE = 200;
const MAX_METADATA_CACHE = 500;

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
    parameters: ['BATT_MONITOR', 'BATT_CAPACITY', 'BATT_LOW_VOLT', 'BATT_CRT_VOLT', 'BATT_FS_VOLTSRC'],
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
  'MOT_SPIN_MIN': {
    min: 0.0,
    max: 0.3,
    errorMessage: 'Motor spin minimum must be between 0 and 0.3'
  },
  'MOT_SPIN_ARM': {
    min: 0.0,
    max: 0.3,
    validator: (value) => value >= getParameterValue('MOT_SPIN_MIN'),
    errorMessage: 'Motor spin armed must be >= MOT_SPIN_MIN'
  },
  'MOT_SPIN_MAX': {
    min: 0.9,
    max: 1.0,
    errorMessage: 'Motor spin maximum must be between 0.9 and 1.0'
  },
  
  // Battery parameters
  'BATT_LOW_VOLT': {
    min: 0.0,
    max: 50.0,
    validator: (value) => value > getParameterValue('BATT_CRT_VOLT'),
    errorMessage: 'Low voltage must be > critical voltage'
  },
  'BATT_CRT_VOLT': {
    min: 0.0,
    max: 50.0,
    errorMessage: 'Critical voltage must be between 0 and 50V'
  },
  
  // GPS parameters
  'GPS_MIN_SATS': {
    min: 4,
    max: 10,
    errorMessage: 'Minimum satellites must be between 4 and 10'
  },
  'GPS_HDOP_GOOD': {
    min: 100,
    max: 900,
    errorMessage: 'HDOP good must be between 100 and 900'
  }
};

/**
 * NASA JPL Rule 4: Split function - Get parameter value for validation
 */
function getParameterValue(name: string): number {
  // This would interface with the parameter store
  // Simplified for now
  return 0;
}

/**
 * NASA JPL Rule 4: Split function - Convert parameter value by type
 */
function convertParameterValue(
  value: number,
  fromType: ParameterType,
  toType: ParameterType
): number {
  // Check cache
  const cacheKey = `${value}_${fromType}_${toType}`;
  const cached = conversionCache.get(cacheKey);
  if (cached) return cached.to;
  
  let converted = value;
  
  // Type conversion logic
  if (fromType === toType) {
    converted = value;
  } else if (toType === ParameterType.UINT8) {
    converted = Math.max(0, Math.min(255, Math.round(value)));
  } else if (toType === ParameterType.INT8) {
    converted = Math.max(-128, Math.min(127, Math.round(value)));
  } else if (toType === ParameterType.UINT16) {
    converted = Math.max(0, Math.min(65535, Math.round(value)));
  } else if (toType === ParameterType.INT16) {
    converted = Math.max(-32768, Math.min(32767, Math.round(value)));
  } else if (toType === ParameterType.UINT32) {
    converted = Math.max(0, Math.min(4294967295, Math.round(value)));
  } else if (toType === ParameterType.INT32) {
    converted = Math.max(-2147483648, Math.min(2147483647, Math.round(value)));
  } else if (toType === ParameterType.FLOAT || toType === ParameterType.DOUBLE) {
    converted = value; // No conversion needed for floats
  }
  
  // Cache result
  if (conversionCache.size < MAX_CONVERSION_CACHE) {
    conversionCache.set(cacheKey, { from: value, to: converted, type: toType });
  }
  
  return converted;
}

/**
 * NASA JPL Rule 4: Split function - Validate parameter constraints
 */
function validateConstraints(
  parameter: DroneParameter,
  value: number,
  constraint?: ParameterConstraint
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Type constraints
  const typeConstraint = DEFAULT_PARAMETER_CONSTRAINTS[parameter.type];
  if (typeConstraint.min !== undefined && typeConstraint.max !== undefined) {
    if (value < typeConstraint.min || value > typeConstraint.max) {
      errors.push(`Value must be between ${typeConstraint.min} and ${typeConstraint.max}`);
    }
  }
  
  // Custom constraints
  const customConstraint = constraint || PARAMETER_VALIDATION_RULES[parameter.name];
  if (customConstraint) {
    if (customConstraint.min !== undefined && value < customConstraint.min) {
      errors.push(customConstraint.errorMessage || `Value must be >= ${customConstraint.min}`);
    }
    if (customConstraint.max !== undefined && value > customConstraint.max) {
      errors.push(customConstraint.errorMessage || `Value must be <= ${customConstraint.max}`);
    }
    if (customConstraint.allowedValues && !customConstraint.allowedValues.includes(value)) {
      errors.push(`Value must be one of: ${customConstraint.allowedValues.join(', ')}`);
    }
    if (customConstraint.validator && !customConstraint.validator(value)) {
      errors.push(customConstraint.errorMessage || 'Value validation failed');
    }
  }
  
  // Metadata constraints
  if (parameter.metadata) {
    if (parameter.metadata.min !== undefined && value < parameter.metadata.min) {
      errors.push(`Value must be >= ${parameter.metadata.min} ${parameter.metadata.units || ''}`);
    }
    if (parameter.metadata.max !== undefined && value > parameter.metadata.max) {
      errors.push(`Value must be <= ${parameter.metadata.max} ${parameter.metadata.units || ''}`);
    }
  }
  
  // Record validation errors
  errors.forEach(error => {
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
      
      if (metadata) {
        // Clear and repopulate cache
        metadataCache.clear();
        metadata.forEach(meta => {
          if (metadataCache.size < MAX_METADATA_CACHE) {
            metadataCache.set(meta.name, meta);
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
    const warnings: string[] = [];
    
    // Basic validation
    const validation = validateConstraints(parameter, value, constraint);
    
    // Additional checks
    if (parameter.metadata) {
      // Check if reboot required
      if (parameter.metadata.rebootRequired) {
        warnings.push('Changing this parameter requires a reboot');
      }
      
      // Check if volatile
      if (parameter.metadata.volatile) {
        warnings.push('This parameter may change during flight');
      }
      
      // Check increment
      if (parameter.metadata.increment) {
        const remainder = value % parameter.metadata.increment;
        if (remainder > 0.0001) {
          warnings.push(`Value should be a multiple of ${parameter.metadata.increment}`);
        }
      }
    }
    
    return {
      valid: validation.valid,
      errors: validation.errors,
      warnings
    };
  }
  
  /**
   * Convert parameter value between types
   */
  convertParameter(
    value: number,
    fromType: ParameterType,
    toType: ParameterType
  ): number {
    return convertParameterValue(value, fromType, toType);
  }
  
  /**
   * Validate batch operation
   */
  async validateBatchOperation(
    operation: BatchParameterOperation,
    parameters: Map<string, DroneParameter>
  ): Promise<{ valid: boolean; errors: Map<string, string[]> }> {
    const errors = new Map<string, string[]>();
    
    for (const { name, value } of operation.parameters) {
      const parameter = parameters.get(name);
      if (!parameter) {
        errors.set(name, ['Parameter not found']);
        continue;
      }
      
      const validation = this.validateParameter(parameter, value);
      if (!validation.valid) {
        errors.set(name, validation.errors);
      }
    }
    
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
    const profile: ParameterProfile = {
      id: `profile-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name,
      description,
      parameters: {},
      created: Date.now(),
      modified: Date.now()
    };
    
    // Add parameter values
    parameters.forEach((param, key) => {
      profile.parameters[key] = param.value;
    });
    
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
  compareProfiles(
    profile1: ParameterProfile,
    profile2: ParameterProfile
  ): ParameterComparison[] {
    const comparisons: ParameterComparison[] = [];
    const allParams = new Set([
      ...Object.keys(profile1.parameters),
      ...Object.keys(profile2.parameters)
    ]);
    
    allParams.forEach(name => {
      const value1 = profile1.parameters[name] || 0;
      const value2 = profile2.parameters[name] || 0;
      const isDifferent = Math.abs(value1 - value2) > 0.0001;
      
      comparisons.push({
        name,
        currentValue: value1,
        compareValue: value2,
        isDifferent,
        percentDifference: value2 !== 0 
          ? Math.abs((value1 - value2) / value2) * 100
          : undefined
      });
    });
    
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
    const lines: string[] = ['# ArduPilot parameter file'];
    
    // Group parameters
    const grouped = new Map<string, DroneParameter[]>();
    parameters.forEach(param => {
      const group = param.name.split('_')[0];
      if (!grouped.has(group)) {
        grouped.set(group, []);
      }
      grouped.get(group)!.push(param);
    });
    
    // Write grouped parameters
    grouped.forEach((params, group) => {
      lines.push(`\n# ${group} Parameters`);
      params.sort((a, b) => a.name.localeCompare(b.name)).forEach(param => {
        lines.push(`${param.name},${param.value}`);
      });
    });
    
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
    const parameters: Array<{ name: string; value: number }> = [];
    
    if (format === 'ardupilot') {
      // Parse ArduPilot format
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.startsWith('#') || !line.trim()) continue;
        
        const [name, valueStr] = line.split(',');
        if (name && valueStr) {
          const value = parseFloat(valueStr);
          if (!isNaN(value)) {
            parameters.push({ name: name.trim(), value });
          }
        }
      }
    } else if (format === 'json') {
      // Parse JSON format
      try {
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          data.forEach(item => {
            if (item.name && typeof item.value === 'number') {
              parameters.push({ name: item.name, value: item.value });
            }
          });
        } else if (typeof data === 'object') {
          Object.entries(data).forEach(([name, value]) => {
            if (typeof value === 'number') {
              parameters.push({ name, value });
            }
          });
        }
      } catch (error) {
        throw new Error('Invalid JSON format');
      }
    }
    
    if (parameters.length === 0) {
      throw new Error('No valid parameters found in file');
    }
    
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
    return PARAMETER_GROUPS;
  }
  
  /**
   * Get parameter metadata
   */
  getParameterMetadata(name: string): ParameterMetadata | undefined {
    return metadataCache.get(name);
  }
  
  /**
   * Get validation errors
   */
  getValidationErrors(): Array<{ parameter: string; error: string; timestamp: number }> {
    return validationErrors.getAll();
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
      return parameters || [];
    } catch (error) {
      console.error('Failed to load parameters:', error);
      throw new Error(`Failed to load parameters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse parameter value from string
   */
  parseValue(value: string, type: ParameterType): number {
    try {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        throw new Error(`Invalid numeric value: ${value}`);
      }
      
      // Apply type constraints
      switch (type) {
        case ParameterType.UINT8:
          return Math.max(0, Math.min(255, Math.round(numValue)));
        case ParameterType.INT8:
          return Math.max(-128, Math.min(127, Math.round(numValue)));
        case ParameterType.UINT16:
          return Math.max(0, Math.min(65535, Math.round(numValue)));
        case ParameterType.INT16:
          return Math.max(-32768, Math.min(32767, Math.round(numValue)));
        case ParameterType.UINT32:
          return Math.max(0, Math.min(4294967295, Math.round(numValue)));
        case ParameterType.INT32:
          return Math.max(-2147483648, Math.min(2147483647, Math.round(numValue)));
        case ParameterType.FLOAT:
        default:
          return numValue;
      }
    } catch (error) {
      throw new Error(`Failed to parse value "${value}" as ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save parameter profile to file
   */
  async saveProfile(profile: ParameterProfile, filePath: string): Promise<void> {
    try {
      const profileData = JSON.stringify(profile, null, 2);
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
    try {
      const profileData = await safeTauriInvoke<string>('read_file', { path: filePath });
      const profile = JSON.parse(profileData) as ParameterProfile;
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
  }
  return parameterServiceInstance;
}

/**
 * Convenience function: Parse parameter value
 */
export function parseParameterValue(value: string, type: ParameterType): number {
  const service = getParameterService();
  return service.parseValue(value, type);
}

/**
 * Convenience function: Get parameter constraints
 */
export function getParameterConstraints(type: ParameterType): ParameterConstraint {
  return DEFAULT_PARAMETER_CONSTRAINTS[type] || DEFAULT_PARAMETER_CONSTRAINTS[ParameterType.FLOAT];
}

/**
 * Convenience function: Generate parameter diff
 */
export function generateParameterDiff(
  oldParams: Record<string, number>,
  newParams: Record<string, number>
): { added: string[]; modified: string[]; removed: string[] } {
  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];

  // Find added and modified
  for (const key in newParams) {
    if (!(key in oldParams)) {
      added.push(key);
    } else if (oldParams[key] !== newParams[key]) {
      modified.push(key);
    }
  }

  // Find removed
  for (const key in oldParams) {
    if (!(key in newParams)) {
      removed.push(key);
    }
  }

  return { added, modified, removed };
}

/**
 * Convenience function: Export parameters to file
 */
export async function exportParametersToFile(
  parameters: Record<string, number>,
  filePath: string
): Promise<void> {
  const service = getParameterService();
  const profile: ParameterProfile = {
    id: 'exported_' + Date.now(),
    name: 'Exported Parameters',
    description: 'Parameters exported from drone',
    parameters: parameters,
    created: Date.now(),
    modified: Date.now()
  };
  
  await service.saveProfile(profile, filePath);
}

/**
 * Convenience function: Import parameters from file
 */
export async function importParametersFromFile(filePath: string): Promise<Record<string, number>> {
  const service = getParameterService();
  const profile = await service.loadProfile(filePath);
  
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
    const metadata = metadataCache.get(parameter.name);
    if (!metadata) {
      showWarning('No Default Value', `No default value found for ${parameter.name}`);
      return false;
    }
    
    try {
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
    const dirtyParams = parameters.filter(p => p.isDirty);
    if (dirtyParams.length === 0) {
      showInfo('No Changes', 'No parameters to write');
      return { success: 0, failed: 0 };
    }
    
    let success = 0;
    let failed = 0;
    
    for (const param of dirtyParams) {
      try {
        await invokeTauriCommand('set_drone_parameter', {
          name: param.name,
          value: param.value
        });
        success++;
      } catch (error) {
        failed++;
        console.error(`Failed to write ${param.name}:`, error);
      }
    }
    
    if (failed === 0) {
      showSuccess('Write Complete', `Successfully wrote ${success} parameters`);
    } else {
      showWarning('Write Partial', `Wrote ${success} parameters, ${failed} failed`);
    }
    
    return { success, failed };
  }
};