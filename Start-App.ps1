# CareSyncRx Development Server Starter PowerShell Script
# This script starts the development server with appropriate configuration

Write-Host "`n=====================================================" -ForegroundColor Cyan
Write-Host "       CareSyncRx Development Server Starter         " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Set the port
$PORT = 3001

# Check if port is in use
Write-Host "Checking if port $PORT is already in use..." -ForegroundColor Yellow
$portInUse = $false
$processId = $null

try {
    $connections = netstat -ano | findstr ":$PORT"
    if ($connections -match "LISTENING") {
        $portInUse = $true
        # Extract PID
        $processId = ($connections -split ' ')[-1]
        $processId = $processId.Trim()
    }
}
catch {
    Write-Host "Error checking port: $_" -ForegroundColor Red
}

# If process found, try to kill it
if ($portInUse -and $processId) {
    Write-Host "Port $PORT is in use by process ID $processId. Attempting to terminate..." -ForegroundColor Yellow
    try {
        Stop-Process -Id $processId -Force
        Write-Host "Process terminated successfully." -ForegroundColor Green
    }
    catch {
        Write-Host "Failed to terminate process: $_" -ForegroundColor Red
        Write-Host "Please manually terminate the process using the PID $processId." -ForegroundColor Yellow
    }
    
    # Small delay to ensure the port is fully released
    Write-Host "Waiting for port to be released..." -ForegroundColor DarkGray
    Start-Sleep -Seconds 2
}
else {
    Write-Host "Port $PORT is available." -ForegroundColor Green
}

# Display startup message
Write-Host "Starting development server with optimized configuration..." -ForegroundColor Green
Write-Host "• Using port: $PORT" -ForegroundColor DarkGray
Write-Host "• Platform: Windows" -ForegroundColor DarkGray
Write-Host "• Node.js: $(node -v)" -ForegroundColor DarkGray
Write-Host ""

# Set environment variables
$env:NODE_OPTIONS = "--no-warnings --max-old-space-size=4096 --trace-warnings"
$env:PORT = "$PORT"
$env:NEXT_TELEMETRY_DISABLED = "1"
$env:NEXT_PUBLIC_REACT_STRICT_MODE = "false"
$env:NEXT_DEBUG_BUILD = "1"
$env:NEXT_WEBPACK_TRACING = "1"
$env:NEXT_CHUNK_LOAD_ERROR_DEBUG = "1"

# Start the Next.js development server
Write-Host "Starting Next.js development server on port $PORT..." -ForegroundColor Yellow
Write-Host ""

# Run the npm dev script
npm run dev -- -p $PORT

# Handle Ctrl+C
$host.UI.RawUI.FlushInputBuffer()
Write-Host "Development server exited." -ForegroundColor Yellow
