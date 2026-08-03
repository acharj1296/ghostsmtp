/**
 * End-to-end SMTP delivery integration test.
 * Run: SMTP_INTEGRATION_TEST=1 npx ts-node --transpile-only src/tests/smtpDelivery.integration.test.ts
 */
import mongoose from 'mongoose';
import crypto from 'crypto';
import { connectDatabase } from '../db/mongoose';
import { getQueueService } from '../services/queue.service';
import { EmailLogRepository } from '../repositories/emailLog.repository';

const TEST_RECIPIENT = process.env.TEST_GMAIL || 'arjunacharya262@gmail.com';
const WORKSPACE_ID = process.env.TEST_WORKSPACE_ID || '6a6e26e61bb30797dcba8904';
const CREDENTIAL_ID = process.env.TEST_CREDENTIAL_ID || '6a6f1c7bab5e60409f652c30';
const FROM_DOMAIN = process.env.TEST_FROM_DOMAIN || 'ghostsmp.qzz.io';

async function run() {
  console.log('--- GhostSMTP SMTP Delivery Integration Test ---');
  console.log(`Recipient: ${TEST_RECIPIENT}`);
  console.log(`Credential: ${CREDENTIAL_ID}`);

  await connectDatabase();

  const queueService = getQueueService();
  queueService.startWorker();

  const emailLogRepo = new EmailLogRepository();
  const messageId = `<${crypto.randomUUID()}@${FROM_DOMAIN}>`;

  await queueService.addEmailJob(WORKSPACE_ID, {
    to: [TEST_RECIPIENT],
    from: `"GhostSMTP Pipeline Test" <support@${FROM_DOMAIN}>`,
    subject: `GhostSMTP Delivery Test ${new Date().toISOString()}`,
    text: 'This is a real pipeline test from GhostSMTP after fixing local relay credentials.',
    html: '<p>This is a <strong>real pipeline test</strong> from GhostSMTP after fixing local relay credentials.</p>',
    credentialId: CREDENTIAL_ID,
    messageId,
    headers: {},
  });

  await emailLogRepo.create({
    workspaceId: WORKSPACE_ID as any,
    sender: `"GhostSMTP Pipeline Test" <support@${FROM_DOMAIN}>`,
    recipient: TEST_RECIPIENT,
    subject: `GhostSMTP Delivery Test`,
    status: 'queued',
    retryCount: 0,
    messageId,
  } as any);

  console.log(`Queued messageId: ${messageId}`);
  console.log('Waiting for worker to process (up to 30s)...');

  let log = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    log = await emailLogRepo.findByMessageId(messageId);
    if (log && (log.status === 'sent' || log.status === 'failed')) {
      break;
    }
    process.stdout.write('.');
  }

  console.log('\n--- Result ---');
  if (!log) {
    console.error('FAIL: No email log found');
    process.exit(1);
  }

  console.log(JSON.stringify({
    status: log.status,
    errorReason: log.errorReason,
    smtpResponse: log.smtpResponse,
    processingTimeMs: log.processingTimeMs,
    workerId: log.workerId,
    deliveryMetadata: log.deliveryMetadata,
  }, null, 2));

  await queueService.stopWorker();
  await mongoose.connection.close();

  if (log.status === 'sent') {
    console.log('\nPASS: Email accepted by SMTP server. Check Gmail inbox/spam.');
    process.exit(0);
  }

  console.error('\nFAIL: Email delivery failed.');
  process.exit(1);
}

run().catch((err) => {
  console.error('Test crashed:', err);
  process.exit(1);
});
