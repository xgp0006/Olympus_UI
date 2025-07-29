/**
 * Tests for responsive utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BREAKPOINTS,
  MEDIA_QUERIES,
  getViewportDimensions,
  matchesBreakpoint,
  getCurrentBreakpoint,
  isMobileDevice,
  isPortraitOrientation,
  prefersReducedMotion,
  detectSwipe,
  addTouchClick,
  generateResponsiveCSS,
  createResponsiveSpacing,
  createResponsiveFontSizes
} from '../responsive';

// Mock window object
const mockWindow = {
  innerWidth: 1024,
  innerHeight: 768,
  matchMedia: vi.fn()
};

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true
});

describe('Responsive Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWindow.innerWidth = 1024;
    mockWindow.innerHeight = 768;
  });

  describe('BREAKPOINTS', () => {
    it('should have correct breakpoint values', () => {
      expect(BREAKPOINTS.xs).toBe(320);
      expect(BREAKPOINTS.sm).toBe(640);
      expect(BREAKPOINTS.md).toBe(768);
      expect(BREAKPOINTS.lg).toBe(1024);
      expect(BREAKPOINTS.xl).toBe(1280);
      expect(BREAKPOINTS['2xl']).toBe(1536);
    });
  });

  describe('MEDIA_QUERIES', () => {
    it('should generate correct media queries', () => {
      expect(MEDIA_QUERIES.md).toBe('(min-width: 768px)');
      expect(MEDIA_QUERIES['max-md']).toBe('(max-width: 767px)');
      expect(MEDIA_QUERIES.touch).toBe('(hover: none) and (pointer: coarse)');
      expect(MEDIA_QUERIES.portrait).toBe('(orientation: portrait)');
    });
  });

  describe('getViewportDimensions', () => {
    it('should return current viewport dimensions', () => {
      const dimensions = getViewportDimensions();
      expect(dimensions).toEqual({ width: 1024, height: 768 });
    });

    it('should return default dimensions when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const dimensions = getViewportDimensions();
      expect(dimensions).toEqual({ width: 1024, height: 768 });

      global.window = originalWindow;
    });
  });

  describe('matchesBreakpoint', () => {
    it('should return true when viewport matches breakpoint', () => {
      mockWindow.innerWidth = 1024;
      expect(matchesBreakpoint('lg')).toBe(true);
      expect(matchesBreakpoint('md')).toBe(true);
      expect(matchesBreakpoint('xl')).toBe(false);
    });

    it('should return false when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      expect(matchesBreakpoint('lg')).toBe(false);

      global.window = originalWindow;
    });
  });

  describe('getCurrentBreakpoint', () => {
    it('should return correct breakpoint for different widths', () => {
      mockWindow.innerWidth = 320;
      expect(getCurrentBreakpoint()).toBe('xs');

      mockWindow.innerWidth = 640;
      expect(getCurrentBreakpoint()).toBe('sm');

      mockWindow.innerWidth = 768;
      expect(getCurrentBreakpoint()).toBe('md');

      mockWindow.innerWidth = 1024;
      expect(getCurrentBreakpoint()).toBe('lg');

      mockWindow.innerWidth = 1280;
      expect(getCurrentBreakpoint()).toBe('xl');

      mockWindow.innerWidth = 1536;
      expect(getCurrentBreakpoint()).toBe('2xl');
    });
  });

  describe('isMobileDevice', () => {
    it('should detect mobile devices correctly', () => {
      mockWindow.matchMedia = vi.fn().mockReturnValue({ matches: true });
      expect(isMobileDevice()).toBe(true);

      mockWindow.matchMedia = vi.fn().mockReturnValue({ matches: false });
      expect(isMobileDevice()).toBe(false);
    });

    it('should return false when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      expect(isMobileDevice()).toBe(false);

      global.window = originalWindow;
    });
  });

  describe('isPortraitOrientation', () => {
    it('should detect portrait orientation correctly', () => {
      mockWindow.matchMedia = vi.fn().mockReturnValue({ matches: true });
      expect(isPortraitOrientation()).toBe(true);

      mockWindow.matchMedia = vi.fn().mockReturnValue({ matches: false });
      expect(isPortraitOrientation()).toBe(false);
    });
  });

  describe('prefersReducedMotion', () => {
    it('should detect reduced motion preference correctly', () => {
      mockWindow.matchMedia = vi.fn().mockReturnValue({ matches: true });
      expect(prefersReducedMotion()).toBe(true);

      mockWindow.matchMedia = vi.fn().mockReturnValue({ matches: false });
      expect(prefersReducedMotion()).toBe(false);
    });
  });

  describe('detectSwipe', () => {
    it('should detect horizontal swipe correctly', () => {
      const startTouch = { x: 100, y: 100, timestamp: 0 };
      const endTouch = { x: 200, y: 110, timestamp: 300 };

      const swipe = detectSwipe(startTouch, endTouch);
      expect(swipe).toEqual({
        direction: 'right',
        distance: expect.any(Number),
        duration: 300,
        velocity: expect.any(Number)
      });
    });

    it('should detect vertical swipe correctly', () => {
      const startTouch = { x: 100, y: 100, timestamp: 0 };
      const endTouch = { x: 110, y: 200, timestamp: 300 };

      const swipe = detectSwipe(startTouch, endTouch);
      expect(swipe).toEqual({
        direction: 'down',
        distance: expect.any(Number),
        duration: 300,
        velocity: expect.any(Number)
      });
    });

    it('should return null for short distance swipes', () => {
      const startTouch = { x: 100, y: 100, timestamp: 0 };
      const endTouch = { x: 120, y: 110, timestamp: 300 };

      const swipe = detectSwipe(startTouch, endTouch);
      expect(swipe).toBeNull();
    });

    it('should return null for slow swipes', () => {
      const startTouch = { x: 100, y: 100, timestamp: 0 };
      const endTouch = { x: 200, y: 110, timestamp: 1500 };

      const swipe = detectSwipe(startTouch, endTouch);
      expect(swipe).toBeNull();
    });
  });

  describe('addTouchClick', () => {
    let mockElement: HTMLElement;
    let mockCallback: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockElement = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      } as any;
      mockCallback = vi.fn();
    });

    it('should add event listeners correctly', () => {
      const cleanup = addTouchClick(mockElement, mockCallback);

      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        { passive: true }
      );
      expect(mockElement.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function));
      expect(mockElement.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));

      cleanup();

      expect(mockElement.removeEventListener).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function)
      );
      expect(mockElement.removeEventListener).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function)
      );
      expect(mockElement.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  describe('generateResponsiveCSS', () => {
    it('should generate responsive CSS correctly', () => {
      const css = generateResponsiveCSS(16, { sm: 1.2, lg: 1.5 });

      expect(css).toContain('--responsive-value: 12px;');
      expect(css).toContain('@media (min-width: 640px)');
      expect(css).toContain('--responsive-value: 19.2px;');
      expect(css).toContain('@media (min-width: 1024px)');
      expect(css).toContain('--responsive-value: 24px;');
    });
  });

  describe('createResponsiveSpacing', () => {
    it('should create responsive spacing values', () => {
      const spacing = createResponsiveSpacing(8);

      expect(spacing).toEqual({
        'spacing-xs': '4px',
        'spacing-sm': '6px',
        'spacing-base': '8px',
        'spacing-lg': '12px',
        'spacing-xl': '16px',
        'spacing-2xl': '24px'
      });
    });
  });

  describe('createResponsiveFontSizes', () => {
    it('should create responsive font sizes', () => {
      const fontSizes = createResponsiveFontSizes(14);

      expect(fontSizes).toEqual({
        'font-xs': '10.5px',
        'font-sm': '12.25px',
        'font-base': '14px',
        'font-lg': '15.75px',
        'font-xl': '17.5px',
        'font-2xl': '21px'
      });
    });
  });
});
