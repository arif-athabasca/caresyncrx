/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Rate limiting middleware for the CareSyncRx platform.
 * This file implements request rate limiting to protect API endpoints
 * from abuse, brute force attacks, and excessive usage.
 * It also provides IP blocking functionality for suspicious activity.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Redis } from 'ioredis';
import { logSecurityEventFromRequest } from '../services/security-audit';
import { SecurityEventType, SecurityEventSeverity } from '../services/security-audit';

// Configuration options for rate limiter
interface RateLimitOptions {
  windowMs: number;     // Time window in milliseconds
  max: number;          // Maximum requests within the window
  message?: string;     // Optional custom error message
  clientIdentifier?: string;  // Optional client identifier to override IP
}

// Redis client for distributed rate limiting
// Will remain null in Edge Runtime
let redisClient: Redis | null = null;

/**
 * Check if code is running in Edge Runtime
 */
function isRunningOnEdge(): boolean {
  return typeof process.env.NEXT_RUNTIME === 'string' && 
         process.env.NEXT_RUNTIME === 'edge';
}

// In-memory storage fallback
const inMemoryStore = new Map<string, { count: number, resetTime: number }>();

// In-memory storage for IP blocking
const blockedIPs = new Map<string, { until: number, reason: string }>();

// In-memory storage for tracking failed login attempts
const failedLoginAttempts = new Map<string, { count: number, firstAttempt: number }>();

/**
 * Rate limit configurations for different endpoint types
 */
export const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints (login, register, password reset)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per 15 minutes
    message: 'Too many authentication attempts, please try again later'
  },
  
  // Two-factor authentication endpoints
  twoFactor: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 5 requests per 5 minutes
    message: 'Too many 2FA verification attempts, please try again later'
  },
  
  // API endpoints that modify data
  mutationApi: {
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: 'Too many API requests, please slow down'
  },
  
  // API endpoints that only read data
  readApi: {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Too many API requests, please slow down'
  },
  
  // Default for all other endpoints
  default: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests, please try again later'
  }
};

/**
 * Check if an IP is blocked
 * 
 * @param ip - IP address to check
 * @returns Block info if blocked, null if not blocked
 */
