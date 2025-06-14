/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Base Data Access Layer - Provides a consistent pattern for database operations with Redis caching
 * All data access operations should extend this base class for consistency and performance
 */

import { prisma } from '../../../lib/prisma';
import { redisService } from '../cache/RedisService';

export interface CacheConfig {
  enabled: boolean;
  ttlSeconds: number;
  keyPrefix: string;
}

export interface QueryOptions {
  cache?: CacheConfig;
  enableLogging?: boolean;
}

export abstract class BaseDataAccess {
  protected readonly defaultCacheConfig: CacheConfig = {
    enabled: true,
    ttlSeconds: 300, // 5 minutes
    keyPrefix: 'default'
  };

  /**
   * Execute a query with optional caching
   */
  protected async executeQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const cacheConfig = { ...this.defaultCacheConfig, ...options.cache };
    const enableLogging = options.enableLogging ?? process.env.NODE_ENV === 'development';

    const startTime = Date.now();

    // Try cache first if enabled
    if (cacheConfig.enabled) {
      try {
        const cached = await redisService.get<T>(cacheConfig.keyPrefix, queryKey);
        if (cached !== null) {
          if (enableLogging) {
            console.log(`🎯 Cache HIT for ${cacheConfig.keyPrefix}:${queryKey} in ${Date.now() - startTime}ms`);
          }
          return cached;
        }
      } catch (error) {
        console.warn('Cache read failed, falling back to database:', error);
      }
    }

    // Execute database query
    try {
      const result = await queryFn();
      const queryTime = Date.now() - startTime;

      if (enableLogging) {
        console.log(`💾 Database query ${cacheConfig.keyPrefix}:${queryKey} took ${queryTime}ms`);
      }

      // Cache the result if enabled
      if (cacheConfig.enabled && result !== null && result !== undefined) {
        try {
          await redisService.set(cacheConfig.keyPrefix, queryKey, result, cacheConfig.ttlSeconds);
          if (enableLogging) {
            console.log(`📦 Cached result for ${cacheConfig.keyPrefix}:${queryKey} with TTL ${cacheConfig.ttlSeconds}s`);
          }
        } catch (error) {
          console.warn('Cache write failed:', error);
        }
      }

      return result;
    } catch (error) {
      console.error(`❌ Database query failed for ${cacheConfig.keyPrefix}:${queryKey}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache for specific keys
   */
  protected async invalidateCache(keyPrefix: string, keys: string[]): Promise<void> {
    try {
      const deletePromises = keys.map(key => redisService.delete(keyPrefix, key));
      await Promise.all(deletePromises);
      console.log(`🗑️  Invalidated cache keys: ${keyPrefix}:[${keys.join(', ')}]`);
    } catch (error) {
      console.warn('Cache invalidation failed:', error);
    }
  }

  /**
   * Invalidate entire namespace
   */
  protected async invalidateNamespace(keyPrefix: string): Promise<void> {
    try {
      await redisService.clearNamespace(keyPrefix);
      console.log(`🗑️  Cleared cache namespace: ${keyPrefix}`);
    } catch (error) {
      console.warn('Namespace invalidation failed:', error);
    }
  }

  /**
   * Build cache key from parameters
   */
  protected buildCacheKey(baseKey: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return sortedParams ? `${baseKey}|${sortedParams}` : baseKey;
  }

  /**
   * Execute raw SQL with caching
   */
  protected async executeRawQuery<T>(
    sql: string,
    params: any[] = [],
    queryKey: string,
    options: QueryOptions = {}
  ): Promise<T> {
    return this.executeQuery(
      queryKey,
      () => prisma.$queryRawUnsafe<T>(sql, ...params),
      options
    );
  }

  /**
   * Batch operations with cache invalidation
   */
  protected async executeBatch<T>(
    operations: (() => Promise<T>)[],
    invalidationKeys: { keyPrefix: string; keys: string[] }[] = []
  ): Promise<T[]> {
    try {
      // Execute all operations
      const results = await Promise.all(operations.map(op => op()));

      // Invalidate relevant caches
      if (invalidationKeys.length > 0) {
        const invalidationPromises = invalidationKeys.map(({ keyPrefix, keys }) =>
          this.invalidateCache(keyPrefix, keys)
        );
        await Promise.all(invalidationPromises);
      }

      return results;
    } catch (error) {
      console.error('Batch operation failed:', error);
      throw error;
    }
  }
}

/**
 * Performance monitoring decorator
 */
export function Monitor(operation: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const className = target.constructor.name;
      
      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;
        
        if (duration > 1000) { // Log slow operations
          console.warn(`⚠️  Slow operation: ${className}.${propertyName} (${operation}) took ${duration}ms`);
        }
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ Failed operation: ${className}.${propertyName} (${operation}) failed after ${duration}ms`, error);
        throw error;
      }
    };

    return descriptor;
  };
}
