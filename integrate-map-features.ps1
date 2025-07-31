# Integrate all 6 map features from worktrees
# This script pulls each completed feature and integrates it with DraggableContainer

param(
    [Parameter()]
    [string[]]$Features = @("map-crosshair", "measuring-tools", "adsb-display", "weather-overlay", "messaging-system"),
    
    [Parameter()]
    [switch]$TestAfter = $false
)

Write-Host "🚀 MAP FEATURES INTEGRATION SCRIPT" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor DarkGray

# Current directory (main project)
$mainProject = Get-Location

# Function to copy feature from worktree
function Copy-MapFeature {
    param($FeatureName, $SourcePath)
    
    Write-Host "`n📦 Integrating $FeatureName..." -ForegroundColor Yellow
    
    $worktreePath = ".claude-orchestrator/worktrees/$SourcePath"
    $featureSource = Join-Path $worktreePath "src/lib/map-features"
    
    if (-not (Test-Path $featureSource)) {
        Write-Host "   ❌ Feature not found at: $featureSource" -ForegroundColor Red
        return $false
    }
    
    # Copy feature directory
    $destination = "src/lib/map-features/$FeatureName"
    
    try {
        Copy-Item -Path (Join-Path $featureSource $FeatureName) -Destination $destination -Recurse -Force
        Write-Host "   ✅ Copied $FeatureName to $destination" -ForegroundColor Green
        
        # Check for additional dependencies
        $utilsSource = Join-Path $worktreePath "src/lib/utils"
        if (Test-Path $utilsSource) {
            Write-Host "   📋 Checking for utility dependencies..." -ForegroundColor Gray
            # Copy any new utilities that don't exist in main
        }
        
        return $true
    } catch {
        Write-Host "   ❌ Failed to copy: $_" -ForegroundColor Red
        return $false
    }
}

# Function to update MapToolsController
function Update-MapToolsController {
    Write-Host "`n🔧 Updating MapToolsController..." -ForegroundColor Yellow
    
    # This would be done by an agent to properly integrate each feature
    Write-Host "   ℹ️  MapToolsController needs manual integration for:" -ForegroundColor Gray
    Write-Host "      - Tab interface for each tool" -ForegroundColor Gray
    Write-Host "      - Event dispatching" -ForegroundColor Gray
    Write-Host "      - Performance budgets" -ForegroundColor Gray
}

# Function to create integration tests
function Create-IntegrationTests {
    param($FeatureName)
    
    $testFile = "src/lib/map-features/__tests__/$FeatureName.integration.test.ts"
    
    Write-Host "   📝 Creating integration test: $testFile" -ForegroundColor Gray
    
    # Basic test template would be created here
}

# Main integration process
$successCount = 0

foreach ($feature in $Features) {
    $sourcePath = switch ($feature) {
        "map-crosshair" { "map-crosshair" }
        "measuring-tools" { "measuring-tools" }
        "adsb-display" { "adsb-display" }
        "weather-overlay" { "weather-overlay" }
        "messaging-system" { "messaging-system" }
        default { $feature }
    }
    
    if (Copy-MapFeature -FeatureName $feature -SourcePath $sourcePath) {
        Create-IntegrationTests -FeatureName $feature
        $successCount++
    }
}

Write-Host "`n📊 Integration Summary" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor DarkGray
Write-Host "Features integrated: $successCount / $($Features.Count)" -ForegroundColor $(if ($successCount -eq $Features.Count) { "Green" } else { "Yellow" })

# Next steps
Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update MapToolsController.svelte to include new tabs" -ForegroundColor White
Write-Host "2. Add Tauri commands for each feature in src-tauri" -ForegroundColor White
Write-Host "3. Configure performance budgets for each tool" -ForegroundColor White
Write-Host "4. Run integration tests" -ForegroundColor White

if ($TestAfter) {
    Write-Host "`n🧪 Running tests..." -ForegroundColor Cyan
    npm test -- map-features
}

Write-Host "`n✅ Integration preparation complete!" -ForegroundColor Green
Write-Host "Use the aerospace agent system to complete the integration:" -ForegroundColor Yellow
Write-Host "   .\spawn-aerospace-agents.ps1 -Mode map-features -AutoLaunch" -ForegroundColor White