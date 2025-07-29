/**
 * Theme utility functions for the Modular C2 Frontend
 * Provides helper functions for theme manipulation and CSS integration
 */

import type { Theme } from '../types/theme';
import { BoundedArray } from './bounded-array';

/**
 * NASA JPL Rule 4: Functions must be ≤60 lines
 * Helper to add CSS properties with bounds checking
 */
function addCSSProperty(properties: BoundedArray<string>, property: string): boolean {
  if (properties.isFull()) {
    console.warn(`CSS property limit reached. Property not added: ${property}`);
    return false;
  }
  properties.push(property);
  return true;
}

/**
 * NASA JPL Rule 4: Split function - Add color properties
 */
function addColorProperties(theme: Theme, properties: BoundedArray<string>): void {
  Object.entries(theme.colors).forEach(([key, value]) => {
    addCSSProperty(properties, `--color-${key}: ${value};`);
  });
}

/**
 * NASA JPL Rule 4: Split function - Add typography properties
 */
function addTypographyProperties(theme: Theme, properties: BoundedArray<string>): void {
  Object.entries(theme.typography).forEach(([key, value]) => {
    addCSSProperty(properties, `--typography-${key}: ${value};`);
  });
}

/**
 * NASA JPL Rule 4: Split function - Add layout properties
 */
function addLayoutProperties(theme: Theme, properties: BoundedArray<string>): void {
  Object.entries(theme.layout).forEach(([key, value]) => {
    addCSSProperty(properties, `--layout-${key}: ${value};`);
  });
}

/**
 * NASA JPL Rule 4: Split function - Add component properties
 */
function addComponentProperties(theme: Theme, properties: BoundedArray<string>): void {
  Object.entries(theme.components).forEach(([component, componentProps]) => {
    Object.entries(componentProps).forEach(([key, value]) => {
      addCSSProperty(properties, `--component-${component}-${key}: ${value};`);
    });
  });
}

/**
 * NASA JPL Rule 4: Split function - Add optional properties
 */
function addOptionalProperties(theme: Theme, properties: BoundedArray<string>): void {
  // Add animation properties if present
  if (theme.animations) {
    Object.entries(theme.animations).forEach(([key, value]) => {
      addCSSProperty(properties, `--animation-${key}: ${value};`);
    });
  }

  // Add responsive properties if present
  if (theme.responsive) {
    Object.entries(theme.responsive).forEach(([breakpoint, breakpointProps]) => {
      if (breakpointProps && typeof breakpointProps === 'object') {
        Object.entries(breakpointProps).forEach(([key, value]) => {
          if (typeof value === 'string') {
            addCSSProperty(properties, `--responsive-${breakpoint}-${key}: ${value};`);
          }
        });
      }
    });
  }

  // Add touch properties if present
  if (theme.touch) {
    Object.entries(theme.touch).forEach(([key, value]) => {
      if (typeof value === 'string') {
        addCSSProperty(properties, `--touch-${key}: ${value};`);
      }
    });
  }
}

/**
 * Generates CSS custom properties string from theme data
 * NASA JPL Rule 2: Bounded memory - uses BoundedArray
 * NASA JPL Rule 4: Function split to be ≤60 lines
 * @param theme - Theme object
 * @returns CSS custom properties string
 */
export function generateCSSProperties(theme: Theme): string {
  const MAX_PROPERTIES = 1000; // Reasonable limit for CSS custom properties
  const properties = new BoundedArray<string>(MAX_PROPERTIES);

  // Add all property types
  addColorProperties(theme, properties);
  addTypographyProperties(theme, properties);
  addLayoutProperties(theme, properties);
  addComponentProperties(theme, properties);
  addOptionalProperties(theme, properties);

  return properties.getAll().join('\n  ');
}

/**
 * Creates a CSS rule string for the :root selector with theme properties
 * @param theme - Theme object
 * @returns Complete CSS rule string
 */
export function generateRootCSS(theme: Theme): string {
  return `:root {\n  ${generateCSSProperties(theme)}\n}`;
}

/**
 * Gets a theme color value with fallback
 * @param theme - Theme object
 * @param colorKey - Color key to retrieve
 * @param fallback - Fallback color value
 * @returns Color value or fallback
 */
export function getThemeColor(
  theme: Theme | null,
  colorKey: keyof Theme['colors'],
  fallback: string = '#000000'
): string {
  return theme?.colors[colorKey] || fallback;
}

/**
 * Gets a theme typography value with fallback
 * @param theme - Theme object
 * @param typographyKey - Typography key to retrieve
 * @param fallback - Fallback typography value
 * @returns Typography value or fallback
 */
export function getThemeTypography(
  theme: Theme | null,
  typographyKey: keyof Theme['typography'],
  fallback: string = 'inherit'
): string {
  return theme?.typography[typographyKey] || fallback;
}

