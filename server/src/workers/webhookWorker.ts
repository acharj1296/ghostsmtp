import { assertEncryptionKeyConfigured } from '../config/encryptionGuard';
import { connectDatabase } from '../db/mongoose';
import WebhookQueueService from '../services/webhookQueue.service';

/**
 * Dedicated webhook-delivery worker process. Runs in the `webhook-worker`
 * container so the API can scale horizontally without duplicate consumers.
 */
const start = async () => {
  assertEncryptionKeyConfigured();
  await connectDatabase();
  const webhookQueueService = new WebhookQueueService();
  webhookQueueService.startWorker();
};

start().catch((error) => {
  console.error('[Webhook Worker] Fatal boot error:', error);
  process.exit(1);
});
