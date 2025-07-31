# Launch agents in current WezTerm session with proper grid layout

Write-Host "🚀 Creating agent grid in current WezTerm session..." -ForegroundColor Cyan

# Get current directory
$projectRoot = Get-Location

# Define agents with their initial prompts
$agents = @(
    @{
        Name="LOCATION ENTRY"
        Icon="[LOCATION]"
        Path=".claude-orchestrator\worktrees\location-entry"
        Desc="MGRS, UTM, Lat/Long, What3Words"
        InitPrompt="Read AGENT_INSTRUCTIONS.md and begin implementing the multi-format coordinate entry system. Focus on 0.5ms frame budget performance. Stay in interactive mode for continuous development."
    },
    @{
        Name="MAP CROSSHAIR"
        Icon="[CROSSHAIR]"
        Path=".claude-orchestrator\worktrees\map-crosshair"
        Desc="Distance rings & NATO icons"
        InitPrompt="Read AGENT_INSTRUCTIONS.md and start implementing the dynamic crosshair system with distance rings. Target 1.5ms frame budget. Stay in interactive mode for continuous development."
    },
    @{
        Name="MEASURING TOOLS"
        Icon="[MEASURE]"
        Path=".claude-orchestrator\worktrees\measuring-tools"
        Desc="Shapes & spline paths"
        InitPrompt="Read AGENT_INSTRUCTIONS.md and develop the measuring tools with shape drawing and spline curves. Maintain 1.0ms frame budget. Stay in interactive mode for continuous development."
    },
    @{
        Name="MESSAGING SYSTEM"
        Icon="[MESSAGE]"
        Path=".claude-orchestrator\worktrees\messaging-system"
        Desc="Aviation alerts"
        InitPrompt="Read AGENT_INSTRUCTIONS.md and create the toast notification system for NOTAMS and alerts. Keep within 0.3ms frame budget. Stay in interactive mode for continuous development."
    },
    @{
        Name="ADS-B DISPLAY"
        Icon="[ADSB]"
        Path=".claude-orchestrator\worktrees\adsb-display"
        Desc="500+ aircraft tracking"
        InitPrompt="Read AGENT_INSTRUCTIONS.md and implement the ADS-B display system for 500+ aircraft at 144fps. Use your 2.0ms frame budget wisely. Stay in interactive mode for continuous development."
    },
    @{
        Name="WEATHER OVERLAY"
        Icon="[WEATHER]"
        Path=".claude-orchestrator\worktrees\weather-overlay"
        Desc="WebGL weather viz"
        InitPrompt="Read AGENT_INSTRUCTIONS.md and build the AccuWeather-style weather overlay with WebGL. Target 1.5ms frame budget. Stay in interactive mode for continuous development."
    }
)

# First, ensure all worktrees have necessary setup
Write-Host "Setting up worktrees..." -ForegroundColor Yellow
foreach ($agent in $agents) {
    $worktreePath = Join-Path $projectRoot $agent.Path
    
    # Create symlink to node_modules from main project if it doesn't exist
    $nodeModulesPath = Join-Path $worktreePath "node_modules"
    $mainNodeModules = Join-Path $projectRoot "node_modules"
    
    if (-not (Test-Path $nodeModulesPath) -and (Test-Path $mainNodeModules)) {
        Write-Host "  Linking node_modules for $($agent.Name)..." -ForegroundColor Gray
        New-Item -ItemType SymbolicLink -Path $nodeModulesPath -Target $mainNodeModules -Force 2>$null
    }
}

# Create new tab - spawn in first agent's directory
Write-Host "Creating new tab..." -ForegroundColor Yellow
$firstAgentPath = Join-Path $projectRoot $agents[0].Path
$newPaneId = wezterm cli spawn --cwd "$firstAgentPath" -- pwsh -NoExit
Write-Host "Created tab with pane ID: $newPaneId" -ForegroundColor Green

Start-Sleep -Milliseconds 500

# Helper function to split and get new pane ID with proper directory
function Split-AndGetPane {
    param(
        [string]$PaneId,
        [string]$Direction,
        [int]$Percent = 50,
        [string]$WorkDir
    )
    
    $splitCmd = @(
        "split-pane",
        "--pane-id", $PaneId,
        "--$Direction",
        "--percent", $Percent,
        "--cwd", $WorkDir
    )
    
    $result = wezterm cli @splitCmd
    return $result
}

# Create the grid layout - each split goes to the correct agent directory
Write-Host "Creating grid layout..." -ForegroundColor Yellow

# First row - split right twice
$pane2Path = Join-Path $projectRoot $agents[1].Path
$pane2 = Split-AndGetPane -PaneId $newPaneId -Direction "right" -Percent 33 -WorkDir $pane2Path
Write-Host "  Created pane 2: $pane2" -ForegroundColor Gray

