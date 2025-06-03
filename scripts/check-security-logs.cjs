/**
 * Simple script to check security audit log entries
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSecurityAuditLog() {
  try {
    // Get all security audit logs
    const logs = await prisma.securityAuditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20
    });
    
    if (logs && logs.length > 0) {
      console.log(`✅ Found ${logs.length} security audit logs:`);
      
      logs.forEach(log => {
        console.log(`\n[${log.timestamp.toISOString()}] [${log.severity}] ${log.eventType}`);
        console.log(`Description: ${log.description}`);
        console.log(`User: ${log.username || 'unknown'} (${log.userId || 'no ID'})`);
        if (log.ipAddress) console.log(`IP: ${log.ipAddress}`);
        if (log.path) console.log(`Path: ${log.path}`);
        console.log('---');
      });
    } else {
      console.log('❌ No security audit logs found');
    }
  } catch (error) {
    console.error('Error checking security audit logs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the query
checkSecurityAuditLog();
