# Quick Launch Script for Map Feature Agents
# Direct Claude invocation without Mission Control infrastructure

Write-Host "`n🚀 LAUNCHING MAP FEATURE AGENTS FOR 144FPS DEVELOPMENT" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# Create necessary directories
Write-Host "Creating workspace directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path ".claude-orchestrator/worktrees" | Out-Null
New-Item -ItemType Directory -Force -Path ".claude-orchestrator/logs" | Out-Null

# Function to create a worktree and launch Claude
function Launch-ClaudeAgent {
    param(
        [string]$Name,
        [string]$Branch,
        [string]$Brief
    )
    
    Write-Host "`nSetting up $Name agent..." -ForegroundColor Blue
    
    $worktreePath = ".claude-orchestrator/worktrees/$Name"
    
    # Create worktree
    Write-Host "  Creating worktree..." -ForegroundColor Gray
    git worktree add -b "claude/$Branch" "$worktreePath" HEAD 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Worktree created" -ForegroundColor Green
        
        # Copy agent brief
        $briefPath = "$worktreePath/AGENT_INSTRUCTIONS.md"
        Copy-Item ".claude-orchestrator/agent-workspaces/$Name/AGENT_BRIEF.md" -Destination $briefPath -Force
        
        # Create a launch file with instructions
        $launchInstructions = @"
# Launch Instructions for $Name Agent

1. Open a new terminal/PowerShell window
2. Navigate to: $PWD\$worktreePath
3. Run: claude
4. When Claude starts, tell it to read AGENT_INSTRUCTIONS.md

Agent Focus: $Brief

Performance Target: 144fps
"@
        $launchInstructions | Out-File -FilePath "$worktreePath/LAUNCH_ME.txt" -Encoding UTF8
        
        Write-Host "  ✓ Agent workspace ready at: $worktreePath" -ForegroundColor Green
        Write-Host "  → Open new terminal and run 'claude' in that directory" -ForegroundColor Yellow
    } else {
        Write-Host "  ! Worktree may already exist, continuing..." -ForegroundColor Yellow
    }
}

# Launch all agents
$agents = @(
    @{Name="location-entry"; Branch="location-entry"; Brief="Multi-format coordinate entry (MGRS/UTM/LatLong/W3W)"},
    @{Name="map-crosshair"; Branch="crosshair"; Brief="Dynamic crosshair with distance rings and icons"},
    @{Name="measuring-tools"; Branch="measuring"; Brief="Shape drawing and spline-based flight paths"},
    @{Name="messaging-system"; Branch="messaging"; Brief="Toast notifications for aviation alerts"},
    @{Name="adsb-display"; Branch="adsb"; Brief="Real-time aircraft tracking (500+ targets)"},
    @{Name="weather-overlay"; Branch="weather"; Brief="Meteorological visualization with WebGL"}
)

foreach ($agent in $agents) {
    Launch-ClaudeAgent -Name $agent.Name -Branch $agent.Branch -Brief $agent.Brief
}

# Create summary file
Write-Host "`nCreating launch summary..." -ForegroundColor Blue

$summary = @"
MAP FEATURE AGENTS - LAUNCH SUMMARY
===================================

All agent worktrees have been created. To start development:

1. LOCATION ENTRY AGENT
   Terminal 1: cd .claude-orchestrator/worktrees/location-entry && claude
   
2. MAP CROSSHAIR AGENT  
   Terminal 2: cd .claude-orchestrator/worktrees/map-crosshair && claude
   
3. MEASURING TOOLS AGENT
   Terminal 3: cd .claude-orchestrator/worktrees/measuring-tools && claude
   
4. MESSAGING SYSTEM AGENT
   Terminal 4: cd .claude-orchestrator/worktrees/messaging-system && claude
   
5. ADS-B DISPLAY AGENT
   Terminal 5: cd .claude-orchestrator/worktrees/adsb-display && claude
   
6. WEATHER OVERLAY AGENT
   Terminal 6: cd .claude-orchestrator/worktrees/weather-overlay && claude

Each agent should read their AGENT_INSTRUCTIONS.md file to understand their mission.

Shared code is in: src/lib/map-features/

Performance target: 144fps (6.94ms frame budget)

Good luck! 🚀
"@

$summary | Out-File -FilePath "AGENT_LAUNCH_SUMMARY.txt" -Encoding UTF8
Write-Host $summary -ForegroundColor Green

Write-Host "`n✅ Setup complete! Open 6 terminals and launch Claude in each worktree." -ForegroundColor Cyan
Write-Host "Each agent has their instructions in AGENT_INSTRUCTIONS.md" -ForegroundColor Cyan