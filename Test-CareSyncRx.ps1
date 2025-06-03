#!/usr/bin/env pwsh
# CareSyncRx Test Helper Script
# This script provides utilities for testing the application

# Display banner
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "            CareSyncRx Test Helper                 " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# Move to the root directory of the project
Set-Location (Split-Path -Parent $PSCommandPath)
$rootDir = Get-Location

Write-Host "CareSyncRx Test Helper" -ForegroundColor Green
Write-Host "Current directory: $rootDir" -ForegroundColor Green
Write-Host ""

# Function to test authentication flow
function Test-Authentication {
    Write-Host "Testing Authentication Flow" -ForegroundColor Cyan
    Write-Host "This will test the login, token refresh, and logout functionality" -ForegroundColor Yellow
    Write-Host ""
    
    # Start the development server if not already running
    $isServerRunning = Get-Process | Where-Object { $_.ProcessName -eq "node" } | Where-Object { $_.CommandLine -match "next dev" }
    if (-not $isServerRunning) {
        Write-Host "Starting development server..." -ForegroundColor Yellow
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c start-dev.cmd" -WindowStyle Minimized
        Write-Host "Waiting for server to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
    
    # Run the test
    Write-Host "Running authentication tests..." -ForegroundColor Yellow
    node scripts/test-auth-flow.js
}

# Function to test two-factor authentication
function Test-TwoFactorAuth {
    Write-Host "Testing Two-Factor Authentication" -ForegroundColor Cyan
    Write-Host "This will test the 2FA setup and verification flow" -ForegroundColor Yellow
    Write-Host ""
    
    # Run the test
    Write-Host "Running 2FA tests..." -ForegroundColor Yellow
    node scripts/test-2fa.js
}

# Function to test idle timeout
function Test-IdleTimeout {
    Write-Host "Testing Idle Timeout" -ForegroundColor Cyan
    Write-Host "This will test the idle timeout functionality" -ForegroundColor Yellow
    Write-Host ""
    
    # Run the test
    Write-Host "Running idle timeout tests..." -ForegroundColor Yellow
    & scripts/Test-IdleTimeout.ps1
}

# Function to validate auth module
function Test-AuthModule {
    Write-Host "Validating Auth Module" -ForegroundColor Cyan
    Write-Host "This will check for circular dependencies and other issues in the auth module" -ForegroundColor Yellow
    Write-Host ""
    
    # Run the validation
    Write-Host "Running auth module validation..." -ForegroundColor Yellow
    node scripts/validate-auth-module.cjs
}

# Main menu
function Show-Menu {
    Write-Host "Please select an option:" -ForegroundColor Green
    Write-Host "1: Test Authentication Flow" -ForegroundColor White
    Write-Host "2: Test Two-Factor Authentication" -ForegroundColor White
    Write-Host "3: Test Idle Timeout" -ForegroundColor White
    Write-Host "4: Validate Auth Module" -ForegroundColor White
    Write-Host "5: Exit" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "Enter your choice (1-5)"
    
    switch ($choice) {
        "1" { Test-Authentication; break }
        "2" { Test-TwoFactorAuth; break }
        "3" { Test-IdleTimeout; break }
        "4" { Test-AuthModule; break }
        "5" { exit }
        default { Write-Host "Invalid choice. Please try again." -ForegroundColor Red }
    }
    
    Write-Host ""
    Show-Menu
}

# Start the menu
Show-Menu
