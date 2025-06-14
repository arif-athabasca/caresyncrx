# PowerShell script to run CareSyncRx with HTTPS for speech recognition
# This enables microphone access for speech-to-text functionality

param(
    [switch]$WithSpeech,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
CareSyncRx Development Server with Speech Support

Usage:
  .\Start-CareSyncRx-Speech.ps1              # Start regular HTTP server
  .\Start-CareSyncRx-Speech.ps1 -WithSpeech  # Start with HTTPS for speech recognition

The -WithSpeech flag enables HTTPS which is required for:
- Microphone access in modern browsers
- Speech-to-text functionality
- WebRTC features

Note: With HTTPS, browsers may show security warnings for self-signed certificates.
This is normal for development. Click "Advanced" and "Proceed to localhost".
"@
    exit 0
}

Write-Host "🚀 Starting CareSyncRx Development Server..." -ForegroundColor Green

# Set environment variables for development
$env:NODE_ENV = "development"

if ($WithSpeech) {
    Write-Host "🎤 Enabling HTTPS for speech recognition..." -ForegroundColor Yellow
    Write-Host "⚠️  Browser may show security warnings - this is normal for development" -ForegroundColor Yellow
    
    # Try to use local-ssl-proxy if available, otherwise use Next.js with custom server
    if (Get-Command "local-ssl-proxy" -ErrorAction SilentlyContinue) {
        Write-Host "Using local-ssl-proxy for HTTPS..." -ForegroundColor Blue
        
        # Start Next.js on HTTP port
        Start-Job -ScriptBlock {
            Set-Location $using:PWD
            npm run dev
        } -Name "NextJS"
        
        # Wait a moment for Next.js to start
        Start-Sleep -Seconds 5
        
        # Start HTTPS proxy
        Write-Host "🔗 HTTPS proxy will be available at: https://localhost:3001" -ForegroundColor Green
        Write-Host "🎤 Speech recognition should work properly" -ForegroundColor Green
        local-ssl-proxy --source 3001 --target 3000 --hostname localhost
    } else {
        Write-Host "Installing local-ssl-proxy for HTTPS support..." -ForegroundColor Blue
        npm install -g local-ssl-proxy
        
        Write-Host "Please run the script again with -WithSpeech flag" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "🌐 Starting HTTP server (speech recognition may not work)" -ForegroundColor Yellow
    Write-Host "💡 Use -WithSpeech flag to enable HTTPS for microphone access" -ForegroundColor Blue
    
    npm run dev
}

Write-Host "✅ Server started successfully!" -ForegroundColor Green
