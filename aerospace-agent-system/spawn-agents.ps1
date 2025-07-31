# Aerospace Agent System - Main Launcher
# Portable multi-agent Claude orchestration system
# Can be invoked from any Claude Code instance across the system

param(
    [Parameter(Position=0)]
    [string]$Mode = "map-features",
    
    [Parameter()]
    [switch]$AutoLaunch = $false,
    
    [Parameter()]
    [switch]$ShowCommands = $false,
    
    [Parameter()]
    [string]$ProjectPath = $null,
    
    [Parameter()]
    [switch]$Resume = $false,
    
    [Parameter()]
    [int]$MaxAgents = 6
)

# System information
Write-Host "🚀 AEROSPACE AGENT SYSTEM v2.0" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor DarkGray
Write-Host "Location: $($MyInvocation.MyCommand.Path | Split-Path)" -ForegroundColor Gray

# Auto-detect project path if not provided
if (-not $ProjectPath) {
    $ProjectPath = Get-Location
    Write-Host "Project: $ProjectPath" -ForegroundColor Gray
}

# Agent configurations for different mission types
$agentConfigs = @{
    "map-features" = @(
        @{
            Name = "LOCATION ENTRY"
            Icon = "[LOC]"
            Path = ".claude-orchestrator\worktrees\location-entry"
            Budget = "0.5ms"
            SubAgents = @("webdesign-ui-architect", "aerospace-code-auditor-v4")
            Prompt = "Read AGENT_INSTRUCTIONS.md and begin implementing the multi-format coordinate entry system (MGRS, UTM, Lat/Long, What3Words). Focus on 0.5ms frame budget performance. Use webdesign-ui-architect for the input components, motion-graphics-specialist for smooth format transitions, and aerospace-code-auditor-v4 to verify coordinate conversion accuracy. Stay in interactive mode for continuous development."
        },
        @{
            Name = "MAP CROSSHAIR"
            Icon = "[AIM]"
            Path = ".claude-orchestrator\worktrees\map-crosshair"
            Budget = "1.5ms"
            SubAgents = @("motion-graphics-specialist", "aerospace-innovation-lead")
            Prompt = "Read AGENT_INSTRUCTIONS.md and implement the dynamic crosshair system with distance rings and NATO/civilian icons. Target 1.5ms frame budget. Use motion-graphics-specialist for smooth crosshair animations, webdesign-ui-architect for icon rendering, and aerospace-innovation-lead for GPU-accelerated ring calculations. Stay in interactive mode for continuous development."
        },
        @{
            Name = "MEASURING TOOLS"
            Icon = "[MSR]"
            Path = ".claude-orchestrator\worktrees\measuring-tools"
            Budget = "1.0ms"
            SubAgents = @("webdesign-ui-architect", "motion-graphics-specialist")
            Prompt = "Read AGENT_INSTRUCTIONS.md and develop the measuring tools with shape drawing and spline-based flight paths. Maintain 1.0ms frame budget. Use webdesign-ui-architect for the tool UI, motion-graphics-specialist for smooth spline curve animations, and aerospace-innovation-lead for optimal path calculation algorithms. Stay in interactive mode for continuous development."
        },
        @{
            Name = "MESSAGING SYSTEM"
            Icon = "[MSG]"
            Path = ".claude-orchestrator\worktrees\messaging-system"
            Budget = "0.3ms"
            SubAgents = @("webdesign-ui-architect", "aerospace-code-auditor-v4")
            Prompt = "Read AGENT_INSTRUCTIONS.md and create the toast notification system for NOTAMS, TFRs, and aviation alerts. Keep within 0.3ms frame budget. Use webdesign-ui-architect for toast component design, motion-graphics-specialist for slide-in animations, and aerospace-code-auditor-v4 to ensure message queue efficiency. Stay in interactive mode for continuous development."
        },
        @{
            Name = "ADS-B DISPLAY"
            Icon = "[ADS]"
            Path = ".claude-orchestrator\worktrees\adsb-display"
            Budget = "2.0ms"
            SubAgents = @("aerospace-innovation-lead", "aerospace-debugger-v2")
            Prompt = "Read AGENT_INSTRUCTIONS.md and implement the ADS-B display system for 500+ aircraft at 144fps. Use your 2.0ms frame budget wisely. Deploy aerospace-innovation-lead for WebGL instancing strategy, motion-graphics-specialist for aircraft trail effects, and aerospace-debugger-v2 for performance optimization. Stay in interactive mode for continuous development."
        },
        @{
            Name = "WEATHER OVERLAY"
            Icon = "[WX]"
            Path = ".claude-orchestrator\worktrees\weather-overlay"
            Budget = "1.5ms"
            SubAgents = @("aerospace-innovation-lead", "motion-graphics-specialist")
            Prompt = "Read AGENT_INSTRUCTIONS.md and build the AccuWeather-style weather overlay with WebGL shaders. Target 1.5ms frame budget. Use aerospace-innovation-lead for shader architecture, motion-graphics-specialist for animated weather effects, and webdesign-ui-architect for the weather legend UI. Stay in interactive mode for continuous development."
        }
    )
    
    "telemetry-systems" = @(
        @{
            Name = "TELEMETRY PARSER"
            Icon = "[TLM]"
            Path = ".claude-orchestrator\worktrees\telemetry-parser"
            Budget = "0.2ms"
            SubAgents = @("aerospace-innovation-lead", "aerospace-debugger-v2")
            Prompt = "Implement high-performance telemetry parsing for MAVLink, CCSDS, and custom protocols. Use aerospace-innovation-lead for parser architecture and aerospace-debugger-v2 for zero-copy optimizations."
        },
        @{
            Name = "DATA VISUALIZER"
            Icon = "[VIZ]"
            Path = ".claude-orchestrator\worktrees\data-viz"
            Budget = "2.0ms"
            SubAgents = @("motion-graphics-specialist", "webdesign-ui-architect")
            Prompt = "Create real-time telemetry visualization with WebGL. Use motion-graphics-specialist for smooth data animations and webdesign-ui-architect for dashboard layouts."
        }
    )
    
    "mission-planning" = @(
        @{
            Name = "ROUTE OPTIMIZER"
            Icon = "[RTE]"
            Path = ".claude-orchestrator\worktrees\route-optimizer"
            Budget = "1.0ms"
            SubAgents = @("aerospace-innovation-lead", "motion-graphics-specialist")
            Prompt = "Build aerospace-grade route optimization with terrain following. Use aerospace-innovation-lead for path algorithms and motion-graphics-specialist for route preview animations."
        },
        @{
            Name = "WAYPOINT MANAGER"
            Icon = "[WPT]"
            Path = ".claude-orchestrator\worktrees\waypoint-manager"
            Budget = "0.5ms"
            SubAgents = @("webdesign-ui-architect", "aerospace-code-auditor-v4")
            Prompt = "Implement waypoint management with drag-and-drop editing. Use webdesign-ui-architect for UI components and aerospace-code-auditor-v4 for coordinate validation."
        }
    )
    
    "custom" = @(
        @{
            Name = "CUSTOM AGENT"
            Icon = "[CUS]"
            Path = ".claude-orchestrator\worktrees\custom"
            Budget = "1.0ms"
            SubAgents = @("general-purpose")
            Prompt = "Custom agent prompt - modify as needed."
        }
    )
}

