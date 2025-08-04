# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Modular C2 Frontend is an aerospace-grade command and control interface built with SvelteKit, Tauri, and TypeScript. The project implements a plugin-based architecture for mission-critical operations including drone control, SDR operations, and mission planning.

## Development Environment

- **Operating System:** Windows
- **Terminal:** WezTerm with PowerShell
- **Package Manager:** pnpm (NOT npm)
- **Node.js:** Latest LTS version
- **Rust:** Required for Tauri backend

## Architecture

**Technology Stack:**

- **Frontend Framework:** SvelteKit with TypeScript
- **Desktop Runtime:** Tauri (Rust-based)
- **UI Components:** Custom Svelte components with TailwindCSS
- **Quality Assurance:** TypeScript type checking, ESLint, runtime assertions
- **State Management:** Svelte stores with persistent theme management
- **Real-time Features:** WebSocket connections for telemetry, xterm.js for terminal emulation
- **Map Integration:** MapLibre GL for mission planning
- **Drone Communication:** MAVLink protocol integration

**Key Architectural Patterns:**

- Plugin-based modular system for extensibility
- Reactive state management using Svelte stores
- Component-driven development with type safety and runtime validation
- Aerospace-grade error handling and runtime safety checks
- Multi-agent orchestration system for parallel development

## Essential Development Commands

### Development & Build

```powershell
# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Build Tauri desktop app
pnpm tauri build

# Run Tauri in development mode
pnpm tauri dev

# Kill process on port 5173 (if port is in use)
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force
# Or use the custom script
node scripts/kill-port.js 5173
```

### Runtime Quality & Validation

```powershell
# Type checking (primary quality gate)
pnpm check
pnpm check:watch    # Watch mode

# Code quality enforcement
pnpm lint
pnpm format

# Full quality assurance (no test building)
pnpm qa       # check + lint only
```

### NASA JPL Rule 5: Runtime Assertions

The codebase emphasizes runtime assertions and validation:

- Parameter validation on all public APIs
- State invariant checks in stores
- Boundary checks on array/collection access
- Error result checking (no ignored promises)
- Type guards for external data

### Code Quality

```powershell
# Type checking
pnpm check
pnpm check:watch    # Watch mode

# Linting
pnpm lint

# Format code
pnpm format

# Full QA suite (focused on type safety and linting)
pnpm qa       # check + lint only
```

### Development Validation

```powershell
# Validate types for specific components
pnpm check -- --files src/lib/components/cli/CliPanel.svelte

# Check for unused exports
pnpm lint -- --rule 'no-unused-vars'

# Validate Tauri integration
pnpm tauri dev -- --debug
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
│   │   ├── drone-config/ # Drone configuration & control
│   │   ├── mission-planner/  # Mission planning with MapLibre
│   │   └── sdr-suite/       # SDR controls and visualization
│   ├── stores/           # Svelte stores for state management
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions with assertions
│   └── map-features/     # Modular map overlay features
├── routes/               # SvelteKit routes
├── orchestrator/         # Multi-agent system components
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
- Current plugins: `drone-config`, `mission-planner`, `sdr-suite`

### CLI Integration

- Terminal emulation using xterm.js
- WebSocket communication for real-time command execution
- Comprehensive terminal customization (themes, fonts, cursor styles)
- GPU-accelerated rendering for high-frequency updates

### Mission Planning

- MapLibre GL integration for interactive maps
- Waypoint management with drag-and-drop
- GeoJSON support for mission data
- Real-time telemetry overlay capabilities
- WebGL-accelerated map overlays and visualizations

### Drone Configuration Plugin

- **MAVLink Integration:** Real-time drone communication and telemetry
- **Motor Testing:** Safe motor control with aerospace-grade safety checks
- **PID Tuning:** Advanced tuning interface for flight controller parameters
- **Calibration Wizard:** Step-by-step sensor calibration workflows
- **Parameter Management:** Comprehensive parameter editing with validation
- **Emergency Stop:** Hardware-level safety controls

### SDR Suite Plugin

- **SpectrumVisualizer:** WebGL 2.0 accelerated FFT visualization (< 0.8ms per frame)
- **Waterfall Display:** GPU texture scrolling for real-time spectrograms (< 1.2ms per frame)
- **Professional Color Maps:** Viridis, plasma, turbo, inferno with scientific accuracy
- **Automatic Fallback:** Canvas 2D compatibility for older hardware
- **Real-time Processing:** Direct integration with SDR hardware streams

### Multi-Agent Orchestration

The project includes an aerospace-grade orchestration system for parallel development:

- **Mission Control:** Centralized orchestrator for multiple Claude Code agents
- **Agent Profiles:** Specialized agents (UI, Plugin, Telemetry, Test)
- **Git Worktrees:** Isolated development branches for each agent
- **WezTerm Integration:** Terminal multiplexing for agent visualization

## Test Commands

```powershell
# Run all tests
pnpm test

# Watch mode for development
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test suites
pnpm test:unit         # Unit tests only
pnpm test:components   # Component tests
pnpm test:stores      # Store tests
pnpm test:plugins     # Plugin tests
pnpm test:integration # Integration tests

# Run a single test file
pnpm test -- src/lib/components/cli/CliPanel.test.ts

# E2E tests (Playwright)
pnpm test:e2e
```

## Aerospace Validation Commands

```powershell
# NASA JPL compliance validation
pnpm nasa-jpl:validate

# Full aerospace compliance check
pnpm aerospace:full

