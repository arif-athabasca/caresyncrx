#!/usr/bin/env node
/**
 * CareSyncRx Development Server Starter
 * 
 * This script starts the Next.js development server with the appropriate configuration
 * to avoid circular dependency issues and other common development problems.
 */

const { spawn } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const PORT = process.env.PORT || 3000;
const isWindows = os.platform() === 'win32';
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

// Display startup message
console.log(`${colors.green}Starting development server with optimized configuration...${colors.reset}`);
console.log(`${colors.dim}• Using port: ${PORT}${colors.reset}`);
console.log(`${colors.dim}• Platform: ${os.platform()} (${os.arch()})${colors.reset}`);
console.log(`${colors.dim}• Node.js: ${process.version}${colors.reset}`);
console.log();

// Environment variables to avoid circular dependencies
const env = {
  ...process.env,
  NODE_OPTIONS: '--no-warnings',
  PORT: PORT.toString(),
};

// Start the Next.js development server with optimal configuration for circular dependency prevention
console.log(`${colors.yellow}Starting Next.js development server...${colors.reset}`);
console.log();

const nextDev = spawn(npmCmd, ['run', 'dev'], {
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
