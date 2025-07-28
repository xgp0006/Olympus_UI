/**
 * SDR Suite Plugin Types
 * Type definitions for the SDR Suite plugin components
 */

export interface FFTData {
  frequencies: number[];
  magnitudes: number[];
  timestamp: number;
  sampleRate: number;
  centerFrequency: number;
}

export interface SdrSettings {
  centerFrequency: number;
  sampleRate: number;
  gain: number;
  bandwidth: number;
}

export interface SdrState {
  connected: boolean;
  recording: boolean;
  settings: SdrSettings;
  error: string | null;
}

export interface WaterfallData {
  data: number[][];
  width: number;
  height: number;
  timestamp: number;
}
