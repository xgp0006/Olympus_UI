# Contributing to Modular C2 Frontend

This guide outlines our coding standards and contribution process to maintain the exceptional code cohesion and aerospace-grade quality of this project.

## Table of Contents

- [Development Environment](#development-environment)
- [Code Style and Standards](#code-style-and-standards)
- [NASA JPL Power of 10 Compliance](#nasa-jpl-power-of-10-compliance)
- [Pre-commit Checks](#pre-commit-checks)
- [Pull Request Process](#pull-request-process)
- [Common Patterns](#common-patterns)

## Development Environment

### Required Tools

- **Node.js**: Latest LTS version
- **pnpm**: Version 9.0.0 or higher (NOT npm)
- **Rust**: Required for Tauri backend
- **Git**: Version 2.x or higher
- **VS Code**: Recommended IDE with extensions:
  - Svelte for VS Code
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd modular-c2-frontend

# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run Tauri in development mode
pnpm tauri dev
```

## Code Style and Standards

### TypeScript/JavaScript

1. **Prefer `const` over `let`**
   ```typescript
   // Good
   const config = { theme: 'dark' };
   
   // Bad
   let config = { theme: 'dark' };
   ```

2. **Event Naming Convention (camelCase)**
   ```typescript
   // Good
   onClick, onMouseEnter, handleSubmit
   
   // Bad
   on_click, OnClick, handle-submit
   ```

3. **Import Ordering**
   ```typescript
   // 1. Built-in modules
   import { readFile } from 'fs';
   
   // 2. External modules
   import { writable } from 'svelte/store';
   
   // 3. Internal modules ($app, $lib)
   import { page } from '$app/stores';
   import { theme } from '$lib/stores/theme';
   
   // 4. Relative imports
   import { Button } from '../components/Button.svelte';
   
   // 5. Type imports
   import type { Theme } from '$lib/types';
   ```

4. **No Magic Numbers**
   ```typescript
   // Good
   const MAX_RETRIES = 3;
   const TIMEOUT_MS = 5000;
   
   // Bad
   if (retries > 3) { ... }
   setTimeout(() => {}, 5000);
   ```

### Svelte Components

1. **Component Structure**
   ```svelte
   <script lang="ts">
     // 1. Imports
     // 2. Props/exports
     // 3. Local state
     // 4. Reactive statements
     // 5. Lifecycle hooks
     // 6. Event handlers
     // 7. Helper functions
   </script>
   
   <!-- Markup -->
   
   <style>
     /* Component styles */
   </style>
   ```

2. **Prop Definitions**
   ```typescript
   // Always type your props
   export let value: string;
   export let onChange: (value: string) => void;
   export let options: ReadonlyArray<Option> = [];
   ```

3. **Event Dispatching**
   ```typescript
   import { createEventDispatcher } from 'svelte';
   
   const dispatch = createEventDispatcher<{
     change: { value: string };
     submit: void;
   }>();
   ```

### CSS/Styling

1. **No Hardcoded Colors**
   ```css
   /* Good */
   background-color: var(--theme-surface);
   color: var(--theme-text-primary);
   
   /* Bad */
   background-color: #1a1a1a;
   color: rgb(255, 255, 255);
   ```

2. **Use Spacing Variables**
   ```css
   /* Good */
   padding: var(--spacing-md);
   margin-top: var(--spacing-lg);
   
   /* Bad */
   padding: 16px;
   margin-top: 24px;
   ```

3. **Component Scoping**
   - Use Svelte's scoped styles by default
   - Use `:global()` sparingly and with clear justification
   - Prefer CSS custom properties for theming

## NASA JPL Power of 10 Compliance

Our code follows aerospace-grade standards:

### 1. Simple Control Flow (Max depth: 4)
```typescript
// Bad: Too deeply nested
if (a) {
  if (b) {
    if (c) {
      if (d) {
        if (e) { // Exceeds max depth
          doSomething();
        }
      }
    }
  }
}

// Good: Refactored with early returns
if (!a || !b) return;
if (!c || !d) return;
if (e) doSomething();
```

### 2. Bounded Loops
```typescript
// Good: Clear upper bound
const MAX_ITEMS = 1000;
for (let i = 0; i < Math.min(items.length, MAX_ITEMS); i++) {
  processItem(items[i]);
}

// Bad: Potentially unbounded
while (condition) {
  // No clear exit guarantee
}
```

### 3. Function Size Limit (60 lines)
- Functions must not exceed 60 lines
- Break large functions into smaller, focused functions
- Each function should have a single, clear purpose

### 4. Runtime Assertions
```typescript
import { assert } from '$lib/utils/assert';

export function processData(data: unknown): ProcessedData {
  // Validate all inputs
  assert(data !== null && data !== undefined, 'Data cannot be null');
  assert(typeof data === 'object', 'Data must be an object');
  assert('id' in data, 'Data must have an id property');
  
  // Validate state transitions
  assert(isValidTransition(oldState, newState), 'Invalid state transition');
  
  return processedData;
}
```

### 5. Check All Returns
```typescript
// Good: Handle all promise results
try {
  const result = await fetchData();
  assert(result.status === 'success', 'Data fetch failed');
  return result.data;
} catch (error) {
  logger.error('Failed to fetch data', error);
  throw new DataFetchError('Unable to retrieve data', { cause: error });
}

// Bad: Ignoring promise results
fetchData(); // No await, no catch
```

## Pre-commit Checks

All commits must pass the following automated checks:

1. **Code Formatting** (`pnpm format`)
   - Prettier formatting for all files
   - Consistent indentation and spacing

2. **Linting** (`pnpm lint`)
   - ESLint rules including custom aerospace rules
   - Zero warnings policy

3. **Type Checking** (`pnpm check`)
   - Full TypeScript type safety
   - No implicit any types

4. **Consistency Checks** (`pnpm consistency:check`)
   - Import ordering
   - Event naming conventions
   - No hardcoded colors/spacing

5. **NASA JPL Compliance** (`pnpm nasa-jpl:validate`)
   - Function size limits
   - Complexity limits
   - Assertion requirements

## Pull Request Process

1. **Branch Naming**
   ```
   feature/description
   fix/issue-description
   refactor/component-name
   docs/update-description
   ```

2. **Commit Messages**
   ```
   type(scope): brief description
   
   Longer explanation if needed.
   
   Fixes #123
   ```
   
   Types: `feat`, `fix`, `refactor`, `docs`, `test`, `style`, `perf`

3. **PR Requirements**
   - All CI checks must pass
   - Code review approval required
   - Update documentation if needed
   - Include tests for new features

4. **PR Description Template**
   ```markdown
   ## Summary
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Refactoring
   - [ ] Documentation
   
   ## Testing
   - [ ] Unit tests pass
   - [ ] Manual testing completed
   - [ ] No console errors
   
   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex code
   - [ ] Documentation updated
   ```

## Common Patterns

### State Management

```typescript
// Use stores for shared state
import { writable, derived } from 'svelte/store';

// Typed store with validation
function createThemeStore() {
  const { subscribe, set, update } = writable<Theme>('light');
  
  return {
    subscribe,
    setTheme: (theme: Theme) => {
      assert(isValidTheme(theme), `Invalid theme: ${theme}`);
      set(theme);
    },
    toggle: () => update(t => t === 'light' ? 'dark' : 'light')
  };
}
```

### Error Handling

```typescript
// Consistent error handling pattern
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Usage
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof AppError) {
    handleAppError(error);
  } else {
    throw new AppError('Unexpected error', 'UNKNOWN', error);
  }
}
```

### Component Composition

```svelte
<!-- ParentComponent.svelte -->
<script lang="ts">
  import ChildComponent from './ChildComponent.svelte';
  
  let value = '';
  
  function handleChange(event: CustomEvent<{ value: string }>) {
    value = event.detail.value;
  }
</script>

<ChildComponent {value} on:change={handleChange}>
  <svelte:fragment slot="icon">
    <Icon name="search" />
  </svelte:fragment>
</ChildComponent>
```

### Performance Patterns

```typescript
// Memoization for expensive computations
import { derived } from 'svelte/store';

const expensiveComputation = derived(
  [sourceStore1, sourceStore2],
  ([$source1, $source2]) => {
    // Only recomputes when sources change
    return computeExpensiveValue($source1, $source2);
  }
);

// Debouncing for user input
import { debounce } from '$lib/utils';

const debouncedSearch = debounce((query: string) => {
  performSearch(query);
}, 300);
```

## Resources

- [Svelte Documentation](https://svelte.dev/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [NASA JPL Coding Standards](http://web.archive.org/web/20111015064908/http://lars-lab.jpl.nasa.gov/JPL_Coding_Standard_C.pdf)
- [Tauri Documentation](https://tauri.app/docs/)

## Questions?

If you have questions about contributing, please:

1. Check existing issues and discussions
2. Review the codebase for examples
3. Ask in the project's discussion forum
4. Contact the maintainers

Thank you for contributing to the Modular C2 Frontend project!