/**
 * Gets a theme layout value with fallback
 * @param theme - Theme object
 * @param layoutKey - Layout key to retrieve
 * @param fallback - Fallback layout value
 * @returns Layout value or fallback
 */
export function getThemeLayout(
  theme: Theme | null,
  layoutKey: keyof Theme['layout'],
  fallback: string = '0'
): string {
  return theme?.layout[layoutKey] || fallback;
}

/**
 * Gets a component-specific theme value with fallback
 * @param theme - Theme object
 * @param component - Component name
 * @param property - Property name
 * @param fallback - Fallback value
 * @returns Component property value or fallback
 */
export function getComponentTheme<T extends keyof Theme['components']>(
  theme: Theme | null,
  component: T,
  property: keyof Theme['components'][T],
  fallback: string = 'inherit'
): string {
  if (!theme?.components) return fallback;

  const componentData = theme.components[component];
  if (!componentData || typeof componentData !== 'object') return fallback;

  const value = (componentData as any)[property];
  return typeof value === 'string' ? value : fallback;
}

/**
 * Checks if a theme is dark based on background color
 * @param theme - Theme object
 * @returns True if theme is dark
 */
export function isThemeDark(theme: Theme | null): boolean {
  if (!theme) return false;

  const bgColor = theme.colors.background_primary;

  // Simple heuristic: if background is closer to black than white
  if (bgColor.startsWith('#')) {
    const hex = bgColor.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }

  // For other color formats, assume dark if contains 'black' or starts with rgb with low values
  return (
    bgColor.toLowerCase().includes('black') ||
    bgColor.toLowerCase().includes('rgb(0') ||
    bgColor === '#000000' ||
    bgColor === '#000'
  );
}

/**
 * Gets a responsive theme value with fallback
 * @param theme - Theme object
 * @param breakpoint - Responsive breakpoint (mobile, tablet, desktop)
 * @param property - Property name
 * @param fallback - Fallback value
 * @returns Responsive property value or fallback
 */
export function getResponsiveTheme(
  theme: Theme | null,
  breakpoint: 'mobile' | 'tablet' | 'desktop',
  property: string,
  fallback: string = 'inherit'
): string {
  if (!theme?.responsive?.[breakpoint]) return fallback;

  const breakpointData = theme.responsive[breakpoint];
  if (!breakpointData || typeof breakpointData !== 'object') return fallback;

  const value = (breakpointData as any)[property];
  return typeof value === 'string' ? value : fallback;
}

/**
 * Gets a touch theme value with fallback
 * @param theme - Theme object
 * @param property - Touch property name
 * @param fallback - Fallback value
 * @returns Touch property value or fallback
 */
export function getTouchTheme(
  theme: Theme | null,
  property: string,
  fallback: string = 'inherit'
): string {
  if (!theme?.touch) return fallback;

  const value = (theme.touch as any)[property];
  return typeof value === 'string' ? value : fallback;
}

/**
 * Creates a CSS variable reference string
 * @param category - CSS variable category (color, typography, layout, component)
 * @param key - Variable key
 * @param component - Component name (for component variables)
 * @returns CSS variable reference string
 */
export function cssVar(
  category: 'color' | 'typography' | 'layout' | 'component' | 'animation' | 'responsive' | 'touch',
  key: string,
  component?: string
): string {
  if (category === 'component' && component) {
    return `var(--component-${component}-${key})`;
  }
  return `var(--${category}-${key})`;
}

/**
 * Creates multiple CSS variable references
 * @param variables - Array of variable definitions
 * @returns Object with CSS variable references
 */
export function cssVars(
  variables: Array<{
    name: string;
    category:
      | 'color'
      | 'typography'
      | 'layout'
      | 'component'
      | 'animation'
      | 'responsive'
      | 'touch';
    key: string;
    component?: string;
  }>
): Record<string, string> {
  const result: Record<string, string> = {};

  variables.forEach(({ name, category, key, component }) => {
    result[name] = cssVar(category, key, component);
  });

  return result;
}

/**
 * Validates a hex color string
 * @param color - Color string to validate
 * @returns True if valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Validates a CSS color string (hex, rgb, rgba, hsl, hsla, named colors)
 * @param color - Color string to validate
 * @returns True if valid CSS color
 */
export function isValidCSSColor(color: string): boolean {
  if (isValidHexColor(color)) return true;

  // Check for rgb/rgba
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+)?\s*\)$/.test(color)) return true;

  // Check for hsl/hsla
  if (/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+)?\s*\)$/.test(color)) return true;

  // Check for named colors (basic set)
  const namedColors = [
    'black',
    'white',
    'red',
    'green',
    'blue',
    'yellow',
    'cyan',
    'magenta',
    'transparent',
    'inherit',
    'initial',
    'unset',
    'currentColor'
  ];

  return namedColors.includes(color.toLowerCase());
}
