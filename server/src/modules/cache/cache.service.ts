import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Lightweight Redis cache wrapper.
 *
 * Gracefully degrades to a no-op if Redis is unavailable:
 * cache hits return `null`, writes are silently dropped.
 * This lets the application function without Redis running,
 * while benefiting from caching when Redis is present.
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;
  private enabled = false;

  /** Default TTL in seconds (10 minutes). */
  private readonly defaultTtl = 600;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not set — cache disabled');
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
          if (times > 3) return null;
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });

      this.client.on('error', (err) => {
        this.logger.warn(`Redis connection error: ${err.message}`);
      });

      this.client.on('ready', () => {
        this.logger.log('Redis connected — cache enabled');
        this.enabled = true;
      });

      this.client.connect().catch((err) => {
        this.logger.warn(`Redis connection failed: ${err.message} — cache disabled`);
        this.client = null;
      });
    } catch {
      this.logger.warn('Failed to initialize Redis — cache disabled');
    }
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.client) return null;
    try {
      const raw = await this.client.get(key);
      if (raw == null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds ?? this.defaultTtl) {
        await this.client.setex(key, ttlSeconds ?? this.defaultTtl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch {
      // silently degrade
    }
  }

  async del(key: string): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // silently degrade
    }
  }

  /** Delete all keys matching a pattern (e.g. `dashboard:*`). */
  async delPattern(pattern: string): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch {
      // silently degrade
    }
  }

  /** Generate a consistent cache key from parts. */
  static key(...parts: string[]): string {
    return parts.join(':');
  }
}
