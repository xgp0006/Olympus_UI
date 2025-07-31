# Fix worktrees and launch agents properly

Write-Host "🚀 Fixing and launching agent worktrees..." -ForegroundColor Cyan

# First, let's ensure all worktrees are on their correct branches
$worktrees = @(
    @{Name="location-entry"; Branch="claude/location-entry"},
    @{Name="map-crosshair"; Branch="claude/crosshair"},
    @{Name="measuring-tools"; Branch="claude/measuring"},
    @{Name="messaging-system"; Branch="claude/messaging"},
    @{Name="adsb-display"; Branch="claude/adsb"},
    @{Name="weather-overlay"; Branch="claude/weather"}
)

Write-Host "`nVerifying worktree branches..." -ForegroundColor Yellow
foreach ($wt in $worktrees) {
    $path = ".claude-orchestrator/worktrees/$($wt.Name)"
    Write-Host "  Checking $($wt.Name)..." -ForegroundColor Gray
    
    # Check current branch
    $currentBranch = git -C $path branch --show-current
    if ($currentBranch -ne $wt.Branch) {
        Write-Host "    Switching from $currentBranch to $($wt.Branch)" -ForegroundColor Yellow
        git -C $path checkout $wt.Branch
    } else {
        Write-Host "    ✓ Already on $($wt.Branch)" -ForegroundColor Green
    }
}

Write-Host "`nCreating launch script for each pane..." -ForegroundColor Yellow

# Create individual launch scripts for each agent
$agents = @(
    @{
        Name="LOCATION ENTRY"
        Icon="📍"
        Path=".claude-orchestrator\worktrees\location-entry"
        Desc="MGRS, UTM, Lat/Long, What3Words"
    },
    @{
        Name="MAP CROSSHAIR"
        Icon="🎯"
        Path=".claude-orchestrator\worktrees\map-crosshair"
        Desc="Distance rings & NATO icons"
    },
    @{
        Name="MEASURING TOOLS"
        Icon="📐"
        Path=".claude-orchestrator\worktrees\measuring-tools"
        Desc="Shapes & spline paths"
    },
    @{
        Name="MESSAGING SYSTEM"
        Icon="💬"
        Path=".claude-orchestrator\worktrees\messaging-system"
        Desc="Aviation alerts & toasts"
    },
    @{
        Name="ADS-B DISPLAY"
        Icon="✈️"
        Path=".claude-orchestrator\worktrees\adsb-display"
        Desc="500+ aircraft tracking"
    },
    @{
        Name="WEATHER OVERLAY"
        Icon="🌦️"
        Path=".claude-orchestrator\worktrees\weather-overlay"
        Desc="WebGL weather viz"
    }
)

# Create a master launch script
$launchScript = @'
# WezTerm Grid Launch Script
Write-Host "Creating agent grid..." -ForegroundColor Cyan

# Get project root
$root = Get-Location

# Create new tab
$p1 = wezterm cli spawn --cwd "$root" -- pwsh -NoExit -Command "Write-Host 'Agent grid created. Exit Claude in each pane first, then navigate to agent directories.' -ForegroundColor Yellow"

# Create grid
$p2 = wezterm cli split-pane --pane-id $p1 --right --percent 33
$p3 = wezterm cli split-pane --pane-id $p2 --right --percent 50
$p4 = wezterm cli split-pane --pane-id $p1 --bottom --percent 50
$p5 = wezterm cli split-pane --pane-id $p2 --bottom --percent 50
$p6 = wezterm cli split-pane --pane-id $p3 --bottom --percent 50

Write-Host "Grid created with panes: $p1, $p2, $p3, $p4, $p5, $p6" -ForegroundColor Green
'@

$launchScript | Out-File -FilePath "launch-grid.ps1" -Encoding UTF8

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`nTo launch agents:" -ForegroundColor Cyan
Write-Host "1. Run: .\launch-grid.ps1" -ForegroundColor Yellow
Write-Host "2. In each pane:" -ForegroundColor Yellow
Write-Host "   - Exit any running Claude (type 'exit')" -ForegroundColor Gray
Write-Host "   - Navigate to agent directory:" -ForegroundColor Gray

$i = 1
foreach ($agent in $agents) {
    Write-Host "`n   Pane $i - $($agent.Icon) $($agent.Name):" -ForegroundColor Cyan
    Write-Host "   cd $($agent.Path)" -ForegroundColor White
    Write-Host "   claude" -ForegroundColor White
    $i++
}

Write-Host "`nAlternatively, use the simple tab approach:" -ForegroundColor Yellow
Write-Host ".\launch-agents-tabs.ps1" -ForegroundColor White