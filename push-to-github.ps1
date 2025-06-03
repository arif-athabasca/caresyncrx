<#
.SYNOPSIS
    Push CareSyncRx to GitHub Repository
.DESCRIPTION
    This script initializes a git repository and pushes the code to GitHub
#>

Write-Host "=== Pushing CareSyncRx to GitHub ===" -ForegroundColor Cyan

# Ensure we're in the correct directory
Set-Location C:\WorkSpace\caresyncrx-dev

# Run validation to ensure code is ready
Write-Host "Running final validation..." -ForegroundColor Yellow
npm run validate:all
if ($LASTEXITCODE -ne 0) {
    Write-Host "Validation failed. Fixing issues before continuing..." -ForegroundColor Red
    npm run cleanup:all
    npm run validate:all
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Validation still failing. Please fix issues manually before continuing." -ForegroundColor Red
        exit 1
    }
}

# Initialize git repository if not already initialized
if (-not (Test-Path ".git")) {
    Write-Host "Initializing git repository..." -ForegroundColor Yellow
    git init
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to initialize git repository. Is git installed?" -ForegroundColor Red
        exit 1
    }
}

# Check if remote already exists
$remoteExists = git remote | Select-String -Pattern "origin"
if (-not $remoteExists) {
    Write-Host "Adding GitHub remote..." -ForegroundColor Yellow
    git remote add origin https://github.com/arif-athabasca/caresyncrx.git
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to add remote. Please check GitHub access." -ForegroundColor Red
        exit 1
    }
}

# Configure git user if not already configured
$gitUserName = git config --get user.name
$gitUserEmail = git config --get user.email

if (-not $gitUserName) {
    Write-Host "Configuring git user name..." -ForegroundColor Yellow
    git config user.name "Arif Athabasca"
}

if (-not $gitUserEmail) {
    Write-Host "Configuring git user email..." -ForegroundColor Yellow
    git config user.email "arif-athabasca@example.com"
}

# Add all files
Write-Host "Adding files to git..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to add files." -ForegroundColor Red
    exit 1
}

# Commit changes
Write-Host "Committing files..." -ForegroundColor Yellow
git commit -m "Initial commit: CareSyncRx application with resolved circular dependencies"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to commit files." -ForegroundColor Red
    exit 1
}

# Create main branch if it doesn't exist
$currentBranch = git branch --show-current
if (-not $currentBranch) {
    Write-Host "Creating main branch..." -ForegroundColor Yellow
    git checkout -b main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create main branch." -ForegroundColor Red
        exit 1
    }
}

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to push to GitHub. You may need to authenticate." -ForegroundColor Yellow
    
    # Try using GitHub CLI if available
    $ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
    if ($ghInstalled) {
        Write-Host "Attempting to use GitHub CLI for authentication..." -ForegroundColor Yellow
        gh auth login
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully authenticated with GitHub CLI. Pushing again..." -ForegroundColor Green
            git push -u origin main
        }
    } else {
        Write-Host "GitHub CLI not found. Please authenticate manually." -ForegroundColor Yellow
        Write-Host "You can use the following commands:" -ForegroundColor Yellow
        Write-Host "  1. git push -u origin main (and enter your credentials)" -ForegroundColor White
        Write-Host "  2. Or configure a credential manager" -ForegroundColor White
    }
}

# Check if push was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "=== Success! ===" -ForegroundColor Green
    Write-Host "CareSyncRx has been pushed to https://github.com/arif-athabasca/caresyncrx" -ForegroundColor Green
    Write-Host "You can now access your code at this URL." -ForegroundColor Green
} else {
    Write-Host "=== Push Failed ===" -ForegroundColor Red
    Write-Host "Please check your GitHub credentials and try again." -ForegroundColor Red
    Write-Host "You can run the following command to push manually:" -ForegroundColor Yellow
    Write-Host "  git push -u origin main" -ForegroundColor White
}
