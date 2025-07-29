# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Modular C2 Frontend is an aerospace-grade Svelte + SvelteKit + Tauri application for command & control operations. The project implements a mobile-first responsive design with a sophisticated plugin system, real-time capabilities, and comprehensive testing infrastructure.

## Architecture

**Technology Stack:**

- Frontend: Svelte + SvelteKit + TypeScript
- Desktop: Tauri (Rust backend, web frontend)
- Styling: Tailwind CSS with custom aerospace utilities
- Testing: Vitest + Playwright + Testing Library
- Package Manager: pnpm

**Component Structure:**

- `src/lib/components/core/` - Core application components (App, ErrorBoundary)
- `src/lib/components/cli/` - Command line interface components
- `src/lib/components/plugins/` - Plugin system UI components
- `src/lib/components/theme/` - Advanced theme system with JSON-based themes
- `src/lib/components/ui/` - Shared UI components

**Plugin Architecture:**

- `src/lib/plugins/mission-planner/` - Mission planning with MapLibre integration
- `src/lib/plugins/sdr-suite/` - Software-defined radio interface
- Each plugin has dedicated stores, components, and TypeScript interfaces

**State Management:**

- Svelte stores with custom actions and error handling
- Plugin-specific stores for isolated state management
- Theme store with file loading and responsive support

## Essential Development Commands

### Primary Development Workflow

```bash
# Development server (Tauri-compatible on port 1420)
pnpm dev

# Production build
pnpm build

# Quick quality assurance
pnpm qa

# Full quality assurance with coverage and E2E
pnpm qa:full
```

### Testing Commands

```bash
# Run all tests
pnpm test

# Specific test suites
pnpm test:unit            # Unit tests only
pnpm test:integration     # Integration tests
pnpm test:components      # Component tests
pnpm test:stores          # Store tests
pnpm test:plugins         # Plugin tests
pnpm test:e2e            # Playwright E2E tests

# Testing modes
pnpm test:watch          # Watch mode
pnpm test:coverage       # Coverage reports (80% threshold)
pnpm test:ui             # Vitest UI interface
```

### Code Quality Commands

```bash
# TypeScript + Svelte checking
pnpm check
pnpm check:watch

# Linting and formatting
pnpm lint
pnpm format
```

### Tauri Development

```bash
# Tauri commands
pnpm tauri dev           # Development with Tauri
pnpm tauri build         # Production Tauri build
```

## Code Quality Standards

### NASA JPL Power of 10 Adapted Rules

The project follows aerospace-grade quality standards adapted for frontend development:

- **Function Complexity:** Keep functions focused and under 60 lines
- **Error Handling:** All async operations must handle errors explicitly
- **Memory Management:** Avoid memory leaks through proper store cleanup
- **Resource Bounds:** Use bounded collections and limit DOM manipulations
- **Code Reviews:** All changes require comprehensive testing

### TypeScript Standards

- Strict mode enabled across all configuration
- Comprehensive type coverage for components, stores, and plugins
- Custom type definitions in `src/lib/types/`
- Proper error type handling with dedicated error interfaces

### Testing Requirements

- **80% coverage threshold** across all metrics (branches, functions, lines, statements)
- Component tests use `@testing-library/svelte` with proper accessibility testing
- Integration tests validate cross-component interactions
- E2E tests cover complete user workflows
- Performance tests ensure responsive behavior

## Theme System Architecture

The advanced theme system supports:

- **JSON-based themes** in `static/themes/` with comprehensive validation
- **Responsive design** with breakpoint-specific values
- **Touch optimization** for mobile interfaces
- **Real-time theme switching** using CSS custom properties
- **Fallback mechanisms** for theme loading failures

Theme loading strategy:

1. Tauri asset protocol (production)
2. Development server fetch
3. Hardcoded fallback theme

## Plugin Development

### Plugin Structure

Each plugin follows this pattern:

```
src/lib/plugins/[plugin-name]/
├── [PluginName].svelte    # Main component
├── types.ts               # TypeScript interfaces
├── __tests__/            # Plugin-specific tests
└── additional components
```

### Plugin Registration

- Plugins register through the plugin store
- Dynamic loading with lazy evaluation
- Isolated state management per plugin
- Comprehensive error boundaries

### Built-in Plugins

