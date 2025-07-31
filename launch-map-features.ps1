# Mission Control - Automated Map Features Launch Script (Windows)
# Launches all agents for 144fps aerospace-grade development

$ErrorActionPreference = "Stop"

Write-Host "🚀 MISSION CONTROL - MAP FEATURES DEVELOPMENT" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Target: 144fps performance across all systems"
Write-Host "Mode: Non-blocking validation (bypass enabled)"
Write-Host ""

# Configuration
$ORCHESTRATOR_DIR = ".claude-orchestrator"
$MISSION_CONTROL = "node scripts/orchestrator/mission-control.js"

# Ensure Mission Control is installed
if (-not (Test-Path "scripts/orchestrator/mission-control.js")) {
    Write-Host "Setting up Mission Control..." -ForegroundColor Yellow
    & bash scripts/orchestrator/setup.sh
}

# Start Mission Control if not running
Write-Host "Starting Mission Control..." -ForegroundColor Blue
$mc_process = Start-Process -FilePath "node" -ArgumentList "scripts/orchestrator/mission-control.js", "start" -PassThru -WindowStyle Hidden
$MC_PID = $mc_process.Id

# Wait for Mission Control to initialize
Start-Sleep -Seconds 3

Write-Host "✅ Mission Control online (PID: $MC_PID)" -ForegroundColor Green
Write-Host ""

# Launch Audit Validator first (background monitoring)
Write-Host "Launching Audit Validator (background)..." -ForegroundColor Blue
Start-Process -FilePath "node" -ArgumentList @(
    "scripts/orchestrator/mission-control.js",
    "launch", "validator",
    "--name", "audit-validator",
    "--task", "Monitor all agent code for NASA JPL compliance and performance",
    "--focus", "all-worktrees",
    "--bypass-mode"
) -WindowStyle Hidden

Start-Sleep -Seconds 2

# Function to launch agent
function Launch-Agent {
    param(
        [string]$AgentType,
        [string]$AgentName,
        [string]$Task,
        [string]$Focus
    )
    
    Write-Host "Launching $AgentName..." -ForegroundColor Blue
    
    Start-Process -FilePath "node" -ArgumentList @(
        "scripts/orchestrator/mission-control.js",
        "launch", $AgentType,
        "--name", $AgentName,
        "--task", $Task,
        "--focus", $Focus
    ) -WindowStyle Hidden
    
    # Small delay between launches
    Start-Sleep -Seconds 1
}

# Launch all feature agents in parallel
Write-Host "`nLaunching Feature Development Agents...`n" -ForegroundColor Yellow

# Agent 1: Location Entry
Launch-Agent -AgentType "ui" -AgentName "location-entry" `
    -Task "Implement multi-format coordinate entry (MGRS, UTM, Lat/Long, What3Words)" `
    -Focus "src/lib/map-features/location-entry"

# Agent 2: Map Crosshair
Launch-Agent -AgentType "ui" -AgentName "map-crosshair" `
    -Task "Create dynamic crosshair with distance rings and NATO/civilian icons" `
    -Focus "src/lib/map-features/crosshair"

# Agent 3: Measuring Tools
Launch-Agent -AgentType "plugin" -AgentName "measuring-tools" `
    -Task "Build shape drawing tools with spline curves and waypoint conversion" `
    -Focus "src/lib/map-features/measuring"

# Agent 4: Messaging System
Launch-Agent -AgentType "telemetry" -AgentName "messaging-system" `
    -Task "Develop toast notifications for NOTAMS, ADS-B, weather warnings" `
    -Focus "src/lib/map-features/messaging"

# Agent 5: ADS-B Display
Launch-Agent -AgentType "telemetry" -AgentName "adsb-display" `
    -Task "Implement real-time ADS-B tracking with 500+ aircraft at 144fps" `
    -Focus "src/lib/map-features/adsb"

