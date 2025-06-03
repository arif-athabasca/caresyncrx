#!/usr/bin/env node
/**
 * Script to check port 3000 availability and help users diagnose issues
 * This is a cross-platform script that will work on Windows, Mac, and Linux
 */

const { execSync } = require('child_process');
const os = require('os');

const PORT = 3000;
const isWindows = os.platform() === 'win32';
const isMac = os.platform() === 'darwin';

console.log('\n🔍 CareSyncRx Development Server - Port Availability Check');
console.log('--------------------------------------------------\n');
console.log(`Checking if port ${PORT} is available...`);

try {
  let portInUse = false;
  let processInfo = '';
  
  if (isWindows) {
    try {
      // On Windows, use netstat
      const result = execSync(`netstat -ano | findstr :${PORT}`).toString();
      if (result.trim()) {
        portInUse = true;
        processInfo = result;
        
        // Try to get process name
        const pidMatch = result.match(/\s+(\d+)$/m);
        if (pidMatch && pidMatch[1]) {
          try {
            const pid = pidMatch[1].trim();
            const processDetails = execSync(`tasklist /fi "PID eq ${pid}"`).toString();
            processInfo = `${processInfo}\n\nProcess details:\n${processDetails}`;
          } catch (e) {
            // Ignore errors getting process details
          }
        }
      }
    } catch (err) {
      // If the command fails or returns empty, port is likely available
      portInUse = false;
    }
  } else if (isMac) {
    try {
      // On Mac, use lsof
      const result = execSync(`lsof -i :${PORT}`).toString();
      if (result.trim()) {
        portInUse = true;
        processInfo = result;
      }
    } catch (err) {
      // If the command fails or returns empty, port is likely available
      portInUse = false;
    }
  } else {
    try {
      // On Linux, use ss
      const result = execSync(`ss -tlnp | grep :${PORT}`).toString();
      if (result.trim()) {
        portInUse = true;
        processInfo = result;
      }
    } catch (err) {
      // Try lsof as fallback
      try {
        const result = execSync(`lsof -i :${PORT}`).toString();
        if (result.trim()) {
          portInUse = true;
          processInfo = result;
        }
      } catch (e) {
        // If both commands fail, port is likely available
        portInUse = false;
      }
    }
  }
  
  if (portInUse) {
    console.log(`❌ Port ${PORT} is in use!`);
    console.log('\nProcess details:');
    console.log(processInfo);
    
    console.log('\n🛑 Next.js development server will not be able to start on port 3000.');
    console.log('To free this port, you can:');
    
    if (isWindows) {
      console.log('  1. Run the cleanup script: npm run dev:win');
      console.log('  2. Or manually terminate the process:');
      console.log('     - Find the PID in the process details above');
      console.log('     - Run: taskkill /F /PID <PID>');
    } else {
      console.log('  1. Run the cleanup script: npm run dev:unix');
      console.log('  2. Or manually terminate the process:');
      console.log('     - Find the PID in the process details above');
      console.log('     - Run: kill -9 <PID>');
    }
  } else {
    console.log(`✅ Port ${PORT} is available!`);
    console.log('\nYou can start the development server with:');
    
    if (isWindows) {
      console.log('  - npm run dev:win     (PowerShell script)');
    } else if (isMac || !isWindows) {
      console.log('  - npm run dev:unix    (Bash script)');
    }
    console.log('  - npm run dev:clean   (Cross-platform script)');
    console.log('  - npm run dev:port3000 (Direct Next.js command)');
  }
  
} catch (error) {
  console.error(`❓ Unable to determine if port ${PORT} is available:`);
  console.error(`   ${error.message}`);
  console.error('\nPlease run a port availability check manually:');
  if (isWindows) {
    console.log('  netstat -ano | findstr :3000');
  } else if (isMac) {
    console.log('  lsof -i :3000');
  } else {
    console.log('  ss -tlnp | grep :3000');
  }
}

console.log('\n');
