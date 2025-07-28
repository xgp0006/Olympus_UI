/**
 * PluginCard Component Tests
 * Tests plugin card display and interaction functionality
 * Requirements: 1.6, 1.7
 */

import { render, fireEvent, screen } from '@testing-library/svelte';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import PluginCard from '../PluginCard.svelte';
import { createMockPlugin } from '../../../test-utils/mock-factories';
import type { Plugin } from '../../../types/plugin';

describe('PluginCard Component', () => {
  const mockPlugin: Plugin = createMockPlugin({
    id: 'test-plugin',
    name: 'Test Plugin',
    description: 'A test plugin for unit testing',
    category: 'mission',
    version: '1.0.0',
    author: 'Test Author',
    enabled: true
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders plugin information correctly', () => {
    const { getByTestId } = render(PluginCard, { props: { plugin: mockPlugin } });

    const card = getByTestId('plugin-card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute('data-plugin-id', 'test-plugin');

    expect(screen.getByText('Test Plugin')).toBeInTheDocument();
    expect(screen.getByText('A test plugin for unit testing')).toBeInTheDocument();
    expect(screen.getByText('Mission')).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByText('by Test Author')).toBeInTheDocument();
  });

  test('displays correct status indicator for enabled plugin', () => {
    render(PluginCard, { props: { plugin: mockPlugin } });

    const statusIndicator = document.querySelector('.status-indicator');
    expect(statusIndicator).toHaveStyle({
      'background-color': 'var(--color-accent_green)'
    });
  });

  test('displays correct status indicator for disabled plugin', () => {
    const disabledPlugin = { ...mockPlugin, enabled: false };
    render(PluginCard, { props: { plugin: disabledPlugin } });

    const statusIndicator = document.querySelector('.status-indicator');
    expect(statusIndicator).toHaveStyle({
      'background-color': 'var(--color-text_disabled)'
    });
  });

  test('shows correct toggle switch state for enabled plugin', () => {
    render(PluginCard, { props: { plugin: mockPlugin } });

    const toggleSwitch = document.querySelector('.toggle-switch');
    expect(toggleSwitch).toHaveClass('enabled');
    expect(toggleSwitch).not.toHaveClass('disabled');
  });

  test('shows correct toggle switch state for disabled plugin', () => {
    const disabledPlugin = { ...mockPlugin, enabled: false };
    render(PluginCard, { props: { plugin: disabledPlugin } });

    const toggleSwitch = document.querySelector('.toggle-switch');
    expect(toggleSwitch).toHaveClass('disabled');
    expect(toggleSwitch).not.toHaveClass('enabled');
  });

  test('fires click event when card is clicked and plugin is enabled', async () => {
    const { component, getByTestId } = render(PluginCard, { props: { plugin: mockPlugin } });

    const mockClickHandler = vi.fn();
    component.$on('click', mockClickHandler);

    const card = getByTestId('plugin-card');
    await fireEvent.click(card);

    expect(mockClickHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { pluginId: 'test-plugin' }
      })
    );
  });

  test('does not fire click event when plugin is disabled', async () => {
    const disabledPlugin = { ...mockPlugin, enabled: false };
    const { component, getByTestId } = render(PluginCard, { props: { plugin: disabledPlugin } });

    const mockClickHandler = vi.fn();
    component.$on('click', mockClickHandler);

    const card = getByTestId('plugin-card');
    await fireEvent.click(card);

    expect(mockClickHandler).not.toHaveBeenCalled();
  });

  test('does not fire click event when card is disabled', async () => {
    const { component, getByTestId } = render(PluginCard, {
      props: { plugin: mockPlugin, disabled: true }
    });

    const mockClickHandler = vi.fn();
    component.$on('click', mockClickHandler);

    const card = getByTestId('plugin-card');
    await fireEvent.click(card);

    expect(mockClickHandler).not.toHaveBeenCalled();
  });

  test('fires toggle event when toggle button is clicked', async () => {
    const { component, getByTestId } = render(PluginCard, { props: { plugin: mockPlugin } });

    const mockToggleHandler = vi.fn();
    component.$on('toggle', mockToggleHandler);

    const toggleButton = getByTestId('plugin-toggle');
    await fireEvent.click(toggleButton);

    expect(mockToggleHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { pluginId: 'test-plugin', enabled: false }
      })
    );
  });

  test('toggle event stops propagation to prevent card click', async () => {
    const { component, getByTestId } = render(PluginCard, { props: { plugin: mockPlugin } });

    const mockClickHandler = vi.fn();
    const mockToggleHandler = vi.fn();
    component.$on('click', mockClickHandler);
    component.$on('toggle', mockToggleHandler);

    const toggleButton = getByTestId('plugin-toggle');
    await fireEvent.click(toggleButton);

    expect(mockToggleHandler).toHaveBeenCalled();
    expect(mockClickHandler).not.toHaveBeenCalled();
  });

  test('handles keyboard navigation for card', async () => {
    const { component, getByTestId } = render(PluginCard, { props: { plugin: mockPlugin } });

    const mockClickHandler = vi.fn();
    component.$on('click', mockClickHandler);

    const card = getByTestId('plugin-card');

    // Test Enter key
    await fireEvent.keyDown(card, { key: 'Enter' });
    expect(mockClickHandler).toHaveBeenCalledTimes(1);

    // Test Space key
    await fireEvent.keyDown(card, { key: ' ' });
    expect(mockClickHandler).toHaveBeenCalledTimes(2);

    // Test other keys (should not trigger)
    await fireEvent.keyDown(card, { key: 'Tab' });
    expect(mockClickHandler).toHaveBeenCalledTimes(2);
  });

  test('applies correct accessibility attributes', () => {
    const { getByTestId } = render(PluginCard, { props: { plugin: mockPlugin } });

    const card = getByTestId('plugin-card');
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute('tabindex', '0');
    expect(card).toHaveAttribute('aria-label', 'Open Test Plugin plugin');
    expect(card).toHaveAttribute('aria-disabled', 'false');

    const toggleButton = getByTestId('plugin-toggle');
    expect(toggleButton).toHaveAttribute('aria-label', 'Disable Test Plugin');
  });

  test('applies correct accessibility attributes when disabled', () => {
    const { getByTestId } = render(PluginCard, {
      props: { plugin: mockPlugin, disabled: true }
    });

    const card = getByTestId('plugin-card');
    expect(card).toHaveAttribute('tabindex', '-1');
    expect(card).toHaveAttribute('aria-disabled', 'true');
  });

  test('applies correct accessibility attributes when plugin is disabled', () => {
    const disabledPlugin = { ...mockPlugin, enabled: false };
    const { getByTestId } = render(PluginCard, { props: { plugin: disabledPlugin } });

    const card = getByTestId('plugin-card');
    expect(card).toHaveAttribute('aria-disabled', 'true');

    const toggleButton = getByTestId('plugin-toggle');
    expect(toggleButton).toHaveAttribute('aria-label', 'Enable Test Plugin');
  });

  test('displays correct icon based on plugin category', () => {
    const categories = [
      { category: 'mission', expectedPath: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
      { category: 'communication', expectedPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' },
      { category: 'navigation', expectedPath: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' }
    ];

    categories.forEach(({ category, expectedPath }) => {
      const testPlugin = { ...mockPlugin, category };
      const { container } = render(PluginCard, { props: { plugin: testPlugin } });

      const iconPath = container.querySelector('.plugin-icon svg path');
      expect(iconPath).toHaveAttribute('d', expectedPath);
    });
  });

  test('displays default icon for unknown category', () => {
    const testPlugin = { ...mockPlugin, category: 'unknown' };
    render(PluginCard, { props: { plugin: testPlugin } });

    const iconPath = document.querySelector('.plugin-icon svg path');
    expect(iconPath).toHaveAttribute('d', 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z');
  });

  test('formats category name correctly', () => {
    const categories = [
      { category: 'mission', expected: 'Mission' },
      { category: 'communication', expected: 'Communication' },
      { category: 'navigation', expected: 'Navigation' },
      { category: 'monitoring', expected: 'Monitoring' },
      { category: 'analysis', expected: 'Analysis' },
      { category: 'utility', expected: 'Utility' },
      { category: undefined, expected: 'General' }
    ];

    categories.forEach(({ category, expected }) => {
      const testPlugin = { ...mockPlugin, category };
      render(PluginCard, { props: { plugin: testPlugin } });

      if (expected !== 'General') {
        expect(screen.getByText(expected)).toBeInTheDocument();
      }
    });
  });

  test('handles missing optional fields gracefully', () => {
    const minimalPlugin: Plugin = {
      id: 'minimal-plugin',
      name: 'Minimal Plugin',
      description: 'A minimal plugin',
      enabled: true
    };

    const { getByTestId } = render(PluginCard, { props: { plugin: minimalPlugin } });

    expect(getByTestId('plugin-card')).toBeInTheDocument();
    expect(screen.getByText('Minimal Plugin')).toBeInTheDocument();
    expect(screen.getByText('A minimal plugin')).toBeInTheDocument();

    // Should not show version or author
    expect(screen.queryByText(/^v/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^by /)).not.toBeInTheDocument();
  });

  test('applies correct CSS classes based on state', () => {
    // Test enabled plugin
    const { getByTestId, rerender } = render(PluginCard, { props: { plugin: mockPlugin } });
    let card = getByTestId('plugin-card');
    expect(card).not.toHaveClass('disabled');
    expect(card).not.toHaveClass('plugin-disabled');

    // Test disabled plugin
    const disabledPlugin = { ...mockPlugin, enabled: false };
    rerender({ plugin: disabledPlugin });
    card = getByTestId('plugin-card');
    expect(card).toHaveClass('plugin-disabled');

    // Test disabled prop
    rerender({ plugin: mockPlugin, disabled: true });
    card = getByTestId('plugin-card');
    expect(card).toHaveClass('disabled');
  });

  test('shows correct hover overlay content for enabled plugin', () => {
    render(PluginCard, { props: { plugin: mockPlugin } });

    const hoverOverlay = document.querySelector('.hover-overlay');
    expect(hoverOverlay).toBeInTheDocument();

    const launchIcon = document.querySelector('.launch-icon');
    expect(launchIcon).toBeInTheDocument();
    expect(screen.getByText('Open Plugin')).toBeInTheDocument();
  });

  test('shows correct hover overlay content for disabled plugin', () => {
    const disabledPlugin = { ...mockPlugin, enabled: false };
    render(PluginCard, { props: { plugin: disabledPlugin } });

    const hoverOverlay = document.querySelector('.hover-overlay');
    expect(hoverOverlay).toBeInTheDocument();

    const disabledIcon = document.querySelector('.disabled-icon');
    expect(disabledIcon).toBeInTheDocument();
    expect(screen.getByText('Plugin Disabled')).toBeInTheDocument();
  });

  test('truncates long descriptions properly', () => {
    const longDescriptionPlugin = {
      ...mockPlugin,
      description: 'This is a very long description that should be truncated when it exceeds the maximum number of lines allowed in the plugin card description area. It should use CSS line-clamp to handle this gracefully.'
    };

    render(PluginCard, { props: { plugin: longDescriptionPlugin } });

    const description = document.querySelector('.plugin-description p');
    expect(description).toHaveStyle({
      display: '-webkit-box',
      '-webkit-line-clamp': '3',
      'line-clamp': '3',
      '-webkit-box-orient': 'vertical',
      overflow: 'hidden'
    });
  });

  test('handles plugin ID-based icon selection', () => {
    const pluginIds = [
      { id: 'mission-planner', expectedPath: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
      { id: 'sdr-suite', expectedPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' }
    ];

    pluginIds.forEach(({ id, expectedPath }) => {
      const testPlugin = { ...mockPlugin, id, category: undefined };
      const { container } = render(PluginCard, { props: { plugin: testPlugin } });

      const iconPath = container.querySelector('.plugin-icon svg path');
      expect(iconPath).toHaveAttribute('d', expectedPath);
    });
  });
});