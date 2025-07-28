/**
 * Plugin type definitions for the Modular C2 Frontend
 * Defines interfaces for the plugin system
 * Requirements: 1.2, 1.3
 */

/**
 * Plugin interface representing a loadable plugin
 */
export interface Plugin {
  /** Unique identifier for the plugin */
  id: string;

  /** Human-readable name of the plugin */
  name: string;

  /** Description of the plugin's functionality */
  description: string;

  /** Icon URL or path for the plugin (optional) */
  icon?: string;

  /** Whether the plugin is currently enabled */
  enabled: boolean;

  /** Plugin version */
  version?: string;

  /** Plugin author */
  author?: string;

  /** Plugin category for organization */
  category?: string;

  /** Required permissions for the plugin */
  permissions?: string[];

  /** Plugin configuration options */
  config?: Record<string, unknown>;
}

/**
 * Plugin metadata interface for additional plugin information
 */
export interface PluginMetadata {
  /** Plugin ID */
  id: string;

  /** Plugin manifest information */
  manifest: {
    name: string;
    version: string;
    description: string;
    author: string;
    homepage?: string;
    repository?: string;
    license?: string;
  };

  /** Plugin capabilities */
  capabilities: {
    /** Whether the plugin provides a UI component */
    hasUI: boolean;

    /** Whether the plugin provides CLI commands */
    hasCLI: boolean;

    /** Whether the plugin requires network access */
    requiresNetwork: boolean;

    /** Whether the plugin requires file system access */
    requiresFileSystem: boolean;
  };

  /** Plugin dependencies */
  dependencies?: {
    /** Required plugins */
    plugins?: string[];

    /** Required system libraries */
    system?: string[];
  };
}

/**
 * Plugin state interface for tracking plugin status
 */
export interface PluginState {
  /** Plugin ID */
  id: string;

  /** Current loading state */
  loading: boolean;

  /** Whether the plugin is loaded */
  loaded: boolean;

  /** Whether the plugin is active/running */
  active: boolean;

  /** Error message if plugin failed to load */
  error: string | null;

  /** Last update timestamp */
  lastUpdated: number;
}

/**
 * Plugin configuration interface
 */
export interface PluginConfig {
  /** Plugin ID */
  id: string;

  /** Plugin-specific configuration */
  settings: Record<string, unknown>;

  /** Whether the plugin should auto-load on startup */
  autoLoad: boolean;

  /** Plugin priority for loading order */
  priority: number;

  /** Environment-specific configuration */
  environment?: {
    development?: Record<string, unknown>;
    production?: Record<string, unknown>;
  };
}

/**
 * Plugin event interface for plugin system events
 */
export interface PluginEvent {
  /** Event type */
  type: 'loaded' | 'unloaded' | 'activated' | 'deactivated' | 'error' | 'config-changed';

  /** Plugin ID that triggered the event */
  pluginId: string;

  /** Event timestamp */
  timestamp: number;

  /** Additional event data */
  data?: Record<string, unknown>;

  /** Error information if applicable */
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
}

/**
 * Plugin registry interface for managing available plugins
 */
export interface PluginRegistry {
  /** Available plugins */
  available: Plugin[];

  /** Loaded plugins */
  loaded: Plugin[];

  /** Active plugin ID */
  active: string | null;

  /** Plugin states */
  states: Record<string, PluginState>;

  /** Plugin configurations */
  configs: Record<string, PluginConfig>;
}

/**
 * Plugin component props interface for dynamic plugin loading
 */
export interface PluginComponentProps {
  /** Plugin ID */
  pluginId: string;

  /** Plugin configuration */
  config?: Record<string, unknown>;

  /** Event handlers */
  onLoad?: () => void;
  onError?: (error: Error) => void;
  onUnload?: () => void;
}

/**
 * Plugin API interface for plugin-to-system communication
 */
export interface PluginAPI {
  /** Get plugin information */
  getPlugin: (id: string) => Plugin | null;

  /** Load a plugin */
  loadPlugin: (id: string) => Promise<boolean>;

  /** Unload a plugin */
  unloadPlugin: (id: string) => Promise<boolean>;

  /** Get plugin configuration */
  getConfig: (id: string) => PluginConfig | null;

  /** Update plugin configuration */
  updateConfig: (id: string, config: Partial<PluginConfig>) => Promise<boolean>;

  /** Send message to plugin */
  sendMessage: (id: string, message: unknown) => Promise<unknown>;

  /** Subscribe to plugin events */
  subscribe: (callback: (event: PluginEvent) => void) => () => void;
}

/**
 * Type guard to check if an object is a valid Plugin
 */
export function isPlugin(obj: unknown): obj is Plugin {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const plugin = obj as Partial<Plugin>;

  return (
    typeof plugin.id === 'string' &&
    typeof plugin.name === 'string' &&
    typeof plugin.description === 'string' &&
    typeof plugin.enabled === 'boolean'
  );
}

/**
 * Type guard to check if an object is a valid PluginEvent
 */
export function isPluginEvent(obj: unknown): obj is PluginEvent {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const event = obj as Partial<PluginEvent>;

  return (
    typeof event.type === 'string' &&
    typeof event.pluginId === 'string' &&
    typeof event.timestamp === 'number'
  );
}

/**
 * Default plugin configuration
 */
export const DEFAULT_PLUGIN_CONFIG: Omit<PluginConfig, 'id'> = {
  settings: {},
  autoLoad: false,
  priority: 0
};

/**
 * Plugin categories for organization
 */
export const PLUGIN_CATEGORIES = {
  MISSION: 'mission',
  COMMUNICATION: 'communication',
  NAVIGATION: 'navigation',
  MONITORING: 'monitoring',
  ANALYSIS: 'analysis',
  UTILITY: 'utility'
} as const;

export type PluginCategory = (typeof PLUGIN_CATEGORIES)[keyof typeof PLUGIN_CATEGORIES];