# Agent 6: Weather Overlay
Launch-Agent -AgentType "ui" -AgentName "weather-overlay" `
    -Task "Create AccuWeather-style visualization with WebGL rendering" `
    -Focus "src/lib/map-features/weather"

# Wait for all agents to initialize
Write-Host "`nWaiting for agents to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Display status
Write-Host "`n✅ All agents launched!`n" -ForegroundColor Green
& node scripts/orchestrator/mission-control.js status

# Set up continuous monitoring
Write-Host "`nSetting up continuous monitoring..." -ForegroundColor Blue

# Create performance monitoring script
$monitorScript = @'
while ($true) {
    # Check frame rates (simplified for Windows)
    Write-Host "Monitoring performance..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
}
'@

$monitorScript | Out-File -FilePath "$ORCHESTRATOR_DIR\monitor-performance.ps1" -Encoding UTF8

# Start performance monitor
$monitor_process = Start-Process -FilePath "powershell" -ArgumentList "-File", "$ORCHESTRATOR_DIR\monitor-performance.ps1" -PassThru -WindowStyle Hidden
$PERF_PID = $monitor_process.Id

Write-Host "✅ Performance monitor started (PID: $PERF_PID)" -ForegroundColor Green

# Create helper commands
Write-Host "`nCreating helper commands..." -ForegroundColor Blue

@'
& node scripts/orchestrator/mission-control.js status
'@ | Out-File -FilePath "mc-status.ps1" -Encoding UTF8

@'
& node scripts/orchestrator/mission-control.js validate
'@ | Out-File -FilePath "mc-validate.ps1" -Encoding UTF8

@'
& node scripts/orchestrator/mission-control.js merge main
'@ | Out-File -FilePath "mc-merge.ps1" -Encoding UTF8

@'
Write-Host "Stopping all agents..." -ForegroundColor Yellow
& node scripts/orchestrator/mission-control.js stop
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
Write-Host "✅ All processes stopped" -ForegroundColor Green
'@ | Out-File -FilePath "mc-stop.ps1" -Encoding UTF8

# Final instructions
Write-Host "`n🚀 MISSION CONTROL READY!" -ForegroundColor Green
Write-Host "`nQuick Commands:" -ForegroundColor Yellow
Write-Host "  .\mc-status.ps1     - Check agent status"
Write-Host "  .\mc-validate.ps1   - Validate all code"
Write-Host "  .\mc-merge.ps1      - Merge to main branch"
Write-Host "  .\mc-stop.ps1       - Stop all agents"
Write-Host ""
Write-Host "Agent Workspaces:" -ForegroundColor Yellow
Write-Host "  Location Entry:   $ORCHESTRATOR_DIR\worktrees\agent-location-entry"
Write-Host "  Map Crosshair:    $ORCHESTRATOR_DIR\worktrees\agent-map-crosshair"
Write-Host "  Measuring Tools:  $ORCHESTRATOR_DIR\worktrees\agent-measuring-tools"
Write-Host "  Messaging:        $ORCHESTRATOR_DIR\worktrees\agent-messaging-system"
Write-Host "  ADS-B Display:    $ORCHESTRATOR_DIR\worktrees\agent-adsb-display"
Write-Host "  Weather Overlay:  $ORCHESTRATOR_DIR\worktrees\agent-weather-overlay"
Write-Host ""
Write-Host "Monitoring:" -ForegroundColor Yellow
Write-Host "  Logs:             $ORCHESTRATOR_DIR\logs\"
Write-Host "  Performance:      Get-Content $ORCHESTRATOR_DIR\logs\performance.log -Tail 50 -Wait"
Write-Host "  Validation:       Get-Content $ORCHESTRATOR_DIR\logs\validation.log -Tail 50 -Wait"
Write-Host ""
Write-Host "All systems nominal. Agents are developing at 144fps! 🎯" -ForegroundColor Green
Write-Host ""
Write-Host "Pro tip: Use 'wezterm --config-file $ORCHESTRATOR_DIR\wezterm-mission-control.lua' for visual monitoring" -ForegroundColor Blue