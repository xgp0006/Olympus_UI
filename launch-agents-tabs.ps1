# Launch each agent in a separate WezTerm tab

Write-Host "🚀 Launching Map Feature Agents in separate tabs..." -ForegroundColor Cyan

$agents = @(
    @{Name="Location Entry"; Icon="📍"; Path=".claude-orchestrator/worktrees/location-entry"},
    @{Name="Map Crosshair"; Icon="🎯"; Path=".claude-orchestrator/worktrees/map-crosshair"},
    @{Name="Measuring Tools"; Icon="📐"; Path=".claude-orchestrator/worktrees/measuring-tools"},
    @{Name="Messaging System"; Icon="💬"; Path=".claude-orchestrator/worktrees/messaging-system"},
    @{Name="ADS-B Display"; Icon="✈️"; Path=".claude-orchestrator/worktrees/adsb-display"},
    @{Name="Weather Overlay"; Icon="🌦️"; Path=".claude-orchestrator/worktrees/weather-overlay"}
)

Write-Host "`nCreating tabs for each agent..." -ForegroundColor Yellow

foreach ($agent in $agents) {
    Write-Host "  Launching $($agent.Name)..." -ForegroundColor Gray
    
    # Create command to run in new tab
    $cmd = "cd '$($agent.Path)'; clear; echo '$($agent.Icon) $($agent.Name) Agent'; echo ''; echo 'Run: claude'; echo 'Brief: AGENT_INSTRUCTIONS.md'"
    
    # Spawn new tab with PowerShell running the command
    wezterm cli spawn -- pwsh -NoExit -Command $cmd
    
    # Small delay between tabs
    Start-Sleep -Milliseconds 500
}

Write-Host "`n✅ All agents launched in separate tabs!" -ForegroundColor Green
Write-Host "Switch between tabs with Ctrl+Tab or Ctrl+Shift+Tab" -ForegroundColor Cyan
Write-Host "In each tab, run 'claude' to start the agent" -ForegroundColor Yellow