- **Mission Planner:** MapLibre integration, waypoint management, drag-and-drop
- **SDR Suite:** Spectrum analysis, waterfall displays, device controls

## Testing Architecture

### Test Setup (`src/test-setup.ts`)

Comprehensive mocking for:

- **Tauri APIs:** All `@tauri-apps/api/*` modules
- **External libraries:** xterm.js, MapLibre GL, svelte-dnd-action
- **Browser APIs:** ResizeObserver, IntersectionObserver, Canvas
- **Custom matchers** for accessibility and theme testing

### Test Utilities (`src/lib/test-utils/`)

- Component rendering with theme context
- Mock factories for all data types
- Async testing helpers with proper cleanup
- Event simulation for touch and keyboard interactions
- Custom matchers for Tauri integration testing

### Testing Patterns

- **Co-located tests** in `__tests__/` directories
- **Integration tests** in `tests/integration/`
- **Barrel exports** for clean test imports
- **Async test handling** with proper timeout management

## Performance and Responsive Design

### Mobile-First Architecture

- Touch-optimized interfaces with proper target sizing
- Gesture support for swipe and drag operations
- Responsive breakpoints: mobile (0px), tablet (768px), desktop (1024px)
- CSS custom properties for efficient theme switching

### Performance Optimization

- Lazy loading for plugin components
- Efficient store subscriptions with cleanup
- Bounded memory allocation patterns
- Real-time rendering optimizations

## Configuration Files

### Core Configuration

- `svelte.config.js` - SvelteKit with static adapter for Tauri
- `vite.config.ts` - Fixed port 1420, Tauri-specific optimizations
- `src-tauri/tauri.conf.json` - Minimal security allowlist, scoped file access
- `tailwind.config.js` - Aerospace utilities, custom animations, responsive system

### Development Tools

- `tsconfig.json` - Strict TypeScript with comprehensive type checking
- `vitest.config.ts` - jsdom environment, 80% coverage thresholds
- `.eslintrc.cjs` - TypeScript + Svelte + Prettier integration
- `prettier.config.js` - 2-space, single quotes, 100-char lines

## Error Handling and Resilience

### Error Boundaries

- `ErrorBoundary.svelte` for graceful failure handling
- Plugin-level error isolation
- Theme loading fallback mechanisms
- User-friendly error messages with recovery options

### State Management Error Handling

- Dedicated error states in all stores
- Error propagation patterns between components
- Async operation error handling with retry mechanisms
- Logging integration for debugging

## Development Workflow

### Pre-commit Quality Checks

```bash
pnpm check && pnpm lint && pnpm test
```

### Plugin Development Workflow

1. Create plugin directory structure
2. Implement TypeScript interfaces
3. Build Svelte components with proper accessibility
4. Add comprehensive tests with mocks
5. Register plugin in plugin store
6. Test integration with main application

### Theme Development

1. Create JSON theme file in `static/themes/`
2. Include all required properties (colors, typography, spacing, responsive, touch)
3. Test theme loading in all environments
4. Validate accessibility and contrast ratios
5. Test responsive behavior across breakpoints

## Important Development Notes

- **Package Manager:** Always use `pnpm` - never `npm` or `yarn`
- **Port Consistency:** Development server must run on port 1420 for Tauri compatibility
- **Type Safety:** Maintain strict TypeScript throughout - no `any` types
- **Testing:** All new features require comprehensive test coverage
- **Accessibility:** Follow WCAG guidelines for aerospace interfaces
- **Performance:** Profile component render cycles and store subscriptions
- **Documentation:** Update TypeScript interfaces when changing data structures

## Troubleshooting

### Common Issues

```bash
# Port conflicts
pkill -f "vite.*1420" && pnpm dev

# Tauri build issues
cd src-tauri && cargo clean && cd .. && pnpm tauri build

# Test failures
pnpm test:coverage --reporter=verbose

# Theme loading problems
pnpm dev  # Check browser dev tools for fetch errors
```

### Performance Debugging

- Use browser dev tools for component profiling
- Check store subscription patterns for memory leaks
- Validate theme switching performance
- Monitor real-time plugin rendering

This project prioritizes aerospace-grade quality, comprehensive testing, and responsive user experience. When in doubt, prefer the more conservative, well-tested approach with proper error handling and accessibility support.
