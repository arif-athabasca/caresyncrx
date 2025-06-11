# CareSyncRx Developer Guide

## Starting the Application

CareSyncRx includes a PowerShell script that simplifies the application startup process. This script handles port configuration, environment setup, and offers additional features to improve the developer experience.

### Basic Usage

To start the CareSyncRx application in development mode:

```powershell
.\Start-CareSyncRx.ps1
```

By default, this will:
1. Check if port 3000 is already in use
2. Attempt to kill any process blocking the port
3. Verify your Node.js environment
4. Configure optimal development environment variables
5. Start the Next.js development server

### Command-Line Parameters

The script supports several command-line parameters:

```powershell
.\Start-CareSyncRx.ps1 [-Environment <development|production>] [-Port <port_number>] [-Clean] [-Help]
```

| Parameter | Description |
|-----------|-------------|
| `-Environment` | Specify the environment mode. Options: `development` (default) or `production` |
| `-Port` | Specify the port to use (default: 3000) |
| `-Clean` | Start with a clean environment (clears caches) |
| `-Help` | Display the help message |

### Examples

**Start in development mode (default):**
```powershell
.\Start-CareSyncRx.ps1
```

**Start in production mode:**
```powershell
.\Start-CareSyncRx.ps1 -Environment production
```

**Start on a custom port:**
```powershell
.\Start-CareSyncRx.ps1 -Port 8080
```

**Start with a clean environment:**
```powershell
.\Start-CareSyncRx.ps1 -Clean
```

**Start in production mode on port 5000 with a clean environment:**
```powershell
.\Start-CareSyncRx.ps1 -Environment production -Port 5000 -Clean
```

## Environment Modes

### Development Mode

Development mode is optimized for local development:
- Hot reloading enabled
- Detailed error messages
- Debug information available
- Performance optimizations for development

### Production Mode

Production mode simulates a production environment:
- Builds the application first
- Optimized for performance
- Reduced debug output
- Simulates the actual production deployment

## Clean Start Option

The `-Clean` option performs the following actions:
- Removes the `.next` cache directory
- Clears Node.js module caches
- Cleans npm cache
- Regenerates Prisma client

Use this option when you:
- Update dependencies
- Experience unexpected errors
- Switch branches
- Need to ensure a fresh environment

## Troubleshooting

### Port Conflicts

If port 3000 (or your specified port) is already in use:
1. The script will attempt to identify and terminate the process using that port
2. If automatic termination fails, you'll be prompted to continue or exit
3. If you choose to exit, you can manually free the port and try again

To manually check what's using port 3000:
```powershell
netstat -ano | findstr :3000
```

To manually kill a process by its PID:
```powershell
taskkill /F /PID <process_id>
```

### Permission Issues

If you encounter permission errors:

- **Run as Administrator**: Right-click on PowerShell and select "Run as Administrator"
- **Adjust execution policy**: Run this command in PowerShell:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  ```

### Node.js Issues

If the script reports Node.js environment problems:

1. Ensure Node.js is installed and in your PATH
2. Verify you're using Node.js v16.x or higher
3. Check if npm is working properly with `npm -v`

### Build Failures

If the application fails to build in production mode:

1. Check the error messages in the console
2. Ensure all dependencies are installed with `npm install`
3. Try running with the `-Clean` flag
4. Check for TypeScript errors with `npx tsc --noEmit`

## Advanced Troubleshooting

### Common Error Codes

| Error Code | Description | Possible Solution |
|------------|-------------|-------------------|
| 1 | General Node.js error | Check console output for details |
| 137 | Out of memory error | Increase NODE_OPTIONS memory limit |
| 130 | User terminated (Ctrl+C) | Normal termination by user |
| EADDRINUSE | Port already in use | The script will attempt to free the port, or you can manually terminate the process |
| EACCES | Permission denied | Run PowerShell as Administrator |

### Debugging Port Issues

If you continue to have issues with port 3000 (or your custom port):

```powershell
# Find what's using the port
netstat -ano | findstr :3000

# Kill a process by PID
taskkill /F /PID <process_id>
```

## Advanced Usage

### Integrating with VS Code

You can configure VS Code tasks to use this script:

1. Create or edit `.vscode/tasks.json`
2. Add the following configuration:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start CareSyncRx (Dev)",
      "type": "shell",
      "command": "powershell -ExecutionPolicy Bypass -File .\\Start-CareSyncRx.ps1",
      "problemMatcher": []
    },
    {
      "label": "Start CareSyncRx (Prod)",
      "type": "shell",
      "command": "powershell -ExecutionPolicy Bypass -File .\\Start-CareSyncRx.ps1 -Environment production",
      "problemMatcher": []
    },
    {
      "label": "Start CareSyncRx (Clean)",
      "type": "shell",
      "command": "powershell -ExecutionPolicy Bypass -File .\\Start-CareSyncRx.ps1 -Clean",
      "problemMatcher": []
    }
  ]
}
```

### Continuous Integration

For CI/CD pipelines, you can use the script in a non-interactive mode:

```powershell
# For CI/CD environments
powershell -ExecutionPolicy Bypass -NonInteractive -Command ".\Start-CareSyncRx.ps1 -Environment production"
```

### Environment Variables

The script sets the following environment variables:

**Development Mode:**
- `NODE_OPTIONS="--no-warnings --max-old-space-size=4096 --trace-warnings"`
- `NEXT_PUBLIC_REACT_STRICT_MODE="false"`
- `NEXT_DEBUG_BUILD="1"`
- `NEXT_WEBPACK_TRACING="1"`

**Production Mode:**
- `NODE_ENV="production"`
- `NODE_OPTIONS="--max-old-space-size=8192"`

**Common:**
- `PORT="<specified port>"`
- `NEXT_TELEMETRY_DISABLED="1"`
