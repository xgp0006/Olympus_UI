# Advanced Aerospace Agent Spawner
# Configurable multi-agent launch system with sub-agent specifications

param(
    [Parameter(Position=0)]
    [string]$Mode = "map-features",
    
    [Parameter()]
    [switch]$AutoLaunch = $false,
    
    [Parameter()]
    [switch]$ShowCommands = $false
)

# Agent configurations for different mission types
$agentConfigs = @{
    "map-features" = @(
        @{
            Name = "LOCATION ENTRY"
            Icon = "[LOC]"
            Path = ".claude-orchestrator\worktrees\location-entry"
            Budget = "0.5ms"
            Prompt = "Read AGENT_INSTRUCTIONS.md and begin implementing the multi-format coordinate entry system (MGRS, UTM, Lat/Long, What3Words). Focus on 0.5ms frame budget performance. Use webdesign-ui-architect for the input components, motion-graphics-specialist for smooth format transitions, and aerospace-code-auditor-v4 to verify coordinate conversion accuracy. Stay in interactive mode for continuous development."
        },
        @{
            Name = "MAP CROSSHAIR"
            Icon = "[AIM]"
            Path = ".claude-orchestrator\worktrees\map-crosshair"
            Budget = "1.5ms"
            Prompt = "Read AGENT_INSTRUCTIONS.md and implement the dynamic crosshair system with distance rings and NATO/civilian icons. Target 1.5ms frame budget. Use motion-graphics-specialist for smooth crosshair animations, webdesign-ui-architect for icon rendering, and aerospace-innovation-lead for GPU-accelerated ring calculations. Stay in interactive mode for continuous development."
        },
        @{
            Name = "MEASURING TOOLS"
            Icon = "[MSR]"
            Path = ".claude-orchestrator\worktrees\measuring-tools"
            Budget = "1.0ms"
            Prompt = "Read AGENT_INSTRUCTIONS.md and develop the measuring tools with shape drawing and spline-based flight paths. Maintain 1.0ms frame budget. Use webdesign-ui-architect for the tool UI, motion-graphics-specialist for smooth spline curve animations, and aerospace-innovation-lead for optimal path calculation algorithms. Stay in interactive mode for continuous development."
        },
        @{
            Name = "MESSAGING SYSTEM"
            Icon = "[MSG]"
            Path = ".claude-orchestrator\worktrees\messaging-system"
            Budget = "0.3ms"
            Prompt = "Read AGENT_INSTRUCTIONS.md and create the toast notification system for NOTAMS, TFRs, and aviation alerts. Keep within 0.3ms frame budget. Use webdesign-ui-architect for toast component design, motion-graphics-specialist for slide-in animations, and aerospace-code-auditor-v4 to ensure message queue efficiency. Stay in interactive mode for continuous development."
        },
        @{
            Name = "ADS-B DISPLAY"
            Icon = "[ADS]"
            Path = ".claude-orchestrator\worktrees\adsb-display"
            Budget = "2.0ms"
            Prompt = "Read AGENT_INSTRUCTIONS.md and implement the ADS-B display system for 500+ aircraft at 144fps. Use your 2.0ms frame budget wisely. Deploy aerospace-innovation-lead for WebGL instancing strategy, motion-graphics-specialist for aircraft trail effects, and aerospace-debugger-v2 for performance optimization. Stay in interactive mode for continuous development."
        },
        @{
            Name = "WEATHER OVERLAY"
            Icon = "[WX]"
            Path = ".claude-orchestrator\worktrees\weather-overlay"
            Budget = "1.5ms"
            Prompt = "Read AGENT_INSTRUCTIONS.md and build the AccuWeather-style weather overlay with WebGL shaders. Target 1.5ms frame budget. Use aerospace-innovation-lead for shader architecture, motion-graphics-specialist for animated weather effects, and webdesign-ui-architect for the weather legend UI. Stay in interactive mode for continuous development."
        }
    )
    
    "telemetry-systems" = @(
        @{
            Name = "TELEMETRY PARSER"
            Icon = "[TLM]"
            Path = ".claude-orchestrator\worktrees\telemetry-parser"
            Budget = "0.2ms"
            Prompt = "Implement high-performance telemetry parsing for MAVLink, CCSDS, and custom protocols. Use aerospace-innovation-lead for parser architecture and aerospace-debugger-v2 for zero-copy optimizations."
        },
        @{
            Name = "DATA VISUALIZER"
            Icon = "[VIZ]"
            Path = ".claude-orchestrator\worktrees\data-viz"
            Budget = "2.0ms"
            Prompt = "Create real-time telemetry visualization with WebGL. Use motion-graphics-specialist for smooth data animations and webdesign-ui-architect for dashboard layouts."
        }
    )
    
    "mission-planning" = @(
        @{
            Name = "ROUTE OPTIMIZER"
            Icon = "[RTE]"
            Path = ".claude-orchestrator\worktrees\route-optimizer"
            Budget = "1.0ms"
            Prompt = "Build aerospace-grade route optimization with terrain following. Use aerospace-innovation-lead for path algorithms and motion-graphics-specialist for route preview animations."
        },
        @{
            Name = "WAYPOINT MANAGER"
            Icon = "[WPT]"
            Path = ".claude-orchestrator\worktrees\waypoint-manager"
            Budget = "0.5ms"
            Prompt = "Implement waypoint management with drag-and-drop editing. Use webdesign-ui-architect for UI components and aerospace-code-auditor-v4 for coordinate validation."
        }
    )
}