export async function isIPBlocked(ip: string): Promise<{ until: number, reason: string } | null> {
  if (!ip) return null;
  
  try {
    // Don't use Redis in Edge Runtime
    if (process.env.REDIS_URL && !isRunningOnEdge()) {
      try {
        // Initialize Redis if not already connected
        if (!redisClient) {
          const Redis = (await import('ioredis')).Redis;
          redisClient = new Redis(process.env.REDIS_URL);
        }
        
        const blockData = await redisClient.get(`blocked:${ip}`);
        if (blockData) {
          const { until, reason } = JSON.parse(blockData);
          if (Date.now() < until) {
            return { until, reason };
          } else {
            // Block expired, remove it
            await redisClient.del(`blocked:${ip}`);
            return null;
          }
        }
      } catch (redisError) {
        console.warn('Redis error checking IP block status, falling back to in-memory store:', redisError);
        // Fall back to in-memory check if Redis fails
      }
    }
    
    // Check in-memory store (used as fallback or primary depending on Redis availability)
    const blockData = blockedIPs.get(ip);
    if (blockData) {
      if (Date.now() < blockData.until) {
        return blockData;
      } else {
        // Block expired, remove it
        blockedIPs.delete(ip);
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error checking IP block status:', error);
    return null;
  }
}

/**
 * Block an IP address
 * 
 * @param ip - IP address to block
 * @param durationMs - Duration of block in milliseconds
 * @param reason - Reason for blocking
 * @returns Success status
 */
export async function blockIP(
  ip: string, 
  durationMs: number,
  reason: string
): Promise<boolean> {
  if (!ip) return false;
  
  try {
    const until = Date.now() + durationMs;
    const blockData = { until, reason };      // Log security event
      try {
        // Create a mock request object since we don't have a real NextRequest
        const mockRequest = {
          ip: ip,
          headers: new Map([
            ['x-forwarded-for', ip],
            ['user-agent', 'system/rate-limiter']
          ]),
          url: 'http://localhost/api/system/rate-limit',
          method: 'SYSTEM'
        } as unknown as NextRequest;
        
        await logSecurityEventFromRequest(
          mockRequest,
          SecurityEventType.IP_BLOCKED,
          SecurityEventSeverity.CRITICAL, // Using CRITICAL instead of HIGH which doesn't exist
          `IP address ${ip} blocked for ${reason}`,
          {
            ip,
            reason,
            durationMs,
            until: new Date(until).toISOString()
          }
        );
      } catch (logError) {
        // Don't fail blocking if logging fails
        console.error('Failed to log IP block security event:', logError);
      }
    
    // Don't use Redis in Edge Runtime
    if (process.env.REDIS_URL && !isRunningOnEdge()) {
      try {
        // Initialize Redis if not already connected
        if (!redisClient) {
          const Redis = (await import('ioredis')).Redis;
          redisClient = new Redis(process.env.REDIS_URL);
        }
        
        // Store block data in Redis with proper expiration
        await redisClient.set(
          `blocked:${ip}`, 
          JSON.stringify(blockData),
          'PX',
          durationMs
        );
      } catch (redisError) {
        console.warn('Redis error during IP blocking, falling back to in-memory store:', redisError);
        // Fall back to in-memory if Redis fails
        blockedIPs.set(ip, blockData);
        
        // Set timeout to remove the block when it expires
        setTimeout(() => {
          blockedIPs.delete(ip);
        }, durationMs);
      }
    } else {
      // Use in-memory store
      blockedIPs.set(ip, blockData);
      
      // Set timeout to remove the block when it expires
      setTimeout(() => {
        blockedIPs.delete(ip);
      }, durationMs);
    }
    
    // Log the block
    console.warn(`Blocked IP ${ip} until ${new Date(until).toISOString()} for: ${reason}`);
    return true;
  } catch (error) {
    console.error('Error blocking IP:', error);
    return false;
  }
}

/**
 * Track failed login attempts and block IPs with suspicious activity
 * 
 * @param ip - IP address of the login attempt
 * @param username - Username that was attempted
 * @returns Whether the IP was blocked
 */
export async function trackFailedLogin(ip: string, username: string): Promise<boolean> {
  if (!ip) return false;
  
  try {
    const now = Date.now();
    const key = `${ip}:${username}`;
    
    // Get current failed attempts
    let attempts = failedLoginAttempts.get(key) || { count: 0, firstAttempt: now };
    
    // Reset if first attempt was more than 30 minutes ago
    if (now - attempts.firstAttempt > 30 * 60 * 1000) {
      attempts = { count: 1, firstAttempt: now };
    } else {
      attempts.count++;
    }
    
    failedLoginAttempts.set(key, attempts);
    
    // Block IP if too many failed attempts
    if (attempts.count >= 10) {
      // Block for 1 hour
      await blockIP(ip, 60 * 60 * 1000, 'Too many failed login attempts');
      failedLoginAttempts.delete(key);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error tracking failed login:', error);
    return false;
  }
}

/**
 * Reset failed login attempts on successful login
 * 
 * @param ip - IP address to reset
 * @param username - Username to reset
 */
export function clearFailedLogins(ip: string, username: string): void {
  if (!ip) return;
  
  try {
    const key = `${ip}:${username}`;
    failedLoginAttempts.delete(key);
  } catch (error) {
    console.error('Error clearing failed logins:', error);
  }
}

/**
 * Get rate limit config for a specific path
 * 
 * @param path - URL path to check
 * @param method - HTTP method
 * @returns Appropriate rate limit configuration
 */
export function getRateLimitConfigForPath(path: string, method: string): RateLimitOptions {
  // Token refresh endpoint - use stricter limits to prevent refresh token abuse
  if (path.startsWith('/api/auth/refresh')) {
    return {
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: 5, // 5 refresh attempts per 10 minutes
      message: 'Too many token refresh attempts, please try again later'
    };
  }
  
  // Auth endpoints
  if (
    path.startsWith('/api/auth/login') ||
    path.startsWith('/api/auth/register') ||
    path.startsWith('/api/auth/password-reset') ||
    path.startsWith('/api/auth/forgot-password')
  ) {
    return RATE_LIMIT_CONFIGS.auth;
  }
  
  // 2FA endpoints
  if (
    path.startsWith('/api/auth/2fa/')
  ) {
    return RATE_LIMIT_CONFIGS.twoFactor;
  }
  
  // API endpoints that modify data
  if (
    path.startsWith('/api/') && 
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
  ) {
    return RATE_LIMIT_CONFIGS.mutationApi;
  }
  
  // API endpoints that only read data
  if (
    path.startsWith('/api/') && 
    ['GET', 'HEAD', 'OPTIONS'].includes(method)
  ) {
    return RATE_LIMIT_CONFIGS.readApi;
  }
  
  // Default for all other endpoints
  return RATE_LIMIT_CONFIGS.default;
}

/**
 * Rate limiter service for API protection
 */
/**
 * Enhanced rate limiting middleware with IP blocking
 * 
 * @param request - Next.js request object
 * @returns Response if rate limited or IP blocked, null otherwise
 */
export async function enhancedRateLimitMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const path = new URL(request.url).pathname;
  
  // Check if IP is blocked
  const blockInfo = await isIPBlocked(ip);
  if (blockInfo) {
    const timeLeft = Math.ceil((blockInfo.until - Date.now()) / 1000 / 60);    // Log security event for blocked IP
    await logSecurityEventFromRequest(
      request,
      SecurityEventType.ACCESS_DENIED,
      SecurityEventSeverity.WARNING,
      `Access blocked for IP due to: ${blockInfo.reason}`
    ).catch(console.error);
    
    return NextResponse.json(
      { 
        error: 'Access blocked',
        message: `Your access has been temporarily blocked due to suspicious activity. Please try again in ${timeLeft} minutes.`,
        reason: blockInfo.reason
      },
      { status: 403 }
    );
  }
  
  // Apply appropriate rate limit based on endpoint type
  const rateLimitConfig = getRateLimitConfigForPath(path, request.method);
  const rateLimited = await RateLimiter.check(request, {
    ...rateLimitConfig,
    clientIdentifier: ip
  });
  
  return rateLimited;
}

export class RateLimiter {
  /**
   * Check if a request should be rate limited
   * 
   * @param req - The Next.js request object
   * @param options - Rate limit configuration options
   * @returns NextResponse if rate limited, null if not limited
   */
  static async check(
    req: NextRequest, 
    options: RateLimitOptions
  ): Promise<NextResponse | null> {
    try {      // Get client identifier (use provided identifier, IP header, or fallback)
      const clientId = options.clientIdentifier || 
                     req.headers.get('x-forwarded-for') ||
                     req.headers.get('x-real-ip') || 
                     'unknown';
      
      // Create a key that includes the route path for path-specific rate limiting
      const routePath = new URL(req.url).pathname;
      const key = `ratelimit:${routePath}:${clientId}`;      // Try to use Redis for distributed rate limiting
      // Skip Redis initialization in Edge Runtime
      if (process.env.REDIS_URL && !redisClient && !isRunningOnEdge()) {
        try {
          // Lazy initialize Redis client
          const Redis = (await import('ioredis')).Redis;
          redisClient = new Redis(process.env.REDIS_URL);
        } catch (error: unknown) {
          // Safely handle unknown error type
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn('Failed to connect to Redis for rate limiting, using in-memory store:', errorMessage);
        }
      }
      
      let isRateLimited = false;
      
      // Use Redis if available
      if (redisClient) {
        const [current, resetTime] = await this.checkRedisRateLimit(
          key, 
          options.max, 
          options.windowMs
        );
        
        isRateLimited = current > options.max;
        
        // Add rate limit headers
        const headers = new Headers();
        headers.set('X-RateLimit-Limit', options.max.toString());
        headers.set('X-RateLimit-Remaining', Math.max(0, options.max - current).toString());
        headers.set('X-RateLimit-Reset', (resetTime / 1000).toString());
        
        // If rate limited, return 429 response
        if (isRateLimited) {
          return NextResponse.json(
            { error: options.message || 'Too many requests, please try again later' },
            { status: 429, headers }
          );
        }
      } else {
        // Fallback to in-memory store
        const now = Date.now();
        const resetTime = now + options.windowMs;
        
        const entry = inMemoryStore.get(key) || { count: 0, resetTime };
        
        // Reset counter if window has passed
        if (now > entry.resetTime) {
          entry.count = 1;
          entry.resetTime = resetTime;
        } else {
          entry.count++;
        }
        
        inMemoryStore.set(key, entry);
        
        isRateLimited = entry.count > options.max;
        
        // Add rate limit headers
        const headers = new Headers();
        headers.set('X-RateLimit-Limit', options.max.toString());
        headers.set('X-RateLimit-Remaining', Math.max(0, options.max - entry.count).toString());
        headers.set('X-RateLimit-Reset', (entry.resetTime / 1000).toString());
        
        // If rate limited, return 429 response
        if (isRateLimited) {
          return NextResponse.json(
            { error: options.message || 'Too many requests, please try again later' },
            { status: 429, headers }
          );
        }
      }
      
      // Not rate limited
      return null;    } catch (error: unknown) {
      // Log error but don't block request on rate limit failure
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Rate limit error:', errorMessage);
      return null;
    }
  }
  
  /**
   * Check rate limit using Redis
   * 
   * @param key - The rate limit key
   * @param max - Maximum requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Current count and reset time
   */  private static async checkRedisRateLimit(
    key: string, 
    max: number, 
    windowMs: number
  ): Promise<[number, number]> {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }
    
    const now = Date.now();
    const windowSec = Math.floor(windowMs / 1000);
    
    const multi = redisClient.multi();
    multi.incr(key);
    multi.pttl(key);
    
    // Cast with more specific types
    const [count, ttl] = await multi.exec() as [[null, number], [null, number]];
    
    // Set expiry if this is a new key
    // -1 means no expiry set, -2 means key doesn't exist
    if (ttl[1] === -1 || ttl[1] === -2) {
      await redisClient.expire(key, windowSec);
    }
    
    // Calculate reset time
    const resetTime = ttl[1] === -1 || ttl[1] === -2
      ? now + windowMs
      : now + ttl[1];
    
    return [count[1], resetTime];
  }
}