# Function to generate launch command
function Get-LaunchCommand {
    param($Agent, $ProjectPath)
    
    $fullPath = Join-Path $ProjectPath $Agent.Path
    $cdCommand = "cd `"$fullPath`""
    $claudeCommand = "claude --dangerously-skip-permissions `"$($Agent.Prompt)`""
    
    return @{
        CD = $cdCommand
        Claude = $claudeCommand
        Full = "$cdCommand && $claudeCommand"
    }
}

# Function to display commands
function Show-Commands {
    param($Agents, $ProjectPath)
    
    Write-Host "`n🎯 AGENT LAUNCH COMMANDS" -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor DarkGray
    
    $i = 1
    $totalBudget = 0
    foreach ($agent in $Agents) {
        $cmd = Get-LaunchCommand $agent $ProjectPath
        
        Write-Host "`n$i. $($agent.Name) ($($agent.Budget) budget)" -ForegroundColor Yellow
        Write-Host "   Sub-agents: $($agent.SubAgents -join ', ')" -ForegroundColor Gray
        Write-Host "   $($cmd.CD)" -ForegroundColor White
        Write-Host "   $($cmd.Claude)" -ForegroundColor Green
        
        $budgetValue = [double]($agent.Budget -replace 'ms', '')
        $totalBudget += $budgetValue
        $i++
    }
    
    Write-Host "`n=========================" -ForegroundColor DarkGray
    Write-Host "TOTAL FRAME BUDGET: ${totalBudget}ms / 6.94ms (144fps)" -ForegroundColor Cyan
    
    if ($totalBudget -gt 6.94) {
        Write-Host "⚠️  WARNING: Budget exceeds 144fps target!" -ForegroundColor Red
    } else {
        Write-Host "✅ Budget within 144fps limits" -ForegroundColor Green
    }
}

