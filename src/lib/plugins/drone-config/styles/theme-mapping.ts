/**
 * Theme Color Mapping for Drone Config Plugin
 * NASA JPL Compliant - Aerospace-grade theme consistency
 */

export const THEME_COLORS = {
  // Backgrounds
  surface_primary: 'var(--color-background_primary)',
  surface_secondary: 'var(--color-background_secondary)',
  surface_tertiary: 'var(--color-background_tertiary)',
  surface_quaternary: 'var(--color-background_quaternary)',
  surface_elevated: 'var(--color-surface_elevated)',

  // Status Colors
  status_error: 'var(--color-status_error)',
  status_error_bg: 'var(--color-status_error_bg)',
  status_warning: 'var(--color-status_warning)',
  status_warning_bg: 'var(--color-status_warning_bg)',
  status_success: 'var(--color-status_success)',
  status_success_bg: 'var(--color-status_success_bg)',
  status_info: 'var(--color-status_info)',
  status_info_bg: 'var(--color-status_info_bg)',

  // Accent Colors
  accent_primary: 'var(--color-accent_blue)',
  accent_secondary: 'var(--color-accent_cyan)',
  accent_tertiary: 'var(--color-accent_purple)',
  accent_green: 'var(--color-accent_green)',
  accent_yellow: 'var(--color-accent_yellow)',
  accent_red: 'var(--color-accent_red)',

  // Text Colors
  text_primary: 'var(--color-text_primary)',
  text_secondary: 'var(--color-text_secondary)',
  text_tertiary: 'var(--color-text_tertiary)',
  text_inverse: 'var(--color-text_inverse)',
  text_tertiary_alpha: 'var(--color-text_tertiary_alpha)',

  // Border Colors
  border_primary: 'var(--color-border_primary)',
  border_secondary: 'var(--color-border_secondary)',

  // Safety-specific mappings
  emergency: 'var(--color-status_error)',
  emergency_bg: 'var(--color-status_error_bg)',
  safety_warning: 'var(--color-status_warning)',
  safety_ok: 'var(--color-status_success)',

  // Shadow
  shadow_dark: 'var(--layout-shadow_dark)',

  // Transparent overlays
  overlay_dark: 'rgba(0, 0, 0, 0.8)',
  overlay_medium: 'rgba(0, 0, 0, 0.5)',
  overlay_light: 'rgba(0, 0, 0, 0.3)',

  // For gradients
  gradient_blue_green:
    'linear-gradient(90deg, var(--color-accent_green) 0%, var(--color-accent_blue) 100%)'
} as const;

// Legacy to new mapping for CalibrationWizard
export const LEGACY_VARIABLE_MAP = {
  // Surface mappings
  'var(--surface-primary)': THEME_COLORS.surface_primary,
  'var(--surface-secondary)': THEME_COLORS.surface_secondary,
  'var(--surface-tertiary)': THEME_COLORS.surface_tertiary,
  'var(--surface-hover)': THEME_COLORS.surface_quaternary,

  // Color mappings
  'var(--primary-color)': THEME_COLORS.accent_primary,
  'var(--primary-surface)': THEME_COLORS.accent_primary,
  'var(--primary-hover)': THEME_COLORS.accent_secondary,

  // Text mappings
  'var(--text-primary)': THEME_COLORS.text_primary,
  'var(--text-secondary)': THEME_COLORS.text_secondary,

  // Status mappings
  'var(--error-color)': THEME_COLORS.status_error,
  'var(--error-background)': THEME_COLORS.status_error_bg,
  'var(--warning-surface)': THEME_COLORS.status_warning_bg,
  'var(--warning-text)': THEME_COLORS.status_warning,
  'var(--success-color)': THEME_COLORS.status_success,
  'var(--success-surface)': THEME_COLORS.status_success_bg,
  'var(--info-color)': THEME_COLORS.status_info,
  'var(--info-surface)': THEME_COLORS.status_info_bg,

  // Border mappings
  'var(--border-color)': THEME_COLORS.border_primary
} as const;

// Flight mode category color mappings
export const FLIGHT_MODE_CATEGORY_COLORS = {
  primary: THEME_COLORS.accent_primary,
  auxiliary: THEME_COLORS.accent_green,
  safety: THEME_COLORS.accent_yellow,
  advanced: THEME_COLORS.accent_red
} as const;

// Type exports
export type ThemeColor = keyof typeof THEME_COLORS;
export type LegacyVariable = keyof typeof LEGACY_VARIABLE_MAP;
export type FlightModeCategory = keyof typeof FLIGHT_MODE_CATEGORY_COLORS;
