/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Auth Security Logger
 * Specialized logger for authentication and security events that logs to both
 * AuditLog and SecurityAuditLog tables to ensure comprehensive security tracking.
 */

import { AuditLogger } from '../../../shared/services/audit-logger';
import { SecurityEventType, SecurityEventSeverity, logSecurityEvent } from '../../../shared/services/security-audit';

/**
 * Interface for auth security log data
 */
interface AuthSecurityLogData {
  userId?: string;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  action: string;
  securityEventType: SecurityEventType;
  severity: SecurityEventSeverity;
  description: string;
  details?: Record<string, any>;
}

/**
 * Service for logging authentication and security events
 * Logs to both the AuditLog (for general auditing) and SecurityAuditLog (for security auditing)
 */
export class AuthSecurityLogger {
  /**
   * Log an authentication or security event
   * 
   * @param data - Data to log
   */
  static async log(data: AuthSecurityLogData): Promise<void> {
    try {
      // First, log to the regular AuditLog
      if (data.userId) {
        await AuditLogger.log({
          userId: data.userId,
          action: data.action,
          details: {
            ...data.details,
            securityEvent: data.securityEventType,
            severity: data.severity,
            resourceType: 'AUTH',
            ipAddress: data.ipAddress,
            path: data.path
          }
        });
      }
      
      // Then log to the SecurityAuditLog with more details
      await logSecurityEvent({
        type: data.securityEventType,
        severity: data.severity,
        userId: data.userId,
        username: data.username,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        path: data.path,
        method: data.method,
        description: data.description,
        metadata: data.details
      });
      
    } catch (error) {
      // Never let logging failures break the application
      console.error('Auth security logging error:', error);
    }
  }

  /**
   * Log a successful login
   */
  static async logLoginSuccess(data: {
    userId: string,
    username: string,
    ipAddress?: string,
    userAgent?: string,
    path?: string,
    method?: string,
    details?: Record<string, any>
  }): Promise<void> {
    return this.log({
      userId: data.userId,
      username: data.username,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      path: data.path,
      method: data.method,
      action: 'USER_LOGIN',
      securityEventType: SecurityEventType.LOGIN_SUCCESS,
      severity: SecurityEventSeverity.INFO,
      description: `User ${data.username} successfully logged in`,
      details: data.details
    });
  }

  /**
   * Log a failed login attempt
   */
  static async logLoginFailure(data: {
    userId?: string,
    username: string,
    ipAddress?: string,
    userAgent?: string,
    path?: string,
    method?: string,
    reason: string,
    details?: Record<string, any>
  }): Promise<void> {
    return this.log({
      userId: data.userId,
      username: data.username,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      path: data.path,
      method: data.method,
      action: 'LOGIN_FAILED',
      securityEventType: SecurityEventType.LOGIN_FAILURE,
      severity: SecurityEventSeverity.WARNING,
      description: `Failed login attempt for ${data.username}: ${data.reason}`,
      details: data.details
    });
  }

  /**
   * Log a logout event
   */
  static async logLogout(data: {
    userId: string,
    username: string,
    ipAddress?: string,
    userAgent?: string,
    path?: string,
    method?: string,
    details?: Record<string, any>
  }): Promise<void> {
    return this.log({
      userId: data.userId,
      username: data.username,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      path: data.path,
      method: data.method,
      action: 'USER_LOGOUT',
      securityEventType: SecurityEventType.LOGOUT,
      severity: SecurityEventSeverity.INFO,
      description: `User ${data.username} logged out`,
      details: data.details
    });
  }

  /**
   * Log a password change event
   */
  static async logPasswordChange(data: {
    userId: string,
    username: string,
    ipAddress?: string,
    userAgent?: string,
    path?: string,
    method?: string,
    details?: Record<string, any>
  }): Promise<void> {
    return this.log({
      userId: data.userId,
      username: data.username,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      path: data.path,
      method: data.method,
      action: 'PASSWORD_CHANGED',
      securityEventType: SecurityEventType.PASSWORD_CHANGE,
      severity: SecurityEventSeverity.INFO,
      description: `Password changed for user ${data.username}`,
      details: data.details
    });
  }

