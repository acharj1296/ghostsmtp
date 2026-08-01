import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory of server
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://ghost_user:ghost_password@localhost:5432/ghostsmtp',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
};

// Simple sanity check of required configurations in production
if (env.NODE_ENV === 'production') {
  if (!process.env.DATABASE_URL) {
    console.warn('[WARNING] DATABASE_URL is not set. Falling back to default.');
  }
  if (!process.env.REDIS_URL) {
    console.warn('[WARNING] REDIS_URL is not set. Falling back to default.');
  }
}
