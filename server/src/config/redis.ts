import Redis from 'ioredis';
import { env } from './env';

// Create a reusable Redis connection option mapping
export const getRedisConnectionOptions = () => {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
  });
};

export default getRedisConnectionOptions;
