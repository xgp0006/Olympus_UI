# Development Workflow & Code Coherence Standards

## Critical Development Principles

**MANDATORY: Execute with ZERO errors, ZERO warnings, ZERO fake code, ABSOLUTE accuracy**

### Pre-Development Requirements

**MANDATORY BEFORE ANY DEVELOPMENT:**

- [ ] **Read all specification files**: `.kiro/specs/modular-c2-frontend/requirements.md`, `design.md`, `tasks.md`
- [ ] **Understand Tauri integration**: Review backend communication patterns and command/event structure
- [ ] **Analyze existing codebase patterns**: Maintain consistency with established architectural patterns
- [ ] **Validate development environment**: Ensure all tools and dependencies are properly configured

## Code Coherence & Consistency Standards

### Architectural Consistency

#### Module Organization Pattern

```typescript
// MANDATORY: Follow this exact structure for all new modules
src/lib/
├── components/          // Reusable UI components
│   ├── [domain]/       // Domain-specific component groups
│   └── ui/             // Generic UI components
├── stores/             // Svelte stores for state management
├── utils/              // Pure utility functions
├── types/              // TypeScript type definitions
└── plugins/            // Plugin implementations
```

#### Naming Conventions (STRICTLY ENFORCED)

- **Files**: PascalCase for components (`PluginCard.svelte`), camelCase for utilities (`themeUtils.ts`)
- **Variables**: camelCase (`selectedPlugin`, `isLoading`)
- **Functions**: camelCase (`loadTheme()`, `handleClick()`)
- **Constants**: SCREAMING_SNAKE_CASE (`DEFAULT_THEME`, `MAX_PLUGINS`)
- **Types/Interfaces**: PascalCase (`PluginConfig`, `ThemeData`)
- **CSS Classes**: kebab-case (`plugin-card`, `theme-selector`)

#### Import Organization (MANDATORY ORDER)

```typescript
// 1. Svelte/SvelteKit imports
import { onMount, onDestroy } from 'svelte';
import { page } from '$app/stores';

// 2. External library imports (alphabetical)
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

// 3. Internal library imports (alphabetical)
import { theme } from '$lib/stores/theme';
import { validateInput } from '$lib/utils/validation';
import type { PluginConfig } from '$lib/types/plugin';

// 4. Local imports (relative paths)
import ChildComponent from './ChildComponent.svelte';
import type { LocalType } from './types';
```

### Tauri Integration Patterns

#### Command Invocation Pattern

```typescript
// MANDATORY: Use this pattern for all Tauri command calls
async function invokeTauriCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    const result = await invoke<T>(command, args);
    return result;
  } catch (error) {
    console.error(`Tauri command '${command}' failed:`, error);
    throw new Error(`Failed to execute ${command}: ${error}`);
  }
}

// Usage example
const plugins = await invokeTauriCommand<Plugin[]>('get_loaded_plugins');
```

#### Event Listening Pattern

```typescript
// MANDATORY: Use this pattern for all Tauri event listeners
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

let unlisten: UnlistenFn | null = null;

onMount(async () => {
  try {
    unlisten = await listen<EventPayload>('event-name', (event) => {
      // Handle event with proper error boundaries
      try {
        handleEvent(event.payload);
      } catch (error) {
        console.error('Event handling error:', error);
        // Emit error to notification system
      }
    });
  } catch (error) {
    console.error('Failed to setup event listener:', error);
  }
});

onDestroy(() => {
  if (unlisten) {
    unlisten();
  }
});
```

### Component Development Standards

#### Component Structure Template (MANDATORY)