# Function to check if WezTerm is available
function Test-WezTerm {
    try {
        $null = wezterm --version 2>$null
        return $true
    } catch {
        return $false
    }
}

# Function to launch agents in WezTerm grid
function Launch-AgentsWezTerm {
    param($Agents, $ProjectPath)
    
    Write-Host "🚀 Launching agents in WezTerm grid..." -ForegroundColor Cyan
    
    # Create new tab
    try {
        $pane1 = wezterm cli spawn -- pwsh -NoExit
        Write-Host "Created tab with pane ID: $pane1" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to create WezTerm tab: $_" -ForegroundColor Red
        return $false
    }
    
    # Create grid based on agent count
    $panes = @($pane1)
    
    # Create optimal grid layout
    $agentCount = [Math]::Min($Agents.Count, $MaxAgents)
    
    if ($agentCount -ge 2) {
        $pane2 = wezterm cli split-pane --pane-id $pane1 --right --percent 50
        $panes += $pane2
    }
    if ($agentCount -ge 3) {
        $pane3 = wezterm cli split-pane --pane-id $pane1 --bottom --percent 50
        $panes += $pane3
    }
    if ($agentCount -ge 4) {
        $pane4 = wezterm cli split-pane --pane-id $pane2 --bottom --percent 50
        $panes += $pane4
    }
    if ($agentCount -ge 5) {
        $pane5 = wezterm cli split-pane --pane-id $pane3 --right --percent 50
        $panes += $pane5
    }
    if ($agentCount -ge 6) {
        $pane6 = wezterm cli split-pane --pane-id $pane4 --right --percent 50
        $panes += $pane6
    }
    
    # Launch agents
    for ($i = 0; $i -lt $agentCount -and $i -lt $panes.Count; $i++) {
        $agent = $Agents[$i]
        $paneId = $panes[$i]
        $cmd = Get-LaunchCommand $agent $ProjectPath
        
        Write-Host "  Launching $($agent.Name) in pane $paneId..." -ForegroundColor Gray
        
        # Navigate to directory
        wezterm cli send-text --pane-id $paneId --no-paste "$($cmd.CD)`n"
        Start-Sleep -Milliseconds 200
        
        # Clear and show agent info
        wezterm cli send-text --pane-id $paneId --no-paste "clear`n"
        wezterm cli send-text --pane-id $paneId --no-paste "Write-Host '$($agent.Icon) $($agent.Name) - $($agent.Budget)' -ForegroundColor Cyan`n"
        wezterm cli send-text --pane-id $paneId --no-paste "Write-Host 'Sub-agents: $($agent.SubAgents -join ', ')' -ForegroundColor Gray`n"
        wezterm cli send-text --pane-id $paneId --no-paste "Write-Host ''" -ForegroundColor Gray`n"
        Start-Sleep -Milliseconds 100
        
        # Launch Claude
        $claudeCommand = $cmd.Claude
        $claudeCommand | wezterm cli send-text --pane-id $paneId --no-paste
        "`n" | wezterm cli send-text --pane-id $paneId --no-paste
    }
    
    Write-Host "`n✅ All agents launched successfully!" -ForegroundColor Green
    Write-Host "📊 Active agents: $agentCount" -ForegroundColor Cyan
    Write-Host "🔄 Use Alt+Arrow to navigate between panes" -ForegroundColor Yellow
    Write-Host "🔍 Use Ctrl+Shift+Z to zoom/unzoom panes" -ForegroundColor Yellow
    
    return $true
}

