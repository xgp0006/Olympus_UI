# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Olympus Ground Control Station is an aerospace-grade Rust workspace designed for UAV/drone ground control operations. The project follows NASA JPL Power of 10 compliance for safety-critical aerospace software and implements a modular, plugin-based architecture.

## Architecture

**Multi-Crate Workspace Structure:**

- `olympus-cli` - Main CLI binary and user interface
- `olympus-core` - Core state management and message bus
- `olympus-mavlink` - MAVLink protocol handling for flight controllers
- `olympus-gps` - GPS device management and sensor fusion
- `olympus-sdr` - Software-defined radio integration (RTL-SDR, KrakenSDR)
- `olympus-klipper` - 3D printer integration via Moonraker API
- `olympus-api` - External API clients (FAA, weather, ADS-B)
- `olympus-mission` - Mission planning and waypoint management
- `olympus-video` - Video streaming and processing
- `olympus-map` - Map tile management and rendering
- `olympus-gpu` - GPU acceleration and WebGPU rendering
- `olympus-telemetry` - Telemetry data processing
- `olympus-plugin` - Plugin system architecture
- `olympus-testing` - Shared testing utilities

**Key Design Principles:**

- NASA JPL Power of 10 compliance (see `clippy.toml` and `rustfmt.toml`)
- Aerospace-grade error handling with bounded memory allocation
- Plugin-based extensibility for hardware integrations
- Real-time performance targets (50Hz telemetry, 120fps rendering)

## Essential Development Commands

### Build Commands

```bash
# Basic workspace build
cargo build --workspace

# Release build (aerospace profile)
cargo build --workspace --release

# Safety-critical profile build
cargo build --workspace --profile safety-critical

# Build with specific feature sets
./scripts/manage-features.sh build desktop --release
./scripts/manage-features.sh build embedded --no-default
./scripts/manage-features.sh build safety_critical
```

### Testing Commands

```bash
# Run all tests
cargo test --workspace

# Run tests with specific features
cargo test --workspace --features "std,alloc,testing"

# Run benchmarks
cargo bench --workspace

# Individual crate testing
cargo test -p olympus-mavlink
cargo test -p olympus-gps --features "testing"
```

### Code Quality and Compliance

```bash
# NASA JPL compliance check
cargo clippy --workspace --all-targets --all-features

# Format code (aerospace standards)
cargo fmt --all

# Security audit
cargo audit

# Dependency validation (comprehensive)
./scripts/validate-dependencies.sh

# Feature validation
./scripts/manage-features.sh validate
```

### Development Tools

```bash
# Install development dependencies
cargo install cargo-watch cargo-audit cargo-deny cargo-tarpaulin

# Live reload during development
cargo watch -x "check --workspace"

# Hot reload for CLI changes
cargo watch -x "run -p olympus-cli -- --help"

# Code coverage analysis
cargo tarpaulin --workspace --out Html --output-dir target/coverage
```

### Task Management

```bash
# Task Master AI integration now available
# Use Claude Code's built-in TodoWrite/TodoRead tools for session planning
# Access Task Master AI features through MCP tools (mcp__task-master-ai__)

# Task Master commands (when Task Master AI tasks exist)
tm get tasks              # View all tasks
tm next                   # Get next task to work on
tm set-status <id> done   # Mark task complete
```

## Key Configuration Files

### NASA JPL Compliance

- `clippy.toml` - Enforces Power of 10 rules (60-line functions, no unsafe code, bounded complexity)
- `rustfmt.toml` - Aerospace code formatting standards
- `cargo-deny.toml` - Dependency security and license compliance
- `.cargo/config.toml` - Build configuration with aerospace flags
- `tarpaulin.toml` - Code coverage configuration with aerospace thresholds

### Feature Management

- `Cargo.toml` (workspace) - Defines feature sets for different deployment scenarios:
  - `minimal` - Basic operation (std,alloc)
  - `desktop` - Full desktop features with networking
  - `embedded` - no_std embedded compatibility
  - `safety_critical` - Aerospace-compliant feature subset
  - `testing` - Development and testing features

### Scripts

- `./scripts/validate-dependencies.sh` - Comprehensive dependency analysis
- `./scripts/manage-features.sh` - Feature set validation and building

### Project Management

- `.taskmaster/` - Task Master AI integration (auto-generated, do not edit)
- `.kiro/specs/` - Project specifications and design documents

## Development Workflow

### 1. Setup and Validation

```bash
# Verify workspace integrity
cargo check --workspace

# Run full validation suite
./scripts/validate-dependencies.sh

# Test all feature combinations
./scripts/manage-features.sh validate
```

### 2. Making Changes

```bash
# Start with feature-specific development
./scripts/manage-features.sh build [minimal|desktop|embedded|safety_critical]

# Use aerospace-compliant profiles
cargo build --profile safety-critical

# Validate changes don't break compliance
cargo clippy --workspace -- -D warnings
```

