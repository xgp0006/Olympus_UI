# Install Aerospace Agent System for Global Access
# Makes the system available to all Claude Code instances

param(
    [Parameter()]
    [string]$InstallPath = "C:\Tools\aerospace-agent-system",
    
    [Parameter()]
    [switch]$AddToPath = $false,
    
    [Parameter()]
    [switch]$CreateShortcuts = $false
)

$systemPath = $PSScriptRoot | Split-Path

Write-Host "🚀 AEROSPACE AGENT SYSTEM - GLOBAL INSTALLER" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor DarkGray
Write-Host "Source: $systemPath" -ForegroundColor Gray
Write-Host "Target: $InstallPath" -ForegroundColor Gray

# Step 1: Copy system to global location
Write-Host "`n📁 Installing system files..." -ForegroundColor Yellow

if (Test-Path $InstallPath) {
    Write-Host "   Existing installation found, updating..." -ForegroundColor Gray
    Remove-Item -Path $InstallPath -Recurse -Force -ErrorAction SilentlyContinue
}

try {
    Copy-Item -Path $systemPath -Destination $InstallPath -Recurse -Force
    Write-Host "   ✅ System files installed successfully" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed to install system files: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Add to PATH if requested
if ($AddToPath) {
    Write-Host "`n🔗 Adding to system PATH..." -ForegroundColor Yellow
    
    try {
        $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
        if ($currentPath -notlike "*$InstallPath*") {
            $newPath = "$currentPath;$InstallPath"
            [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
            Write-Host "   ✅ Added to user PATH" -ForegroundColor Green
            Write-Host "   ⚠️  Restart terminals to use new PATH" -ForegroundColor Yellow
        } else {
            Write-Host "   ℹ️  Already in PATH" -ForegroundColor Gray
        }
    } catch {
        Write-Host "   ❌ Failed to modify PATH: $_" -ForegroundColor Red
        Write-Host "   Manual step: Add '$InstallPath' to your PATH environment variable" -ForegroundColor Yellow
    }
}

# Step 3: Create shortcuts if requested
if ($CreateShortcuts) {
    Write-Host "`n🔗 Creating shortcuts..." -ForegroundColor Yellow
    
    # Desktop shortcut
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    $shortcutPath = Join-Path $desktopPath "Aerospace Agents.lnk"
    
    try {
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = "powershell.exe"
        $shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$InstallPath\spawn-agents.ps1`""
        $shortcut.WorkingDirectory = $InstallPath
        $shortcut.Description = "Launch Aerospace Agent System"
        $shortcut.Save()
        Write-Host "   ✅ Desktop shortcut created" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Failed to create shortcut: $_" -ForegroundColor Red
    }
}

# Step 4: Create integration examples
Write-Host "`n📋 Creating integration examples..." -ForegroundColor Yellow

$examplesDir = Join-Path $InstallPath "examples"
if (-not (Test-Path $examplesDir)) {
    New-Item -ItemType Directory -Path $examplesDir -Force | Out-Null
}

# VS Code integration
$vscodeConfig = @"
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Launch Map Feature Agents",
      "type": "shell",
      "command": "$InstallPath\\spawn-agents.ps1",
      "args": ["-Mode", "map-features", "-AutoLaunch"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      },
      "problemMatcher": []
    },
    {
      "label": "Show Agent Commands",
      "type": "shell", 
      "command": "$InstallPath\\spawn-agents.ps1",
      "args": ["-ShowCommands"],
      "group": "build"
    }
  ]
}
"@

$vscodeConfig | Out-File -FilePath (Join-Path $examplesDir "vscode-tasks.json") -Encoding UTF8

# PowerShell profile integration
$profileIntegration = @"
# Aerospace Agent System Integration
# Add this to your PowerShell profile (`$PROFILE)

# Quick aliases
Set-Alias -Name agents -Value "$InstallPath\spawn-agents.ps1"
Set-Alias -Name launch-agents -Value "$InstallPath\spawn-agents.ps1"

# Functions for common tasks
function Launch-MapAgents { 
    & "$InstallPath\spawn-agents.ps1" -Mode map-features -AutoLaunch 
}

function Show-AgentCommands { 
    & "$InstallPath\spawn-agents.ps1" -ShowCommands 
}

function Launch-TelemetryAgents { 
    & "$InstallPath\spawn-agents.ps1" -Mode telemetry-systems -AutoLaunch 
}

Write-Host "🚀 Aerospace Agent System loaded" -ForegroundColor Cyan
"@

$profileIntegration | Out-File -FilePath (Join-Path $examplesDir "powershell-profile.ps1") -Encoding UTF8

Write-Host "   ✅ Integration examples created" -ForegroundColor Green

# Step 5: Test installation
Write-Host "`n🧪 Testing installation..." -ForegroundColor Yellow

$testScript = Join-Path $InstallPath "spawn-agents.ps1"
if (Test-Path $testScript) {
    try {
        $testResult = & $testScript -Mode map-features -ShowCommands 2>&1
        if ($LASTEXITCODE -eq 0 -or $testResult -match "AGENT LAUNCH COMMANDS") {
            Write-Host "   ✅ Installation test passed" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Installation test had warnings" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ❌ Installation test failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ Main script not found after installation" -ForegroundColor Red
}

# Summary
Write-Host "`n=============================================" -ForegroundColor DarkGray
Write-Host "🎉 INSTALLATION COMPLETE" -ForegroundColor Green
Write-Host "`nUsage from any Claude Code instance:" -ForegroundColor Cyan
Write-Host "   $InstallPath\spawn-agents.ps1 -Mode map-features -AutoLaunch" -ForegroundColor White

if ($AddToPath) {
    Write-Host "`nAfter PATH update (restart terminal):" -ForegroundColor Cyan
    Write-Host "   spawn-agents.ps1 -Mode map-features -AutoLaunch" -ForegroundColor White
}

Write-Host "`nIntegration examples:" -ForegroundColor Yellow
Write-Host "   VS Code: $examplesDir\vscode-tasks.json" -ForegroundColor Gray
Write-Host "   PowerShell: $examplesDir\powershell-profile.ps1" -ForegroundColor Gray

Write-Host "`nSlash command support:" -ForegroundColor Yellow
Write-Host "   Copy $InstallPath\slash-commands\aerospace-agents.md" -ForegroundColor Gray
Write-Host "   to your project's .claude-code\ directory" -ForegroundColor Gray

Write-Host "`n🔧 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Restart terminals if PATH was modified" -ForegroundColor White
Write-Host "   2. Navigate to any project directory" -ForegroundColor White
Write-Host "   3. Run: spawn-agents.ps1 -Mode map-features -AutoLaunch" -ForegroundColor White
Write-Host "   4. Use /aerospace-agents in Claude Code" -ForegroundColor White