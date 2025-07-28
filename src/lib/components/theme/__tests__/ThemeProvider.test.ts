/**
 * ThemeProvider component tests
 * Tests the ThemeProvider component functionality
 * Requirements: 3.4, 3.5, 3.6
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/svelte';
import ThemeProvider from '../ThemeProvider.svelte';
import { themeState } from '../../../stores/theme';
import type { Theme } from '../../../types/theme';

// Mock Tauri fs API
vi.mock('@tauri-apps/api', () => ({
  fs: {
    readTextFile: vi.fn()
  }
}));

const mockTheme: Theme = {
  name: 'Test Theme',
  metadata: {
    author: 'Test Author',
    version: '1.0.0'
  },
  colors: {
    background_primary: '#000000',
    background_secondary: '#111111',
    background_tertiary: '#222222',
    text_primary: '#ffffff',
    text_secondary: '#cccccc',
    text_disabled: '#666666',
    accent_yellow: '#ffd700',
    accent_blue: '#00bfff',
    accent_red: '#ff4444',
    accent_green: '#00ff88'
  },
  typography: {
    font_family_sans: 'Inter, sans-serif',
    font_family_mono: 'JetBrains Mono, monospace',
    font_size_base: '14px',
    font_size_lg: '18px',
    font_size_sm: '12px'
  },
  layout: {
    border_radius: '6px',
    border_width: '1px',
    spacing_unit: '8px'
  },
  components: {
    cli: {
      background: '#000000',
      text_color: '#00ff88',
      cursor_color: '#ffd700',
      cursor_shape: 'block'
    },
    map: {
      waypoint_color_default: '#00bfff',
      waypoint_color_selected: '#ffd700',
      path_color: '#00ff88',
      geofence_color: '#ff4444'
    },
    button: {
      background_default: '#1a1a1a',
      text_color_default: '#ffffff',
      background_hover: '#2a2a2a',
      background_accent: '#00bfff',
      text_color_accent: '#000000'
    },
    plugin_card: {
      background: '#0a0a0a',
      background_hover: '#1a1a1a',
      icon_color: '#00bfff',
      text_color: '#ffffff',
      border_radius: '8px'
    },
    accordion: {
      background: '#0a0a0a',
      border_color: '#333333',
      header_text_color: '#ffffff'
    },
    hex_coin: {
      background: '#1a1a1a',
      icon_color: '#00bfff',
      border_color_default: '#333333',
      border_color_pinned: '#ffd700',
      snap_point_color: '#00ff88'
    },
    sdr: {
      spectrum_line_color: '#00bfff',
      spectrum_fill_color: 'rgba(0, 191, 255, 0.3)',
      waterfall_color_gradient: 'linear-gradient(to bottom, #ff4444, #ffd700, #00ff88, #00bfff)',
      grid_line_color: '#333333',
      axis_label_color: '#cccccc'
    }
  },
  animations: {
    transition_duration: '200ms',
    easing_function: 'cubic-bezier(0.4, 0, 0.2, 1)',
    hover_scale: '1.05',
    button_press_scale: '0.95'
  }
};

describe('ThemeProvider Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset DOM
    document.documentElement.style.cssText = '';
    // Reset stores
    themeState.set({
      current: null,
      loading: false,
      error: null,
      lastLoaded: 0
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Clean up DOM
    document.documentElement.style.cssText = '';
  });

  it('should render without errors', () => {
    const { getByTestId } = render(ThemeProvider, {
      props: { autoLoad: false }
    });

    // Should render fallback when no theme is loaded
    expect(getByTestId('theme-fallback')).toBeInTheDocument();
  });

  it('should auto-load theme on mount', async () => {
    const { fs } = await import('@tauri-apps/api');
    vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify(mockTheme));

    const { getByTestId } = render(ThemeProvider, {
      props: {
        themeName: 'test-theme',
        autoLoad: true
      }
    });

    await waitFor(
      () => {
        expect(fs.readTextFile).toHaveBeenCalledWith('static/themes/test-theme.json');
      },
      { timeout: 2000 }
    );

    await waitFor(
      () => {
        expect(getByTestId('theme-provider')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('should show loading indicator when enabled', async () => {
    const { fs } = await import('@tauri-apps/api');

    // Create a controlled promise
    let resolvePromise: (value: string) => void;
    const controlledPromise = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });

    vi.mocked(fs.readTextFile).mockReturnValue(controlledPromise);

    const { getByTestId } = render(ThemeProvider, {
      props: {
        themeName: 'test-theme',
        showLoadingIndicator: true,
        autoLoad: true
      }
    });

    // Should show loading indicator
    await waitFor(
      () => {
        expect(getByTestId('theme-loading')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Resolve the promise
    resolvePromise!(JSON.stringify(mockTheme));

    // Loading indicator should disappear
    await waitFor(
      () => {
        expect(() => getByTestId('theme-loading')).toThrow();
      },
      { timeout: 2000 }
    );
  });

  it('should show error message when theme loading fails', async () => {
    const { fs } = await import('@tauri-apps/api');
    vi.mocked(fs.readTextFile).mockRejectedValue(new Error('Theme not found'));

    const { getByTestId } = render(ThemeProvider, {
      props: {
        themeName: 'nonexistent-theme',
        showErrorMessages: true,
        autoLoad: true
      }
    });

    await waitFor(() => {
      expect(getByTestId('theme-error')).toBeInTheDocument();
    });

    expect(getByTestId('theme-error')).toHaveTextContent(
      'Theme Error: Failed to load both primary theme'
    );
  });

  it('should hide error messages when disabled', async () => {
    const { fs } = await import('@tauri-apps/api');
    vi.mocked(fs.readTextFile).mockRejectedValue(new Error('Theme not found'));

    const { queryByTestId } = render(ThemeProvider, {
      props: {
        themeName: 'nonexistent-theme',
        showErrorMessages: false,
        autoLoad: true
      }
    });

    await waitFor(() => {
      // Wait a bit to ensure error would have appeared if enabled
      return new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(queryByTestId('theme-error')).not.toBeInTheDocument();
  });

  it('should apply theme data attribute when theme is loaded', async () => {
    const { fs } = await import('@tauri-apps/api');
    vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify(mockTheme));

    const { getByTestId } = render(ThemeProvider, {
      props: {
        themeName: 'test-theme',
        autoLoad: true
      }
    });

    await waitFor(() => {
      const provider = getByTestId('theme-provider');
      expect(provider).toHaveAttribute('data-theme', 'Test Theme');
    });
  });

  it('should reload theme when themeName prop changes', async () => {
    const { fs } = await import('@tauri-apps/api');
    vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify(mockTheme));

    const { component } = render(ThemeProvider, {
      props: {
        themeName: 'theme1',
        autoLoad: true
      }
    });

    // Wait for initial load
    await waitFor(() => {
      expect(fs.readTextFile).toHaveBeenCalledWith('static/themes/theme1.json');
    });

    // Change theme name
    component.$set({ themeName: 'theme2' });

    // Should load new theme
    await waitFor(() => {
      expect(fs.readTextFile).toHaveBeenCalledWith('static/themes/theme2.json');
    });

    expect(fs.readTextFile).toHaveBeenCalledTimes(2);
  });

  it('should render theme provider when theme is loaded', async () => {
    const { fs } = await import('@tauri-apps/api');
    vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify(mockTheme));

    const { getByTestId } = render(ThemeProvider, {
      props: {
        themeName: 'test-theme',
        autoLoad: true
      }
    });

    await waitFor(() => {
      expect(getByTestId('theme-provider')).toBeInTheDocument();
    });
  });

  it('should render fallback content when theme is not loaded and not loading', () => {
    const { getByTestId } = render(ThemeProvider, {
      props: {
        autoLoad: false
      }
    });

    expect(getByTestId('theme-fallback')).toBeInTheDocument();
  });

  it('should handle retry button click', async () => {
    const { fs } = await import('@tauri-apps/api');
    vi.mocked(fs.readTextFile)
      .mockRejectedValueOnce(new Error('Theme not found'))
      .mockResolvedValueOnce(JSON.stringify(mockTheme));

    const { getByTestId, getByRole } = render(ThemeProvider, {
      props: {
        themeName: 'test-theme',
        showErrorMessages: true,
        autoLoad: true
      }
    });

    // Wait for error to appear
    await waitFor(() => {
      expect(getByTestId('theme-error')).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = getByRole('button', { name: /retry/i });
    retryButton.click();

    // Should successfully load theme on retry
    await waitFor(() => {
      expect(getByTestId('theme-provider')).toBeInTheDocument();
    });

    expect(fs.readTextFile).toHaveBeenCalledTimes(2);
  });

  it('should apply CSS custom properties to DOM when theme loads', async () => {
    const { fs } = await import('@tauri-apps/api');
    vi.mocked(fs.readTextFile).mockResolvedValue(JSON.stringify(mockTheme));

    render(ThemeProvider, {
      props: {
        themeName: 'test-theme',
        autoLoad: true
      }
    });

    await waitFor(() => {
      const rootStyle = document.documentElement.style;
      expect(rootStyle.getPropertyValue('--color-background_primary')).toBe('#000000');
      expect(rootStyle.getPropertyValue('--typography-font_family_sans')).toBe('Inter, sans-serif');
      expect(rootStyle.getPropertyValue('--layout-border_radius')).toBe('6px');
      expect(rootStyle.getPropertyValue('--component-cli-background')).toBe('#000000');
      expect(rootStyle.getPropertyValue('--animation-transition_duration')).toBe('200ms');
    });
  });

  it('should use fallback theme when primary theme fails', async () => {
    const { fs } = await import('@tauri-apps/api');
    vi.mocked(fs.readTextFile)
      .mockRejectedValueOnce(new Error('Primary theme not found'))
      .mockResolvedValueOnce(JSON.stringify(mockTheme));

    const { getByTestId } = render(ThemeProvider, {
      props: {
        themeName: 'nonexistent-theme',
        fallbackTheme: 'super_amoled_black',
        autoLoad: true
      }
    });

    await waitFor(() => {
      expect(getByTestId('theme-provider')).toBeInTheDocument();
    });

    expect(fs.readTextFile).toHaveBeenCalledTimes(2);
    expect(fs.readTextFile).toHaveBeenCalledWith('static/themes/nonexistent-theme.json');
    expect(fs.readTextFile).toHaveBeenCalledWith('static/themes/super_amoled_black.json');
  });
});
