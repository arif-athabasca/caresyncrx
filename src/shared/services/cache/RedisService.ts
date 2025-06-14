/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 *
 * Redis Service - Centralized caching service for high-performance data access
 * Implements TTL, key namespacing, and connection pooling for optimal performance
 */

import Redis from 'ioredis';

export class RedisService {
  private static instance: RedisService;
  private redis: Redis;

  private constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableAutoPipelining: true,
    });

    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  /**
   * Generate a namespaced cache key
   */
  private getKey(namespace: string, key: string): string {
    return `caresyncrx:${namespace}:${key}`;
  }

  /**
   * Get data from cache
   */
  async get<T>(namespace: string, key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(this.getKey(namespace, key));
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Set data in cache with TTL
   */
  async set(namespace: string, key: string, data: any, ttlSeconds: number = 300): Promise<boolean> {
    try {
      await this.redis.setex(this.getKey(namespace, key), ttlSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  /**
   * Delete data from cache
   */
  async delete(namespace: string, key: string): Promise<boolean> {
    try {
      await this.redis.del(this.getKey(namespace, key));
      return true;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  /**
   * Clear all keys in a namespace
   */
  async clearNamespace(namespace: string): Promise<boolean> {
    try {
      const pattern = this.getKey(namespace, '*');
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Redis clearNamespace error:', error);
      return false;
    }
  }

  /**
   * Get multiple keys
   */
  async mget<T>(namespace: string, keys: string[]): Promise<(T | null)[]> {
    try {
      const namespacedKeys = keys.map(key => this.getKey(namespace, key));
      const results = await this.redis.mget(...namespacedKeys);
      return results.map(result => result ? JSON.parse(result) : null);
    } catch (error) {
      console.error('Redis mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys
   */
  async mset(namespace: string, keyValuePairs: Record<string, any>, ttlSeconds: number = 300): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        const namespacedKey = this.getKey(namespace, key);
        pipeline.setex(namespacedKey, ttlSeconds, JSON.stringify(value));
      });
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Redis mset error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(namespace: string, key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(this.getKey(namespace, key));
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  /**
   * Increment a counter
   */
  async increment(namespace: string, key: string, by: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(this.getKey(namespace, key), by);
    } catch (error) {
      console.error('Redis increment error:', error);
      return 0;
    }
  }

  /**
   * Set expiration for existing key
   */
  async expire(namespace: string, key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(this.getKey(namespace, key), ttlSeconds);
      return result === 1;
    } catch (error) {
      console.error('Redis expire error:', error);
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Close connection
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

export const redisService = RedisService.getInstance();
