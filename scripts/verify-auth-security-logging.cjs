/**
 * Verify Authentication Security Logging
 * 
 * This script checks if all authentication operations properly log security events
 * for PIPEDA compliance. It tests all authentication flows including:
 * - Login
 * - Logout
 * - Token refresh
 * - Password reset
 * - Password change
 * - 2FA setup and verification
 * 
 * Usage: 
 * node scripts/verify-auth-security-logging.cjs
 */

const { PrismaClient } = require('@prisma/client');
const colors = require('./utils/console-colors.cjs');
const path = require('path');
const fs = require('fs');

// Initialize Prisma client
const prisma = new PrismaClient();

// Security event types to verify
const securityEvents = {
  // Authentication events
  LOGIN_SUCCESS: 'Login success',
  LOGIN_FAILURE: 'Login failure',
  LOGOUT: 'Logout',
  PASSWORD_RESET: 'Password reset',
  PASSWORD_CHANGE: 'Password change',
  TOKEN_REFRESH: 'Token refresh',
  
  // 2FA events
  TWO_FACTOR_SETUP: '2FA setup',
  TWO_FACTOR_SUCCESS: '2FA verification success',
  TWO_FACTOR_FAILURE: '2FA verification failure',
  
  // Access control events
  ACCESS_DENIED: 'Access denied'
};

/**
 * Main verification function
 */
async function verifyAuthLogging() {
  console.log(`\n${colors.cyan}CareSyncRx Authentication Security Logging Verification${colors.reset}`);
  console.log(`${colors.gray}======================================================${colors.reset}\n`);
  
  try {
    // Check if the database has security audit logs
    const logCount = await prisma.securityAuditLog.count();
    console.log(`Found ${colors.cyan}${logCount}${colors.reset} security audit logs in the database`);
    
    if (logCount === 0) {
      console.log(`\n${colors.yellow}Warning:${colors.reset} No security logs found. The system may not have been used yet.`);
      console.log(`Run the test-security-logging.cjs script first to generate test logs.`);
      return;
    }
    
    // Get counts for each security event type
    console.log(`\n${colors.cyan}Checking security event coverage:${colors.reset}`);
    
    for (const [eventType, description] of Object.entries(securityEvents)) {
      const count = await prisma.securityAuditLog.count({
        where: { type: eventType }
      });
      
      const status = count > 0 
        ? `${colors.green}✓ Logged (${count} events)${colors.reset}`
        : `${colors.red}✗ Not found${colors.reset}`;
        
      console.log(`  ${description.padEnd(25)}: ${status}`);
    }
    
    // Check if all authentication events are being logged
    const missingEvents = [];
    for (const [eventType, description] of Object.entries(securityEvents)) {
      const count = await prisma.securityAuditLog.count({
        where: { type: eventType }
      });
      
      if (count === 0) {
        missingEvents.push(eventType);
      }
    }
    
    // Summary and recommendations
    console.log(`\n${colors.cyan}Authentication Logging Status:${colors.reset}`);
    
    if (missingEvents.length === 0) {
      console.log(`\n${colors.green}✓ All authentication events are being logged properly${colors.reset}`);
      console.log(`\nThe system is correctly logging all security events required for PIPEDA compliance.`);
    } else {
      console.log(`\n${colors.yellow}⚠ Some authentication events are not being logged:${colors.reset}`);
      
      missingEvents.forEach(event => {
        console.log(`  - ${event} (${securityEvents[event]})`);
      });
      
      console.log(`\n${colors.yellow}Recommendations:${colors.reset}`);
      console.log(`1. Ensure that all authentication operations call the appropriate logging functions`);
      console.log(`2. Check if AuthSecurityLogger is being used consistently across all auth operations`);
      console.log(`3. Run the test-security-logging.cjs script to verify that logging works correctly`);
      console.log(`4. Test the application by performing all authentication operations manually`);
    }
    
    // Check if there are multiple log types for important events
    console.log(`\n${colors.cyan}Checking log details:${colors.reset}`);
    
    // Get sample logs for detailed inspection
    const sampleLogs = await prisma.securityAuditLog.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' }
    });
    
    if (sampleLogs.length > 0) {
      console.log(`\n${colors.cyan}Recent log samples:${colors.reset}`);
      
      sampleLogs.forEach(log => {
        console.log(`\n  ${colors.green}Event:${colors.reset} ${log.type}`);
        console.log(`  ${colors.green}Description:${colors.reset} ${log.description}`);
        console.log(`  ${colors.green}User:${colors.reset} ${log.username || 'unknown'}`);
        console.log(`  ${colors.green}Timestamp:${colors.reset} ${log.timestamp}`);
        console.log(`  ${colors.green}Severity:${colors.reset} ${log.severity}`);
        
        if (log.metadata) {
          console.log(`  ${colors.green}Details:${colors.reset} ${typeof log.metadata === 'object' ? JSON.stringify(log.metadata, null, 2) : log.metadata}`);
        }
      });
    }
    
  } catch (error) {
    console.error(`\n${colors.red}Error:${colors.reset} ${error.message}`);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check for console colors utility
const colorsPath = path.join(__dirname, 'utils/console-colors.cjs');
if (!fs.existsSync(colorsPath)) {
  fs.mkdirSync(path.join(__dirname, 'utils'), { recursive: true });
  fs.writeFileSync(colorsPath, `/**
 * Console colors for scripts
 */
module.exports = {
  reset: "\\x1b[0m",
  bright: "\\x1b[1m",
  dim: "\\x1b[2m",
  underscore: "\\x1b[4m",
  blink: "\\x1b[5m",
  reverse: "\\x1b[7m",
  hidden: "\\x1b[8m",
  
  black: "\\x1b[30m",
  red: "\\x1b[31m",
  green: "\\x1b[32m",
  yellow: "\\x1b[33m",
  blue: "\\x1b[34m",
  magenta: "\\x1b[35m",
  cyan: "\\x1b[36m",
  white: "\\x1b[37m",
  gray: "\\x1b[90m",
  
  bgBlack: "\\x1b[40m",
  bgRed: "\\x1b[41m",
  bgGreen: "\\x1b[42m",
  bgYellow: "\\x1b[43m",
  bgBlue: "\\x1b[44m",
  bgMagenta: "\\x1b[45m",
  bgCyan: "\\x1b[46m",
  bgWhite: "\\x1b[47m"
};`);
}

// Run the verification
verifyAuthLogging().catch(e => {
  console.error(`\n${colors.red}Error:${colors.reset} ${e.message}`);
  process.exit(1);
});
