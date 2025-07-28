/**
 * SDR Controls Component Tests
 * Tests for the SDR controls component functionality
 */
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { vi } from 'vitest';
import SdrControls from '../SdrControls.svelte';
import { sdrStore } from '$lib/stores/sdr';

// Mock the SDR store
vi.mock('$lib/stores/sdr', () => ({
  sdrStore: {
    initialize: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    updateSettings: vi.fn(),
    setCenterFrequency: vi.fn(),
    setSampleRate: vi.fn(),
    setGain: vi.fn(),
    setBandwidth: vi.fn(),
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    clearError: vi.fn()
  },
  sdrState: {
    subscribe: vi.fn((callback) => {
      callback({
        connected: false,
        recording: false,
        settings: {
          centerFrequency: 100000000,
          sampleRate: 2048000,
          gain: 20,
          bandwidth: 1000000
        },
        error: null
      });
      return () => {};
    })
  },
  sdrConnectionStatus: {
    subscribe: vi.fn((callback) => {
      callback({
        connected: false,
        connecting: false,
        error: null,
        lastUpdate: Date.now()
      });
      return () => {};
    })
  },
  sdrRecordingStatus: {
    subscribe: vi.fn((callback) => {
      callback({
        recording: false,
        connected: false
      });
      return () => {};
    })
  }
}));

// Mock Tauri commands
vi.mock('$lib/utils/tauri', () => ({
  SdrCommands: {
    getAvailableDevices: vi.fn().mockResolvedValue([
      { id: 'rtl0', name: 'RTL-SDR Device', type: 'RTL-SDR' },
      { id: 'hackrf0', name: 'HackRF One', type: 'HackRF' }
    ]),
    startSdr: vi.fn(),
    stopSdr: vi.fn(),
    updateSdrSettings: vi.fn(),
    setCenterFrequency: vi.fn(),
    setSampleRate: vi.fn(),
    setGain: vi.fn(),
    setBandwidth: vi.fn(),
    startRecording: vi.fn(),
    stopRecording: vi.fn()
  }
}));

describe('SdrControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders without errors', () => {
    const { getByTestId } = render(SdrControls);
    expect(getByTestId('sdr-controls')).toBeInTheDocument();
  });

  test('displays connection status correctly', () => {
    const { getByText } = render(SdrControls);
    expect(getByText('Disconnected')).toBeInTheDocument();
  });

  test('loads available devices on mount', async () => {
    const { getByTestId } = render(SdrControls);

    // Initially should show "No devices found" while loading
    const deviceSelect = getByTestId('device-select') as HTMLSelectElement;
    expect(deviceSelect).toBeInTheDocument();

    // The component should at least render the device select element
    expect(deviceSelect.tagName).toBe('SELECT');
  });

  test('handles connection button click', async () => {
    const { getByTestId } = render(SdrControls);

    const connectionButton = getByTestId('connection-button');
    await fireEvent.click(connectionButton);

    expect(sdrStore.start).toHaveBeenCalled();
  });

  test('validates frequency input', async () => {
    const { getByTestId } = render(SdrControls);

    const frequencyInput = getByTestId('center-frequency-input');
    await fireEvent.input(frequencyInput, { target: { value: '500000' } }); // Below minimum

    await waitFor(() => {
      expect(getByTestId('sdr-controls')).toContainHTML(
        'Frequency must be between 1 MHz and 6 GHz'
      );
    });
  });

  test('validates sample rate input', async () => {
    const { getByTestId } = render(SdrControls);

    const sampleRateInput = getByTestId('sample-rate-input');
    await fireEvent.input(sampleRateInput, { target: { value: '100000' } }); // Below minimum

    await waitFor(() => {
      expect(getByTestId('sdr-controls')).toContainHTML(
        'Sample rate must be between 250 kHz and 20 MHz'
      );
    });
  });

  test('handles gain adjustment', async () => {
    const { getByTestId } = render(SdrControls);

    const gainInput = getByTestId('gain-input');
    await fireEvent.input(gainInput, { target: { value: '30' } });

    // Should update pending settings
    expect(gainInput).toHaveValue('30');
  });

  test('shows advanced controls when toggled', async () => {
    const { getByTestId, queryByTestId } = render(SdrControls);

    // Advanced controls should be hidden initially
    expect(queryByTestId('bandwidth-input')).not.toBeInTheDocument();

    const advancedToggle = getByTestId('advanced-toggle');
    await fireEvent.click(advancedToggle);

    // Advanced controls should now be visible
    await waitFor(() => {
      expect(getByTestId('bandwidth-input')).toBeInTheDocument();
    });
  });

  test('applies settings when apply button is clicked', async () => {
    const { getByTestId } = render(SdrControls);

    // Change a setting
    const frequencyInput = getByTestId('center-frequency-input');
    await fireEvent.input(frequencyInput, { target: { value: '144000000' } });

    // Apply settings button should appear
    await waitFor(() => {
      const applyButton = getByTestId('apply-settings');
      expect(applyButton).toBeInTheDocument();
    });

    const applyButton = getByTestId('apply-settings');
    await fireEvent.click(applyButton);

    expect(sdrStore.updateSettings).toHaveBeenCalledWith({
      centerFrequency: 144000000
    });
  });

  test('resets settings when reset button is clicked', async () => {
    const { getByTestId, queryByTestId } = render(SdrControls);

    // Change a setting
    const frequencyInput = getByTestId('center-frequency-input');
    await fireEvent.input(frequencyInput, { target: { value: '144000000' } });

    // Reset button should appear
    await waitFor(() => {
      const resetButton = getByTestId('reset-settings');
      expect(resetButton).toBeInTheDocument();
    });

    const resetButton = getByTestId('reset-settings');
    await fireEvent.click(resetButton);

    // Apply/reset buttons should disappear
    await waitFor(() => {
      expect(queryByTestId('apply-settings')).not.toBeInTheDocument();
      expect(queryByTestId('reset-settings')).not.toBeInTheDocument();
    });
  });

  test('handles recording toggle', async () => {
    const { getByTestId } = render(SdrControls);

    const recordingButton = getByTestId('recording-button');
    await fireEvent.click(recordingButton);

    expect(sdrStore.startRecording).toHaveBeenCalled();
  });

  test('disables controls when not connected', () => {
    const { getByTestId } = render(SdrControls);

    const recordingButton = getByTestId('recording-button');
    expect(recordingButton).toBeDisabled();
  });

  test('formats frequency display correctly', () => {
    const { getByText } = render(SdrControls);

    // Should display 100 MHz for 100000000 Hz
    expect(getByText('100.000 MHz')).toBeInTheDocument();
  });

  test('formats sample rate display correctly', () => {
    const { getByText } = render(SdrControls);

    // Should display 2.048 MS/s for 2048000 S/s
    expect(getByText('2.048 MS/s')).toBeInTheDocument();
  });
});
