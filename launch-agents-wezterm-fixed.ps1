# Launch agents in current WezTerm session as new tab

Write-Host "🚀 Creating agent grid in current WezTerm session..." -ForegroundColor Cyan

# Create new tab (spawn without specifying new-window)
try {
    $output = & wezterm cli spawn 2>&1 | Out-String
    $newPaneId = $output.Trim()
    
    if ($newPaneId -match '^\d+$') {
        Write-Host "Created new tab with pane ID: $newPaneId" -ForegroundColor Green
    } else {
        # If output is not a number, try to extract it
        if ($output -match '(\d+)') {
            $newPaneId = $matches[1]
            Write-Host "Created new tab with pane ID: $newPaneId" -ForegroundColor Green
        } else {
            throw "Could not get pane ID from output: $output"
        }
    }
} catch {
    Write-Host "Error creating new tab: $_" -ForegroundColor Red
    Write-Host "Make sure WezTerm is running and the mux server is enabled." -ForegroundColor Yellow
    exit 1
}

# Helper function to split and get new pane ID
function Split-AndGetPane {
    param(
        [string]$PaneId,
        [string]$Direction,
        [int]$Percent = 50
    )
    
    $cmd = "wezterm cli split-pane --pane-id $PaneId --$Direction"
    if ($Percent -ne 50) {
        $cmd += " --percent $Percent"
    }
    
    try {
        $output = & cmd /c $cmd 2>&1 | Out-String
        $result = $output.Trim()
        
        if ($result -match '^\d+$') {
            return $result
        } elseif ($output -match '(\d+)') {
            return $matches[1]
        } else {
            Write-Warning "Unexpected output from split-pane: $output"
            return $null
        }
    } catch {
        Write-Warning "Error splitting pane: $_"
        return $null
    }
}

# Create the grid layout
Write-Host "Creating grid layout..." -ForegroundColor Yellow

# First row - split right twice
$pane2 = Split-AndGetPane -PaneId $newPaneId -Direction "right" -Percent 33
if (-not $pane2) { Write-Warning "Failed to create pane 2"; exit 1 }

$pane3 = Split-AndGetPane -PaneId $pane2 -Direction "right" -Percent 50
if (-not $pane3) { Write-Warning "Failed to create pane 3"; exit 1 }

# Second row - split each pane down
$pane4 = Split-AndGetPane -PaneId $newPaneId -Direction "bottom" -Percent 50
if (-not $pane4) { Write-Warning "Failed to create pane 4"; exit 1 }

$pane5 = Split-AndGetPane -PaneId $pane2 -Direction "bottom" -Percent 50
if (-not $pane5) { Write-Warning "Failed to create pane 5"; exit 1 }

$pane6 = Split-AndGetPane -PaneId $pane3 -Direction "bottom" -Percent 50
if (-not $pane6) { Write-Warning "Failed to create pane 6"; exit 1 }

Write-Host "Grid created! Launching agents..." -ForegroundColor Yellow

# Helper function to send commands to panes
function Send-ToPane {
    param(
        [string]$PaneId,
        [string]$AgentName,
        [string]$AgentIcon,
        [string]$Description,
        [string]$WorktreePath
    )
    
    # Send commands one by one for better compatibility
    $cmds = @(
        "cd $WorktreePath",
        "clear",
        "echo '$AgentIcon $AgentName'",
        "echo '$Description'",
        "echo ''",
        "echo 'Starting Claude...'",
        "claude"
    )
    
    foreach ($cmd in $cmds) {
        & wezterm cli send-text --pane-id $PaneId --no-paste "$cmd`n" 2>$null
        Start-Sleep -Milliseconds 50
    }
}

# Launch Claude in each pane
Write-Host "Launching agents..." -ForegroundColor Blue

Send-ToPane -PaneId $newPaneId -AgentName "LOCATION ENTRY" -AgentIcon "📍" `
    -Description "Multi-format coordinate input (MGRS/UTM/LatLong/W3W)" `
    -WorktreePath ".claude-orchestrator/worktrees/location-entry"

Send-ToPane -PaneId $pane2 -AgentName "MAP CROSSHAIR" -AgentIcon "🎯" `
    -Description "Distance rings & NATO/civilian icons" `
    -WorktreePath ".claude-orchestrator/worktrees/map-crosshair"

Send-ToPane -PaneId $pane3 -AgentName "MONITORING" -AgentIcon "📊" `
    -Description "Performance: 144fps (6.94ms budget)" `
    -WorktreePath "."

Send-ToPane -PaneId $pane4 -AgentName "MEASURING TOOLS" -AgentIcon "📐" `
    -Description "Shapes & spline-based flight paths" `
    -WorktreePath ".claude-orchestrator/worktrees/measuring-tools"

Send-ToPane -PaneId $pane5 -AgentName "MESSAGING SYSTEM" -AgentIcon "💬" `
    -Description "Toast notifications for aviation alerts" `
    -WorktreePath ".claude-orchestrator/worktrees/messaging-system"

Send-ToPane -PaneId $pane6 -AgentName "ADS-B DISPLAY" -AgentIcon "✈️" `
    -Description "Real-time tracking (500+ aircraft)" `
    -WorktreePath ".claude-orchestrator/worktrees/adsb-display"

# Create weather overlay in expanded bottom section
Write-Host "Adding weather overlay pane..." -ForegroundColor Yellow
$pane7 = Split-AndGetPane -PaneId $pane4 -Direction "bottom" -Percent 50

if ($pane7) {
    Send-ToPane -PaneId $pane7 -AgentName "WEATHER OVERLAY" -AgentIcon "🌦️" `
        -Description "AccuWeather-style WebGL visualization" `
        -WorktreePath ".claude-orchestrator/worktrees/weather-overlay"
}

Write-Host "`n✅ Agent grid created successfully!" -ForegroundColor Green
Write-Host "All 6 agents are launching in their respective panes." -ForegroundColor Cyan
Write-Host "Each agent will read their AGENT_INSTRUCTIONS.md file." -ForegroundColor Cyan
Write-Host "`nTip: You can switch between panes with Alt+Arrow keys" -ForegroundColor Yellow
Write-Host "     Use Ctrl+Shift+Z to zoom/unzoom a pane" -ForegroundColor Yellow