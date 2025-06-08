# Test script for real-world verification of the authentication system
# This script guides you through testing the actual authentication flow

Write-Host @"
==========================================================================
                   CareSyncRx Authentication System Test
==========================================================================

This script will help you verify that the authentication system overhaul
has successfully fixed the issues with unexpected redirects and login loops.

TEST PROCEDURE:

1. LOGIN PROCESS
   - Opening login page in your browser...
   - Enter your test credentials and click "Login"
   - Verify you are successfully redirected to the dashboard

2. PROTECTED PAGES ACCESS
   - Navigate to various protected pages in the application
   - Verify you can access all pages without being redirected to login
   - Test the "New Triage" functionality specifically

3. BROWSER NAVIGATION
   - Use browser back/forward buttons to navigate between pages
   - Refresh the page on a protected route
   - Open a new tab and navigate directly to a protected route
   - Verify you remain logged in throughout all these actions

4. SESSION PERSISTENCE
   - Close the browser completely
   - Reopen the browser and navigate directly to a protected route
   - Verify you either remain logged in or are properly redirected to login

5. LOGOUT PROCESS
   - Click the logout button
   - Verify you are redirected to the login page
   - Try to access a protected route after logout
   - Verify you cannot access protected pages after logout

==========================================================================
"@

# Check if the development server is running
$serverRunning = $false
try {
    Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -ErrorAction Stop
    $serverRunning = $true
} catch {
    Write-Host "Development server is not running. Starting it..."
}

# Start the development server if it's not running
if (-not $serverRunning) {
    Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow
    
    # Wait for the server to start
    $maxAttempts = 10
    $attempts = 0
    $serverStarted = $false
      while (-not $serverStarted -and $attempts -lt $maxAttempts) {
        try {
            Start-Sleep -Seconds 3
            Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -ErrorAction Stop
            $serverStarted = $true
            Write-Host "Development server started successfully."
        } catch {
            $attempts++
            Write-Host "Waiting for server to start... ($attempts/$maxAttempts)"
        }
    }
    
    if (-not $serverStarted) {
        Write-Host "Failed to start development server. Please start it manually."
        exit 1
    }
}

# Open the login page in the default browser
Write-Host "`nOpening the login page in your browser..."
Start-Process "http://localhost:3000/login"

# Prompt user to proceed with each test step
function Test-Step {
    param (
        [string]$StepName,
        [string]$Instructions
    )
    
    Write-Host "`n==========================================================================`n"
    Write-Host "STEP: $StepName" -ForegroundColor Cyan
    Write-Host $Instructions
    
    $response = Read-Host "Did this step pass? (y/n)"
    
    if ($response -eq "n") {
        Write-Host "Test failed at step: $StepName" -ForegroundColor Red
        Write-Host "Please check the browser console for errors and review the auth-system-overhaul.md documentation."
        return $false
    }
    
    Write-Host "Step passed!" -ForegroundColor Green
    return $true
}

# Wait for user to login
Write-Host "`nPlease log in with your test credentials when the page loads."
Read-Host "Press Enter when you've successfully logged in"

# Test each step
$testsPassed = $true

$testsPassed = $testsPassed -and (Test-Step -StepName "Login Process" -Instructions @"
Verify:
- You are now on the dashboard page
- No error messages are displayed
- The user profile information is displayed correctly
"@)

$testsPassed = $testsPassed -and (Test-Step -StepName "Protected Pages Access" -Instructions @"
Please:
1. Navigate to various protected pages in the application
2. Specifically test the "New Triage" functionality
3. Verify you can access all pages without being redirected to login
"@)

$testsPassed = $testsPassed -and (Test-Step -StepName "Browser Navigation" -Instructions @"
Please:
1. Use browser back button to return to a previous page
2. Use browser forward button to go forward again
3. Refresh the page on a protected route
4. Open a new tab and navigate directly to a protected route
   (e.g., http://localhost:3000/dashboard)

Verify you remain logged in throughout all these actions.
"@)

$testsPassed = $testsPassed -and (Test-Step -StepName "Session Persistence" -Instructions @"
Please:
1. Close the browser completely
2. Reopen the browser and navigate directly to a protected route
   (e.g., http://localhost:3000/dashboard)

Verify you either remain logged in or are properly redirected to login.
"@)

$testsPassed = $testsPassed -and (Test-Step -StepName "Logout Process" -Instructions @"
Please:
1. Click the logout button
2. Verify you are redirected to the login page
3. Try to access a protected route after logout
4. Verify you cannot access protected pages after logout
"@)

# Final results
Write-Host "`n==========================================================================`n"

if ($testsPassed) {
    Write-Host "AUTHENTICATION SYSTEM TEST: PASSED" -ForegroundColor Green    Write-Host @"
All tests passed successfully! The authentication system overhaul has fixed the issues
with unexpected redirects and login loops.

For more information about the changes made, please see:
- docs/auth-system/overhaul.md
- docs/auth-system/testing-guide.md
"@
} else {
    Write-Host "AUTHENTICATION SYSTEM TEST: FAILED" -ForegroundColor Red    Write-Host @"
Some tests failed. Please check the browser console for errors and review:
- docs/auth-system/overhaul.md
- docs/auth-system/testing-guide.md

If issues persist, please report them with details about the specific step that failed.
"@
}

Write-Host "`n==========================================================================`n"
