<#
.SYNOPSIS
    Create GitHub Repository for CareSyncRx
.DESCRIPTION
    This script uses GitHub CLI to create a new repository for CareSyncRx
    You must have GitHub CLI installed and be authenticated
#>

Write-Host "=== Creating GitHub Repository for CareSyncRx ===" -ForegroundColor Cyan

# Check if GitHub CLI is installed
$ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghInstalled) {
    Write-Host "GitHub CLI is not installed." -ForegroundColor Red
    Write-Host "Please install it from https://cli.github.com/ or create the repository manually." -ForegroundColor Red
    Write-Host "Then use push-to-github.ps1 to push your code." -ForegroundColor Yellow
    exit 1
}

# Check if already authenticated with GitHub CLI
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "You need to authenticate with GitHub CLI." -ForegroundColor Yellow
    Write-Host "Running authentication process..." -ForegroundColor Yellow
    gh auth login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Authentication failed. Please try again manually." -ForegroundColor Red
        exit 1
    }
}

# Create the repository
Write-Host "Creating GitHub repository 'caresyncrx' under 'arif-athabasca'..." -ForegroundColor Yellow
$repoExists = gh repo view arif-athabasca/caresyncrx 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Repository already exists. Skipping creation." -ForegroundColor Yellow
} else {
    gh repo create arif-athabasca/caresyncrx --description "CareSyncRx application with resolved circular dependencies" --private
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create repository. You may need to create it manually." -ForegroundColor Red
        Write-Host "Go to https://github.com/new to create a new repository." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Repository created successfully!" -ForegroundColor Green
}

Write-Host "GitHub repository is ready!" -ForegroundColor Green
Write-Host "Now run push-to-github.ps1 to push your code or use 'npm run github:push'." -ForegroundColor Green