# Function to launch agents in current terminal (fallback)
function Launch-AgentsFallback {
    param($Agents, $ProjectPath)
    
    Write-Host "📋 Launching agents in sequence (WezTerm not available)..." -ForegroundColor Yellow
    
    foreach ($agent in $Agents) {
        $cmd = Get-LaunchCommand $agent $ProjectPath
        Write-Host "`n🚀 Launch $($agent.Name):" -ForegroundColor Cyan
        Write-Host "   $($cmd.Full)" -ForegroundColor White
        Write-Host "   (Press Enter to continue to next agent)"
        Read-Host
    }
}

# Function to create slash command integration
function Install-SlashCommand {
    param($ProjectPath)
    
    $slashDir = Join-Path $ProjectPath ".claude-code"
    $slashFile = Join-Path $slashDir "aerospace-agents.md"
    
    if (-not (Test-Path $slashDir)) {
        New-Item -ItemType Directory -Path $slashDir -Force | Out-Null
    }
    
    $slashContent = @"
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

Run from any Claude Code instance in this project.
"@
    
    $slashContent | Out-File -FilePath $slashFile -Encoding UTF8
    Write-Host "✅ Slash command installed: /aerospace-agents" -ForegroundColor Green
    Write-Host "   Location: $slashFile" -ForegroundColor Gray
}

# Main execution logic
$selectedAgents = $agentConfigs[$Mode]

if (-not $selectedAgents) {
    Write-Host "❌ Unknown mode: $Mode" -ForegroundColor Red
    Write-Host "`nAvailable modes:" -ForegroundColor Yellow
    $agentConfigs.Keys | ForEach-Object { 
        Write-Host "  - $_" -ForegroundColor Gray 
        if ($agentConfigs[$_].Count -gt 0) {
            Write-Host "    ($($agentConfigs[$_].Count) agents)" -ForegroundColor DarkGray
        }
    }
    exit 1
}

# Limit agents if requested
if ($MaxAgents -lt $selectedAgents.Count) {
    Write-Host "⚠️  Limiting to $MaxAgents agents (requested: $($selectedAgents.Count))" -ForegroundColor Yellow
    $selectedAgents = $selectedAgents[0..($MaxAgents-1)]
}

Write-Host "🎯 Mode: $Mode" -ForegroundColor Cyan
Write-Host "📊 Agents: $($selectedAgents.Count)" -ForegroundColor Cyan
Write-Host "📁 Project: $ProjectPath" -ForegroundColor Cyan

# Always show commands unless explicitly skipped
if ($ShowCommands -or -not $AutoLaunch) {
    Show-Commands $selectedAgents $ProjectPath
}

if ($AutoLaunch) {
    # Try WezTerm first, fallback to regular terminal
    if (Test-WezTerm) {
        $success = Launch-AgentsWezTerm $selectedAgents $ProjectPath
        if (-not $success) {
            Launch-AgentsFallback $selectedAgents $ProjectPath
        }
    } else {
        Write-Host "⚠️  WezTerm not detected, using fallback mode" -ForegroundColor Yellow
        Launch-AgentsFallback $selectedAgents $ProjectPath
    }
} else {
    Write-Host "`nTo auto-launch these agents:" -ForegroundColor Yellow
    Write-Host "  $($MyInvocation.MyCommand.Name) -Mode $Mode -AutoLaunch" -ForegroundColor White
    Write-Host "`nTo install slash command support:" -ForegroundColor Yellow
    Write-Host "  $($MyInvocation.MyCommand.Name) -Mode $Mode -InstallSlash" -ForegroundColor White
}

# Install slash command if in a project directory
if (Test-Path (Join-Path $ProjectPath "package.json")) {
    Install-SlashCommand $ProjectPath
}

# Display system info
Write-Host "`n================================================" -ForegroundColor DarkGray
Write-Host "💡 System Status:" -ForegroundColor Yellow
Write-Host "   WezTerm: $(if (Test-WezTerm) { '✅ Available' } else { '❌ Not found' })" -ForegroundColor Gray
Write-Host "   Max Agents: $MaxAgents" -ForegroundColor Gray
Write-Host "   System Path: $($MyInvocation.MyCommand.Path | Split-Path)" -ForegroundColor Gray
Write-Host "`n🔗 Integration: Add system path to environment PATH for global access" -ForegroundColor Cyan