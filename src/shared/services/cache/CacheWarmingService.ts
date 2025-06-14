/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Cache Warming Service - Proactively warms frequently accessed data
 * Implements intelligent cache warming strategies for optimal performance
 */

import { redisService } from './RedisService';
import { usersDataAccess } from '../data/UsersDataAccess';
import { triageDataAccess } from '../data/TriageDataAccess';
import { prisma } from '../../../lib/prisma';

export class CacheWarmingService {
  private static instance: CacheWarmingService;
  private warmingInProgress = new Set<string>();

  private constructor() {}

  public static getInstance(): CacheWarmingService {
    if (!CacheWarmingService.instance) {
      CacheWarmingService.instance = new CacheWarmingService();
    }
    return CacheWarmingService.instance;
  }

  /**
   * Warm caches for a specific clinic
   */
  async warmClinicCaches(clinicId: string): Promise<void> {
    const warmingKey = `clinic_${clinicId}`;
    
    if (this.warmingInProgress.has(warmingKey)) {
      console.log(`🔥 Cache warming already in progress for clinic: ${clinicId}`);
      return;
    }

    try {
      this.warmingInProgress.add(warmingKey);
      console.log(`🔥 Starting cache warming for clinic: ${clinicId}`);

      const startTime = Date.now();

      // Warm provider caches
      await usersDataAccess.warmProviderCaches(clinicId);

      // Warm triage statistics
      await triageDataAccess.getTriageStatistics(clinicId);

      // Warm recent triages
      await triageDataAccess.getTriageList(
        { clinicId },
        { page: 1, limit: 20 }
      );

      const duration = Date.now() - startTime;
      console.log(`🔥 Cache warming completed for clinic ${clinicId} in ${duration}ms`);

    } catch (error) {
      console.error(`❌ Cache warming failed for clinic ${clinicId}:`, error);
    } finally {
      this.warmingInProgress.delete(warmingKey);
    }
  }

  /**
   * Warm caches for all active clinics
   */
  async warmAllClinicCaches(): Promise<void> {
    try {
      console.log('🔥 Starting global cache warming...');
      const startTime = Date.now();

      // Get all active clinics
      const clinics = await prisma.clinic.findMany({
        select: { id: true, name: true },
        where: {
          users: {
            some: {
              // Only warm caches for clinics with active users
              lastFailedLogin: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Active in last 30 days
              }
            }
          }
        }
      });

      console.log(`🏥 Found ${clinics.length} active clinics to warm`);

      // Warm caches for each clinic in parallel (but limit concurrency)
      const BATCH_SIZE = 3;
      for (let i = 0; i < clinics.length; i += BATCH_SIZE) {
        const batch = clinics.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(clinic => this.warmClinicCaches(clinic.id))
        );
      }

      const duration = Date.now() - startTime;
      console.log(`🔥 Global cache warming completed in ${duration}ms`);

    } catch (error) {
      console.error('❌ Global cache warming failed:', error);
    }
  }

  /**
   * Warm caches for a specific user session
   */
  async warmUserSessionCaches(userId: string, clinicId: string): Promise<void> {
    const warmingKey = `user_${userId}`;
    
    if (this.warmingInProgress.has(warmingKey)) {
      return;
    }

    try {
      this.warmingInProgress.add(warmingKey);
      
      // Warm clinic-specific data for the user
      await Promise.all([
        usersDataAccess.getProvidersForDropdown(clinicId),
        triageDataAccess.getTriageStatistics(clinicId),
        triageDataAccess.getTriageList({ clinicId }, { page: 1, limit: 10 })
      ]);

      console.log(`🔥 User session caches warmed for user: ${userId}`);

    } catch (error) {
      console.error(`❌ User session cache warming failed for user ${userId}:`, error);
    } finally {
      this.warmingInProgress.delete(warmingKey);
    }
  }

  /**
   * Schedule periodic cache warming
   */
  startPeriodicWarming(intervalMinutes: number = 15): void {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    console.log(`⏰ Starting periodic cache warming every ${intervalMinutes} minutes`);
    
    // Initial warming
    this.warmAllClinicCaches();
    
    // Schedule periodic warming
    setInterval(() => {
      this.warmAllClinicCaches();
    }, intervalMs);
  }

  /**
   * Intelligent cache warming based on usage patterns
   */
  async intelligentWarming(): Promise<void> {
    try {
      console.log('🧠 Starting intelligent cache warming...');

      // Get usage statistics from Redis (if available)
      const usageStats = await this.getUsageStatistics();

      // Warm high-usage clinics first
      const highUsageClinics = usageStats.clinics
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 10); // Top 10 clinics

      for (const clinic of highUsageClinics) {
        await this.warmClinicCaches(clinic.id);
      }

      console.log(`🧠 Intelligent warming completed for ${highUsageClinics.length} high-usage clinics`);

    } catch (error) {
      console.error('❌ Intelligent cache warming failed:', error);
    }
  }

  /**
   * Get usage statistics from Redis
   */
  private async getUsageStatistics(): Promise<{
    clinics: Array<{ id: string; usage: number }>;
    providers: Array<{ id: string; usage: number }>;
  }> {
    try {
      // This would be populated by actual usage tracking
      // For now, return mock data based on recent database activity
      const recentTriages = await prisma.patientTriage.groupBy({
        by: ['patientId'],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        _count: true
      });

      // Get clinic usage from patient data
      const clinicUsage = await prisma.patient.groupBy({
        by: ['clinicId'],
        where: {
          triages: {
            some: {
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
              }
            }
          }
        },
        _count: true
      });

      return {
        clinics: clinicUsage.map(c => ({ id: c.clinicId, usage: c._count })),
        providers: [] // Would implement provider usage tracking
      };

    } catch (error) {
      console.error('Error getting usage statistics:', error);
      return { clinics: [], providers: [] };
    }
  }

  /**
   * Track cache usage for intelligent warming
   */
  async trackCacheUsage(namespace: string, key: string): Promise<void> {
    try {
      const usageKey = `usage:${namespace}:${key}`;
      await redisService.increment('cache_usage', usageKey);
      
      // Set expiration for usage tracking (7 days)
      await redisService.expire('cache_usage', usageKey, 7 * 24 * 60 * 60);
    } catch (error) {
      console.warn('Failed to track cache usage:', error);
    }
  }

  /**
   * Clear all caches (use with caution)
   */
  async clearAllCaches(): Promise<void> {
    try {
      console.log('🗑️  Clearing all application caches...');
      
      await Promise.all([
        redisService.clearNamespace('users'),
        redisService.clearNamespace('triage'),
        redisService.clearNamespace('cache_usage')
      ]);

      console.log('🗑️  All caches cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear caches:', error);
    }
  }

  /**
   * Health check for cache warming service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    warmingInProgress: number;
    redisConnected: boolean;
  }> {
    return {
      status: 'healthy',
      warmingInProgress: this.warmingInProgress.size,
      redisConnected: await redisService.healthCheck()
    };
  }
}

export const cacheWarmingService = CacheWarmingService.getInstance();
