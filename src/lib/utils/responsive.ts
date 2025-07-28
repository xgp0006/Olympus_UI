/**
 * Responsive Design Utilities for Modular C2 Frontend
 * Provides utilities for mobile-first responsive design and touch optimization
 */

// ===== BREAKPOINTS =====
export const BREAKPOINTS = {
  xs: 320,   // Extra small devices (phones)
  sm: 640,   // Small devices (large phones)
  md: 768,   // Medium devices (tablets)
  lg: 1024,  // Large devices (laptops)
  xl: 1280,  // Extra large devices (desktops)
  '2xl': 1536 // 2X large devices (large desktops)
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// ===== MEDIA QUERIES =====
export const MEDIA_QUERIES = {
  xs: `(min-width: ${BREAKPOINTS.xs}px)`,
  sm: `(min-width: ${BREAKPOINTS.sm}px)`,
  md: `(min-width: ${BREAKPOINTS.md}px)`,
  lg: `(min-width: ${BREAKPOINTS.lg}px)`,
  xl: `(min-width: ${BREAKPOINTS.xl}px)`,
  '2xl': `(min-width: ${BREAKPOINTS['2xl']}px)`,
  
  // Max-width queries for mobile-first approach
  'max-xs': `(max-width: ${BREAKPOINTS.xs - 1}px)`,
  'max-sm': `(max-width: ${BREAKPOINTS.sm - 1}px)`,
  'max-md': `(max-width: ${BREAKPOINTS.md - 1}px)`,
  'max-lg': `(max-width: ${BREAKPOINTS.lg - 1}px)`,
  'max-xl': `(max-width: ${BREAKPOINTS.xl - 1}px)`,
  
  // Orientation queries
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
  
  // Touch device detection
  touch: '(hover: none) and (pointer: coarse)',
  'no-touch': '(hover: hover) and (pointer: fine)',
  
  // High DPI displays
  retina: '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',
  
  // Reduced motion preference
  'reduced-motion': '(prefers-reduced-motion: reduce)',
  'no-reduced-motion': '(prefers-reduced-motion: no-preference)'
} as const;

// ===== VIEWPORT UTILITIES =====

/**
 * Get current viewport dimensions
 */
export function getViewportDimensions(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 1024, height: 768 }; // Default for SSR
  }
  
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

/**
 * Check if current viewport matches a breakpoint
 */
export function matchesBreakpoint(breakpoint: Breakpoint): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.innerWidth >= BREAKPOINTS[breakpoint];
}

/**
 * Get current breakpoint
 */
export function getCurrentBreakpoint(): Breakpoint {
  const { width } = getViewportDimensions();
  
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

/**
 * Check if device is mobile (touch-based)
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia(MEDIA_QUERIES.touch).matches;
}

/**
 * Check if device is in portrait orientation
 */
export function isPortraitOrientation(): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia(MEDIA_QUERIES.portrait).matches;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia(MEDIA_QUERIES['reduced-motion']).matches;
}

// ===== RESPONSIVE STORE =====

import { writable, derived } from 'svelte/store';

interface ResponsiveState {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isPortrait: boolean;
  prefersReducedMotion: boolean;
}

function createResponsiveStore() {
  const { subscribe, set, update } = writable<ResponsiveState>({
    width: 1024,
    height: 768,
    breakpoint: 'lg',
    isMobile: false,
    isPortrait: false,
    prefersReducedMotion: false
  });

  let resizeTimeout: number;

  function updateState() {
    const dimensions = getViewportDimensions();
    const breakpoint = getCurrentBreakpoint();
    const isMobile = isMobileDevice();
    const isPortrait = isPortraitOrientation();
    const reducedMotion = prefersReducedMotion();

    set({
      width: dimensions.width,
      height: dimensions.height,
      breakpoint,
      isMobile,
      isPortrait,
      prefersReducedMotion: reducedMotion
    });
  }

  function handleResize() {
    // Debounce resize events for performance
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(updateState, 100);
  }

  function initialize() {
    if (typeof window === 'undefined') return;

    updateState();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      // Delay to allow orientation change to complete
      setTimeout(updateState, 100);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }

  return {
    subscribe,
    initialize
  };
}

export const responsiveStore = createResponsiveStore();

// ===== DERIVED STORES =====

export const isMobile = derived(responsiveStore, ($responsive) => $responsive.isMobile);
export const isTablet = derived(responsiveStore, ($responsive) => 
  $responsive.breakpoint === 'md' || ($responsive.breakpoint === 'lg' && $responsive.isMobile)
);
export const isDesktop = derived(responsiveStore, ($responsive) => 
  $responsive.breakpoint === 'lg' || $responsive.breakpoint === 'xl' || $responsive.breakpoint === '2xl'
);
export const currentBreakpoint = derived(responsiveStore, ($responsive) => $responsive.breakpoint);

