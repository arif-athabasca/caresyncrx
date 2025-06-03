@echo off
REM GitHub Repository Initialization Script for CareSyncRx

echo ===================================================
echo    CareSyncRx GitHub Repository Initialization
echo ===================================================

REM Check if Git is installed
git --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Git is not installed or not in your PATH.
    echo Please install Git from https://git-scm.com/
    exit /b 1
)

REM Run final validation
echo Running final validation...
call npm run validate:all
if %ERRORLEVEL% neq 0 (
    echo ERROR: Validation failed. Please fix issues before continuing.
    exit /b 1
)

REM Initialize Git repository
echo Initializing Git repository...
git init
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to initialize Git repository.
    exit /b 1
)

REM Create .gitignore if it doesn't exist
if not exist .gitignore (
    echo Creating .gitignore file...
    echo node_modules/ > .gitignore
    echo .next/ >> .gitignore
    echo .env >> .gitignore
    echo .env.local >> .gitignore
    echo npm-debug.log* >> .gitignore
    echo yarn-debug.log* >> .gitignore
    echo yarn-error.log* >> .gitignore
    echo .DS_Store >> .gitignore
)

REM Add all files to Git
echo Adding files to Git...
git add .
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to add files to Git.
    exit /b 1
)

REM Create initial commit
echo Creating initial commit...
git commit -m "Initial commit: CareSyncRx application"
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to create initial commit.
    exit /b 1
)

echo.
echo Repository initialized successfully!
echo.
echo Next steps:
echo 1. Create a new GitHub repository at https://github.com/new
echo 2. Run the following commands to push to GitHub:
echo    git remote add origin https://github.com/your-username/caresyncrx.git
echo    git push -u origin main
echo.
echo NOTE: Replace 'your-username' with your actual GitHub username.
echo ===================================================
