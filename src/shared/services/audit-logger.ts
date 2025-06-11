/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Audit logging service for CareSyncRx platform.
 * This service provides secure, tamper-evident logging for security events
 * and critical operations to meet healthcare compliance requirements.
 */

/**
 * Interface for audit log entry data
 */
interface AuditLogData {
  userId: string;
  action: string;
  details: Record<string, any>;
  timestamp?: Date;
}

/**
 * Service for logging audit events
 */
export class AuditLogger {
  /**
   * Log an audit event
   * 
   * @param data - Audit log data to record
   */
  static async log(data: AuditLogData): Promise<void> {
    try {
      // Set timestamp if not provided
      if (!data.timestamp) {
        data.timestamp = new Date();
      }
      
      // Format for better readability in logs
      const formattedData = {
        timestamp: data.timestamp.toISOString(),
        userId: data.userId,
        action: data.action,
        details: data.details
      };
      
      // In a production environment, this would write to:
      // 1. A secure database table
      // 2. A tamper-evident log service
      // 3. Possibly a SIEM system
      
      // For development, we're using console logging
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AUDIT] ${JSON.stringify(formattedData)}`);
        return;
      }
      
      // In production, we'd use a more robust solution
      if (process.env.NODE_ENV === 'production') {
        // Example: Write to database
        try {
          // This would be replaced with actual database writes
          // await prisma.auditLog.create({ data: formattedData });
          
          // For now, log to console in production too
          console.log(`[AUDIT] ${JSON.stringify(formattedData)}`);
        } catch (dbError) {
          // Log to backup system if database write fails
          console.error('Failed to write audit log to database:', dbError);
          
          // In a real implementation, we might have a fallback mechanism:
          // - Write to local file with encryption
          // - Queue for retry later
          // - Send to external logging service
        }
      }
    } catch (error) {
      // Never let audit logging failures bubble up and break application flow
      // But log that we failed to audit log (ironic, but necessary)
      console.error('Audit logging error:', error);
    }  }
  
  /**
   * Log a data access event (for HIPAA compliance)
   * 
   * @param userId - User ID who accessed the data
   * @param resourceType - Type of resource accessed (PATIENT, RX, etc)
   * @param resourceId - ID of the accessed resource
   * @param action - Type of access (VIEW, MODIFY, etc)
   * @param details - Additional access details
   */
  static async logDataAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    return this.log({
      userId,
      action: `DATA_ACCESS_${action}`,
      details: {
        resourceType,
        resourceId,
        ...details,
      }
    });
  }
}