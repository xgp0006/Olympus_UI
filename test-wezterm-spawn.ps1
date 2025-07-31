# Test WezTerm spawn functionality

Write-Host "Testing WezTerm CLI..." -ForegroundColor Cyan

# Test 1: Simple spawn
Write-Host "`nTest 1: Spawning new tab" -ForegroundColor Yellow
$result = wezterm cli spawn -- pwsh -NoExit -Command "echo 'Test pane created'"
Write-Host "Result: $result" -ForegroundColor Green

# Test 2: Check if we got a pane ID
if ($result -match '^\d+$') {
    Write-Host "✓ Got pane ID: $result" -ForegroundColor Green
    
    # Test 3: Try to split this pane
    Write-Host "`nTest 2: Splitting pane $result" -ForegroundColor Yellow
    $split_result = wezterm cli split-pane --pane-id $result --right
    Write-Host "Split result: $split_result" -ForegroundColor Green
    
    if ($split_result -match '^\d+$') {
        Write-Host "✓ Got new pane ID: $split_result" -ForegroundColor Green
        
        # Test 4: Send text to new pane
        Write-Host "`nTest 3: Sending text to pane $split_result" -ForegroundColor Yellow
        wezterm cli send-text --pane-id $split_result --no-paste "echo 'Hello from split pane'`n"
        Write-Host "✓ Text sent" -ForegroundColor Green
    }
} else {
    Write-Host "✗ Did not get a valid pane ID" -ForegroundColor Red
    Write-Host "Raw output: $result" -ForegroundColor Gray
}

# Test 5: List current panes
Write-Host "`nTest 4: Listing current panes" -ForegroundColor Yellow
wezterm cli list