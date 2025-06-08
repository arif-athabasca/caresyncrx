# Test-AuthSystem.ps1
# Master script for testing the CareSyncRx authentication system

param(
    [switch]$Integration,
    [switch]$RealWorld,
    [switch]$Full
)

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$integrationScript = Join-Path $scriptPath "Test-AuthIntegration.ps1"
$realWorldScript = Join-Path $scriptPath "Test-AuthRealWorldFlow.ps1"

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "CareSyncRx Auth System Test Suite" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host

# Validate that the authentication system is properly set up
Write-Host "Validating authentication system..." -ForegroundColor Yellow
$validationResult = node scripts/validate-auth-module.cjs
if ($validationResult -match "All required public auth scripts are present") {
    Write-Host "Authentication system validation passed!" -ForegroundColor Green
} else {
    Write-Host "Authentication system validation failed. Please check the output above." -ForegroundColor Red
    Write-Host "See docs/auth-system/README.md for more information."
    exit 1
}

Write-Host

# Run the requested tests
if ($Integration -or $Full) {
    Write-Host "Running integration tests..." -ForegroundColor Yellow
    Write-Host "This will open the auth-integration-test.html page in your browser."
    Write-Host "Please press Enter when you're ready to proceed."
    Read-Host | Out-Null
    
    & $integrationScript
    
    Write-Host "Integration tests completed. Please confirm if all tests passed." -ForegroundColor Yellow
    $integrationPassed = Read-Host "Did all integration tests pass? (y/n)"
    
    if ($integrationPassed -ne "y") {
        Write-Host "Integration tests failed. Please check the browser console for errors." -ForegroundColor Red
        Write-Host "See docs/auth-system/testing-guide.md for troubleshooting information."
        if (-not $Full) { exit 1 }
    } else {
        Write-Host "Integration tests passed!" -ForegroundColor Green
    }
    
    Write-Host
}

if ($RealWorld -or $Full) {
    Write-Host "Running real-world flow tests..." -ForegroundColor Yellow
    Write-Host "This will guide you through testing the authentication flow in the application."
    Write-Host "Please press Enter when you're ready to proceed."
    Read-Host | Out-Null
    
    & $realWorldScript
    
    Write-Host "Real-world flow tests completed. Please confirm if all tests passed." -ForegroundColor Yellow
    $realWorldPassed = Read-Host "Did all real-world flow tests pass? (y/n)"
    
    if ($realWorldPassed -ne "y") {
        Write-Host "Real-world flow tests failed. Please check the error messages." -ForegroundColor Red
        Write-Host "See docs/auth-system/testing-guide.md for troubleshooting information."
        exit 1
    } else {
        Write-Host "Real-world flow tests passed!" -ForegroundColor Green
    }
    
    Write-Host
}

if (-not ($Integration -or $RealWorld -or $Full)) {
    Write-Host "No test type specified. Please use one of the following parameters:" -ForegroundColor Yellow
    Write-Host "  -Integration : Run the integration tests"
    Write-Host "  -RealWorld  : Run the real-world flow tests"
    Write-Host "  -Full       : Run all tests"
    Write-Host
    Write-Host "Example: .\Test-AuthSystem.ps1 -Full"
    exit 0
}

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Auth System Tests Completed" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
