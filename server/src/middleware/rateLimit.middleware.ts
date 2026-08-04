import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { env } from '../config/env';

// Shared Redis connection for the fixed-window limiter. BullMQ uses its own
// connections; this one is dedicated to rate limiting.
const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1 });

const windowSeconds = Math.max(1, Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000));
const maxRequests = env.RATE_LIMIT_IP_MAX;

/**
 * Redis-backed fixed-window IP rate limiter. Emits standard
 * X-RateLimit-Limit / X-RateLimit-Remaining / X-RateLimit-Reset headers plus
 * Retry-After on rejection so clients and CDNs can throttle correctly.
 *
 * Requires `trust proxy` to be configured so req.ip reflects the real client
 * behind nginx. Fails open with a loud log only if Redis is briefly down.
 */
export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const key = `rl:ip:${ip}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    const ttl = await redis.ttl(key);
    const remaining = Math.max(0, maxRequests - count);

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + Math.max(0, ttl)));

    if (count > maxRequests) {
      res.setHeader('Retry-After', String(Math.max(1, ttl)));
      return res.status(429).json({
        error: 'Too many requests from this IP. Please try again later.',
      });
    }

    return next();
  } catch (error: any) {
    console.error('[RateLimiter] Redis error, allowing request through:', error.message);
    return next();
  }
};

export default rateLimiter;
