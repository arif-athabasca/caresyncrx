/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Security Audit Log
 * Records and analyzes security-related events for regular auditing
 */

import { NextRequest } from 'next/server';
import prisma from '../../lib/prisma';
import { v4 as uuidv4 } from 'uuid';

/**
 * Severity levels for security events
 */
export enum SecurityEventSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL'
}

/**
 * Types of security events
 */
export enum SecurityEventType {  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  
  // 2FA events
  TWO_FACTOR_SETUP = 'TWO_FACTOR_SETUP',
  TWO_FACTOR_SUCCESS = 'TWO_FACTOR_SUCCESS',
  TWO_FACTOR_FAILURE = 'TWO_FACTOR_FAILURE',
  
  // Access control events
  ACCESS_DENIED = 'ACCESS_DENIED',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  ROLE_CHANGE = 'ROLE_CHANGE',
  
  // Rate limiting and blocking events
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  IP_BLOCKED = 'IP_BLOCKED',
  
  // Data events
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  DATA_EXPORT = 'DATA_EXPORT',
  
  // System events
  SYSTEM_SETTING_CHANGE = 'SYSTEM_SETTING_CHANGE',
  API_KEY_GENERATED = 'API_KEY_GENERATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
  
  // Security configuration events
  SECURITY_POLICY_CHANGE = 'SECURITY_POLICY_CHANGE',
  
  // Other
  OTHER = 'OTHER'
}

/**
 * Security event data structure
 */
interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  userId?: string;
  username?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Log a security event to the database and console
 * 
 * @param event - The security event to log
 * @returns The logged event ID
 */
export async function logSecurityEvent(
  event: Omit<SecurityEvent, 'id' | 'timestamp'>
): Promise<string> {
  const eventId = uuidv4();
  const timestamp = new Date();
  
  try {
    const securityEvent: SecurityEvent = {
      id: eventId,
      timestamp,
      ...event
    };
    
    // Log to console with appropriate level
    switch (event.severity) {
      case SecurityEventSeverity.CRITICAL:
        console.error(`[SECURITY:CRITICAL] ${event.type}: ${event.description}`);
        break;
      case SecurityEventSeverity.WARNING:
        console.warn(`[SECURITY:WARNING] ${event.type}: ${event.description}`);
        break;
      case SecurityEventSeverity.INFO:
      default:
        console.info(`[SECURITY:INFO] ${event.type}: ${event.description}`);
    }
    
    // Store in database for audit trail
    try {
      await prisma.securityAuditLog.create({
        data: {
          id: eventId,
          timestamp,
          eventType: event.type,
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
    } catch (dbError) {
      console.error('Failed to write security event to database:', dbError);
    }
    
    return eventId;
  } catch (error) {
    console.error('Error logging security event:', error);
    return eventId;
  }
}

/**
 * Log a security event from a request context
 * 
 * @param request - The request object 
 * @param type - The type of security event
 * @param severity - The severity level
 * @param description - Description of the event
 * @param metadata - Additional metadata
 * @returns The logged event ID
 */
export async function logSecurityEventFromRequest(
  request: NextRequest,
  type: SecurityEventType,
  severity: SecurityEventSeverity,
  description: string,
  metadata?: Record<string, any>
): Promise<string> {  // Extract request information
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const path = new URL(request.url).pathname;
  const method = request.method;
  
  // Extract user information from headers (set by auth middleware)
  const userId = request.headers.get('x-user-id') || undefined;
  const username = request.headers.get('x-user-email') || undefined;
  const userRole = request.headers.get('x-user-role') || undefined;
  
  return logSecurityEvent({
    type,
    severity,
    userId,
    username,
    userRole,
    ipAddress,
    userAgent,
    path,
    method,
    description,
    metadata
  });
}

/**
 * Security audit service for analyzing events and generating reports
 */
export class SecurityAuditService {
  /**
   * Generate a security audit report for a specific time period
   * 
   * @param startDate - Start of audit period
   * @param endDate - End of audit period
   * @returns Audit report data
   */
  static async generateAuditReport(
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    try {
      // Get all security events in time period
      const events = await prisma.securityAuditLog.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      });
      
      // Calculate statistics
      const totalEvents = events.length;
      const eventsByType = this.groupBy(events, 'eventType');
      const eventsBySeverity = this.groupBy(events, 'severity');
      
      // Find critical events
      const criticalEvents = events.filter(e => e.severity === SecurityEventSeverity.CRITICAL);
      
      // Group by IP address to find potential attacks
      const eventsByIP = this.groupBy(events, 'ipAddress');
      const suspiciousIPs = Object.entries(eventsByIP)
        .filter(([_, events]) => events.length > 50)
        .map(([ip, events]) => ({
          ip,
          count: events.length,
          firstSeen: events[0].timestamp,
          lastSeen: events[events.length - 1].timestamp
        }));
      
      // Group by user to find suspicious user activity
      const eventsByUser = this.groupBy(events.filter(e => e.userId), 'userId');
      const suspiciousUsers = Object.entries(eventsByUser)
        .filter(([_, events]) => {
          const failedLogins = events.filter(e => e.eventType === SecurityEventType.LOGIN_FAILURE).length;
          return failedLogins > 5;
        })
        .map(([userId, events]) => ({
          userId,
          username: events[0].username,
          failedLogins: events.filter(e => e.eventType === SecurityEventType.LOGIN_FAILURE).length,
          accessDenied: events.filter(e => e.eventType === SecurityEventType.ACCESS_DENIED).length
        }));
      
      // Return audit report
      return {
        period: {
          start: startDate,
          end: endDate
        },
        summary: {
          totalEvents,
          criticalEventsCount: criticalEvents.length,
          warningEventsCount: events.filter(e => e.severity === SecurityEventSeverity.WARNING).length,
          infoEventsCount: events.filter(e => e.severity === SecurityEventSeverity.INFO).length,
        },
        eventsByType,
        eventsBySeverity,
        criticalEvents,
        suspiciousIPs,
        suspiciousUsers,
        recommendations: this.generateRecommendations({
          criticalEvents,
          suspiciousIPs,
          suspiciousUsers
        })
      };
    } catch (error) {
      console.error('Error generating security audit report:', error);
      throw error;
    }
  }
  
  /**
   * Generate security recommendations based on audit data
   */
  private static generateRecommendations(data: any): string[] {
    const recommendations: string[] = [];
    
    // Critical events recommendations
    if (data.criticalEvents.length > 0) {
      recommendations.push('Review all critical security events immediately');
    }
    
    // Suspicious IP recommendations
    if (data.suspiciousIPs.length > 0) {
      recommendations.push(`Consider blocking ${data.suspiciousIPs.length} suspicious IP addresses with high activity`);
    }
    
    // Suspicious user recommendations
    if (data.suspiciousUsers.length > 0) {
      recommendations.push(`Review ${data.suspiciousUsers.length} user accounts with suspicious login activity`);
    }
    
    return recommendations;
  }
  
  /**
   * Helper to group array elements by property
   */
  private static groupBy(array: any[], key: string): Record<string, any[]> {
    return array.reduce((result, item) => {
      const groupKey = item[key] || 'unknown';
      result[groupKey] = result[groupKey] || [];
      result[groupKey].push(item);
      return result;
    }, {});
  }
}
