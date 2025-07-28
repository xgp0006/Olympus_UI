# Safe API Invocation Utilities

This module provides comprehensive utilities for safe Tauri command invocation with error handling, retry logic, circuit breaker protection, and notification integration.

## Requirements

Implements requirement **6.1**: "WHEN interacting with plugins THEN the system SHALL use defined Tauri commands and events."

## Core Features

### 1. Enhanced Error Handling

- Structured error parsing and reporting
- User-friendly error notifications
- Comprehensive logging for debugging
- Graceful degradation on failures

### 2. Retry Logic

- Configurable retry attempts with exponential backoff
- Automatic recovery notifications
- Timeout protection for long-running operations

### 3. Circuit Breaker Protection

- Prevents cascading failures
- Automatic recovery after cooldown periods
- Per-category circuit breakers (plugin, cli, mission, sdr)
- Manual reset capabilities

### 4. Event Handling

- Resilient event listeners with error tracking
- Automatic disable/re-enable on repeated failures
- Configurable error thresholds and cooldown periods

### 5. Health Monitoring

- Backend connectivity health checks
- Performance monitoring and alerting
- Comprehensive API status reporting

## API Reference

### Core Functions

#### `invokeTauriCommand<T>(command, args?, options?)`

Enhanced Tauri command wrapper with comprehensive error handling.

```typescript
const result = await invokeTauriCommand<Plugin[]>('get_loaded_plugins', undefined, {
  retryAttempts: 2,
  timeout: 5000,
  notificationTitle: 'Failed to Load Plugins'
});
```

#### `safeTauriInvoke<T>(command, args?, options?)`

Safe command invocation that returns `null` on error instead of throwing.

```typescript
const plugins = (await safeTauriInvoke<Plugin[]>('get_loaded_plugins')) || [];
```

#### `protectedTauriInvoke<T>(command, args?, category?, options?)`

Command invocation with circuit breaker protection.

```typescript
const result = await protectedTauriInvoke<void>(
  'load_plugin',
  { name: 'mission-planner' },
  'plugin',
  { retryAttempts: 1 }
);
```

#### `batchTauriInvoke<T>(commands, globalOptions?)`

Execute multiple commands in parallel with error handling.

```typescript
const results = await batchTauriInvoke([
  { command: 'get_loaded_plugins' },
  { command: 'get_mission_data' },
  { command: 'get_cli_history' }
]);
```

### Event Handling

#### `setupEventListener<T>(eventName, handler, options?)`

Enhanced event listener with comprehensive error handling.

```typescript
const unlisten = await setupEventListener<CliOutput>(
  'cli-output',
  (output) => console.log(output),
  {
    showErrorNotifications: true,
    maxErrorsBeforeDisable: 5,
    errorCooldownMs: 10000
  }
);
```

### Health Monitoring

#### `checkBackendHealth()`

Check backend connectivity and performance.

```typescript
const health = await checkBackendHealth();
if (health.healthy) {
  console.log(`Backend is healthy (${health.latency}ms)`);
} else {
  console.error(`Backend is unhealthy: ${health.error}`);
}
```

#### `initializeApiMonitoring(intervalMs?)`

Start periodic health monitoring.

```typescript
const cleanup = initializeApiMonitoring(30000); // Check every 30 seconds
// Later: cleanup();
```

### Command Wrappers

Pre-configured command wrappers for different system categories:

#### CLI Commands

```typescript
await CliCommands.runCommand('help');
await CliCommands.getHistory();
const success = await CliCommands.safeRunCommand('status');
```

#### Plugin Commands

```typescript
const plugins = await PluginCommands.getLoadedPlugins();
await PluginCommands.loadPlugin('mission-planner');
const safePlugins = await PluginCommands.safeGetLoadedPlugins();
```

#### Mission Commands

```typescript
const missions = await MissionCommands.getMissionData();
await MissionCommands.updateWaypointParams('wp1', { lat: 37.7749, lng: -122.4194 });
const safeMissions = await MissionCommands.safeGetMissionData();
```

#### SDR Commands

```typescript
await SdrCommands.startSdr(settings);
const devices = await SdrCommands.getAvailableDevices();
await SdrCommands.setCenterFrequency(100000000);
```

## Configuration Options

### ApiInvocationOptions

```typescript
interface ApiInvocationOptions {
  showNotification?: boolean; // Show error notifications (default: true)
  notificationTitle?: string; // Custom notification title
  retryAttempts?: number; // Number of retry attempts (default: 0)
  retryDelay?: number; // Delay between retries in ms (default: 1000)
  timeout?: number; // Command timeout in ms (default: 30000)
  suppressConsoleError?: boolean; // Suppress console error logging (default: false)
}
```

### EventListenerOptions

```typescript
interface EventListenerOptions {
  showErrorNotifications?: boolean; // Show error notifications (default: true)
  errorNotificationTitle?: string; // Custom error notification title
  maxErrorsBeforeDisable?: number; // Max errors before disabling (default: 10)
  errorCooldownMs?: number; // Cooldown period in ms (default: 5000)
  enableLogging?: boolean; // Enable console logging (default: true)
}
```

## Error Recovery

### Circuit Breaker Management

```typescript
// Reset specific category
resetCircuitBreaker('plugin');

// Check circuit breaker status
const status = getCircuitBreakerStatus();
console.log('Plugin circuit breaker:', status.get('plugin'));
```

### Event Error Recovery

```typescript
// Reset event error tracking
resetEventErrorTracking('cli-output');

// Reset all event error tracking
resetAllEventErrorTracking();
```

### Complete API Reset

```typescript
// Reset all error tracking and circuit breakers
resetAllApiErrorTracking();
```

## Best Practices

### 1. Use Appropriate Methods

- Use `safeTauriInvoke` for non-critical operations where null return is acceptable
- Use `protectedTauriInvoke` for operations that need circuit breaker protection
- Use regular `invokeTauriCommand` when you need to handle errors explicitly

### 2. Configure Timeouts

```typescript
// Short timeout for frequent operations
await SdrCommands.setCenterFrequency(freq, { timeout: 1000 });

// Longer timeout for complex operations
await PluginCommands.loadPlugin('complex-plugin', { timeout: 30000 });
```

### 3. Handle Batch Operations

```typescript
// Process results with proper error handling
const results = await batchTauriInvoke(commands);
results.forEach((result, index) => {
  if (result === null) {
    console.warn(`Command ${index} failed`);
  } else {
    // Process successful result
  }
});
```

### 4. Monitor API Health

```typescript
// Initialize monitoring in your main app component
onMount(() => {
  const cleanup = initializeApiMonitoring();
  return cleanup;
});
```

### 5. Graceful Error Handling

```typescript
// Always provide fallback values for safe methods
const plugins = (await PluginCommands.safeGetLoadedPlugins()) || [];
const missions = (await MissionCommands.safeGetMissionData()) || [];
```

## Testing

The utilities include comprehensive tests covering:

- Error handling scenarios
- Retry logic
- Circuit breaker functionality
- Event listener error management
- Health monitoring
- All command wrappers

Run tests with:

```bash
pnpm test src/lib/utils/__tests__/tauri.test.ts
```

## Example Usage

See `src/lib/utils/examples/SafeApiUsage.svelte` for a complete example component demonstrating all features of the safe API invocation utilities.
