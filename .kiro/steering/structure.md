# Project Structure & Organization

## Root Directory Structure

```
modular-c2-frontend/
├── .kiro/                          # Kiro configuration and specifications
│   ├── specs/modular-c2-frontend/  # Project specifications
│   └── steering/                   # Development steering documents
├── src/                            # Frontend source code
├── src-tauri/                      # Tauri Rust backend
├── static/                         # Static assets and themes
├── tests/                          # Test files
├── node_modules/                   # Dependencies (managed by PNPM)
├── pnpm-lock.yaml                  # Dependency lock file
└── [config files]                 # Various configuration files
```

## Frontend Source Structure (`src/`)

### Core Application Structure

```
src/
├── app.html                        # HTML template
├── app.d.ts                        # Global TypeScript definitions
├── lib/                            # Reusable library code
│   ├── components/                 # Shared UI components
│   │   ├── core/                   # Core application components
│   │   │   ├── App.svelte          # Root application component
│   │   │   ├── Layout.svelte       # Main layout wrapper
│   │   │   └── ErrorBoundary.svelte # Error handling wrapper
│   │   ├── cli/                    # CLI panel components
│   │   │   ├── CliPanel.svelte     # CLI container
│   │   │   ├── CliView.svelte      # Terminal interface
│   │   │   └── CliResizer.svelte   # Resizing functionality
│   │   ├── theme/                  # Theming components
│   │   │   ├── ThemeProvider.svelte # Theme application
│   │   │   └── ThemeSelector.svelte # Theme selection UI
│   │   ├── plugins/                # Plugin system components
│   │   │   ├── PluginDashboard.svelte # Plugin grid view
│   │   │   ├── PluginCard.svelte   # Individual plugin card
│   │   │   └── PluginContainer.svelte # Plugin wrapper
│   │   └── ui/                     # Generic UI components
│   │       ├── Button.svelte       # Themed button component
│   │       ├── Modal.svelte        # Modal dialog
│   │       └── Notification.svelte # Toast notifications
│   ├── stores/                     # Svelte stores for state management
│   │   ├── theme.ts                # Theme management store
│   │   ├── plugins.ts              # Plugin state store
│   │   ├── cli.ts                  # CLI state management
│   │   ├── mission.ts              # Mission planning store
│   │   └── notifications.ts        # Notification system store
│   ├── utils/                      # Utility functions
│   │   ├── tauri.ts                # Tauri command wrappers
│   │   ├── validation.ts           # Input validation utilities
│   │   ├── formatting.ts           # Data formatting helpers
│   │   └── constants.ts            # Application constants
│   ├── types/                      # TypeScript type definitions
│   │   ├── plugin.ts               # Plugin-related types
│   │   ├── theme.ts                # Theme system types
│   │   ├── mission.ts              # Mission planning types
│   │   └── api.ts                  # API response types
│   └── plugins/                    # Plugin implementations
│       ├── mission-planner/        # Mission planning plugin
│       │   ├── MissionPlanner.svelte # Main plugin component
│       │   ├── MapViewer.svelte    # Map visualization
│       │   ├── MissionAccordion.svelte # Mission item list
│       │   ├── WaypointItem.svelte # Individual waypoint
│       │   ├── MinimizedCoin.svelte # Minimized waypoint
│       │   └── types.ts            # Plugin-specific types
│       └── sdr-suite/              # SDR visualization plugin
│           ├── SdrDashboard.svelte # Main SDR interface
│           ├── SpectrumVisualizer.svelte # Spectrum display
│           ├── Waterfall.svelte    # Waterfall visualization
│           └── types.ts            # SDR-specific types
└── routes/                         # SvelteKit routing
    ├── +layout.svelte              # Root layout
    ├── +page.svelte                # Home page (dashboard)
    └── +error.svelte               # Error page
```

## Static Assets Structure (`static/`)

```
static/
├── themes/                         # Theme definition files
│   ├── super_amoled_black.json     # Default AMOLED theme
│   ├── aerospace_blue.json         # Alternative aerospace theme
│   └── high_contrast.json          # Accessibility theme
├── icons/                          # Application icons
│   ├── plugins/                    # Plugin-specific icons
│   └── ui/                         # General UI icons
├── fonts/                          # Custom fonts (if needed)
└── images/                         # Static images and assets
```

## Test Structure (`tests/`)

```
tests/
├── unit/                           # Unit tests
│   ├── components/                 # Component tests
│   ├── stores/                     # Store tests
│   └── utils/                      # Utility function tests
├── integration/                    # Integration tests
│   ├── plugin-system/              # Plugin loading tests
│   ├── tauri-integration/          # Backend communication tests
│   └── theme-system/               # Theming tests
├── e2e/                           # End-to-end tests
│   ├── mission-planning.spec.ts    # Mission planner E2E tests
│   ├── cli-interaction.spec.ts     # CLI functionality tests
│   └── plugin-navigation.spec.ts   # Plugin navigation tests
└── fixtures/                       # Test data and fixtures
    ├── themes/                     # Test theme files
    ├── missions/                   # Test mission data
    └── mock-data/                  # Mock API responses
```