# Security and SRI validation
pnpm nasa-jpl:sri
```

## Code Quality Strategy

### NASA JPL Power of 10 Compliance

The project follows aerospace-grade coding standards:

1. **Simple Control Flow**: No complex nesting or recursion
2. **Bounded Operations**: All loops have fixed bounds
3. **No Dynamic Memory**: After initialization phase
4. **Short Functions**: Max 60 lines per function
5. **Runtime Assertions**: Validate all inputs and state transitions
6. **Minimal Scope**: Variables declared at point of use
7. **Check Returns**: All Results/Promises handled
8. **Limited Complexity**: Cognitive complexity ≤ 10
9. **Safe Memory**: No direct pointer manipulation
10. **Zero Warnings**: All TypeScript/ESLint warnings are errors

### Runtime Validation Patterns

```typescript
// Import assertion utilities
import { assert, assertDefined, assertNumber } from '$lib/utils/assert';

// Parameter validation example
export function processData(data: unknown): ProcessedData {
  // NASA JPL Rule 5: Runtime assertions
  assert(data !== null && data !== undefined, 'Data cannot be null');
  assert(typeof data === 'object', 'Data must be an object');
  assert('id' in data && typeof data.id === 'string', 'Data must have string id');

  // Type guard for external data
  if (!isValidData(data)) {
    throw new Error('Invalid data format');
  }

  // Bounded operations
  const items = data.items.slice(0, MAX_ITEMS);

  return processItems(items);
}

// Assertion utilities available:
// - assert(condition, message): General assertions
// - assertDefined(value, name): Null/undefined checks
// - assertNumber(value, name): Number validation
// - assertInRange(value, min, max, name): Range validation
// - assertArray(value, name): Array validation
// - assertNonEmptyString(value, name): String validation
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
4. Add runtime validation and error handling

### Adding a New Route

1. Create `+page.svelte` in `src/routes/your-route/`
2. Implement route logic
3. Add navigation in appropriate components
4. Validate route parameters and state

### Modifying Theme System

1. Update theme type definitions in `src/lib/types/theme.ts`
2. Modify theme store implementation
3. Update `ThemeProvider.svelte` if needed
4. Add runtime validation for theme values

## Performance Considerations

- Lazy load heavy components (maps, charts)
- Use Svelte's built-in reactivity efficiently
- Minimize store subscriptions in components
- Implement virtual scrolling for large lists
- Profile with Chrome DevTools in development

## Known Issues and Workarounds

### Theme Loading

Multiple theme implementations exist due to iterative fixes for runtime loading issues. The current working implementation uses careful Tauri context detection and defensive loading strategies.

### Development Environment

Focus on runtime validation over test mocks. Use actual Tauri APIs in development mode for realistic behavior.

## Common Troubleshooting

### Port Already in Use (5173)

If you get "Port 5173 is already in use" error:

```powershell
# Option 1: Kill the process using PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force

# Option 2: Use the kill-port script
node scripts/kill-port.js 5173

# Option 3: Find and kill the process manually
netstat -ano | findstr :5173
# Then kill the process with the PID shown
taskkill /PID <PID> /F
```

### WezTerm Command Execution

When running commands in WezTerm with PowerShell:

- Use `pnpm` instead of `npm`
- If commands fail, try prefixing with `powershell -Command`
- For long-running commands like `pnpm dev`, you may need to open a new terminal tab

## CI/CD Considerations

- TypeScript compilation must succeed (zero errors)
- All ESLint rules must pass (zero warnings)
- Formatting must match prettier/rustfmt standards
- Runtime assertions validate critical paths
- Tauri builds tested on Windows, macOS, and Linux

## Aerospace Agent System

The project includes a portable multi-agent orchestration system:

### Quick Usage

```powershell
# Launch specialized agents for map features development
aerospace-agent-system/spawn-agents.ps1 -Mode map-features -AutoLaunch

# Available modes:
# - map-features: Location entry, crosshair, measuring, messaging, ADS-B, weather
# - telemetry-systems: Telemetry parsing, data visualization
# - mission-planning: Route optimization, waypoint management
```

### Agent Performance Targets

- **144fps Rendering:** All UI components target 6.94ms frame budget
- **Bounded Memory:** Fixed-size arrays for telemetry data
- **Zero Allocations:** In critical render paths
- **Concurrent Processing:** Multi-agent parallel development

## Performance Optimizations

### WebGL Acceleration

GPU-accelerated visualizations for real-time data:

- **SpectrumVisualizer:** WebGL 2.0 rendering (< 0.8ms per frame)
- **Waterfall Display:** GPU texture scrolling (< 1.2ms per frame)
- **Automatic Fallback:** Canvas 2D compatibility mode
- **Professional Color Maps:** Viridis, plasma, turbo, inferno

### Web Workers

Parallel processing for computationally intensive tasks:

- **Coordinate Conversion Worker:** UTM, MGRS, Lat/Lng transformations
- **SharedArrayBuffer Support:** Zero-copy data transfer when available
- **Batch Processing:** Progress reporting with cancellation support
- **Thread Pool Pattern:** Efficient work distribution

### Async Streaming Pipeline

Modern streaming architecture for real-time data:

- **Web Streams API:** Telemetry data flow with backpressure
- **AsyncIterator Support:** Elegant consumption patterns
- **Priority Queues:** Critical data prioritization
- **Bounded Buffers:** NASA JPL compliance with fixed memory

### Demo Routes

Performance testing and validation:

- `/coordinate-worker-demo` - Test coordinate conversions
- `/telemetry-stream-demo` - View streaming telemetry
- `/draggable-144fps-demo` - 144fps drag performance test
- `/hexagon-drag-demo` - Hexagonal grid interaction

## Quality Focus

The project prioritizes:

1. **Type Safety**: Comprehensive TypeScript types
2. **Runtime Validation**: NASA JPL Rule 5 assertions
3. **Error Handling**: No unhandled promises or exceptions
4. **Performance**: Profiling over premature optimization
5. **Real Hardware Testing**: Actual drone/SDR integration
