# Simple HTTPS Setup for Speech Recognition
Write-Host "Starting CareSyncRx with HTTPS for Speech Recognition" -ForegroundColor Green

# Stop any existing processes
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

# Install local-ssl-proxy if not already installed
if (-not (Get-Command "local-ssl-proxy" -ErrorAction SilentlyContinue)) {
    Write-Host "Installing HTTPS proxy..." -ForegroundColor Yellow
    npm install -g local-ssl-proxy
}

# Start Next.js in background
Write-Host "Starting Next.js server..." -ForegroundColor Blue
Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev
} -Name "NextJS" | Out-Null

# Wait for Next.js to start
Start-Sleep -Seconds 8

# Start HTTPS proxy
Write-Host ""
Write-Host "Servers Starting!" -ForegroundColor Green
Write-Host "HTTP:  http://localhost:3000" -ForegroundColor Yellow
Write-Host "HTTPS: https://localhost:3001 (for speech)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your browser will show Not Secure warning" -ForegroundColor Yellow
Write-Host "This is NORMAL - just click Advanced then Proceed to localhost" -ForegroundColor White
Write-Host ""
Write-Host "Use HTTPS URL for speech recognition!" -ForegroundColor Green
Write-Host ""

local-ssl-proxy --source 3001 --target 3000 --hostname localhost
