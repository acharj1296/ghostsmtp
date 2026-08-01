import mongoose from 'mongoose';
import Redis from 'ioredis';
import { EmailSendService } from '../services/emailSend.service';
import { WorkspaceRepository } from '../repositories/workspace.repository';
import { DomainRepository } from '../repositories/domain.repository';
import { EmailLogModel } from '../models/emailLog.model';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://admin:admin_password@localhost:27017/ghostsmtp_test?authSource=admin';

async function runSendTests() {
  console.log('--- Starting Email Sending Engine Integration Tests ---');

  try {
    await mongoose.connect(TEST_MONGO_URI);
    console.log('[Test Setup] Connected to MongoDB.');
  } catch (error) {
    console.error('[Test Setup] Failed to connect to MongoDB.', error);
    process.exit(1);
  }

  const workspaceRepo = new WorkspaceRepository();
  const domainRepo = new DomainRepository();
  const sendService = new EmailSendService();

  // Create mock workspace and verified domain
  const workspace = await workspaceRepo.create({
    name: 'Email Send Test Workspace',
    plan: 'growth',
  } as any);

  const domain = await domainRepo.create({
    workspaceId: workspace.id,
    name: 'ghostsmtp.com',
    status: 'verified',
  } as any);

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  };

  try {
    // Test 1: Successful Enqueue
    console.log('Testing successful email queueing...');
    const result1 = await sendService.sendEmail(workspace.id, {
      to: 'receiver@ghostsmtp.com',
      from: 'info@ghostsmtp.com',
      subject: 'Verification Test',
      text: 'Simple text content body',
      html: '<p>HTML body</p>',
    });
    assert(result1.status === 'queued' && !!result1.messageId, 'Queue Success: Valid sender and parameters enqueued successfully.');

    // Test 2: Unverified Domain Rejection
    console.log('Testing unverified domain send...');
    try {
      await sendService.sendEmail(workspace.id, {
        to: 'receiver@ghostsmtp.com',
        from: 'info@fakehost.com', // unverified domain
        subject: 'Fake domain',
        text: 'Body text',
      });
      assert(false, 'Unverified Rejection: Domain verification check failed.');
    } catch (e: any) {
      assert(e.message.includes('not verified'), 'Unverified Rejection: Correctly rejected unverified sender domain.');
    }

    // Test 3: Exceed Maximum Recipients Threshold
    console.log('Testing maximum recipients...');
    const fakeRecipients = Array.from({ length: 55 }, (_, i) => `rcp_${i}@ghostsmtp.com`);
    try {
      await sendService.sendEmail(workspace.id, {
        to: fakeRecipients,
        from: 'info@ghostsmtp.com',
        subject: 'Spammy send',
        text: 'Body text',
      });
      assert(false, 'Recipients Limit: Limit check failed.');
    } catch (e: any) {
      assert(e.message.includes('recipients threshold exceeded'), 'Recipients Limit: Correctly rejected payloads exceeding max recipients count.');
    }

    // Test 4: Exceed Attachment size threshold
    console.log('Testing maximum attachment size...');
    // Create fake base64 content exceeding 10MB (approx 15MB base64 string)
    const largeContent = 'a'.repeat(15 * 1024 * 1024);
    try {
      await sendService.sendEmail(workspace.id, {
        to: 'receiver@ghostsmtp.com',
        from: 'info@ghostsmtp.com',
        subject: 'Large attachments',
        text: 'Body text',
        attachments: [{ filename: 'huge.zip', content: largeContent }],
      });
      assert(false, 'Attachment Limit: Size limit verification failed.');
    } catch (e: any) {
      assert(e.message.includes('Attachments size limit exceeded'), 'Attachment Limit: Correctly rejected oversized attachment payload.');
    }

  } catch (error) {
    console.error('An error occurred during test execution:', error);
  } finally {
    // Teardown DB logs
    await EmailLogModel.deleteMany({ workspaceId: workspace.id });
    await domainRepo.delete(domain.id);
    await workspaceRepo.delete(workspace.id);

    await mongoose.connection.close();
    console.log('[Test Teardown] MongoDB Connection closed.');

    // Disconnect test connection
    const disconnectRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    await disconnectRedis.quit();
  }

  console.log(`\n--- Send Test Summary: ${passed} passed, ${failed} failed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

runSendTests();
