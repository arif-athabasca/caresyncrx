/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Data Access Layer Index - Centralized exports for all data access services
 * Provides a single point of import for data access patterns across the application
 */

// Core data access services
export { BaseDataAccess } from './BaseDataAccess';
export { UsersDataAccess, usersDataAccess } from './UsersDataAccess';
export { TriageDataAccess, triageDataAccess } from './TriageDataAccess';

// Cache services
export { RedisService, redisService } from '../cache/RedisService';
export { CacheWarmingService, cacheWarmingService } from '../cache/CacheWarmingService';

// Types and interfaces
export type {
  CacheConfig,
  QueryOptions
} from './BaseDataAccess';

export type {
  ProviderInfo,
  ProviderSearchFilters
} from './UsersDataAccess';

export type {
  TriageRecord,
  TriageFilters,
  PaginationOptions,
  TriageListResponse
} from './TriageDataAccess';

/**
 * Performance monitoring utilities
 */
export class DataAccessMonitor {
  private static queries: Array<{
    operation: string;
    duration: number;
    timestamp: Date;
    cached: boolean;
  }> = [];

  static log(operation: string, duration: number, cached: boolean = false): void {
    this.queries.push({
      operation,
      duration,
      timestamp: new Date(),
      cached
    });

    // Keep only last 1000 queries
    if (this.queries.length > 1000) {
      this.queries = this.queries.slice(-1000);
    }

    // Log slow queries
    if (duration > 2000) {
      console.warn(`⚠️  Slow query detected: ${operation} took ${duration}ms`);
    }
  }

  static getStatistics(): {
    totalQueries: number;
    averageDuration: number;
    cacheHitRate: number;
    slowQueries: number;
  } {
    const total = this.queries.length;
    const cached = this.queries.filter(q => q.cached).length;
    const slow = this.queries.filter(q => q.duration > 1000).length;
    const avgDuration = total > 0 
      ? this.queries.reduce((sum, q) => sum + q.duration, 0) / total 
      : 0;

    return {
      totalQueries: total,
      averageDuration: Math.round(avgDuration),
      cacheHitRate: total > 0 ? Math.round((cached / total) * 100) : 0,
      slowQueries: slow
    };
  }

  static reset(): void {
    this.queries = [];
  }
}

/**
 * Data access initialization and health checks
 */
export class DataAccessManager {
  private static initialized = false;

  /**
   * Initialize all data access services
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('🚀 Initializing data access layer...');

      // Test Redis connection
      const redisHealthy = await redisService.healthCheck();
      if (!redisHealthy) {
        console.warn('⚠️  Redis connection failed - caching will be disabled');
      } else {
        console.log('✅ Redis connection established');
      }

      // Start cache warming if in production
      if (process.env.NODE_ENV === 'production') {
        console.log('🔥 Starting cache warming service...');
        cacheWarmingService.startPeriodicWarming(15); // Every 15 minutes
      }

      this.initialized = true;
      console.log('✅ Data access layer initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize data access layer:', error);
      throw error;
    }
  }

  /**
   * Health check for all data access services
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      redis: boolean;
      database: boolean;
      cacheWarming: boolean;
    };
    statistics: ReturnType<typeof DataAccessMonitor.getStatistics>;
  }> {
    try {
      const [redisHealth, cacheWarmingHealth] = await Promise.all([
        redisService.healthCheck(),
        cacheWarmingService.healthCheck()
      ]);

      // Test database connection
      let databaseHealth = false;
      try {
        await prisma.$queryRaw`SELECT 1`;
        databaseHealth = true;
      } catch (error) {
        console.error('Database health check failed:', error);
      }

      const services = {
        redis: redisHealth,
        database: databaseHealth,
        cacheWarming: cacheWarmingHealth.status === 'healthy'
      };

      const healthyServices = Object.values(services).filter(Boolean).length;
      const totalServices = Object.keys(services).length;

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (healthyServices === totalServices) {
        status = 'healthy';
      } else if (healthyServices >= totalServices / 2) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        status,
        services,
        statistics: DataAccessMonitor.getStatistics()
      };

    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        services: {
          redis: false,
          database: false,
          cacheWarming: false
        },
        statistics: DataAccessMonitor.getStatistics()
      };
    }
  }

  /**
   * Graceful shutdown
   */
  static async shutdown(): Promise<void> {
    try {
      console.log('🛑 Shutting down data access layer...');
      
      await redisService.disconnect();
      await prisma.$disconnect();
      
      console.log('✅ Data access layer shutdown complete');
    } catch (error) {
      console.error('❌ Error during data access shutdown:', error);
    }
  }
}

// Auto-initialize in development
if (process.env.NODE_ENV === 'development') {
  DataAccessManager.initialize().catch(console.error);
}
