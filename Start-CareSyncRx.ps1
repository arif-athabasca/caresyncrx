#!/usr/bin/env pwsh
# CareSyncRx Application Starter PowerShell Script
# This script consolidates various startup scripts into one comprehensive solution
# Version 1.0.0

param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("development", "production")]
    [string]$Environment = "development",
    
    [Parameter(Mandatory=$false)]
    [int]$Port = 3000,
    
    [Parameter(Mandatory=$false)]
    [switch]$Clean = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Help = $false
)

# If help switch is provided, show usage information
if ($Help) {
    Write-Host "`nCareSyncRx Application Starter - Help" -ForegroundColor Cyan
    Write-Host "Usage: .\Start-CareSyncRx.ps1 [-Environment <development|production>] [-Port <port_number>] [-Clean] [-Help]" -ForegroundColor White
    Write-Host "`nParameters:" -ForegroundColor Yellow
    Write-Host "  -Environment : Select environment mode (default: development)" -ForegroundColor White
    Write-Host "  -Port        : Specify port to use (default: 3000)" -ForegroundColor White
    Write-Host "  -Clean       : Start with a clean environment (clears caches)" -ForegroundColor White
    Write-Host "  -Help        : Display this help message" -ForegroundColor White
    Write-Host "`nExamples:" -ForegroundColor Yellow
    Write-Host "  .\Start-CareSyncRx.ps1" -ForegroundColor White
    Write-Host "  .\Start-CareSyncRx.ps1 -Environment production -Port 8080" -ForegroundColor White
    Write-Host "  .\Start-CareSyncRx.ps1 -Clean" -ForegroundColor White
    exit 0
}

# Set global variables
$PORT = $Port
$ENV_MODE = $Environment

# Display banner
Write-Host "`n=====================================================" -ForegroundColor Cyan
Write-Host "            CareSyncRx Application Starter          " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "• Environment: $ENV_MODE" -ForegroundColor White
Write-Host "• Port: $PORT" -ForegroundColor White
if ($Clean) {
    Write-Host "• Clean start: Yes" -ForegroundColor White
}
Write-Host "=====================================================" -ForegroundColor Cyan

# Function to check if a port is in use
function Test-PortInUse {
    param (
        [int]$Port,
        [switch]$KillIfInUse
    )
    
    $portInUse = $null
    $connections = netstat -ano | findstr ":$Port"
    
    if ($connections) {
        foreach ($line in $connections) {
            if ($line -match "LISTENING") {
                $processId = ($line -split ' ')[-1]
                $processInfo = Get-Process -Id $processId -ErrorAction SilentlyContinue
                $processName = if ($processInfo) { $processInfo.ProcessName } else { "Unknown" }
                
                Write-Host "Port $Port is in use by process ID $processId ($processName)." -ForegroundColor Yellow
                
                if ($KillIfInUse) {
                    Write-Host "Terminating process..." -ForegroundColor Yellow
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Seconds 2
                    return $false
                }
                return $true
            }
        }
    }
    
    Write-Host "Port $Port is available." -ForegroundColor Green
    return $false
}

# Function to verify Node.js environment
function Test-NodeEnvironment {
    Write-Host "Verifying Node.js environment..." -ForegroundColor Yellow
    
    try {
        $nodeVersion = node -v
        $npmVersion = npm -v
        
        Write-Host "✓ Node.js version $nodeVersion detected." -ForegroundColor Green
        Write-Host "✓ npm version $npmVersion detected." -ForegroundColor Green
        
        # Check Node.js version (should be 16.x or higher)
        $versionNumber = $nodeVersion -replace 'v', '' -as [version]
        if ($versionNumber.Major -lt 16) {
            Write-Host "⚠ Warning: This application recommends Node.js v16 or higher." -ForegroundColor Yellow
            
            $continue = Read-Host "Continue anyway? (y/n)"
            if ($continue -ne "y") {
                return $false
            }
        }
        
        return $true
    }
    catch {
        Write-Host "Error: Node.js is not installed or not in your PATH." -ForegroundColor Red
        return $false
    }
}

