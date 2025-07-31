# /aerospace-agents

Launch specialized aerospace-grade agents for parallel development.

## Usage
```
/aerospace-agents [mode] [options]
```

## Modes

### map-features (6 agents, 6.8ms budget)
Complete map feature development suite:
- **Location Entry** (0.5ms): Multi-format coordinate input (MGRS, UTM, Lat/Long, What3Words)
- **Map Crosshair** (1.5ms): Dynamic crosshair with distance rings and NATO icons
- **Measuring Tools** (1.0ms): Shape drawing and spline-based flight paths
- **Messaging System** (0.3ms): Toast notifications for NOTAMS and aviation alerts
- **ADS-B Display** (2.0ms): Real-time aircraft tracking for 500+ aircraft
- **Weather Overlay** (1.5ms): AccuWeather-style WebGL weather visualization

### telemetry-systems (2 agents)
High-performance data processing:
- **Telemetry Parser**: MAVLink, CCSDS, and custom protocol parsing
- **Data Visualizer**: Real-time telemetry visualization with WebGL

### mission-planning (2 agents)
Flight planning and optimization:
- **Route Optimizer**: Terrain-following route optimization algorithms
- **Waypoint Manager**: Drag-and-drop waypoint editing interface

## Options

- `-AutoLaunch`: Immediately spawn agents in WezTerm grid layout
- `-ShowCommands`: Display launch commands without executing
- `-MaxAgents N`: Limit concurrent agents (default: 6)
- `-Resume`: Reconnect to existing agent sessions

## Examples

```bash
# Launch all map features with auto-grid
/aerospace-agents map-features -AutoLaunch

# Show telemetry system commands
/aerospace-agents telemetry-systems -ShowCommands

# Launch with agent limit
/aerospace-agents map-features -AutoLaunch -MaxAgents 4

# Resume existing sessions
/aerospace-agents map-features -Resume
```

## Sub-Agents Used

Each agent automatically deploys specialized sub-agents:

- **webdesign-ui-architect**: UI/UX components, responsive layouts, component architecture
- **motion-graphics-specialist**: 144fps animations, smooth transitions, WebGL effects
- **aerospace-innovation-lead**: System architecture, algorithm design, performance optimization
- **aerospace-debugger-v2**: Bug fixes, performance tuning, memory optimization
- **aerospace-code-auditor-v4**: NASA JPL compliance, code quality, security analysis

## System Requirements

- **Claude Code**: Instance with `--dangerously-skip-permissions` capability
- **WezTerm**: For optimal grid layout (falls back to standard terminal)
- **Git**: For worktree management and branch isolation
- **PowerShell**: Cross-platform script execution

## Performance Targets

- **144fps**: 6.94ms total frame budget
- **NASA JPL**: Power of 10 compliance enforced
- **Real-time**: Sub-millisecond response targets
- **Scalable**: 500+ concurrent entities (aircraft, weather data)

## Integration

This command works from any Claude Code instance. The system automatically:
1. Creates git worktrees for agent isolation
2. Sets up performance monitoring
3. Establishes inter-agent communication
4. Enforces aerospace-grade coding standards
5. Provides real-time progress tracking

## Troubleshooting

If agents fail to launch:
1. Verify WezTerm installation: `wezterm --version`
2. Check git worktree support: `git worktree list`
3. Ensure project has `.claude-orchestrator/` directory
4. Verify system PATH includes aerospace-agent-system location

For advanced configuration, see `aerospace-agent-system/README.md`.