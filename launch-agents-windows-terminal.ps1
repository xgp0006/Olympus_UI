# Launch all agents in Windows Terminal tabs

$agents = @(
    @{Name="Location Entry"; Dir=".claude-orchestrator/worktrees/location-entry"; Color="#FF6B6B"},
    @{Name="Map Crosshair"; Dir=".claude-orchestrator/worktrees/map-crosshair"; Color="#4ECDC4"},
    @{Name="Measuring Tools"; Dir=".claude-orchestrator/worktrees/measuring-tools"; Color="#45B7D1"},
    @{Name="Messaging System"; Dir=".claude-orchestrator/worktrees/messaging-system"; Color="#F7DC6F"},
    @{Name="ADS-B Display"; Dir=".claude-orchestrator/worktrees/adsb-display"; Color="#BB8FCE"},
    @{Name="Weather Overlay"; Dir=".claude-orchestrator/worktrees/weather-overlay"; Color="#85C1E2"}
)

# Build Windows Terminal command
$wtCommand = "wt"

foreach ($agent in $agents) {
    $fullPath = Join-Path $PWD $agent.Dir
    $wtCommand += " new-tab --title `"$($agent.Name)`" --tabColor `"$($agent.Color)`" -d `"$fullPath`" pwsh -NoExit -Command `"Write-Host 'Agent: $($agent.Name)' -ForegroundColor Cyan; Write-Host 'Run: claude' -ForegroundColor Yellow`";"
}

Write-Host "Launching all agents in Windows Terminal..." -ForegroundColor Cyan
Invoke-Expression $wtCommand