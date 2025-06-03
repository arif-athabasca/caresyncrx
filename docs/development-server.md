# Development Server Management

This document explains how to use the development server scripts to ensure consistent behavior and port assignment.

## Available Scripts

The following scripts are available to manage the development server:

### 1. PowerShell Script (Windows)

For Windows users, we've created a PowerShell script that handles cleanup and server startup:

```powershell
# Run directly from PowerShell
.\scripts\Start-DevServer.ps1

# Or use the convenience batch file
.\start-dev.cmd

# Or via npm
npm run dev:win
```

This script will:
- Check if port 3000 is in use
- Terminate any running Node.js processes
- Clean the .next build directory
- Verify port 3000 is now available
- Start the Next.js server on port 3000

### 2. Bash Script (Mac/Linux/Unix)

For Mac and Linux users, we've created a Bash script:

```bash
# Run directly (make sure to set execute permission first)
chmod +x ./scripts/start-dev.sh
./scripts/start-dev.sh

# Or via npm script
npm run dev:unix
```

This script will:
- Check if port 3000 is in use and free it if needed
- Terminate any running Node.js processes
- Clean the .next build directory
- Verify port 3000 is now available
- Start the Next.js server on port 3000

### 3. Cross-Platform Node Script

For all platforms (Windows, Mac, Linux), we have a Node.js script:

```bash
# Run directly
node scripts/start-dev.cjs

# Or via npm script
npm run dev:clean
```

### 4. npm Scripts

We've added several npm scripts for convenience:

```bash
# Standard development command (uses Turbopack)
npm run dev

# Clean startup on port 3000 (kills existing processes)
npm run dev:clean

# Windows-specific PowerShell script
npm run dev:win

# Mac/Linux-specific Bash script
npm run dev:unix

# Start on port 3000 without cleanup
npm run dev:port3000

# Run REG-001 test case
npm run test:reg001
```

## Tools for Port Management

### Port Checker

We've included a cross-platform port checker tool that will help you diagnose port conflicts:

```bash
npm run port-check
```

This script will:
- Check if port 3000 is available
- If port is in use, show detailed information about which process is using it
- Provide guidance on how to free up the port
- Suggest the appropriate script to use for your platform

Example output when port is available:
```
🔍 CareSyncRx Development Server - Port Availability Check
--------------------------------------------------

Checking if port 3000 is available...
✅ Port 3000 is available!

You can start the development server with:
  - npm run dev:win     (PowerShell script)
  - npm run dev:clean   (Cross-platform script)
  - npm run dev:port3000 (Direct Next.js command)
```

Example output when port is in use:
```
🔍 CareSyncRx Development Server - Port Availability Check
--------------------------------------------------

Checking if port 3000 is available...
❌ Port 3000 is in use!

Process details:
TCP    127.0.0.1:3000         0.0.0.0:0              LISTENING       1234

Process details:
Image Name                     PID Session Name        Session#    Mem Usage
========================= ======== ================ =========== ============
node.exe                      1234 Console                    1     52,436 K

🛑 Next.js development server will not be able to start on port 3000.
To free this port, you can:
  1. Run the cleanup script: npm run dev:win
  2. Or manually terminate the process:
     - Find the PID in the process details above
     - Run: taskkill /F /PID 1234
```

## Testing

When running tests, all scripts now consistently use port 3000. This ensures that:

1. The server is always available at the same URL
2. Test scripts target the correct endpoints 
3. Documentation remains consistent

## Troubleshooting

### Port 3000 Already In Use

If you encounter issues with port 3000 being in use:

1. Run the cleanup script first: `npm run dev:clean` or `npm run dev:win` on Windows
2. If problems persist, manually check for processes:
   - Windows: `netstat -ano | findstr :3000`
   - Mac/Linux: `lsof -i :3000`
3. Kill any remaining processes:
   - Windows: `taskkill /F /PID <pid>`
   - Mac/Linux: `kill -9 <pid>`

### Script Not Terminating All Processes

If some Node.js processes are not being terminated:

1. On Windows, run PowerShell as Administrator and try:
   ```powershell
   Get-Process -Name "node" | Stop-Process -Force
   ```

2. On Mac/Linux, try:
   ```bash
   killall node
   ```

### Running Tests

When running tests like REG-001, ensure:

1. The server is running on port 3000
2. Any previous test data has been cleaned up
3. The test clinic ID is properly configured in the test scripts

To verify server port:
```bash
# Windows
netstat -ano | findstr :3000

# Mac/Linux
lsof -i :3000
```
