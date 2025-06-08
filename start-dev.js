#!/usr/bin/env node
/**
 * CareSyncRx Development Server Starter
 * 
 * This script starts the Next.js development server with the appropriate configuration
 * to avoid circular dependency issues and other common development problems.
 */

const { spawn, spawnSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const PORT = process.env.PORT || 3001; // Changed default port to 3001
const isWindows = os.platform() === 'win32';
const isMac = os.platform() === 'darwin';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m"
};

// Banner
console.log(`${colors.cyan}${colors.bright}=====================================================${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}       CareSyncRx Development Server Starter         ${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}=====================================================${colors.reset}`);
console.log();

// Check if we're in the right directory
const packageJsonPath = path.resolve(process.cwd(), 'package.json');
if (!existsSync(packageJsonPath)) {
  console.error(`${colors.red}Error: package.json not found. Make sure you're running this script from the root of the project.${colors.reset}`);
  process.exit(1);
}

// Function to check if port is in use and kill the process
function checkAndKillPortProcess() {
  console.log(`${colors.yellow}Checking if port ${PORT} is already in use...${colors.reset}`);
  
  try {
    let portInUse = false;
    let pid = null;
    
    if (isWindows) {
      try {
        // On Windows, use netstat to find the process
        const result = spawnSync('netstat', ['-ano'], { shell: true });
        const output = result.stdout.toString();
        const lines = output.split('\n');
        
        for (const line of lines) {
          if (line.includes(`:${PORT}`) && line.includes('LISTENING')) {
            portInUse = true;
            const match = line.match(/\s+(\d+)$/);
            if (match && match[1]) {
              pid = match[1].trim();
            }
            break;
          }
        }
      } catch (e) {
        console.error(`${colors.red}Error checking port: ${e.message}${colors.reset}`);
      }
      
      // If process found, try to kill it
      if (portInUse && pid) {
        console.log(`${colors.yellow}Port ${PORT} is in use by process ID ${pid}. Attempting to terminate...${colors.reset}`);
        try {
          spawnSync('taskkill', ['/F', '/PID', pid], { shell: true });
          console.log(`${colors.green}Process terminated successfully.${colors.reset}`);
        } catch (e) {
          console.error(`${colors.red}Failed to terminate process: ${e.message}${colors.reset}`);
          console.log(`${colors.yellow}Please manually terminate the process using the PID ${pid}.${colors.reset}`);
        }
      }
    } else if (isMac || !isWindows) {
      // For Mac and Linux systems
      try {
        const cmd = isMac ? 'lsof' : 'ss';
        const args = isMac ? ['-i', `:${PORT}`] : ['-tlnp', `( sport = :${PORT} )`];
        
        const result = spawnSync(cmd, args, { shell: true });
        const output = result.stdout.toString();
        
        if (output.trim()) {
          portInUse = true;
          
          if (isMac) {
            const lines = output.split('\n');
            if (lines.length > 1) {
              const parts = lines[1].split(/\s+/);
              pid = parts[1];
            }
          } else {
            // Linux parsing
            const match = output.match(/pid=(\d+)/);
            if (match && match[1]) {
              pid = match[1];
            }
          }
          
          // If process found, try to kill it
          if (pid) {
            console.log(`${colors.yellow}Port ${PORT} is in use by process ID ${pid}. Attempting to terminate...${colors.reset}`);
            try {
              spawnSync('kill', ['-9', pid], { shell: true });
              console.log(`${colors.green}Process terminated successfully.${colors.reset}`);
            } catch (e) {
              console.error(`${colors.red}Failed to terminate process: ${e.message}${colors.reset}`);
              console.log(`${colors.yellow}Please manually terminate the process using: sudo kill -9 ${pid}${colors.reset}`);
            }
          }
        }
      } catch (e) {
        console.error(`${colors.red}Error checking port: ${e.message}${colors.reset}`);
      }
    }
    
    if (portInUse && !pid) {
      console.log(`${colors.yellow}Port ${PORT} appears to be in use, but couldn't identify the process.${colors.reset}`);
    } else if (!portInUse) {
      console.log(`${colors.green}Port ${PORT} is available.${colors.reset}`);
    }
    
    // Small delay to ensure the port is fully released
    if (portInUse) {
      console.log(`${colors.dim}Waiting for port to be released...${colors.reset}`);
      spawnSync(isWindows ? 'timeout' : 'sleep', isWindows ? ['/t', '2'] : ['2'], { shell: true });
    }
    
  } catch (e) {
    console.error(`${colors.red}Error in port check: ${e.message}${colors.reset}`);
  }
}

