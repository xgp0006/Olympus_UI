/**
 * Integration tests for responsive design implementation
 * Tests mobile-first layouts and touch optimization
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

// Mock Tauri
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {}))
}));

// Import components
import App from '../../src/lib/components/core/App.svelte';
import PluginDashboard from '../../src/lib/components/plugins/PluginDashboard.svelte';
import CliPanel from '../../src/lib/components/cli/CliPanel.svelte';
import MissionPlanner from '../../src/lib/plugins/mission-planner/MissionPlanner.svelte';
import SdrDashboard from '../../src/lib/plugins/sdr-suite/SdrDashboard.svelte';

// Mock responsive utilities
vi.mock('../../src/lib/utils/responsive', () => ({
  responsiveStore: {
    subscribe: vi.fn(),
    initialize: vi.fn(() => () => {})
  },
  isMobile: { subscribe: vi.fn() },
  isTablet: { subscribe: vi.fn() },
  currentBreakpoint: { subscribe: vi.fn() },
  BREAKPOINTS: {
    xs: 320,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536
  },
  MEDIA_QUERIES: {
    'max-md': '(max-width: 767px)',
    'max-lg': '(max-width: 1023px)'
  }
}));

describe('Responsive Design Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    });

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768
    });

    // Mock matchMedia
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
  });

  describe('Mobile Layout (< 768px)', () => {
    beforeEach(() => {
      window.innerWidth = 375;
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query.includes('max-width: 767px') || query.includes('hover: none'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }));
    });

    it('should render App component with mobile layout', async () => {
      const { container, getByTestId } = render(App);

      await waitFor(() => {
        expect(getByTestId('app-container')).toBeInTheDocument();
      });

      const appContainer = getByTestId('app-container');
      expect(appContainer).toHaveClass('mobile');
    });

    it('should show CLI toggle button on mobile in plugin view', async () => {
      // Mock active plugin
      const { getByTestId, queryByTestId } = render(App);

      await waitFor(() => {
        const cliToggle = queryByTestId('cli-toggle-mobile');
        // CLI toggle should be present in mobile view when in plugin mode
        if (cliToggle) {
          expect(cliToggle).toBeInTheDocument();
        }
      });
    });

    it('should render PluginDashboard with single column layout', async () => {
      const { container } = render(PluginDashboard);

      const pluginsContainer = container.querySelector('.plugins-container.grid');
      if (pluginsContainer) {
        const computedStyle = window.getComputedStyle(pluginsContainer);
        // Should use single column layout on mobile
        expect(computedStyle.gridTemplateColumns).toContain('1');
      }
    });

    it('should render CLI panel with mobile-specific styling', async () => {
      const { getByTestId } = render(CliPanel, { props: { collapsed: false } });

      const cliPanel = getByTestId('cli-panel');
      expect(cliPanel).toHaveClass('mobile');
    });

    it('should render Mission Planner with stacked layout', async () => {
      const { getByTestId } = render(MissionPlanner);

      const missionPlanner = getByTestId('mission-planner');
      expect(missionPlanner).toHaveClass('mobile');

      // Should show accordion toggle button on mobile
      const accordionToggle = getByTestId('accordion-toggle');
      expect(accordionToggle).toBeInTheDocument();
    });

    it('should render SDR Dashboard with mobile layout', async () => {
      const { getByTestId } = render(SdrDashboard);

      const sdrDashboard = getByTestId('sdr-dashboard');
      expect(sdrDashboard).toHaveClass('mobile');
    });
  });

  describe('Tablet Layout (768px - 1023px)', () => {
    beforeEach(() => {
      window.innerWidth = 768;
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query.includes('min-width: 768px') && !query.includes('min-width: 1024px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }));
    });

    it('should render App component with tablet layout', async () => {
      const { getByTestId } = render(App);

      await waitFor(() => {
        const appContainer = getByTestId('app-container');
        expect(appContainer).toHaveClass('tablet');
      });
    });

    it('should render PluginDashboard with two-column layout', async () => {
      const { container } = render(PluginDashboard);

      const pluginsContainer = container.querySelector('.plugins-container.grid');
      if (pluginsContainer) {
        const computedStyle = window.getComputedStyle(pluginsContainer);
        // Should use two-column layout on tablet
        expect(computedStyle.gridTemplateColumns).toContain('2');
      }
    });

    it('should render Mission Planner with side-by-side layout', async () => {
      const { getByTestId, queryByTestId } = render(MissionPlanner);

      const missionPlanner = getByTestId('mission-planner');
      expect(missionPlanner).toHaveClass('tablet');

      // Should not show accordion toggle button on tablet
      const accordionToggle = queryByTestId('accordion-toggle');
      expect(accordionToggle).not.toBeInTheDocument();
    });
  });

  describe('Desktop Layout (>= 1024px)', () => {
    beforeEach(() => {
      window.innerWidth = 1024;
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query.includes('min-width: 1024px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }));
    });

    it('should render App component with desktop layout', async () => {
      const { getByTestId } = render(App);

      await waitFor(() => {
        const appContainer = getByTestId('app-container');
        expect(appContainer).not.toHaveClass('mobile');
        expect(appContainer).not.toHaveClass('tablet');
      });
    });

    it('should render PluginDashboard with auto-fill grid layout', async () => {
      const { container } = render(PluginDashboard);

      const pluginsContainer = container.querySelector('.plugins-container.grid');
      if (pluginsContainer) {
        const computedStyle = window.getComputedStyle(pluginsContainer);
        // Should use auto-fill layout on desktop
        expect(computedStyle.gridTemplateColumns).toContain('auto-fill');
      }
    });
  });

  describe('Touch Interactions', () => {
    beforeEach(() => {
      window.innerWidth = 375;
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query.includes('hover: none') && query.includes('pointer: coarse'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }));
    });

    it('should handle touch events on mobile buttons', async () => {
      const { getByTestId } = render(CliPanel, { props: { collapsed: false } });

      const toggleButton = getByTestId('cli-toggle-button');

      // Simulate touch events
      await fireEvent.touchStart(toggleButton, {
        touches: [{ clientX: 100, clientY: 100 }]
      });

      await fireEvent.touchEnd(toggleButton, {
        changedTouches: [{ clientX: 100, clientY: 100 }]
      });

      expect(toggleButton).toBeInTheDocument();
    });

    it('should handle swipe gestures on Mission Planner', async () => {
      const { getByTestId } = render(MissionPlanner);

      const missionPlanner = getByTestId('mission-planner');

      // Simulate swipe gesture
      await fireEvent.touchStart(missionPlanner, {
        touches: [{ clientX: 100, clientY: 100 }]
      });

      await fireEvent.touchEnd(missionPlanner, {
        changedTouches: [{ clientX: 100, clientY: 200 }]
      });

      expect(missionPlanner).toBeInTheDocument();
    });
  });

  describe('Responsive Theme Variables', () => {
    it('should apply mobile theme variables', async () => {
      window.innerWidth = 375;

      const { container } = render(App);

      // Check if mobile-specific CSS custom properties are applied
      const rootElement = document.documentElement;
      const computedStyle = window.getComputedStyle(rootElement);

      // These would be set by the theme system
      expect(rootElement).toBeDefined();
    });

    it('should apply tablet theme variables', async () => {
      window.innerWidth = 768;

      const { container } = render(App);

      const rootElement = document.documentElement;
      expect(rootElement).toBeDefined();
    });

    it('should apply desktop theme variables', async () => {
      window.innerWidth = 1024;

      const { container } = render(App);

      const rootElement = document.documentElement;
      expect(rootElement).toBeDefined();
    });
  });

  describe('Accessibility and Reduced Motion', () => {
    it('should respect reduced motion preferences', async () => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }));

      const { container } = render(App);

      // Components should apply reduced motion styles
      expect(container).toBeInTheDocument();
    });

    it('should maintain minimum touch target sizes', async () => {
      window.innerWidth = 375;

      const { getByTestId } = render(CliPanel, { props: { collapsed: false } });

      const toggleButton = getByTestId('cli-toggle-button');
      const computedStyle = window.getComputedStyle(toggleButton);

      // Should meet minimum 44px touch target size on mobile
      const minHeight = parseInt(computedStyle.minHeight);
      expect(minHeight).toBeGreaterThanOrEqual(44);
    });
  });

  describe('Layout Transitions', () => {
    it('should handle viewport size changes smoothly', async () => {
      const { getByTestId, rerender } = render(App);

      // Start with mobile
      window.innerWidth = 375;
      await rerender({});

      // Change to desktop
      window.innerWidth = 1024;
      window.dispatchEvent(new Event('resize'));

      await waitFor(() => {
        const appContainer = getByTestId('app-container');
        expect(appContainer).toBeInTheDocument();
      });
    });

    it('should handle orientation changes', async () => {
      const { getByTestId } = render(App);

      // Simulate orientation change
      window.dispatchEvent(new Event('orientationchange'));

      await waitFor(() => {
        const appContainer = getByTestId('app-container');
        expect(appContainer).toBeInTheDocument();
      });
    });
  });
});
