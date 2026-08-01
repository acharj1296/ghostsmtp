import mongoose from 'mongoose';
import { env } from '../config/env';

export const connectDatabase = async (): Promise<void> => {
  try {
    mongoose.connection.on('connected', () => {
      console.log('[MongoDB] Connected successfully to database cluster.');
    });

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error occurred:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Connection disconnected.');
    });

    await mongoose.connect(env.MONGODB_URI, {
      autoIndex: true, // Auto-build indexes in development/production
    });
  } catch (error) {
    console.error('[MongoDB] Initial connection failed:', error);
    throw error;
  }
};

export const getDbStatus = (): string => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
};
