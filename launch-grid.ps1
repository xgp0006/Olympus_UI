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
