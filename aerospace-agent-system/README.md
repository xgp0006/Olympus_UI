# Aerospace Agent System
## Portable Multi-Agent Claude Orchestration System

This system allows any Claude Code instance to spawn specialized aerospace-grade agents for parallel development tasks.

## 🚀 Quick Start

### 1. Installation
Copy this entire `aerospace-agent-system` folder to a location accessible by all Claude instances:

**Recommended locations:**
- `C:\Tools\aerospace-agent-system\` (Windows)
- `~/tools/aerospace-agent-system/` (macOS/Linux)
- Or any path in your system PATH

### 2. Global Access Setup

#### Option A: Add to PATH
Add the system directory to your PATH environment variable so any Claude instance can access it.

#### Option B: Symlink (Advanced)
Create symlinks in common locations:
```bash
# Windows (as Administrator)
mklink /D "C:\Tools\aerospace-agent-system" "path\to\this\folder"

# macOS/Linux
ln -s "path/to/this/folder" "~/tools/aerospace-agent-system"
```

### 3. Usage from any Claude Code instance

#### Method 1: Direct execution
```bash
# Navigate to any project directory
cd /path/to/your/project

# Run the system
path/to/aerospace-agent-system/spawn-agents.ps1 -Mode map-features -AutoLaunch
```

#### Method 2: Slash command (Recommended)
Create a `.claude-code/` directory in your project and add `aerospace-agents.md`:

```markdown
# /aerospace-agents

Launch specialized aerospace-grade agents for parallel development.

Usage: /aerospace-agents [mode] [options]

Available modes:
- map-features: Location entry, crosshair, measuring tools, messaging, ADS-B, weather
- telemetry-systems: Telemetry parsing, data visualization
- mission-planning: Route optimization, waypoint management

Options:
- -AutoLaunch: Immediately spawn agents in WezTerm grid
- -ShowCommands: Display commands without launching

Examples:
/aerospace-agents map-features -AutoLaunch
/aerospace-agents telemetry-systems
```

## 🎯 System Architecture

### Agent Types Available

1. **Map Features** (6 agents, 6.8ms/6.94ms @ 144fps)
   - Location Entry (0.5ms): Multi-format coordinate input
   - Map Crosshair (1.5ms): Dynamic crosshair with distance rings
   - Measuring Tools (1.0ms): Shape drawing and spline paths
   - Messaging System (0.3ms): Toast notifications for aviation alerts
   - ADS-B Display (2.0ms): Real-time aircraft tracking (500+)
   - Weather Overlay (1.5ms): WebGL weather visualization

2. **Telemetry Systems** (2 agents)
   - Telemetry Parser: MAVLink, CCSDS protocol parsing
   - Data Visualizer: Real-time telemetry visualization

3. **Mission Planning** (2 agents)
   - Route Optimizer: Terrain-following route optimization
   - Waypoint Manager: Drag-and-drop waypoint editing

### Sub-Agent Specialists

Each agent automatically uses specialized sub-agents:
- **webdesign-ui-architect**: UI/UX components & layouts
- **motion-graphics-specialist**: 144fps animations & effects  
- **aerospace-innovation-lead**: Architecture & algorithms
- **aerospace-debugger-v2**: Performance optimization
- **aerospace-code-auditor-v4**: NASA JPL compliance

## 📁 File Structure

```
aerospace-agent-system/
├── README.md                    # This file
├── spawn-agents.ps1            # Main launcher script
├── slash-commands/             # Slash command definitions
│   └── aerospace-agents.md
├── templates/                  # Agent workspace templates
│   ├── map-features/
│   ├── telemetry-systems/
│   └── mission-planning/
├── hooks/                      # Integration hooks
│   ├── claude-hook.js
│   └── install-hooks.ps1
└── examples/                   # Usage examples
    ├── basic-usage.md
    └── advanced-configuration.md
```

## 🔧 Advanced Configuration

### Custom Agent Modes

Edit `spawn-agents.ps1` to add your own agent configurations:

```powershell
"custom-mode" = @(
    @{
        Name = "CUSTOM AGENT"
        Path = "path/to/worktree"
        Budget = "1.0ms"
        Prompt = "Your custom prompt with sub-agent specifications"
    }
)
```

### Environment Variables

- `AEROSPACE_AGENTS_PATH`: Override default system path
- `AEROSPACE_DEBUG`: Enable debug logging
- `AEROSPACE_MAX_AGENTS`: Limit concurrent agents (default: 6)

## 🚨 Requirements

- **Claude Code**: Any instance with --dangerously-skip-permissions capability
- **WezTerm**: For grid layout (auto-detects and falls back to default terminal)
- **Git**: For worktree management
- **PowerShell**: For script execution (Windows/cross-platform)

## 🔄 Lifecycle Management

The system is designed to be:

1. **Persistent**: Agents remain active until explicitly closed
2. **Resumable**: Can reconnect to existing agent sessions
3. **Scalable**: Add new agent types without system changes
4. **Portable**: Works across different projects and systems

## 🛡️ Security

- Uses Claude's built-in `--dangerously-skip-permissions` for rapid prototyping
- All agent prompts are visible and auditable
- No external network dependencies except Claude API
- Git worktrees provide isolation between agents

## 🤝 Integration Examples

### With VS Code
```json
{
  "tasks": [
    {
      "label": "Launch Aerospace Agents",
      "type": "shell",
      "command": "path/to/aerospace-agent-system/spawn-agents.ps1",
      "args": ["-Mode", "map-features", "-AutoLaunch"]
    }
  ]
}
```

### With CLion/IntelliJ
Add as External Tool with working directory set to project root.

### With Cursor
Create custom command in settings pointing to the system.

## 📊 Performance Monitoring

Each agent reports:
- Frame budget utilization
- Memory usage
- Task completion status
- Code quality metrics
- NASA JPL compliance scores

Monitor via the built-in dashboard or integrate with your existing monitoring tools.