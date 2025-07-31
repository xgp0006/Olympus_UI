# Launch agents in current WezTerm session as new tab

Write-Host "🚀 Creating agent grid in current WezTerm session..." -ForegroundColor Cyan

# Create new tab
wezterm cli spawn --new-window=false

# Get the new pane ID
$paneId = (wezterm cli list-panes --format json | ConvertFrom-Json)[-1].pane_id

# Create the grid layout
# First row
wezterm cli split-pane --pane-id $paneId --right --percent 33
$pane2 = (wezterm cli list-panes --format json | ConvertFrom-Json)[-1].pane_id

wezterm cli split-pane --pane-id $pane2 --right --percent 50
$pane3 = (wezterm cli list-panes --format json | ConvertFrom-Json)[-1].pane_id

# Second row
wezterm cli split-pane --pane-id $paneId --bottom --percent 50
$pane4 = (wezterm cli list-panes --format json | ConvertFrom-Json)[-1].pane_id

wezterm cli split-pane --pane-id $pane2 --bottom --percent 50
$pane5 = (wezterm cli list-panes --format json | ConvertFrom-Json)[-1].pane_id

wezterm cli split-pane --pane-id $pane3 --bottom --percent 50
$pane6 = (wezterm cli list-panes --format json | ConvertFrom-Json)[-1].pane_id

# Launch Claude in each pane
Write-Host "Launching agents..." -ForegroundColor Yellow

# Location Entry
wezterm cli send-text --pane-id $paneId --no-paste "cd .claude-orchestrator/worktrees/location-entry && clear && echo '📍 LOCATION ENTRY AGENT' && echo 'Multi-format coordinate input' && echo '' && claude`n"

# Map Crosshair
wezterm cli send-text --pane-id $pane2 --no-paste "cd .claude-orchestrator/worktrees/map-crosshair && clear && echo '🎯 MAP CROSSHAIR AGENT' && echo 'Distance rings & NATO icons' && echo '' && claude`n"

# Extra pane (can be used for monitoring)
wezterm cli send-text --pane-id $pane3 --no-paste "clear && echo '📊 MONITORING' && echo 'Frame Budget: 6.94ms @ 144fps' && echo ''`n"

# Measuring Tools
wezterm cli send-text --pane-id $pane4 --no-paste "cd .claude-orchestrator/worktrees/measuring-tools && clear && echo '📐 MEASURING TOOLS AGENT' && echo 'Shapes & spline paths' && echo '' && claude`n"

# Messaging System
wezterm cli send-text --pane-id $pane5 --no-paste "cd .claude-orchestrator/worktrees/messaging-system && clear && echo '💬 MESSAGING SYSTEM AGENT' && echo 'Toast notifications' && echo '' && claude`n"

# ADS-B Display
wezterm cli send-text --pane-id $pane6 --no-paste "cd .claude-orchestrator/worktrees/adsb-display && clear && echo '✈️ ADS-B DISPLAY AGENT' && echo '500+ aircraft tracking' && echo '' && claude`n"

# Create weather overlay in bottom row
wezterm cli split-pane --pane-id $pane4 --bottom --percent 50
$pane7 = (wezterm cli list-panes --format json | ConvertFrom-Json)[-1].pane_id

wezterm cli send-text --pane-id $pane7 --no-paste "cd .claude-orchestrator/worktrees/weather-overlay && clear && echo '🌦️ WEATHER OVERLAY AGENT' && echo 'WebGL meteorological viz' && echo '' && claude`n"

Write-Host "✅ Agent grid created! All 6 agents are launching..." -ForegroundColor Green
Write-Host "Each agent will read their AGENT_INSTRUCTIONS.md for their mission brief." -ForegroundColor Cyan