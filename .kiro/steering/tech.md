# Technology Stack & Build System

## Core Technologies

### Frontend Stack

- **SvelteKit**: Modern web framework with TypeScript support for component-based architecture
- **TypeScript**: Strict typing for aerospace-grade reliability and maintainability
- **Tailwind CSS**: Utility-first CSS framework with JIT compilation for optimal performance
- **Vite**: Fast build tool and development server optimized for modern web development

### UI Libraries & Components

- **xterm.js**: Full-featured terminal emulator for persistent CLI panel integration
- **MapLibre GL JS**: High-performance mapping library for mission planning visualization
- **GSAP**: Professional animation library for smooth UI transitions and interactions
- **Motion**: Svelte-specific animation utilities for enhanced user experience

### Backend Integration

- **Tauri**: Rust-based framework for native desktop applications with secure frontend-backend communication
- **Tauri Commands**: Type-safe RPC system for invoking Rust backend functions
- **Tauri Events**: Real-time event system for streaming data from Rust backend to frontend

### Package Management

- **PNPM**: Fast, disk space efficient package manager with strict dependency resolution

## Build Commands

### Development

```bash
# Start development server with hot reload
pnpm dev

# Start development server with specific host/port
pnpm dev --host 0.0.0.0 --port 3000

# Build for development with source maps
pnpm build:dev
```

### Production

```bash
# Build optimized production bundle
pnpm build

# Preview production build locally
pnpm preview

# Build and bundle with Tauri for desktop distribution
pnpm tauri build
```

### Quality Assurance

```bash
# Run TypeScript type checking
pnpm check

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run end-to-end tests
pnpm test:e2e

# Lint code with ESLint
pnpm lint

# Format code with Prettier
pnpm format

# Run full quality check (type check + lint + test)
pnpm qa
```

### Tauri Integration

```bash
# Initialize Tauri development environment
pnpm tauri dev

# Build Tauri application for current platform
pnpm tauri build

# Generate Tauri command bindings
pnpm tauri generate

# Update Tauri dependencies
pnpm tauri update
```

## Configuration Files

### Core Configuration

- `vite.config.ts`: Vite build configuration with Tauri integration
- `svelte.config.js`: SvelteKit configuration for routing and preprocessing
- `tailwind.config.js`: Tailwind CSS configuration with custom theme variables
- `tsconfig.json`: TypeScript compiler configuration with strict settings

### Quality Assurance

- `.eslintrc.cjs`: ESLint configuration for TypeScript and Svelte
- `prettier.config.js`: Prettier formatting rules
- `playwright.config.ts`: End-to-end testing configuration

### Tauri Configuration

- `src-tauri/tauri.conf.json`: Tauri application configuration
- `src-tauri/Cargo.toml`: Rust backend dependencies and build settings

## Development Environment Requirements

### Required Tools

- **Node.js**: Version 18+ for modern JavaScript features
- **PNPM**: Version 8+ for package management
- **Rust**: Latest stable version for Tauri backend
- **Tauri CLI**: Latest version for desktop app development

### Recommended IDE Setup

- **VS Code** with extensions:
  - Svelte for VS Code
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - Rust Analyzer (for Tauri backend)
  - Prettier - Code formatter
  - ESLint

## Performance Optimization

### Build Optimization

- Tree shaking for minimal bundle size
- Code splitting for optimal loading
- Asset optimization and compression
- Source map generation for debugging

### Runtime Performance

- Lazy loading for plugin components
- Virtual scrolling for large data sets
- Efficient state management with Svelte stores
- Optimized re-rendering with reactive statements

## Security Considerations

### Tauri Security

- CSP (Content Security Policy) enforcement
- Secure context requirements for sensitive operations
- API endpoint validation and sanitization
- Secure storage for sensitive configuration data

### Frontend Security

- Input validation and sanitization
- XSS prevention through proper escaping
- Secure handling of user-generated content
- Safe evaluation of dynamic content
