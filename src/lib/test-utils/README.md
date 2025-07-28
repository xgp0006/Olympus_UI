# Test Utils Documentation

This directory contains comprehensive testing utilities for the Modular C2 Frontend project. These utilities provide consistent, reliable, and maintainable testing patterns across all components.

## Overview

The test utilities are organized into several modules:

- **component-helpers.ts** - Utilities for testing Svelte components
- **mock-factories.ts** - Factory functions for creating test data
- **test-data.ts** - Static test data and fixtures
- **custom-matchers.ts** - Custom Jest/Vitest matchers
- **async-helpers.ts** - Utilities for testing asynchronous operations
- **event-helpers.ts** - Utilities for testing user interactions

## Quick Start

```typescript
import { renderComponent, createMockPlugin, waitForElement } from '$lib/test-utils';
import { TEST_PLUGINS, TEST_THEME } from '$lib/test-utils/test-data';

// Render a component with theme support
const { getByTestId } = renderWithTheme(MyComponent, {
  props: { plugin: createMockPlugin() }
});

// Wait for async operations
await waitForElement(container, '[data-testid="loaded-content"]');

// Use custom matchers
expect(element).toBeAccessible();
expect(element).toHaveThemeVariable('color-background_primary');
```

## Component Testing

### Basic Component Rendering

```typescript
import { renderComponent } from '$lib/test-utils';

test('renders component correctly', () => {
  const { getByTestId } = renderComponent(MyComponent, {
    props: { title: 'Test Title' }
  });
  
  expect(getByTestId('my-component')).toBeInTheDocument();
});
```

### Theme-Aware Testing

```typescript
import { renderWithTheme, mockTheme } from '$lib/test-utils';

test('applies theme correctly', () => {
  const { container } = renderWithTheme(ThemedComponent);
  
  expect(container.firstChild).toBeThemed();
  expect(container.firstChild).toHaveThemeVariable('color-background_primary', '#000000');
});
```

### Error Boundary Testing

```typescript
import { renderWithErrorBoundary } from '$lib/test-utils';

test('handles errors gracefully', () => {
  const { container } = renderWithErrorBoundary(ProblematicComponent);
  
  expect(container).toHandleErrorState();
});
```

## Mock Factories

### Creating Mock Data

```typescript
import { 
  createMockPlugin, 
  createMockMissionItem, 
  createMockNotification 
} from '$lib/test-utils';

// Create mock plugin with defaults
const plugin = createMockPlugin();

// Create mock plugin with overrides
const customPlugin = createMockPlugin({
  name: 'Custom Plugin',
  enabled: false
});

// Create mock mission item
const waypoint = createMockMissionItem({
  type: 'waypoint',
  params: { lat: 40.7128, lng: -74.0060, alt: 100 }
});
```

### Tauri API Mocking

```typescript
import { createMockTauriApi } from '$lib/test-utils';
import { vi } from 'vitest';

// Mock Tauri invoke
const mockTauri = createMockTauriApi();
vi.mocked(mockTauri.invoke).mockResolvedValue(['plugin1', 'plugin2']);

// Test Tauri command calls
expect(mockTauri.invoke).toHaveBeenCalledWithTauriCommand('get_loaded_plugins');
```

## Async Testing

### Waiting for Conditions

```typescript
import { waitForCondition, waitForElement, waitForStoreValue } from '$lib/test-utils';

// Wait for a condition to be true
await waitForCondition(() => component.isReady, 5000);

// Wait for element to appear
const element = await waitForElement(container, '.dynamic-content');

// Wait for store value to change
await waitForStoreValue(myStore, expectedValue);
```

### Promise Testing

```typescript
import { waitForPromise, retryOperation } from '$lib/test-utils';

// Wait for promise with timeout
const result = await waitForPromise(slowOperation(), 10000);

// Retry operation with backoff
const result = await retryOperation(
  () => unreliableOperation(),
  3, // max retries
  100 // base delay
);
```

## Event Testing

### User Interactions

```typescript
import { 
  simulateKeyboardShortcut, 
  simulateTyping, 
  simulateDragAndDrop 
} from '$lib/test-utils';

// Simulate keyboard shortcut
await simulateKeyboardShortcut(element, { key: 's', ctrlKey: true });

// Simulate typing
await simulateTyping(input, 'Hello World');

// Simulate drag and drop
await simulateDragAndDrop(sourceElement, targetElement);
```

### Touch and Mobile Events

```typescript
import { simulateTouch, simulatePinch } from '$lib/test-utils';

// Simulate touch
await simulateTouch(element, [{ clientX: 100, clientY: 100 }]);

// Simulate pinch gesture
await simulatePinch(element, 100, 200); // start distance, end distance
```

## Custom Matchers

### Accessibility Testing

```typescript
// Check if element is accessible
expect(button).toBeAccessible();

// Check keyboard navigation support
expect(container).toSupportKeyboardNavigation();
```

### Theme Testing

```typescript
// Check if element uses theme variables
expect(element).toBeThemed();

// Check specific theme variable
expect(element).toHaveThemeVariable('color-background_primary', '#000000');
```

### Component State Testing

