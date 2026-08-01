import mongoose from 'mongoose';
import Redis from 'ioredis';
import { StatusUpdateService } from '../services/statusUpdate.service';
import { DeliveryTrackingService } from '../services/deliveryTracking.service';
import { WorkspaceRepository } from '../repositories/workspace.repository';
import { EmailLogModel } from '../models/emailLog.model';
import { DeliveryEventModel } from '../models/deliveryEvent.model';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://admin:admin_password@localhost:27017/ghostsmtp_test?authSource=admin';

async function runTrackingTests() {
  console.log('--- Starting Email Delivery Tracking Integration Tests ---');

  try {
    await mongoose.connect(TEST_MONGO_URI);
    console.log('[Test Setup] Connected to MongoDB.');
  } catch (error) {
    console.error('[Test Setup] Failed to connect to MongoDB.', error);
    process.exit(1);
  }

  const workspaceRepo = new WorkspaceRepository();
  const statusUpdateService = new StatusUpdateService();
  const trackingService = new DeliveryTrackingService();

  // Create Mock Workspace
  const workspace = await workspaceRepo.create({
    name: 'Tracking Test Workspace',
    plan: 'growth',
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
    // 1. Setup email log
    const messageId = '<test-tracking-id@ghostsmtp.com>';
    const queueId = 'job-tracking-123';
    
    const emailLog = await EmailLogModel.create({
      workspaceId: workspace.id,
      sender: 'info@ghostsmtp.com',
      recipient: 'rcp@ghostsmtp.com',
      subject: 'Tracking test',
      status: 'queued',
      messageId,
      retryCount: 0,
    });

    // 2. Perform sequence of status updates (Event Sourcing)
    console.log('Processing updates: queued -> processing -> sent -> delivered...');
    await statusUpdateService.updateStatus(workspace.id, messageId, queueId, 'processing');
    await statusUpdateService.updateStatus(workspace.id, messageId, queueId, 'sent', {
      smtpResponse: '250 Ok',
      responseCode: 250,
      remoteServer: 'mx.gmail.com',
    });
    await statusUpdateService.updateStatus(workspace.id, messageId, queueId, 'delivered', {
      smtpResponse: '250 2.0.0 Ok: delivered',
      responseCode: 250,
      remoteServer: 'mx.gmail.com',
    });

    // 3. Verify final state in EmailLog
    const updatedLog = await EmailLogModel.findById(emailLog.id);
    assert(updatedLog?.status === 'delivered' && updatedLog.smtpResponse === '250 2.0.0 Ok: delivered', 'Status Update: EmailLog updated to final status.');

    // 4. Verify chronological Event Store entries
    const events = await trackingService.getEventHistory(workspace.id, messageId);
    assert(events.length === 3, 'Event Store: 3 immutable events correctly logged.');
    assert(events[0].status === 'processing' && events[1].status === 'sent' && events[2].status === 'delivered', 'Event Sequence: Chronological state flow validated.');

    // 5. Verify Immutability controls
    console.log('Testing event immutability updates...');
    try {
      const eventToEdit = events[0];
      eventToEdit.status = 'failed';
      await eventToEdit.save();
      assert(false, 'Immutability check: Modifying events must be rejected.');
    } catch (e: any) {
      assert(e.message.includes('Immutable delivery history'), 'Immutability check: Correctly blocked updates to existing events.');
    }

    // 6. Verify Workspace Isolation
    console.log('Testing workspace isolation boundaries...');
    try {
      await trackingService.getEventHistory('different-workspace-id', messageId);
      assert(false, 'Workspace boundary: Lookups across tenants must be blocked.');
    } catch (e: any) {
      assert(e.message.includes('Unauthorized event lookup'), 'Workspace boundary: Blocked cross-tenant access to events history.');
    }

  } catch (error) {
    console.error('An error occurred during test execution:', error);
  } finally {
    // Teardown
    await EmailLogModel.deleteMany({ workspaceId: workspace.id });
    await DeliveryEventModel.deleteMany({ workspaceId: workspace.id });
    await workspaceRepo.delete(workspace.id);

    await mongoose.connection.close();
    console.log('[Test Teardown] MongoDB Connection closed.');

    // Disconnect Redis
    const disconnectRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    await disconnectRedis.quit();
  }

  console.log(`\n--- Tracking Test Summary: ${passed} passed, ${failed} failed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

runTrackingTests();