```svelte
<script lang="ts">
  // ===== IMPORTS (follow import order) =====
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { invoke } from '@tauri-apps/api/tauri';
  import { theme } from '$lib/stores/theme';
  import type { ComponentProps } from '$lib/types/component';

  // ===== TYPES =====
  interface ComponentState {
    loading: boolean;
    error: string | null;
    data: ComponentProps | null;
  }

  // ===== PROPS =====
  export let initialData: ComponentProps | null = null;
  export let onUpdate: (data: ComponentProps) => void = () => {};

  // ===== STATE =====
  let state: ComponentState = {
    loading: false,
    error: null,
    data: initialData
  };

  // ===== EVENT DISPATCHER =====
  const dispatch = createEventDispatcher<{
    change: ComponentProps;
    error: string;
    ready: void;
  }>();

  // ===== REACTIVE STATEMENTS =====
  $: if (state.data) {
    onUpdate(state.data);
  }

  // ===== FUNCTIONS =====
  /**
   * Handle data updates with proper error handling
   * @param newData - The new data to process
   */
  async function handleDataUpdate(newData: ComponentProps): Promise<void> {
    try {
      state.loading = true;
      state.error = null;

      // Validate input
      if (!validateComponentProps(newData)) {
        throw new Error('Invalid component props');
      }

      // Process data
      const processedData = await processData(newData);
      state.data = processedData;

      dispatch('change', processedData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      state.error = errorMessage;
      dispatch('error', errorMessage);
    } finally {
      state.loading = false;
    }
  }

  // ===== LIFECYCLE =====
  onMount(async () => {
    try {
      // Initialization logic
      await initializeComponent();
      dispatch('ready');
    } catch (error) {
      console.error('Component initialization failed:', error);
      state.error = 'Failed to initialize component';
    }
  });

  onDestroy(() => {
    // Cleanup logic
    cleanupResources();
  });
</script>

<!-- ===== TEMPLATE ===== -->
<div class="component-root" data-testid="component-name">
  {#if state.loading}
    <div class="loading-state" data-testid="loading">
      <span>Loading...</span>
    </div>
  {:else if state.error}
    <div class="error-state" data-testid="error">
      <span class="error-message">{state.error}</span>
      <button on:click={() => handleRetry()} class="retry-button"> Retry </button>
    </div>
  {:else if state.data}
    <!-- Main content -->
    <div class="content">
      <!-- Component content here -->
    </div>
  {:else}
    <div class="empty-state" data-testid="empty">
      <span>No data available</span>
    </div>
  {/if}
</div>

<!-- ===== STYLES ===== -->
<style>
  .component-root {
    /* Use theme variables exclusively */
    background-color: var(--color-background_primary);
    color: var(--color-text_primary);
    border-radius: var(--layout-border_radius);
    padding: var(--layout-spacing_unit);
  }

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100px;
    color: var(--color-text_secondary);
  }

  .error-state {
    padding: var(--layout-spacing_unit);
    background-color: var(--color-accent_red);
    color: white;
    border-radius: var(--layout-border_radius);
  }

  .error-message {
    display: block;
    margin-bottom: 0.5rem;
  }

  .retry-button {
    background-color: transparent;
    border: 1px solid white;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: var(--layout-border_radius);
    cursor: pointer;
  }

  .retry-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100px;
    color: var(--color-text_disabled);
  }

  .content {
    /* Main content styles */
  }
</style>
```

### Error Handling Standards

#### Error Boundary Pattern

```typescript
// MANDATORY: Implement error boundaries for all major components
interface ErrorState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

function createErrorBoundary() {
  let errorState: ErrorState = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  function handleError(error: Error, errorInfo?: string) {
    errorState = {
      hasError: true,
      error,
      errorInfo: errorInfo || null
    };

    // Log error for debugging
    console.error('Component error:', error, errorInfo);

    // Report to error tracking service if available
    reportError(error, errorInfo);
  }

  function resetError() {
    errorState = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  return { errorState, handleError, resetError };
}
```

#### Tauri Error Handling

```typescript
// MANDATORY: Use this pattern for all Tauri interactions
async function safeTauriInvoke<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T | null> {
  try {
    const result = await invoke<T>(command, args);
    return result;
  } catch (error) {
    console.error(`Tauri command '${command}' failed:`, error);

    // Show user-friendly error notification
    showNotification({
      type: 'error',
      message: `Operation failed: ${command}`,
      details: error instanceof Error ? error.message : 'Unknown error'
    });

    return null;
  }
}
```

### Testing Standards

#### Component Testing Pattern

