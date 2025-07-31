# Package Aerospace Agent System for Distribution
# Creates a portable, standalone version of the system

param(
    [Parameter()]
    [string]$OutputPath = ".\aerospace-agent-system-portable",
    
    [Parameter()]
    [switch]$IncludeTemplates = $true,
    
    [Parameter()]
    [switch]$CreateZip = $false
)

Write-Host "📦 PACKAGING AEROSPACE AGENT SYSTEM" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor DarkGray

$sourceDir = $PSScriptRoot
Write-Host "Source: $sourceDir" -ForegroundColor Gray
Write-Host "Output: $OutputPath" -ForegroundColor Gray

# Create output directory
if (Test-Path $OutputPath) {
    Remove-Item -Path $OutputPath -Recurse -Force
}
New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null

# Copy core system files
Write-Host "`n📋 Copying core system files..." -ForegroundColor Yellow

$coreFiles = @(
    "README.md",
    "spawn-agents.ps1"
)

foreach ($file in $coreFiles) {
    $sourcePath = Join-Path $sourceDir $file
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $OutputPath -Force
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file (not found)" -ForegroundColor Red
    }
}

# Copy directories
Write-Host "`n📁 Copying directories..." -ForegroundColor Yellow

$directories = @(
    "slash-commands",
    "hooks",
    "orchestrator"
)

foreach ($dir in $directories) {
    $sourcePath = Join-Path $sourceDir $dir
    $destPath = Join-Path $OutputPath $dir
    
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $destPath -Recurse -Force
        Write-Host "   ✅ $dir\" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $dir\ (not found)" -ForegroundColor Red
    }
}

# Copy examples if they exist
$examplesDir = Join-Path $sourceDir "examples"
if (Test-Path $examplesDir) {
    Copy-Item -Path $examplesDir -Destination (Join-Path $OutputPath "examples") -Recurse -Force
    Write-Host "   ✅ examples\" -ForegroundColor Green
}

# Create essential directories
Write-Host "`n📂 Creating essential directories..." -ForegroundColor Yellow

$essentialDirs = @(
    "examples",
    "templates",
    "logs"
)

foreach ($dir in $essentialDirs) {
    $dirPath = Join-Path $OutputPath $dir
    if (-not (Test-Path $dirPath)) {
        New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
        Write-Host "   ✅ $dir\" -ForegroundColor Green
    }
}

# Create usage examples
Write-Host "`n📝 Creating usage examples..." -ForegroundColor Yellow

$basicUsage = @"
# Aerospace Agent System - Basic Usage Examples

## Quick Start
```powershell
# Show available commands
.\spawn-agents.ps1 -ShowCommands

# Launch map features with auto-grid
.\spawn-agents.ps1 -Mode map-features -AutoLaunch

# Launch telemetry systems
.\spawn-agents.ps1 -Mode telemetry-systems -AutoLaunch
```

## Integration Examples

### VS Code Task
Add to .vscode/tasks.json:
```json
{
  "label": "Launch Aerospace Agents",
  "type": "shell",
  "command": "path/to/aerospace-agent-system/spawn-agents.ps1",
  "args": ["-Mode", "map-features", "-AutoLaunch"]
}
```

### PowerShell Alias
Add to your PowerShell profile:
```powershell
Set-Alias -Name agents -Value "path/to/aerospace-agent-system/spawn-agents.ps1"
```

### Claude Code Slash Command
Copy `slash-commands/aerospace-agents.md` to your project's `.claude-code/` directory.

## Advanced Usage

### Custom Agent Modes
Edit `spawn-agents.ps1` to add custom agent configurations:
```powershell
"my-custom-mode" = @(
    @{
        Name = "MY AGENT"
        Path = "path/to/worktree"
        Budget = "1.0ms"
        Prompt = "Custom prompt with sub-agent specifications"
    }
)
```

### Environment Integration
Set environment variables:
- `AEROSPACE_AGENTS_PATH`: Override system location
- `AEROSPACE_DEBUG`: Enable debug logging
- `AEROSPACE_MAX_AGENTS`: Limit concurrent agents

