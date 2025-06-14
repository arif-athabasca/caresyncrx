# CareSyncRx Speech Recognition Test Script

Write-Host "Speech Recognition Setup Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

# Check required files
$files = @(
    "src/app/components/ui/hooks/useSpeechToText.ts",
    "src/app/components/ui/SpeechToTextInput.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ $file exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $file missing" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "To test speech recognition:" -ForegroundColor Cyan
Write-Host "1. Run: npm run dev:speech" -ForegroundColor White
Write-Host "2. Open: https://localhost:3001" -ForegroundColor White
Write-Host "3. Accept security warning" -ForegroundColor White
Write-Host "4. Navigate to New Triage page" -ForegroundColor White
Write-Host "5. Test voice input" -ForegroundColor White
Write-Host ""
Write-Host "See docs/speech-recognition-troubleshooting.md for help" -ForegroundColor Yellow
