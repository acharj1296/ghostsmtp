import { Request, Response, NextFunction } from 'express';

const rateLimitWindowMs = 15 * 60 * 1000; // 15 minutes
const rateLimitMaxRequests = 200; // limit each IP to 200 requests per windowMs

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitRecord>();

// Cleanup routine to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(ip);
    }
  }
}, 300000); // Clean every 5 minutes

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let record = store.get(ip);

  if (!record) {
    store.set(ip, {
      count: 1,
      resetTime: now + rateLimitWindowMs,
    });
    return next();
  }

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + rateLimitWindowMs;
    return next();
  }

  record.count += 1;

  if (record.count > rateLimitMaxRequests) {
    res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
    return res.status(429).json({
      error: 'Too many requests from this IP. Please try again later.',
    });
  }

  next();
};

export default rateLimiter;
