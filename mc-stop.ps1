Write-Host "Stopping all agents..." -ForegroundColor Yellow
& node scripts/orchestrator/mission-control.js stop
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
Write-Host "✅ All processes stopped" -ForegroundColor Green
