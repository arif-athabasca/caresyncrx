# Test script for verifying the overhauled authentication system
# This script launches the test page in a browser and captures the results

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

# Open the test page in the default browser
Write-Host "Opening the auth integration test page in your browser..."
Start-Process "http://localhost:3000/auth-integration-test.html"

Write-Host @"
================================================================
Auth System Test Guide
================================================================

The test page has been opened in your browser. Please follow these steps:

1. Click on each test button to run the individual tests:
   - Token Management System Check
   - Auth Navigation Integration
   - Device Identity Integration
   - Simulated Token Refresh

2. Verify that all tests pass with green success messages.

3. To test the actual authentication flow:
   a. Navigate to http://localhost:3000/login
   b. Log in with your test credentials
   c. Verify you can access protected pages
   d. Test the "New Triage" functionality
   e. Use browser back/forward navigation to ensure it works correctly
   f. Log out and verify you're redirected to the login page

4. If you encounter any issues, check the browser console for errors
   and refer to the docs/auth-system/overhaul.md and docs/auth-system/testing-guide.md documentation.

5. When finished, press Ctrl+C in this terminal to stop the script.
================================================================
"@

# Keep the script running to maintain the server
try {
    while ($true) {
        Start-Sleep -Seconds 5
    }
} catch {
    # Handle Ctrl+C
    Write-Host "Test script terminated."
}