## Tauri Backend Structure (`src-tauri/`)

```
src-tauri/
├── src/                            # Rust source code
│   ├── main.rs                     # Application entry point
│   ├── commands/                   # Tauri command handlers
│   │   ├── mod.rs                  # Command module exports
│   │   ├── plugin.rs               # Plugin management commands
│   │   ├── cli.rs                  # CLI execution commands
│   │   └── mission.rs              # Mission planning commands
│   ├── events/                     # Event emission handlers
│   └── state/                      # Application state management
├── Cargo.toml                      # Rust dependencies
├── tauri.conf.json                 # Tauri configuration
└── build.rs                        # Build script (if needed)
```

## Configuration Files

### Build & Development

- `vite.config.ts`: Vite configuration with Tauri integration
- `svelte.config.js`: SvelteKit configuration
- `tailwind.config.js`: Tailwind CSS configuration
- `tsconfig.json`: TypeScript configuration
- `package.json`: Node.js project configuration

### Quality Assurance

- `.eslintrc.cjs`: ESLint configuration
- `prettier.config.js`: Code formatting rules
- `playwright.config.ts`: E2E testing configuration
- `vitest.config.ts`: Unit testing configuration

### Development Environment

- `.gitignore`: Git ignore patterns
- `.env.example`: Environment variable template
- `README.md`: Project documentation

## Naming Conventions

### Files and Directories

- **Components**: PascalCase (e.g., `PluginCard.svelte`)
- **Stores**: camelCase (e.g., `themeStore.ts`)
- **Utilities**: camelCase (e.g., `formatData.ts`)
- **Types**: camelCase (e.g., `pluginTypes.ts`)
- **Directories**: kebab-case (e.g., `mission-planner/`)

### Code Conventions

- **Variables**: camelCase (e.g., `selectedPlugin`)
- **Functions**: camelCase (e.g., `loadTheme()`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `DEFAULT_THEME`)
- **Types/Interfaces**: PascalCase (e.g., `PluginConfig`)
- **CSS Classes**: kebab-case following Tailwind conventions

## Import Organization

### Standard Import Order

```typescript
// 1. Standard library imports
import { onMount, onDestroy } from 'svelte';

// 2. External library imports
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

// 3. Internal library imports
import { theme } from '$lib/stores/theme';
import { validateInput } from '$lib/utils/validation';

// 4. Local imports
import ChildComponent from './ChildComponent.svelte';
import type { LocalType } from './types';
```

## Component Architecture Patterns

### Component Structure Template

```svelte
<!-- Component: ExampleComponent.svelte -->
<script lang="ts">
  // ===== IMPORTS =====
  // Standard library imports
  import { onMount, createEventDispatcher } from 'svelte';

  // External library imports
  import { invoke } from '@tauri-apps/api/tauri';

  // Internal imports
  import { theme } from '$lib/stores/theme';
  import type { ComponentProps } from '$lib/types/component';

  // ===== TYPES =====
  interface ComponentState {
    loading: boolean;
    error: string | null;
  }

  // ===== PROPS =====
  export let data: ComponentProps;
  export let onUpdate: (data: ComponentProps) => void = () => {};

  // ===== STATE =====
  let state: ComponentState = {
    loading: false,
    error: null
  };

  // ===== EVENT DISPATCHER =====
  const dispatch = createEventDispatcher<{
    change: ComponentProps;
    error: string;
  }>();

  // ===== REACTIVE STATEMENTS =====
  $: if (data) {
    handleDataChange(data);
  }

  // ===== FUNCTIONS =====
  async function handleDataChange(newData: ComponentProps): Promise<void> {
    // Implementation with proper error handling
    try {
      state.loading = true;
      state.error = null;

      // Process data
      await processData(newData);

      dispatch('change', newData);
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Unknown error';
      dispatch('error', state.error);
    } finally {
      state.loading = false;
    }
  }

  // ===== LIFECYCLE =====
  onMount(() => {
    // Initialization logic
  });
</script>

<!-- ===== TEMPLATE ===== -->
<div class="component-container">
  {#if state.loading}
    <div class="loading-indicator">Loading...</div>
  {:else if state.error}
    <div class="error-message">{state.error}</div>
  {:else}
    <!-- Main content -->
  {/if}
</div>

<!-- ===== STYLES ===== -->
<style>
  .component-container {
    /* Use CSS custom properties from theme */
    background-color: var(--color-background_primary);
    color: var(--color-text_primary);
  }

  .loading-indicator {
    /* Loading styles */
  }

  .error-message {
    color: var(--color-accent_red);
  }
</style>
```

This structure ensures consistency, maintainability, and clear separation of concerns across all components in the application.
