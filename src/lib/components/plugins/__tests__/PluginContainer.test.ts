/**
 * PluginContainer Component Tests
 * Tests for the plugin container component functionality
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import PluginContainer from '../PluginContainer.svelte';

describe('PluginContainer', () => {
  it('renders empty state when no plugin ID provided', () => {
    const { getByTestId } = render(PluginContainer, {
      props: { pluginId: '' }
    });

    expect(getByTestId('plugin-empty')).toBeInTheDocument();
  });

  it('sets correct data attributes', () => {
    const { getByTestId } = render(PluginContainer, {
      props: { pluginId: 'mission-planner' }
    });

    const container = getByTestId('plugin-container');
    expect(container).toHaveAttribute('data-plugin-id', 'mission-planner');
  });

  it('renders container with correct structure', () => {
    const { getByTestId } = render(PluginContainer, {
      props: { pluginId: 'test-plugin' }
    });

    const container = getByTestId('plugin-container');
    expect(container).toHaveClass('plugin-container');
    expect(container).toBeInTheDocument();
  });

  it('handles empty plugin ID gracefully', () => {
    const { getByTestId, getByText } = render(PluginContainer, {
      props: { pluginId: '' }
    });

    expect(getByTestId('plugin-empty')).toBeInTheDocument();
    expect(getByText('No Plugin Selected')).toBeInTheDocument();
    expect(getByText('Select a plugin from the dashboard to get started.')).toBeInTheDocument();
  });

  it('displays correct empty state content', () => {
    const { getByText } = render(PluginContainer, {
      props: { pluginId: '' }
    });

    expect(getByText('No Plugin Selected')).toBeInTheDocument();
    expect(getByText('Select a plugin from the dashboard to get started.')).toBeInTheDocument();
  });
});
