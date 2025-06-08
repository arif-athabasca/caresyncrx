@echo off
echo =====================================================
echo        CareSyncRx Development Server Starter
echo =====================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo Error: Node.js is not installed or not in your PATH.
  echo Please install Node.js from https://nodejs.org/
  exit /b 1
)

:: Check if port 3000 is in use and notify the user
echo Checking port 3000 status...
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %ERRORLEVEL% equ 0 (
  echo.
  echo Port 3000 is currently in use.
  echo The script will attempt to free this port automatically.
  echo.
)

:: Start the development server using our optimized script
echo Starting development server with optimized configuration...
echo.
node start-dev.js

:: If the server exits with an error, keep the window open
if %ERRORLEVEL% neq 0 (
  echo.
  echo The development server exited with an error.
  echo Check the output above for details.
  echo.
  pause
  exit /b %ERRORLEVEL%
)