## Troubleshooting

### Common Issues
1. **WezTerm not found**: Install WezTerm or use fallback mode
2. **Permission denied**: Run with appropriate permissions
3. **Git worktree issues**: Ensure project is a git repository

### Debug Mode
Run with verbose output:
```powershell
$env:AEROSPACE_DEBUG = "1"
.\spawn-agents.ps1 -Mode map-features -AutoLaunch
```
"@

$basicUsage | Out-File -FilePath (Join-Path $OutputPath "examples\basic-usage.md") -Encoding UTF8

# Create installation script
$installScript = @"
# Quick Installation Script
# Run this to set up global access

param(
    [switch]`$AddToPath
)

Write-Host "🚀 Installing Aerospace Agent System..." -ForegroundColor Cyan

`$systemPath = `$PSScriptRoot
Write-Host "System location: `$systemPath" -ForegroundColor Gray

if (`$AddToPath) {
    `$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
    if (`$currentPath -notlike "*`$systemPath*") {
        `$newPath = "`$currentPath;`$systemPath"
        [Environment]::SetEnvironmentVariable("PATH", `$newPath, "User")
        Write-Host "✅ Added to PATH - restart terminals" -ForegroundColor Green
    }
}

Write-Host "`nUsage:" -ForegroundColor Yellow
Write-Host "  .\spawn-agents.ps1 -Mode map-features -AutoLaunch" -ForegroundColor White
Write-Host "`nFor global access:" -ForegroundColor Yellow  
Write-Host "  .\install.ps1 -AddToPath" -ForegroundColor White
"@

$installScript | Out-File -FilePath (Join-Path $OutputPath "install.ps1") -Encoding UTF8

# Create version info
$versionInfo = @"
# Aerospace Agent System
Version: 2.0
Build Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Source: $sourceDir

## Features
- Multi-agent parallel development
- 144fps performance targeting  
- NASA JPL compliance enforcement
- WezTerm grid layout support
- Slash command integration
- Cross-platform compatibility

## System Requirements
- Claude Code with --dangerously-skip-permissions
- PowerShell (Windows/Core)
- Git (for worktree support)
- WezTerm (optional, for grid layout)

## Agent Modes Available
- map-features (6 agents)
- telemetry-systems (2 agents)  
- mission-planning (2 agents)
- custom (configurable)
"@

$versionInfo | Out-File -FilePath (Join-Path $OutputPath "VERSION.txt") -Encoding UTF8

# Calculate size
$totalSize = (Get-ChildItem -Path $OutputPath -Recurse | Measure-Object -Property Length -Sum).Sum
$sizeKB = [math]::Round($totalSize / 1KB, 2)

Write-Host "`n✅ Packaging complete!" -ForegroundColor Green
Write-Host "📊 Total size: $sizeKB KB" -ForegroundColor Cyan
Write-Host "📁 Location: $OutputPath" -ForegroundColor Cyan

# Create ZIP if requested
if ($CreateZip) {
    Write-Host "`n📦 Creating ZIP archive..." -ForegroundColor Yellow
    
    $zipPath = "$OutputPath.zip"
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    
    try {
        Compress-Archive -Path "$OutputPath\*" -DestinationPath $zipPath -CompressionLevel Optimal
        Write-Host "   ✅ ZIP created: $zipPath" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ ZIP creation failed: $_" -ForegroundColor Red
    }
}

Write-Host "`n🚀 Ready for distribution!" -ForegroundColor Green
Write-Host "`nTo install globally:" -ForegroundColor Yellow
Write-Host "   Copy folder to C:\Tools\ (or similar)" -ForegroundColor White
Write-Host "   Run: .\install.ps1 -AddToPath" -ForegroundColor White
Write-Host "`nTo use in projects:" -ForegroundColor Yellow
Write-Host "   Copy slash-commands\aerospace-agents.md to .claude-code\" -ForegroundColor White
Write-Host "   Use: /aerospace-agents map-features -AutoLaunch" -ForegroundColor White