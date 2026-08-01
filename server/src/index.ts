import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';

const app = express();

// Apply global middlewares
app.use(helmet());
app.use(cors({
  origin: '*', // We can restrict this in production configurations
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Start Express Server
const server = app.listen(env.PORT, () => {
  console.log(`[GhostSMTP API] Server is running on port ${env.PORT} in ${env.NODE_ENV} mode.`);
});

// Graceful shutdown helper
const gracefulShutdown = () => {
  console.log('[GhostSMTP API] Shutting down gracefully...');
  server.close(() => {
    console.log('[GhostSMTP API] HTTP server closed.');
    process.exit(0);
  });

  // Force close after 10s if connections persist
  setTimeout(() => {
    console.error('[GhostSMTP API] Force shutdown triggered.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
export default app;
