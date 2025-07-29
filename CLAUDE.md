# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Modular C2 Frontend is an aerospace-grade command and control interface built with SvelteKit, Tauri, and TypeScript. The project implements a plugin-based architecture for mission-critical operations including drone control, SDR operations, and mission planning.

## Architecture

**Technology Stack:**
- **Frontend Framework:** SvelteKit with TypeScript
- **Desktop Runtime:** Tauri (Rust-based)
- **UI Components:** Custom Svelte components with TailwindCSS
- **Testing:** Vitest for unit/integration tests, Playwright for E2E
- **State Management:** Svelte stores with persistent theme management
- **Real-time Features:** WebSocket connections for telemetry, xterm.js for terminal emulation

**Key Architectural Patterns:**
- Plugin-based modular system for extensibility
- Reactive state management using Svelte stores
- Component-driven development with comprehensive test coverage
- Aerospace-grade error handling and runtime safety checks

## Essential Development Commands

### Development & Build

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Build Tauri desktop app
npm run tauri build

# Run Tauri in development mode
npm run tauri dev
```

### Testing Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run specific test categories
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests
npm run test:components   # Component tests
npm run test:stores      # Store tests
npm run test:utils       # Utility tests
npm run test:plugins     # Plugin tests

# Run E2E tests
npm run test:e2e

# Run custom test runner
npm run test:runner
```

### Code Quality

```bash
# Type checking
npm run check
npm run check:watch    # Watch mode

# Linting
npm run lint

# Format code
npm run format

# Full QA suite
npm run qa       # check + lint + test
npm run qa:full  # check + lint + coverage + e2e
```

### Running Single Tests

```bash
# Run a specific test file
npx vitest run src/lib/components/cli/CliPanel.test.ts

# Run tests matching a pattern
npx vitest run -t "CliPanel"

# Debug a specific test
npx vitest --inspect-brk src/lib/components/cli/CliPanel.test.ts
```

## Project Structure

```
src/
├── lib/                    # Core library code
│   ├── components/        # UI components
│   │   ├── cli/          # Terminal/CLI components
│   │   ├── core/         # Core app components
│   │   ├── plugins/      # Plugin system components
│   │   ├── theme/        # Theme management
│   │   └── ui/           # Common UI components
│   ├── plugins/          # Plugin implementations
│   │   ├── mission-planner/  # Mission planning with MapLibre
│   │   └── sdr-suite/       # SDR controls and visualization
│   ├── stores/           # Svelte stores for state management
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── routes/               # SvelteKit routes
└── test-setup.ts        # Test configuration
```

## Key Components and Systems

### Theme System
The application implements a sophisticated theme system with:
- Multiple theme store implementations (`theme.ts`, `theme-fix.ts`, `theme-simple.ts`)
- Persistent theme storage
- Runtime theme switching with CSS variable updates
- Tauri-aware theme loading that handles both browser and desktop contexts

### Plugin Architecture
- **PluginDashboard:** Main plugin management interface
- **PluginContainer:** Wrapper for plugin content with consistent UI
- **Plugin Types:** Defined in `src/lib/types/plugin.ts`
- Dynamic plugin loading and state management via stores

### CLI Integration
- Terminal emulation using xterm.js
- WebSocket communication for real-time command execution
- Comprehensive terminal customization (themes, fonts, cursor styles)

### Mission Planning
- MapLibre GL integration for interactive maps
- Waypoint management with drag-and-drop
- GeoJSON support for mission data
- Real-time telemetry overlay capabilities

## Testing Strategy

### Test Utilities
Located in `src/lib/test-utils/`:
- **async-helpers.ts:** Utilities for testing async operations
- **component-helpers.ts:** Svelte component testing helpers
- **custom-matchers.ts:** Extended Jest matchers
- **event-helpers.ts:** Event simulation utilities
- **mock-factories.ts:** Factory functions for test data

### Test Patterns
```typescript
// Component testing example
import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Component from './Component.svelte';

describe('Component', () => {
  it('should handle user interaction', async () => {
    const { getByRole } = render(Component, { props: { /* ... */ } });
    const button = getByRole('button');
    await fireEvent.click(button);
    // assertions...
  });
});
```

## Tauri Integration

### API Security
The Tauri configuration restricts API access for security:
- Limited filesystem access to app directories
- Controlled shell command execution
- Window management permissions
- Asset protocol for secure resource loading

### Tauri Context Detection
The application uses `isTauriEnv()` checks throughout to handle differences between web and desktop environments:
```typescript
import { isTauriEnv } from '$lib/utils/tauri-context';

if (isTauriEnv()) {
  // Tauri-specific code
}
```

## Common Development Tasks

### Adding a New Plugin
1. Create plugin directory: `src/lib/plugins/your-plugin/`
2. Implement main component extending plugin interface
3. Register in plugin store
4. Add tests in `__tests__/` subdirectory

### Adding a New Route
1. Create `+page.svelte` in `src/routes/your-route/`
2. Implement route logic
3. Add navigation in appropriate components
4. Test route behavior

### Modifying Theme System
1. Update theme type definitions in `src/lib/types/theme.ts`
2. Modify theme store implementation
3. Update `ThemeProvider.svelte` if needed
4. Test theme persistence and switching

## Performance Considerations

- Lazy load heavy components (maps, charts)
- Use Svelte's built-in reactivity efficiently
- Minimize store subscriptions in components
- Implement virtual scrolling for large lists
- Profile with Chrome DevTools in development

## Known Issues and Workarounds

### Theme Loading
Multiple theme implementations exist due to iterative fixes for runtime loading issues. The current working implementation uses careful Tauri context detection and defensive loading strategies.

### Test Environment
Some tests require specific setup for Tauri mocks. The test utilities provide helpers for common scenarios.

## CI/CD Considerations

- All tests must pass before merge
- Coverage thresholds enforced at 80%
- Linting and formatting are mandatory
- E2E tests run on multiple platforms
- Tauri builds tested on Windows, macOS, and Linux