// Check and kill any process using our port
checkAndKillPortProcess();

// Display startup message
console.log(`${colors.green}Starting development server with optimized configuration...${colors.reset}`);
console.log(`${colors.dim}• Using port: ${PORT}${colors.reset}`);
console.log(`${colors.dim}• Platform: ${os.platform()} (${os.arch()})${colors.reset}`);
console.log(`${colors.dim}• Node.js: ${process.version}${colors.reset}`);
console.log();

// Environment variables to avoid circular dependencies
const env = {
  ...process.env,
  NODE_OPTIONS: '--no-warnings --max-old-space-size=4096 --trace-warnings',
  PORT: PORT.toString(),
  // Add flags to help with circular dependency resolution
  NEXT_TELEMETRY_DISABLED: '1',
  // Disable React strict mode during development to avoid double rendering issues
  NEXT_PUBLIC_REACT_STRICT_MODE: 'false',
  // Add debugging for webpack
  NEXT_DEBUG_BUILD: '1',
  NEXT_WEBPACK_TRACING: '1',
  // Add chunk loading error debugging 
  NEXT_CHUNK_LOAD_ERROR_DEBUG: '1'
};

// Start the Next.js development server with optimal configuration for circular dependency prevention
console.log(`${colors.yellow}Starting Next.js development server on port ${PORT}...${colors.reset}`);
console.log();

const nextDev = spawn(npmCmd, ['run', 'dev', '--', '-p', PORT.toString()], {
  env,
  stdio: 'inherit',
  shell: true
});

// Handle process exit
nextDev.on('close', (code) => {
  if (code !== 0) {
    console.log(`${colors.red}Development server exited with code ${code}${colors.reset}`);
  }
  process.exit(code);
});

// Handle termination signals
process.on('SIGINT', () => {
  nextDev.kill('SIGINT');
});

process.on('SIGTERM', () => {
  nextDev.kill('SIGTERM');
});

// Function to verify that the authentication system is properly configured
function verifyAuthSystem() {
  console.log(`${colors.yellow}Verifying authentication system...${colors.reset}`);
  
  // Check if all required auth scripts exist
  const requiredAuthScripts = [
    path.resolve(process.cwd(), 'public', 'token-management.js'),
    path.resolve(process.cwd(), 'public', 'auth-navigation.js'),
    path.resolve(process.cwd(), 'public', 'auth-verification.js'),
    path.resolve(process.cwd(), 'public', 'auth-error-handler.js'),
    path.resolve(process.cwd(), 'public', 'auth-logout.js')
  ];
  
  let missingScripts = [];
  
  for (const scriptPath of requiredAuthScripts) {
    if (!existsSync(scriptPath)) {
      missingScripts.push(path.basename(scriptPath));
    }
  }
  
  if (missingScripts.length > 0) {
    console.error(`${colors.red}Error: Missing auth scripts: ${missingScripts.join(', ')}${colors.reset}`);
    console.error(`${colors.red}The authentication system will not work correctly without these files.${colors.reset}`);
    return false;
  }
  
  console.log(`${colors.green}Authentication system verified successfully.${colors.reset}`);
  return true;
}

// Verify the authentication system configuration
if (!verifyAuthSystem()) {
  console.warn(`${colors.yellow}Authentication system verification failed. The application may not function correctly.${colors.reset}`);
  console.warn(`${colors.yellow}Please make sure all required auth files are present in the public directory.${colors.reset}`);
  console.warn(`${colors.yellow}See docs/auth-system/README.md for more information.${colors.reset}`);
  console.warn(`${colors.yellow}Continuing with development server startup anyway...${colors.reset}`);
  console.log();
}