```typescript
// MANDATORY: Follow this pattern for all component tests
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { vi } from 'vitest';
import ComponentName from './ComponentName.svelte';

// Mock Tauri
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}));

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders without errors', () => {
    const { getByTestId } = render(ComponentName);
    expect(getByTestId('component-name')).toBeInTheDocument();
  });

  test('handles loading state correctly', async () => {
    const { getByTestId } = render(ComponentName);

    // Verify loading state
    expect(getByTestId('loading')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(() => getByTestId('loading')).toThrow();
    });
  });

  test('handles error state correctly', async () => {
    // Mock error response
    vi.mocked(invoke).mockRejectedValue(new Error('Test error'));

    const { getByTestId } = render(ComponentName);

    await waitFor(() => {
      expect(getByTestId('error')).toBeInTheDocument();
    });
  });

  test('handles user interactions correctly', async () => {
    const { getByRole } = render(ComponentName);

    const button = getByRole('button');
    await fireEvent.click(button);

    // Verify expected behavior
    expect(invoke).toHaveBeenCalledWith('expected_command', expect.any(Object));
  });
});
```

### Theme Integration Standards

#### Theme Usage Pattern

```svelte
<script lang="ts">
  import { theme } from '$lib/stores/theme';

  // MANDATORY: Always use theme store for styling
  $: themeVars = $theme
    ? {
        '--local-primary': $theme.colors.background_primary,
        '--local-accent': $theme.colors.accent_blue,
        '--local-spacing': $theme.layout.spacing_unit
      }
    : {};
</script>

<div
  class="themed-component"
  style={Object.entries(themeVars)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ')}
>
  <!-- Content -->
</div>

<style>
  .themed-component {
    /* Use local CSS variables derived from theme */
    background-color: var(--local-primary);
    color: var(--local-accent);
    padding: var(--local-spacing);
  }
</style>
```

### Performance Standards

#### Optimization Checklist

- [ ] **Lazy Loading**: Implement lazy loading for plugin components
- [ ] **Virtual Scrolling**: Use virtual scrolling for large data sets
- [ ] **Debounced Inputs**: Debounce user inputs to prevent excessive API calls
- [ ] **Memoization**: Use reactive statements efficiently to prevent unnecessary re-renders
- [ ] **Bundle Optimization**: Ensure proper code splitting and tree shaking

#### Performance Monitoring

```typescript
// MANDATORY: Add performance monitoring to critical paths
function measurePerformance<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
  const startTime = performance.now();

  return operation().finally(() => {
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`${operationName} took ${duration.toFixed(2)}ms`);

    // Report to performance monitoring service
    if (duration > 100) {
      // Warn if operation takes > 100ms
      console.warn(`Slow operation detected: ${operationName} (${duration.toFixed(2)}ms)`);
    }
  });
}
```

## Quality Assurance Checklist

### Pre-Commit Checklist

- [ ] **Type Check**: `pnpm check` passes without errors
- [ ] **Linting**: `pnpm lint` passes without warnings
- [ ] **Formatting**: Code is properly formatted with Prettier
- [ ] **Tests**: All relevant tests pass
- [ ] **Build**: Production build completes successfully
- [ ] **Tauri Integration**: All Tauri commands and events work correctly

### Code Review Checklist

- [ ] **Architectural Consistency**: Follows established patterns
- [ ] **Error Handling**: Proper error boundaries and user feedback
- [ ] **Performance**: No obvious performance issues
- [ ] **Accessibility**: Proper ARIA labels and keyboard navigation
- [ ] **Theme Integration**: Uses theme system correctly
- [ ] **Documentation**: Code is well-commented and self-documenting
- [ ] **Testing**: Adequate test coverage for new functionality

### Final Validation

- [ ] **Zero Compilation Errors**: All TypeScript and Svelte compilation succeeds
- [ ] **Zero Warnings**: No ESLint or TypeScript warnings
- [ ] **All Tests Pass**: Unit, integration, and E2E tests all pass
- [ ] **Tauri Integration**: Frontend-backend communication works flawlessly
- [ ] **Theme Consistency**: All components use theme system correctly
- [ ] **Performance Targets**: Meets performance requirements for aerospace applications
- [ ] **Code Coherence**: Maintains architectural consistency across entire codebase

**FINAL DELIVERABLE STANDARD:** Fully functional, error-free code that maintains perfect architectural consistency and supports future development without breaking existing patterns.
