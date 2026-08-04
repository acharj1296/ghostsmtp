import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { assertEncryptionKeyConfigured } from './config/encryptionGuard';
import { connectDatabase, getDbStatus } from './db/mongoose';
import { rateLimiter } from './middleware/rateLimit.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import domainRouter from './routes/domain.routes';
import credentialRouter from './routes/credential.routes';
import internalRouter from './routes/internal.routes';
import emailRouter from './routes/email.routes';
import webhookRouter from './routes/webhook.routes';
import profileRouter from './routes/profile.routes';
import templateRouter from './routes/template.routes';

const app = express();

// Apply global middlewares
app.use(helmet());

// nginx is the only reverse proxy in front of the API, so exactly one trusted hop.
app.set('trust proxy', env.TRUST_PROXY_HOPS);

// Secure CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(rateLimiter);
// 20MB cap accepts 8MB attachments (base64 overhead ~33%) with headroom,
// while staying below Postfix's 25MB message_size_limit.
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// API Routers
app.use('/api/v1/domains', domainRouter);
app.use('/api/v1/credentials', credentialRouter);
app.use('/api/v1/internal', internalRouter);
app.use('/api/v1/emails', emailRouter);
app.use('/api/v1/webhooks', webhookRouter);
app.use('/api/v1/profile', profileRouter);
app.use('/api/v1/templates', templateRouter);
app.use(errorHandler);

// Health Check Endpoint (Includes MongoDB status check)
app.get('/api/v1/health', (req, res) => {
  const dbStatus = getDbStatus();
  const isHealthy = dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
    uptime: process.uptime(),
    version: '1.0.0',
    services: {
      mongodb: {
        status: dbStatus,
        healthy: isHealthy,
      }
    }
  });
});

// Start Express Server & MongoDB Connection
const startServer = async () => {
  try {
    // Fail fast in production if secrets cannot be encrypted at rest.
    assertEncryptionKeyConfigured();

    // Establish DB Connection
    await connectDatabase();

    // NOTE: BullMQ workers no longer run inside the API process. Dedicated
    // `send-worker` and `webhook-worker` containers consume the queues, which
    // lets the API scale horizontally without duplicate consumers.

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

      setTimeout(() => {
        console.error('[GhostSMTP API] Force shutdown triggered.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    console.error('❌ Failed to boot GhostSMTP API server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