### 3. Testing Strategy

```bash
# Run tests for specific feature sets
./scripts/manage-features.sh test desktop
./scripts/manage-features.sh test embedded

# Benchmark performance-critical components
cargo bench -p olympus-mavlink
cargo bench -p olympus-gps
```

### 4. Pre-commit Validation

```bash
# Pre-commit hooks enforce strict compliance automatically
# Manual validation (hooks handle this automatically)
cargo fmt --all && \
cargo clippy --workspace --all-targets -- -D warnings && \
cargo test --workspace && \
cargo audit && \
./scripts/validate-dependencies.sh
```

## Crate-Specific Guidance

### olympus-cli (Main Binary)

- Entry point for all user interactions
- Clap-based CLI with completion support
- Integrates all other crates via dependency injection
- **Testing:** `cargo test -p olympus-cli`

### olympus-mavlink (Flight Control)

- Real-time MAVLink message processing
- Vehicle state management with 50Hz telemetry target
- Multi-connection support (USB/serial, TCP, UDP)
- **Testing:** Focus on message parsing accuracy and latency

### olympus-gps (Navigation)

- Multi-source GPS fusion algorithms
- NMEA parsing and device management
- Quality assessment and accuracy estimation
- **Testing:** Validate fusion algorithms with synthetic data

### olympus-core (Foundation)

- Message bus for inter-component communication
- Shared state management with thread safety
- Configuration management system
- **Testing:** Focus on thread safety and message ordering

## Code Coherence and Consistency

Olympus follows aerospace-grade standards for code coherence and consistency to ensure maintainability, safety, and reliability across the multi-crate workspace.

### Architectural Coherence

**Workspace Structure Consistency:**

- Each crate follows the same internal organization: `lib.rs`, `error.rs`, domain modules
- Public APIs are consistently designed with builder patterns and error handling
- All crates implement the same logging, error propagation, and configuration patterns
- Inter-crate communication follows the message bus pattern from `olympus-core`

**Data Flow Consistency:**

- All real-time data flows through the universal event bus (`olympus-core`)
- Configuration changes propagate through the core state management system
- Error handling follows the same aerospace-grade patterns across all modules
- Telemetry data maintains consistent formatting and validation standards

**Interface Coherence:**

- CLI commands follow consistent naming: `olympus <subsystem> <action> [options]`
- All subsystems implement the same health monitoring and status reporting interfaces
- Plugin architecture ensures consistent integration patterns for external hardware
- API responses maintain consistent error codes and message formats

### Code Style Consistency

**NASA JPL Power of 10 Compliance:**

- Functions limited to 60 lines maximum across all crates
- Cyclomatic complexity ≤ 10 for all functions
- No dynamic memory allocation in real-time paths
- All return values checked (no unused `Result` types)
- Consistent use of `#[must_use]` attributes for critical types

**Rust Idiom Consistency:**

- Error types implement consistent traits: `Error`, `Debug`, `Clone` when appropriate
- All async functions use `tokio` runtime consistently
- Resource management follows RAII patterns with custom `Drop` implementations
- Type safety enforced through newtype patterns for domain-specific values

**Documentation Standards:**

- All public APIs documented with usage examples
- Safety considerations documented for any `unsafe` code
- Performance characteristics documented for real-time components
- Error conditions and recovery strategies clearly documented

### Naming Conventions

**Module and Type Naming:**

- Crates named `olympus-<domain>` following kebab-case
- Types use PascalCase: `VehicleState`, `GpsDevice`, `TelemetryMessage`
- Functions and variables use snake_case: `process_telemetry`, `gps_quality`
- Constants use SCREAMING_SNAKE_CASE: `MAX_VEHICLES`, `TELEMETRY_RATE_HZ`

**Domain-Specific Patterns:**

- All state types end with `State`: `VehicleState`, `GpsState`, `ConnectionState`
- All configuration types end with `Config`: `MavlinkConfig`, `LoggingConfig`
- All error types end with `Error`: `MavlinkError`, `GpsError`, `ConnectionError`
- All manager types end with `Manager`: `VehicleManager`, `ConnectionManager`

### Data Structure Consistency

**Configuration Patterns:**

- All configuration structs implement `Default`, `Clone`, `Debug`, `Serialize`, `Deserialize`
- Configuration validation happens at application startup, not runtime
- Environment variable overrides follow consistent naming: `OLYMPUS_<CRATE>_<SETTING>`
- Configuration errors provide actionable error messages with suggested fixes

**State Management:**

- All state mutations go through the core message bus for auditability
- State changes are atomic and follow event sourcing patterns
- Rollback capabilities exist for all critical state changes
- State persistence follows consistent serialization patterns

**Error Handling:**

- All errors implement conversion patterns between crate boundaries
- Error context includes relevant system state for debugging
- Recovery strategies are consistently implemented across similar operations
- Error logging includes structured metadata for monitoring

### Testing Consistency

**Test Organization:**

