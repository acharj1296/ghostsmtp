import mongoose from 'mongoose';
import Redis from 'ioredis';
import { WebhookService } from '../services/webhook.service';
import { WebhookQueueService } from '../services/webhookQueue.service';
import { WorkspaceRepository } from '../repositories/workspace.repository';
import { WebhookModel } from '../models/webhook.model';
import { WebhookEventModel } from '../models/webhookEvent.model';
import { WebhookDeliveryModel } from '../models/webhookDelivery.model';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://admin:admin_password@localhost:27017/ghostsmtp_test?authSource=admin';

async function runWebhookTests() {
  console.log('--- Starting Webhook Infrastructure Integration Tests ---');

  try {
    await mongoose.connect(TEST_MONGO_URI);
    console.log('[Test Setup] Connected to MongoDB.');
  } catch (error) {
    console.error('[Test Setup] Failed to connect to MongoDB.', error);
    process.exit(1);
  }

  const workspaceRepo = new WorkspaceRepository();
  const service = new WebhookService();
  const queueService = new WebhookQueueService();

  // Create Mock Workspace
  const workspace = await workspaceRepo.create({
    name: 'Webhook Test Workspace',
    plan: 'enterprise',
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
    // Test 1: Create Webhook Endpoint
    console.log('Testing webhook registration...');
    const wh = await service.createWebhook(
      workspace.id,
      'https://api.test-receiver.com/webhooks/test-mock-bypass',
      ['delivered', 'bounced']
    );

    assert(wh.url === 'https://api.test-receiver.com/webhooks/test-mock-bypass', 'Create Webhook: Endpoint registered.');
    assert(wh.secret.startsWith('whsec_'), 'Create Webhook: Secure signing secret generated.');

    // Test 2: Rotate Signing Key Secret
    console.log('Testing webhook secret rotation...');
    const originalSecret = wh.secret;
    const rotated = await service.rotateSecret(workspace.id, wh.id);
    assert(rotated.secret !== originalSecret && rotated.secret.startsWith('whsec_'), 'Rotate Secret: HMAC signing key rotated.');

    // Test 3: Disable/Enable Webhook
    console.log('Testing state toggle active/disabled...');
    const disabled = await service.updateWebhookStatus(workspace.id, wh.id, false);
    assert(disabled.active === false, 'Toggle Status: Endpoint disabled successfully.');
    const enabled = await service.updateWebhookStatus(workspace.id, wh.id, true);
    assert(enabled.active === true, 'Toggle Status: Endpoint re-enabled successfully.');

    // Test 4: Webhook Event Dispatch & Queue Worker Pipeline
    console.log('Testing event triggering and worker transmission...');
    // Trigger delivered event
    const payloadData = { messageId: '<msg-id-123>', recipient: 'user@domain.com', status: 'delivered' };
    const triggered = await service.triggerEvent(workspace.id, 'delivered', payloadData);
    assert(triggered.length === 1, 'Event Trigger: Event enqueued for matched endpoints.');

    // Start Worker
    queueService.startWorker();
    
    // Wait for transmission
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await queueService.stopWorker();

    // Verify delivery logs
    const event = await WebhookEventModel.findOne({ workspaceId: workspace.id, event: 'delivered' });
    assert(!!event && event.status === 'delivered', 'Queue Worker: Parent event status marked delivered.');

    const delivery = await WebhookDeliveryModel.findOne({ workspaceId: workspace.id, webhookId: wh.id });
    assert(!!delivery && delivery.status === 'success', 'Queue Worker: WebhookDelivery attempt trace logged successfully.');

    // Test 5: Webhook Delivery Immutability check
    console.log('Testing delivery log immutability...');
    if (delivery) {
      try {
        delivery.status = 'failed';
        await delivery.save();
        assert(false, 'Immutability check: Modifying webhook logs must be rejected.');
      } catch (e: any) {
        assert(e.message.includes('Immutable webhook delivery history'), 'Immutability check: Blocked webhook delivery edits.');
      }
    }

    // Test 6: Soft Delete
    console.log('Testing soft deletes...');
    await service.deleteWebhook(workspace.id, wh.id);
    const checked = await WebhookModel.findOne({ _id: wh.id, isDeleted: false });
    assert(!checked, 'Soft Delete: Webhook marked deleted and filtered from normal queries.');

  } catch (error) {
    console.error('An error occurred during test execution:', error);
  } finally {
    // Teardown
    await WebhookModel.deleteMany({ workspaceId: workspace.id });
    await WebhookEventModel.deleteMany({ workspaceId: workspace.id });
    await WebhookDeliveryModel.deleteMany({ workspaceId: workspace.id });
    await workspaceRepo.delete(workspace.id);

    await mongoose.connection.close();
    console.log('[Test Teardown] MongoDB Connection closed.');

    // Disconnect Redis
    const disconnectRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    await disconnectRedis.quit();
  }

  console.log(`\n--- Webhook Test Summary: ${passed} passed, ${failed} failed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

runWebhookTests();