# Function to generate launch command
function Get-LaunchCommand {
    param($Agent)
    
    return "claude --dangerously-skip-permissions `"$($Agent.Prompt)`""
}

# Function to display commands
function Show-Commands {
    param($Agents)
    
    Write-Host "`n🚀 AEROSPACE AGENT LAUNCH COMMANDS" -ForegroundColor Cyan
    Write-Host "===================================" -ForegroundColor DarkGray
    
    $i = 1
    $totalBudget = 0
    foreach ($agent in $Agents) {
        Write-Host "`n$i. $($agent.Name) ($($agent.Budget) budget)" -ForegroundColor Yellow
        Write-Host "   cd $($agent.Path)" -ForegroundColor White
        Write-Host "   $(Get-LaunchCommand $agent)" -ForegroundColor Green
        
        $budgetValue = [double]($agent.Budget -replace 'ms', '')
        $totalBudget += $budgetValue
        $i++
    }
    
    Write-Host "`n===================================" -ForegroundColor DarkGray
    Write-Host "TOTAL FRAME BUDGET: ${totalBudget}ms / 6.94ms (144fps)" -ForegroundColor Cyan
    Write-Host ""
}

# Function to launch agents in WezTerm
function Launch-Agents {
    param($Agents)
    
    Write-Host "🚀 Launching agents in WezTerm grid..." -ForegroundColor Cyan
    
    # Create new tab
    $pane1 = wezterm cli spawn -- pwsh -NoExit
    Write-Host "Created tab with pane ID: $pane1" -ForegroundColor Green
    
    # Create grid based on agent count
    $panes = @($pane1)
    
    if ($Agents.Count -ge 2) {
        $pane2 = wezterm cli split-pane --pane-id $pane1 --right --percent 50
        $panes += $pane2
    }
    if ($Agents.Count -ge 3) {
        $pane3 = wezterm cli split-pane --pane-id $pane1 --bottom --percent 50
        $panes += $pane3
    }
    if ($Agents.Count -ge 4) {
        $pane4 = wezterm cli split-pane --pane-id $pane2 --bottom --percent 50
        $panes += $pane4
    }
    if ($Agents.Count -ge 5) {
        $pane5 = wezterm cli split-pane --pane-id $pane3 --right --percent 50
        $panes += $pane5
    }
    if ($Agents.Count -ge 6) {
        $pane6 = wezterm cli split-pane --pane-id $pane4 --right --percent 50
        $panes += $pane6
    }
    
    # Launch agents
    for ($i = 0; $i -lt $Agents.Count -and $i -lt $panes.Count; $i++) {
        $agent = $Agents[$i]
        $paneId = $panes[$i]
        
        Write-Host "Launching $($agent.Name) in pane $paneId..." -ForegroundColor Gray
        
        # Navigate to directory
        wezterm cli send-text --pane-id $paneId --no-paste "cd $($agent.Path)`n"
        Start-Sleep -Milliseconds 200
        
        # Clear and show agent info
        wezterm cli send-text --pane-id $paneId --no-paste "clear`n"
        wezterm cli send-text --pane-id $paneId --no-paste "Write-Host '$($agent.Icon) $($agent.Name) - $($agent.Budget)' -ForegroundColor Cyan`n"
        Start-Sleep -Milliseconds 100
        
        # Launch Claude
        $cmd = Get-LaunchCommand $agent
        $cmd | wezterm cli send-text --pane-id $paneId --no-paste
        "`n" | wezterm cli send-text --pane-id $paneId --no-paste
    }
    
    Write-Host "`n✅ All agents launched!" -ForegroundColor Green
}

# Main execution
$selectedAgents = $agentConfigs[$Mode]

if (-not $selectedAgents) {
    Write-Host "Available modes:" -ForegroundColor Yellow
    $agentConfigs.Keys | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
    exit 1
}

Write-Host "🎯 Mode: $Mode" -ForegroundColor Cyan
Write-Host "📊 Agents: $($selectedAgents.Count)" -ForegroundColor Cyan

if ($ShowCommands -or -not $AutoLaunch) {
    Show-Commands $selectedAgents
}

if ($AutoLaunch) {
    Launch-Agents $selectedAgents
} else {
    Write-Host "`nTo auto-launch these agents, run:" -ForegroundColor Yellow
    Write-Host "  .\spawn-aerospace-agents.ps1 -Mode $Mode -AutoLaunch" -ForegroundColor White
}

# Display sub-agent reference
Write-Host "`nSub-Agents Reference:" -ForegroundColor Yellow
Write-Host "  • webdesign-ui-architect: UI/UX components & layouts" -ForegroundColor Gray
Write-Host "  • motion-graphics-specialist: 144fps animations & effects" -ForegroundColor Gray
Write-Host "  • aerospace-innovation-lead: Architecture & algorithms" -ForegroundColor Gray
Write-Host "  • aerospace-debugger-v2: Performance optimization" -ForegroundColor Gray
Write-Host "  • aerospace-code-auditor-v4: NASA JPL compliance" -ForegroundColor Gray