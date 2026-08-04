import { assertEncryptionKeyConfigured } from '../config/encryptionGuard';
import { connectDatabase } from '../db/mongoose';
import { getQueueService } from '../services/queue.service';

/**
 * Dedicated email-send worker process. Runs in the `send-worker` container so
 * the API can scale horizontally without duplicate BullMQ consumers.
 */
const start = async () => {
  assertEncryptionKeyConfigured();
  await connectDatabase();
  getQueueService().startWorker();
};

start().catch((error) => {
  console.error('[Email Worker] Fatal boot error:', error);
  process.exit(1);
});