$pane3Path = Join-Path $projectRoot $agents[2].Path
$pane3 = Split-AndGetPane -PaneId $pane2 -Direction "right" -Percent 50 -WorkDir $pane3Path
Write-Host "  Created pane 3: $pane3" -ForegroundColor Gray

# Second row - split each pane down
$pane4Path = Join-Path $projectRoot $agents[3].Path
$pane4 = Split-AndGetPane -PaneId $newPaneId -Direction "bottom" -Percent 50 -WorkDir $pane4Path
Write-Host "  Created pane 4: $pane4" -ForegroundColor Gray

$pane5Path = Join-Path $projectRoot $agents[4].Path
$pane5 = Split-AndGetPane -PaneId $pane2 -Direction "bottom" -Percent 50 -WorkDir $pane5Path
Write-Host "  Created pane 5: $pane5" -ForegroundColor Gray

$pane6Path = Join-Path $projectRoot $agents[5].Path
$pane6 = Split-AndGetPane -PaneId $pane3 -Direction "bottom" -Percent 50 -WorkDir $pane6Path
Write-Host "  Created pane 6: $pane6" -ForegroundColor Gray

Write-Host "Grid layout complete!" -ForegroundColor Green

# Helper function to launch agent
function Launch-AgentInPane {
    param(
        [string]$PaneId,
        [hashtable]$Agent
    )
    
    Write-Host "  Launching $($Agent.Name) in pane $PaneId..." -ForegroundColor Gray
    
    # First, clear and show agent info
    wezterm cli send-text --pane-id $PaneId --no-paste "clear`n"
    Start-Sleep -Milliseconds 100
    
    # Display agent header
    wezterm cli send-text --pane-id $PaneId --no-paste "Write-Host '========================================' -ForegroundColor DarkGray`n"
    wezterm cli send-text --pane-id $PaneId --no-paste "Write-Host '$($Agent.Icon) $($Agent.Name) AGENT' -ForegroundColor Cyan`n"
    wezterm cli send-text --pane-id $PaneId --no-paste "Write-Host '$($Agent.Desc)' -ForegroundColor Gray`n"
    wezterm cli send-text --pane-id $PaneId --no-paste "Write-Host '========================================' -ForegroundColor DarkGray`n"
    wezterm cli send-text --pane-id $PaneId --no-paste "Write-Host ''`n"
    Start-Sleep -Milliseconds 200
    
    # Launch Claude with bypass permissions and the prompt as part of the command
    $prompt = $Agent.InitPrompt -replace '"', '\"'
    $claudeCommand = "claude --dangerously-skip-approval `"$prompt`""
    $claudeCommand | wezterm cli send-text --pane-id $PaneId --no-paste
    "`n" | wezterm cli send-text --pane-id $PaneId --no-paste
}

# Launch Claude in each pane
Write-Host "`nLaunching agents..." -ForegroundColor Blue

# Map panes to agents
$paneMapping = @(
    @{Pane=$newPaneId; Agent=$agents[0]},
    @{Pane=$pane2; Agent=$agents[1]},
    @{Pane=$pane3; Agent=$agents[2]},
    @{Pane=$pane4; Agent=$agents[3]},
    @{Pane=$pane5; Agent=$agents[4]},
    @{Pane=$pane6; Agent=$agents[5]}
)

foreach ($mapping in $paneMapping) {
    Launch-AgentInPane -PaneId $mapping.Pane -Agent $mapping.Agent
}

Write-Host "`n✅ All agents launched successfully!" -ForegroundColor Green
Write-Host "`nGrid Layout:" -ForegroundColor Cyan
Write-Host "┌─────────────┬─────────────┬─────────────┐" -ForegroundColor DarkGray
Write-Host "│  [LOCATION] │  [CROSS]    │ [MEASURE]   │" -ForegroundColor DarkGray
Write-Host "│    Entry    │    hair     │    Tools    │" -ForegroundColor DarkGray
Write-Host "├─────────────┼─────────────┼─────────────┤" -ForegroundColor DarkGray
Write-Host "│ [MESSAGE]   │  [ADSB]     │ [WEATHER]   │" -ForegroundColor DarkGray
Write-Host "│   System    │   Display   │   Overlay   │" -ForegroundColor DarkGray
Write-Host "└─────────────┴─────────────┴─────────────┘" -ForegroundColor DarkGray
Write-Host "`nAgent Status:" -ForegroundColor Yellow
Write-Host "  • Each agent is reading their AGENT_INSTRUCTIONS.md"
Write-Host "  • Interactive mode - agents stay active for continuous development"
Write-Host "  • NASA JPL compliance is enforced"
Write-Host "  • 144fps performance target active"
Write-Host "`nNavigation:" -ForegroundColor Cyan
Write-Host "  • Alt + Arrow Keys: Move between panes"
Write-Host "  • Ctrl + Shift + Z: Zoom/unzoom current pane"
Write-Host "  • Ctrl + Tab: Switch tabs"