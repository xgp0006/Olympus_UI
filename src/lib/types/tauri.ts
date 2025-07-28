/**
 * TypeScript type definitions for Tauri integration
 */

// Application Info
export interface AppInfo {
  name: string;
  version: string;
  backend_status: string;
}

// Plugin System Types
export interface Plugin {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

// Command Response Types
export interface CommandResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Event Payload Types
export interface PluginEvent {
  plugin_id: string;
  event_type: 'loaded' | 'unloaded' | 'enabled' | 'disabled';
  timestamp: number;
}

export interface CliEvent {
  line: string;
  stream: 'stdout' | 'stderr';
  timestamp: number;
}

export interface CliTerminationEvent {
  code: number;
  timestamp: number;
}

// Tauri Window Types
export interface WindowConfig {
  title: string;
  width: number;
  height: number;
  resizable: boolean;
  fullscreen: boolean;
  minimizable: boolean;
  maximizable: boolean;
}

// Error Types
export interface TauriError {
  message: string;
  code?: string;
  details?: unknown;
}