# Check Node.js environment
$nodeEnvValid = Test-NodeEnvironment
if (-not $nodeEnvValid) {
    Write-Host "Exiting due to Node.js environment issues." -ForegroundColor Red
    exit 1
}

# Handle clean option
if ($Clean) {
    Write-Host "`nCleaning environment..." -ForegroundColor Yellow
    if (Test-Path -Path ".next") {
        Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✓ Next.js cache cleared." -ForegroundColor Green
    }
    
    if (Test-Path -Path "node_modules/.cache") {
        Remove-Item -Path "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✓ Node modules cache cleared." -ForegroundColor Green
    }
    
    try {
        npm cache clean --force
        Write-Host "✓ npm cache cleared." -ForegroundColor Green
        
        npx prisma generate
        Write-Host "✓ Prisma schema regenerated." -ForegroundColor Green
    } 
    catch {
        Write-Host "Error during cleanup: $_" -ForegroundColor Red
    }
    
    Write-Host "Environment cleaned." -ForegroundColor Green
}

# Check port and free it if necessary
$portInUse = Test-PortInUse -Port $PORT -KillIfInUse
if ($portInUse) {
    $response = Read-Host "Port $PORT is still in use. Try to start anyway? (y/n)"
    if ($response -ne "y") {
        Write-Host "Exiting. Please free port $PORT manually and try again." -ForegroundColor Yellow
        exit 0
    }
}

# Set common environment variables
$env:PORT = "$PORT"
$env:NEXT_TELEMETRY_DISABLED = "1"

# Environment-specific settings and startup
if ($ENV_MODE -eq "development") {
    Write-Host "`nStarting in development mode..." -ForegroundColor Yellow
    
    # Set development-specific environment variables
    $env:NODE_OPTIONS = "--no-warnings --max-old-space-size=4096 --trace-warnings"
    $env:NEXT_PUBLIC_REACT_STRICT_MODE = "false"
    $env:NEXT_DEBUG_BUILD = "1"
    $env:NEXT_WEBPACK_TRACING = "1"
    
    # Start the development server
    $npmCommand = "npm run dev -- --port $PORT"
    Write-Host "Executing: $npmCommand" -ForegroundColor DarkGray
    Invoke-Expression $npmCommand
}
else {
    Write-Host "`nStarting in production mode..." -ForegroundColor Yellow
    
    # Set production-specific environment variables
    $env:NODE_ENV = "production"
    $env:NODE_OPTIONS = "--max-old-space-size=8192"
    
    # Build the application first
    Write-Host "Building application for production..." -ForegroundColor Yellow
    try {
        npm run build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Production build successful." -ForegroundColor Green
            
            # Start the production server
            Write-Host "Starting production server on port $PORT..." -ForegroundColor Yellow
            $npmCommand = "npm run start -- -p $PORT"
            Write-Host "Executing: $npmCommand" -ForegroundColor DarkGray
            Invoke-Expression $npmCommand
        }
        else {
            Write-Host "Error: Production build failed with code $LASTEXITCODE" -ForegroundColor Red
            exit $LASTEXITCODE
        }
    }
    catch {
        Write-Host "Error during production build: $_" -ForegroundColor Red
        exit 1
    }
}

# Handle exit
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
    Write-Host "CareSyncRx application exited with code $exitCode" -ForegroundColor Red
    
    # Provide error context based on exit code
    switch ($exitCode) {
        1 { 
            Write-Host "This is likely a general Node.js error." -ForegroundColor Yellow 
        }
        137 { 
            Write-Host "The application was terminated due to memory issues." -ForegroundColor Yellow 
        }
        130 { 
            Write-Host "The application was terminated by user (Ctrl+C)." -ForegroundColor Yellow 
        }
        default { 
            Write-Host "Check the console output above for error details." -ForegroundColor Yellow 
        }
    }
    
    # Keep window open if there was an error
    Write-Host "`nPress any key to continue..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit $exitCode
}
else {
    Write-Host "CareSyncRx application exited normally." -ForegroundColor Green
}