  /**
   * Log a two-factor setup event
   */
  static async logTwoFactorSetup(data: {
    userId: string,
    username: string,
    method: string,
    ipAddress?: string,
    userAgent?: string,
    path?: string,
    httpMethod?: string,
    details?: Record<string, any>
  }): Promise<void> {
    return this.log({
      userId: data.userId,
      username: data.username,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      path: data.path,
      method: data.httpMethod,
      action: 'TWO_FACTOR_SETUP',
      securityEventType: SecurityEventType.TWO_FACTOR_SETUP,
      severity: SecurityEventSeverity.INFO,
      description: `Two-factor authentication setup for user ${data.username} (method: ${data.method})`,
      details: data.details
    });
  }

  /**
   * Log a password reset request event
   */
  static async logPasswordResetRequest(data: {
    username: string,
    ipAddress?: string,
    userAgent?: string,
    path?: string,
    method?: string,
    details?: Record<string, any>
  }): Promise<void> {
    return this.log({
      userId: undefined, // User ID may not be known during password reset request
      username: data.username,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      path: data.path,
      method: data.method,
      action: 'PASSWORD_RESET_REQUEST',
      securityEventType: SecurityEventType.PASSWORD_RESET,
      severity: SecurityEventSeverity.INFO,
      description: `Password reset requested for ${data.username}`,
      details: data.details
    });
  }

  /**
   * Log a password reset completion event
   */
  static async logPasswordResetComplete(data: {
    userId: string,
    username: string,
    ipAddress?: string,
    userAgent?: string,
    path?: string,
    method?: string,
    details?: Record<string, any>
  }): Promise<void> {
    return this.log({
      userId: data.userId,
      username: data.username,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      path: data.path,
      method: data.method,
      action: 'PASSWORD_RESET_COMPLETE',
      securityEventType: SecurityEventType.PASSWORD_RESET,
      severity: SecurityEventSeverity.INFO,
      description: `Password successfully reset for ${data.username}`,
      details: data.details
    });
  }

  /**
   * Log a two-factor authentication success
   */
  static async logTwoFactorSuccess(data: {
    userId: string,
    username: string,
    method: string,
    ipAddress?: string,
    userAgent?: string,
    path?: string,
    httpMethod?: string,
    details?: Record<string, any>
  }): Promise<void> {
    return this.log({
      userId: data.userId,
      username: data.username,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      path: data.path,
      method: data.httpMethod,
      action: 'TWO_FACTOR_SUCCESS',
      securityEventType: SecurityEventType.TWO_FACTOR_SUCCESS,
      severity: SecurityEventSeverity.INFO,
      description: `Two-factor authentication successful for user ${data.username} (method: ${data.method})`,
      details: data.details
    });
  }

  /**
   * Log a two-factor authentication failure
   */
  static async logTwoFactorFailure(data: {
    userId?: string,
    username: string,
    method: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
    path?: string,
    httpMethod?: string,
    details?: Record<string, any>
  }): Promise<void> {
    return this.log({
      userId: data.userId,
      username: data.username,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      path: data.path,
      method: data.httpMethod,
      action: 'TWO_FACTOR_FAILURE',
      securityEventType: SecurityEventType.TWO_FACTOR_FAILURE,
      severity: SecurityEventSeverity.WARNING,
      description: `Two-factor authentication failed for user ${data.username} (method: ${data.method}): ${data.reason}`,
      details: data.details
    });
  }

  /**
   * Log other security events
   */
  static async logSecurityEvent(
    securityEventType: SecurityEventType,
    severity: SecurityEventSeverity, 
    data: {
      userId?: string,
      username?: string,
      ipAddress?: string,
      userAgent?: string,
      path?: string,
      method?: string,
      action: string,
      description: string,
      details?: Record<string, any>
    }
  ): Promise<void> {
    return this.log({
      userId: data.userId,
      username: data.username,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      path: data.path,
      method: data.method,
      action: data.action,
      securityEventType,
      severity,
      description: data.description,
      details: data.details
    });
  }
}
