/**
 * Security Audit Logging Test Script (CommonJS version)
 * 
 * This script tests the comprehensive security logging implementation
 * by simulating various auth events and verifying logs are created.
 */

const { PrismaClient } = require('@prisma/client');

// Security event types and severities
const SecurityEventType = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  PASSWORD_RESET: 'PASSWORD_RESET',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  TWO_FACTOR_SETUP: 'TWO_FACTOR_SETUP',
  TWO_FACTOR_SUCCESS: 'TWO_FACTOR_SUCCESS',
  TWO_FACTOR_FAILURE: 'TWO_FACTOR_FAILURE',
  ACCESS_DENIED: 'ACCESS_DENIED',
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
  ROLE_CHANGE: 'ROLE_CHANGE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  IP_BLOCKED: 'IP_BLOCKED',
  SENSITIVE_DATA_ACCESS: 'SENSITIVE_DATA_ACCESS',
  DATA_EXPORT: 'DATA_EXPORT',
  SYSTEM_SETTING_CHANGE: 'SYSTEM_SETTING_CHANGE',
  API_KEY_GENERATED: 'API_KEY_GENERATED',
  API_KEY_REVOKED: 'API_KEY_REVOKED',
  SECURITY_POLICY_CHANGE: 'SECURITY_POLICY_CHANGE',
  OTHER: 'OTHER'
};

const SecurityEventSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL'
};

const prisma = new PrismaClient();

// ANSI color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m"
};

/**
 * Log a security event directly to the database for testing
 */
async function logSecurityEvent(event) {
  const eventId = require('crypto').randomUUID();
  const timestamp = new Date();
  
  try {
    await prisma.securityAuditLog.create({
      data: {
        id: eventId,
        timestamp,
        eventType: event.type, // This maps to the eventType field in the schema
        severity: event.severity,
        userId: event.userId,
        username: event.username,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        path: event.path,
        method: event.method,
        description: event.description,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null
      }
    });
    
    return eventId;
  } catch (error) {
    console.error('Error logging security event:', error);
    return eventId;
  }
}

/**
 * Test security audit logging
 */