- Unit tests in `tests/` directory for each crate
- Integration tests validate cross-crate interactions
- Performance tests ensure real-time requirements are met
- Property-based tests validate edge cases for critical algorithms

**Test Patterns:**

- All async tests use `#[tokio::test]` consistently
- Mock objects follow the same interface patterns as real implementations
- Test data generation uses consistent factory patterns
- Assertion messages provide clear failure context

### Performance Consistency

**Real-time Guarantees:**

- All telemetry processing maintains 50Hz minimum rates
- Memory allocation patterns are predictable and bounded
- CPU usage monitoring is consistent across all real-time components
- Latency tracking follows the same measurement patterns

**Resource Management:**

- Connection pooling patterns are consistent across network protocols
- Buffer management uses the same bounded allocation strategies
- Thread pool configuration follows consistent patterns
- Resource cleanup is deterministic and follows RAII patterns

### Development Workflow Consistency

**Build Process:**

- All crates build with the same compiler flags and feature sets
- Safety-critical profiles apply consistent optimization levels
- Documentation generation follows the same standards
- Dependency management uses consistent version pinning strategies

**Quality Assurance:**

- All code passes the same `clippy` rule set
- Formatting follows aerospace-standard `rustfmt` configuration
- Security audits apply to all dependencies consistently
- Code coverage requirements are uniform across the workspace

### Future-Proofing Strategies

**API Evolution:**

- Deprecation warnings provide migration paths
- Version compatibility is maintained across minor releases
- Breaking changes follow semantic versioning strictly
- Public API surface is minimized to reduce maintenance burden

**Extensibility Patterns:**

- Plugin interfaces are designed for forward compatibility
- Configuration schemas support graceful evolution
- Database migrations are reversible and tested
- Protocol implementations support version negotiation

This coherence ensures that any developer can work effectively across the entire Olympus codebase, understanding patterns and conventions that apply consistently throughout the aerospace-grade ground control system.

## Current Development Status

**Build Status:** ✅ FULLY COMPLIANT

- **0 Compilation Errors** ✅
- **0 Clippy Warnings** ✅ (Complete compliance achieved)
- **NASA JPL Compliance** ✅ (Zero rule violations)
- **Pre-commit Hooks** ✅ (Strict clippy enforcement active)

The project now maintains zero warnings through strict pre-commit hook enforcement.

## Performance Targets

**Real-time Requirements:**

- MAVLink telemetry: 50Hz processing
- GPS fusion: 10Hz minimum, 50Hz target
- Video streaming: 30fps minimum, 60fps target
- Rendering pipeline: 120fps target
- Command latency: <50ms end-to-end

**Memory Constraints:**

- Use `heapless` collections over `std::collections` where possible
- Bounded allocation patterns for predictable memory usage
- Stack arrays limited to 512KB per NASA JPL guidelines

## Plugin Development

The system supports hardware integration plugins:

- SDR integration (RTL-SDR, KrakenSDR)
- 3D printer control (Klipper/Moonraker)
- External APIs (FAA NOTAMs, weather, ADS-B)

See individual crate READMEs for plugin architecture details.

## Troubleshooting

### Build Issues

```bash
# Clean slate rebuild
cargo clean && cargo build --workspace

# Check specific feature combinations
./scripts/manage-features.sh check [feature_set]

# Dependency conflicts
./scripts/validate-dependencies.sh --tree
```

### NASA JPL Compliance

```bash
# Check for rule violations
cargo clippy --workspace | grep -E "(too-many-lines|cognitive-complexity|unsafe)"

# Memory allocation analysis
./scripts/validate-dependencies.sh --memory
```

### Performance Issues

```bash
# Profile specific components
cargo build --release && cargo bench -p [crate-name]

# Check real-time constraints
cargo run -p olympus-cli -- mavlink telemetry --rate 50
```

## Important Notes

- **Never** manually edit auto-generated files in `.taskmaster/`
- Always use workspace-level builds for consistency
- Test feature combinations before merging changes
- Document any unsafe code with safety analysis
- Follow NASA JPL Power of 10 rules strictly for aerospace compliance

## Current Development Status

**Development Phase:** Core infrastructure complete with Task Master AI integration
**Next Phase:** MAVLink integration implementation and advanced feature development

## Project Context

This project implements the Olympus CLI Interconnectivity System as specified in:

- `.kiro/specs/olympus-cli-interconnectivity/design.md` - Comprehensive architecture design
- `.kiro/specs/olympus-cli-interconnectivity/requirements.md` - 16 core requirements

The system provides true interconnectivity between MAVLink, ROS2, Klipper, and SDR systems with CLI-first operation, ratatui terminal interface, real-time data fusion, and deterministic behavior suitable for mission-critical aerospace applications.

This project prioritizes safety, reliability, and real-time performance for aerospace applications. When in doubt, prefer the more conservative, aerospace-compliant approach.

## Task Master AI Instructions

**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