// ===== TOUCH UTILITIES =====

/**
 * Touch event utilities for mobile optimization
 */
export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface SwipeGesture {
  direction: 'up' | 'down' | 'left' | 'right';
  distance: number;
  duration: number;
  velocity: number;
}

/**
 * Detect swipe gestures
 */
export function detectSwipe(
  startTouch: TouchPoint,
  endTouch: TouchPoint,
  minDistance = 50,
  maxTime = 1000
): SwipeGesture | null {
  const deltaX = endTouch.x - startTouch.x;
  const deltaY = endTouch.y - startTouch.y;
  const duration = endTouch.timestamp - startTouch.timestamp;

  if (duration > maxTime) return null;

  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  if (distance < minDistance) return null;

  const velocity = distance / duration;
  
  let direction: SwipeGesture['direction'];
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    direction = deltaX > 0 ? 'right' : 'left';
  } else {
    direction = deltaY > 0 ? 'down' : 'up';
  }

  return {
    direction,
    distance,
    duration,
    velocity
  };
}

/**
 * Add touch-friendly click handling
 */
export function addTouchClick(
  element: HTMLElement,
  callback: (event: Event) => void,
  options: { preventDefault?: boolean } = {}
) {
  let touchStartTime = 0;
  let touchStartPos = { x: 0, y: 0 };

  function handleTouchStart(event: TouchEvent) {
    touchStartTime = Date.now();
    const touch = event.touches[0];
    touchStartPos = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: TouchEvent) {
    const touchEndTime = Date.now();
    const duration = touchEndTime - touchStartTime;
    
    if (duration > 500) return; // Too long for a tap

    const touch = event.changedTouches[0];
    const distance = Math.sqrt(
      Math.pow(touch.clientX - touchStartPos.x, 2) +
      Math.pow(touch.clientY - touchStartPos.y, 2)
    );

    if (distance > 10) return; // Moved too much

    if (options.preventDefault) {
      event.preventDefault();
    }

    callback(event);
  }

  function handleClick(event: MouseEvent) {
    // Only handle mouse clicks on non-touch devices
    if (!isMobileDevice()) {
      callback(event);
    }
  }

  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchend', handleTouchEnd);
  element.addEventListener('click', handleClick);

  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
    element.removeEventListener('click', handleClick);
  };
}

// ===== CSS UTILITIES =====

/**
 * Generate responsive CSS custom properties
 */
export function generateResponsiveCSS(
  baseValue: number,
  scalingFactor: { [K in Breakpoint]?: number } = {}
): string {
  const scales = {
    xs: scalingFactor.xs ?? 0.75,
    sm: scalingFactor.sm ?? 0.875,
    md: scalingFactor.md ?? 1,
    lg: scalingFactor.lg ?? 1.125,
    xl: scalingFactor.xl ?? 1.25,
    '2xl': scalingFactor['2xl'] ?? 1.5
  };

  let css = '';
  Object.entries(scales).forEach(([breakpoint, scale]) => {
    const value = baseValue * scale;
    if (breakpoint === 'xs') {
      css += `--responsive-value: ${value}px;\n`;
    } else {
      css += `@media ${MEDIA_QUERIES[breakpoint as Breakpoint]} {\n`;
      css += `  --responsive-value: ${value}px;\n`;
      css += `}\n`;
    }
  });

  return css;
}

/**
 * Create responsive spacing values
 */
export function createResponsiveSpacing(baseSpacing = 8): Record<string, string> {
  return {
    'spacing-xs': `${baseSpacing * 0.5}px`,
    'spacing-sm': `${baseSpacing * 0.75}px`,
    'spacing-base': `${baseSpacing}px`,
    'spacing-lg': `${baseSpacing * 1.5}px`,
    'spacing-xl': `${baseSpacing * 2}px`,
    'spacing-2xl': `${baseSpacing * 3}px`
  };
}

/**
 * Create responsive font sizes
 */
export function createResponsiveFontSizes(baseFontSize = 14): Record<string, string> {
  return {
    'font-xs': `${baseFontSize * 0.75}px`,
    'font-sm': `${baseFontSize * 0.875}px`,
    'font-base': `${baseFontSize}px`,
    'font-lg': `${baseFontSize * 1.125}px`,
    'font-xl': `${baseFontSize * 1.25}px`,
    'font-2xl': `${baseFontSize * 1.5}px`
  };
}