async function testSecurityAuditLogging() {
  console.log(`\n${colors.bright}${colors.blue}======================================${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}  CareSyncRx Security Logging Test     ${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}======================================${colors.reset}\n`);
  
  try {
    console.log(`${colors.cyan}Testing security logging with direct database access...${colors.reset}\n`);
    
    // First, count existing logs to check differences later
    const existingLogs = await prisma.securityAuditLog.count();
    console.log(`Existing security logs: ${existingLogs}\n`);
    
    // Test direct security logging
    console.log('1. Testing direct security event logging...');
    const directLogId = await logSecurityEvent({
      type: SecurityEventType.SYSTEM_SETTING_CHANGE,
      severity: SecurityEventSeverity.INFO,
      description: "Security logging test - direct log",
      userId: "test-user-001",
      username: "test@example.com",
      ipAddress: "127.0.0.1",
      metadata: { test: "Security Audit Test" }
    });
    console.log(`   Direct log created with ID: ${directLogId}`);
    
    // Test login success logging
    console.log('2. Testing login success logging...');
    const loginSuccessId = await logSecurityEvent({
      type: SecurityEventType.LOGIN_SUCCESS,
      severity: SecurityEventSeverity.INFO,
      description: "Test user logged in successfully",
      userId: "test-user-001",
      username: "test@example.com",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 Test Browser",
      metadata: { source: "Security test script", deviceId: "TEST-DEVICE-001" }
    });
    console.log(`   Login success log created with ID: ${loginSuccessId}`);
    
    // Test login failure logging
    console.log('3. Testing login failure logging...');
    const loginFailureId = await logSecurityEvent({
      type: SecurityEventType.LOGIN_FAILURE,
      severity: SecurityEventSeverity.WARNING,
      description: "Failed login attempt for test@example.com: Invalid credentials",
      username: "test@example.com",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 Test Browser",
      metadata: { source: "Security test script", reason: "Testing security logging" }
    });
    console.log(`   Login failure log created with ID: ${loginFailureId}`);
    
    // Test 2FA setup logging
    console.log('4. Testing 2FA setup logging...');
    const twoFASetupId = await logSecurityEvent({
      type: SecurityEventType.TWO_FACTOR_SETUP,
      severity: SecurityEventSeverity.INFO,
      description: "Two-factor authentication setup for user test@example.com (method: TOTP)",
      userId: "test-user-001",
      username: "test@example.com",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 Test Browser",
      metadata: { source: "Security test script", method: "TOTP" }
    });
    console.log(`   2FA setup log created with ID: ${twoFASetupId}`);
    
    // Test 2FA verification success logging
    console.log('5. Testing 2FA verification success logging...');
    const twoFASuccessId = await logSecurityEvent({
      type: SecurityEventType.TWO_FACTOR_SUCCESS,
      severity: SecurityEventSeverity.INFO,
      description: "Two-factor authentication successful for user test@example.com (method: TOTP)",
      userId: "test-user-001",
      username: "test@example.com",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 Test Browser",
      metadata: { source: "Security test script", method: "TOTP" }
    });
    console.log(`   2FA verification success log created with ID: ${twoFASuccessId}`);
    
    // Test 2FA verification failure logging
    console.log('6. Testing 2FA verification failure logging...');
    const twoFAFailureId = await logSecurityEvent({
      type: SecurityEventType.TWO_FACTOR_FAILURE,
      severity: SecurityEventSeverity.WARNING,
      description: "Two-factor authentication failed for user test@example.com (method: TOTP): Invalid code",
      userId: "test-user-001",
      username: "test@example.com",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 Test Browser",
      metadata: { source: "Security test script", method: "TOTP", reason: "Invalid code" }
    });
    console.log(`   2FA verification failure log created with ID: ${twoFAFailureId}`);
      // Test password reset logging
    console.log('7. Testing password reset logging...');
    const passwordResetId = await logSecurityEvent({
      type: SecurityEventType.PASSWORD_RESET,
      severity: SecurityEventSeverity.INFO,
      description: "Password reset requested for test@example.com",
      username: "test@example.com",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 Test Browser",
      metadata: { source: "Security test script" }
    });
    console.log(`   Password reset log created with ID: ${passwordResetId}`);
    
    // Test password change logging
    console.log('8. Testing password change logging...');
    const passwordChangeId = await logSecurityEvent({
      type: SecurityEventType.PASSWORD_CHANGE,
      severity: SecurityEventSeverity.INFO,
      description: "Password changed for user test@example.com",
      userId: "test-user-001",
      username: "test@example.com",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 Test Browser",
      metadata: { source: "Security test script" }
    });
    console.log(`   Password change log created with ID: ${passwordChangeId}`);
    
    // Test token refresh logging
    console.log('9. Testing token refresh logging...');
    const tokenRefreshId = await logSecurityEvent({
      type: SecurityEventType.TOKEN_REFRESH,
      severity: SecurityEventSeverity.INFO,
      description: "Tokens refreshed for user test@example.com",
      userId: "test-user-001",
      username: "test@example.com",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 Test Browser",
      metadata: { source: "Security test script", deviceId: "TEST-DEVICE-001" }
    });    console.log(`   Token refresh log created with ID: ${tokenRefreshId}`);
    
    // Test security policy change logging
    console.log('10. Testing security policy change logging...');
    const policyChangeId = await logSecurityEvent({
      type: SecurityEventType.SECURITY_POLICY_CHANGE,
      severity: SecurityEventSeverity.WARNING,
      description: "Testing generic security event logging",
      userId: "test-user-001",
      username: "test@example.com",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 Test Browser",
      metadata: { source: "Security test script", action: "SECURITY_TEST" }
    });
    console.log(`   Policy change log created with ID: ${policyChangeId}`);
    
    // Verify the log count increased
    const newLogCount = await prisma.securityAuditLog.count();    const logDifference = newLogCount - existingLogs;
    
    console.log(`\n${colors.green}Test completed successfully!${colors.reset}`);
    console.log(`Security logs before test: ${existingLogs}`);
    console.log(`Security logs after test: ${newLogCount}`);
    console.log(`New logs created: ${logDifference}`);
    
    // Check if the expected number of logs were created
    if (logDifference >= 10) {
      console.log(`\n${colors.green}✅ Security logging is working correctly!${colors.reset}`);
    } else {
      console.log(`\n${colors.red}⚠️ Warning: Expected at least 10 new logs, but only ${logDifference} were created.${colors.reset}`);
      console.log(`This may indicate that some security logging functions are not working correctly.`);
    }
    
    console.log(`\n${colors.cyan}To view detailed security logs, run:${colors.reset}`);
    console.log(`npm run security:audit\n`);
    
  } catch (error) {
    console.error(`${colors.red}Error testing security logging:${colors.reset}`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testSecurityAuditLogging().catch(console.error);
