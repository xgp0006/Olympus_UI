/**
 * ThemeSelector Component Tests
 * Tests theme selection and switching functionality
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import ThemeSelector from '../ThemeSelector.svelte';
import { theme, themeLoading, loadTheme } from '../../../stores/theme';
import { createMockTheme } from '../../../test-utils/mock-factories';

// Mock theme store
vi.mock('../../../stores/theme', () => ({
  theme: { subscribe: vi.fn() },
  themeLoading: { subscribe: vi.fn() },
  themeError: { subscribe: vi.fn() },
  loadTheme: vi.fn(),
  reloadTheme: vi.fn(),
  getThemeState: vi.fn(),
  clearThemeError: vi.fn(),
  setTheme: vi.fn(),
  themeState: { subscribe: vi.fn() }
}));

describe('ThemeSelector Component', () => {
  const mockTheme = createMockTheme({
    name: 'Super AMOLED Black'
  });

  const availableThemes = ['super_amoled_black', 'aerospace_blue', 'high_contrast', 'classic_dark'];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default store mocks
    vi.mocked(theme.subscribe).mockImplementation((callback) => {
      callback(mockTheme);
      return () => {};
    });

    vi.mocked(themeLoading.subscribe).mockImplementation((callback) => {
      callback(false);
      return () => {};
    });

    vi.mocked(loadTheme).mockResolvedValue(mockTheme);
  });

  test('renders theme selector with correct structure', () => {
    const { getByTestId } = render(ThemeSelector, {
      props: { availableThemes }
    });

    expect(getByTestId('theme-selector')).toBeInTheDocument();
    expect(screen.getByText('Theme:')).toBeInTheDocument();
    expect(getByTestId('theme-select-input')).toBeInTheDocument();
  });

  test('displays all available themes as options', () => {
    render(ThemeSelector, {
      props: { availableThemes }
    });

    const select = screen.getByTestId('theme-select-input') as HTMLSelectElement;
    const options = Array.from(select.options).map((option) => option.value);

    expect(options).toEqual(availableThemes);
  });

  test('formats theme names correctly for display', () => {
    render(ThemeSelector, {
      props: { availableThemes }
    });

    const select = screen.getByTestId('theme-select-input') as HTMLSelectElement;
    const optionTexts = Array.from(select.options).map((option) => option.text);

    expect(optionTexts).toContain('Super Amoled Black');
    expect(optionTexts).toContain('Aerospace Blue');
    expect(optionTexts).toContain('High Contrast');
    expect(optionTexts).toContain('Classic Dark');
  });

  test('sets initial selected theme based on current theme', () => {
    render(ThemeSelector, {
      props: { availableThemes }
    });

    const select = screen.getByTestId('theme-select-input') as HTMLSelectElement;
    expect(select.value).toBe('super_amoled_black');
  });

  test('handles theme change successfully', async () => {
    const { component } = render(ThemeSelector, {
      props: { availableThemes }
    });

    const mockThemeChangedHandler = vi.fn();
    component.$on('themeChanged', mockThemeChangedHandler);

    const select = screen.getByTestId('theme-select-input');
    await fireEvent.change(select, { target: { value: 'aerospace_blue' } });

    expect(loadTheme).toHaveBeenCalledWith({ themeName: 'aerospace_blue' });
    expect(mockThemeChangedHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: 'aerospace_blue'
      })
    );
  });

  test('handles theme change error', async () => {
    const error = new Error('Failed to load theme');
    vi.mocked(loadTheme).mockRejectedValue(error);

    const { component } = render(ThemeSelector, {
      props: { availableThemes }
    });

    const mockErrorHandler = vi.fn();
    component.$on('themeLoadError', mockErrorHandler);

    const select = screen.getByTestId('theme-select-input') as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: 'aerospace_blue' } });

    await waitFor(() => {
      expect(mockErrorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: 'Failed to load theme'
        })
      );
    });

    // Should reset to original theme on error
    expect(select.value).toBe('super_amoled_black');
  });

  test('does not trigger change for same theme', async () => {
    render(ThemeSelector, {
      props: { availableThemes }
    });

    const select = screen.getByTestId('theme-select-input');

    // Try to select the same theme
    await fireEvent.change(select, { target: { value: 'super_amoled_black' } });

    expect(loadTheme).not.toHaveBeenCalled();
  });

  test('shows loading indicator during theme loading', () => {
    vi.mocked(themeLoading.subscribe).mockImplementation((callback) => {
      callback(true);
      return () => {};
    });

    const { getByTestId } = render(ThemeSelector, {
      props: { availableThemes }
    });

    expect(getByTestId('theme-loading-indicator')).toBeInTheDocument();
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  test('hides loading indicator when not loading', () => {
    const { queryByTestId } = render(ThemeSelector, {
      props: { availableThemes }
    });

    expect(queryByTestId('theme-loading-indicator')).not.toBeInTheDocument();
  });

  test('disables selector when disabled prop is true', () => {
    render(ThemeSelector, {
      props: { availableThemes, disabled: true }
    });

    const select = screen.getByTestId('theme-select-input');
    expect(select).toBeDisabled();
  });

  test('disables selector during theme loading', () => {
    vi.mocked(themeLoading.subscribe).mockImplementation((callback) => {
      callback(true);
      return () => {};
    });

    render(ThemeSelector, {
      props: { availableThemes }
    });

    const select = screen.getByTestId('theme-select-input');
    expect(select).toBeDisabled();
  });

  test('updates selected theme when theme store changes', () => {
    const { rerender } = render(ThemeSelector, {
      props: { availableThemes }
    });

    // Change the theme in the store
    const newTheme = createMockTheme({ name: 'Aerospace Blue' });
    vi.mocked(theme.subscribe).mockImplementation((callback) => {
      callback(newTheme);
      return () => {};
    });

    rerender({ availableThemes });

    const select = screen.getByTestId('theme-select-input') as HTMLSelectElement;
    expect(select.value).toBe('aerospace_blue');
  });

  test('handles theme names with spaces and special characters', () => {
    const specialThemes = ['super_amoled_black', 'high_contrast_mode', 'custom_theme_v2'];

    render(ThemeSelector, {
      props: { availableThemes: specialThemes }
    });

    const select = screen.getByTestId('theme-select-input') as HTMLSelectElement;
    const optionTexts = Array.from(select.options).map((option) => option.text);

    expect(optionTexts).toContain('Super Amoled Black');
    expect(optionTexts).toContain('High Contrast Mode');
    expect(optionTexts).toContain('Custom Theme V2');
  });

  test('uses default theme list when no themes provided', () => {
    render(ThemeSelector);

    const select = screen.getByTestId('theme-select-input') as HTMLSelectElement;
    expect(select.options.length).toBe(1);
    expect(select.options[0].value).toBe('super_amoled_black');
  });

  test('handles unknown error types in theme loading', async () => {
    vi.mocked(loadTheme).mockRejectedValue('String error');

    const { component } = render(ThemeSelector, {
      props: { availableThemes }
    });

    const mockErrorHandler = vi.fn();
    component.$on('themeLoadError', mockErrorHandler);

    const select = screen.getByTestId('theme-select-input');
    await fireEvent.change(select, { target: { value: 'aerospace_blue' } });

    await waitFor(() => {
      expect(mockErrorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: 'Unknown error'
        })
      );
    });
  });

  test('maintains accessibility attributes', () => {
    render(ThemeSelector, {
      props: { availableThemes }
    });

    const label = screen.getByText('Theme:');
    const select = screen.getByTestId('theme-select-input');

    expect(label).toHaveAttribute('for', 'theme-select');
    expect(select).toHaveAttribute('id', 'theme-select');
  });

  test('applies correct CSS classes and styles', () => {
    render(ThemeSelector, {
      props: { availableThemes }
    });

    const container = screen.getByTestId('theme-selector');
    expect(container).toHaveClass('theme-selector');

    const select = screen.getByTestId('theme-select-input');
    expect(select).toHaveClass('theme-select');
  });

  test('handles focus and hover states', async () => {
    render(ThemeSelector, {
      props: { availableThemes }
    });

    const select = screen.getByTestId('theme-select-input');

    // Test focus
    await fireEvent.focus(select);
    expect(select).toHaveFocus();

    // Test blur
    await fireEvent.blur(select);
    expect(select).not.toHaveFocus();
  });

  test('handles theme name normalization correctly', () => {
    const themeWithSpaces = createMockTheme({ name: 'Super AMOLED Black Theme' });

    vi.mocked(theme.subscribe).mockImplementation((callback) => {
      callback(themeWithSpaces);
      return () => {};
    });

    render(ThemeSelector, {
      props: { availableThemes: ['super_amoled_black_theme'] }
    });

    const select = screen.getByTestId('theme-select-input') as HTMLSelectElement;
    expect(select.value).toBe('super_amoled_black_theme');
  });

  test('handles rapid theme changes gracefully', async () => {
    render(ThemeSelector, {
      props: { availableThemes }
    });

    const select = screen.getByTestId('theme-select-input');

    // Rapidly change themes
    await fireEvent.change(select, { target: { value: 'aerospace_blue' } });
    await fireEvent.change(select, { target: { value: 'high_contrast' } });
    await fireEvent.change(select, { target: { value: 'classic_dark' } });

    // Should call loadTheme for each change
    expect(loadTheme).toHaveBeenCalledTimes(3);
    expect(loadTheme).toHaveBeenLastCalledWith({ themeName: 'classic_dark' });
  });

  test('preserves selection during loading state', () => {
    vi.mocked(themeLoading.subscribe).mockImplementation((callback) => {
      callback(true);
      return () => {};
    });

    render(ThemeSelector, {
      props: { availableThemes }
    });

    const select = screen.getByTestId('theme-select-input') as HTMLSelectElement;
    expect(select.value).toBe('super_amoled_black');
    expect(select).toBeDisabled();
  });
});