```typescript
// Check loading state
expect(component).toHandleLoadingState();

// Check error state
expect(component).toHandleErrorState();
```

### Tauri Integration Testing

```typescript
// Check Tauri command calls
expect(mockInvoke).toHaveBeenCalledWithTauriCommand('load_plugin', { name: 'test' });
```

## Test Data

### Using Predefined Data

```typescript
import { 
  TEST_PLUGINS, 
  TEST_MISSION_ITEMS, 
  TEST_THEME,
  TEST_SDR_DEVICES 
} from '$lib/test-utils/test-data';

// Use predefined test plugins
const plugins = TEST_PLUGINS;

// Use predefined mission items
const mission = TEST_MISSION_ITEMS;

// Use test theme
const theme = TEST_THEME;
```

### Error Messages and Constants

```typescript
import { TEST_ERROR_MESSAGES, TEST_KEYBOARD_SHORTCUTS } from '$lib/test-utils/test-data';

// Use predefined error messages
const error = TEST_ERROR_MESSAGES.PLUGIN_NOT_FOUND;

// Use keyboard shortcuts
await simulateKeyboardShortcut(element, TEST_KEYBOARD_SHORTCUTS.SAVE);
```

## Best Practices

### 1. Use Descriptive Test Names

```typescript
// Good
test('should display error message when plugin loading fails', () => {});

// Bad
test('error test', () => {});
```

### 2. Follow AAA Pattern

```typescript
test('should update waypoint parameters', async () => {
  // Arrange
  const waypoint = createMockMissionItem();
  const { getByTestId } = renderComponent(WaypointEditor, { props: { waypoint } });
  
  // Act
  await simulateTyping(getByTestId('lat-input'), '40.7128');
  await fireEvent.click(getByTestId('save-button'));
  
  // Assert
  expect(mockUpdateWaypoint).toHaveBeenCalledWith(waypoint.id, {
    lat: 40.7128
  });
});
```

### 3. Clean Up After Tests

```typescript
import { vi, afterEach } from 'vitest';

afterEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
});
```

### 4. Use Proper Async/Await

```typescript
// Good
test('should load data asynchronously', async () => {
  const promise = loadData();
  await waitForPromise(promise);
  expect(data).toBeDefined();
});

// Bad
test('should load data asynchronously', () => {
  loadData().then(() => {
    expect(data).toBeDefined(); // This might not run
  });
});
```

### 5. Test Error Conditions

```typescript
test('should handle network errors gracefully', async () => {
  vi.mocked(invoke).mockRejectedValue(new Error('Network error'));
  
  const { getByTestId } = renderComponent(DataLoader);
  
  await waitFor(() => {
    expect(getByTestId('error-message')).toBeInTheDocument();
  });
});
```

### 6. Use Test IDs Consistently

```typescript
// In component
<button data-testid="save-button">Save</button>

// In test
const saveButton = getByTestId('save-button');
```

### 7. Mock External Dependencies

```typescript
// Mock Tauri
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}));

// Mock external libraries
vi.mock('maplibre-gl', () => ({
  Map: vi.fn().mockImplementation(() => createMockMap())
}));
```

## Common Patterns

### Testing Stores

```typescript
import { get } from 'svelte/store';
import { myStore } from '$lib/stores/my-store';

test('should update store value', () => {
  myStore.set('new value');
  expect(get(myStore)).toBe('new value');
});
```

### Testing Components with Stores

```typescript
import { createMockStore } from '$lib/test-utils';

test('should react to store changes', () => {
  const mockStore = createMockStore('initial');
  
  const { getByText } = renderComponent(StoreConsumer, {
    context: new Map([['store', mockStore]])
  });
  
  mockStore.set('updated');
  expect(getByText('updated')).toBeInTheDocument();
});
```

### Testing Event Dispatchers

```typescript
test('should dispatch custom event', async () => {
  const { component } = renderComponent(EventDispatcher);
  const eventHandler = vi.fn();
  
  component.$on('custom-event', eventHandler);
  
  await fireEvent.click(getByTestId('trigger-button'));
  
  expect(eventHandler).toHaveBeenCalledWith(
    expect.objectContaining({
      detail: { data: 'test' }
    })
  );
});
```

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout or use proper async/await patterns
2. **Mock not working**: Ensure mocks are set up before importing modules
3. **DOM not updating**: Use `waitFor` or `waitForNextTick` for reactive updates
4. **Event not firing**: Check event target and use proper event simulation

### Debugging Tips

1. Use `screen.debug()` to see current DOM state
2. Add `console.log` statements in test setup
3. Use `vi.spyOn` to monitor function calls
4. Check mock call history with `mockFn.mock.calls`

## Performance Considerations

1. Use `vi.clearAllMocks()` in `afterEach` to prevent memory leaks
2. Avoid creating large test data sets unnecessarily
3. Use `vi.useFakeTimers()` for time-dependent tests
4. Mock heavy dependencies like maps and terminals

## Contributing

When adding new test utilities:

1. Follow existing naming conventions
2. Add comprehensive JSDoc comments
3. Include usage examples
4. Update this README
5. Add tests for the utilities themselves