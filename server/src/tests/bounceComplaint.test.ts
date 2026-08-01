import mongoose from 'mongoose';
import Redis from 'ioredis';
import { BounceComplaintService } from '../services/bounceComplaint.service';
import { WorkspaceRepository } from '../repositories/workspace.repository';
import { BounceEventModel } from '../models/bounceEvent.model';
import { ComplaintEventModel } from '../models/complaintEvent.model';
import { SuppressionModel } from '../models/suppression.model';

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:admin_password@localhost:27017/ghostsmtp_test?authSource=admin';

async function runBounceTests() {
  console.log('--- Starting Bounce & Complaint Processing Integration Tests ---');

  try {
    await mongoose.connect(TEST_MONGO_URI);
    console.log('[Test Setup] Connected to MongoDB.');
  } catch (error) {
    console.error('[Test Setup] Failed to connect to MongoDB.', error);
    process.exit(1);
  }

  const workspaceRepo = new WorkspaceRepository();
  const service = new BounceComplaintService();

  // Create Mock Workspace
  const workspace = await workspaceRepo.create({
    name: 'Bounce Test Workspace',
    plan: 'free',
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
    // Test 1: Hard bounce immediate suppression
    console.log('Testing hard bounce suppression trigger...');
    const hardEmail = 'hard-bounce@test.com';
    const b1 = await service.handleBounce(workspace.id, 'msg-123', hardEmail, 'hard', 550, 'User unknown');
    
    assert(b1.bounceType === 'hard', 'Hard Bounce: Event logged successfully.');
    const s1 = await SuppressionModel.findOne({ workspaceId: workspace.id, email: hardEmail });
    assert(!!s1 && s1.reason === 'bounce', 'Hard Bounce: Recipient suppressed immediately.');

    // Test 2: Soft bounce accumulation rule (Threshold: 5)
    console.log('Testing soft bounce threshold accumulation...');
    const softEmail = 'soft-bounce@test.com';
    
    // First 4 soft bounces
    for (let i = 0; i < 4; i++) {
      await service.handleBounce(workspace.id, `msg-soft-${i}`, softEmail, 'soft', 421, 'Mailbox full');
    }
    const s2Before = await SuppressionModel.findOne({ workspaceId: workspace.id, email: softEmail });
    assert(!s2Before, 'Soft Bounce Accumulation: Recipient NOT suppressed after 4 soft bounces.');

    // 5th soft bounce
    await service.handleBounce(workspace.id, 'msg-soft-4', softEmail, 'soft', 421, 'Mailbox full');
    const s2After = await SuppressionModel.findOne({ workspaceId: workspace.id, email: softEmail });
    assert(!!s2After && s2After.reason === 'bounce', 'Soft Bounce Accumulation: Recipient suppressed on 5th soft bounce.');

    // Test 3: Spam Complaint immediate suppression
    console.log('Testing spam complaint suppression trigger...');
    const spamEmail = 'complain@test.com';
    const c1 = await service.handleComplaint(workspace.id, 'msg-complaint-1', spamEmail, 'spam', 'Spam report');
    
    assert(c1.complaintType === 'spam', 'Complaint: Event logged successfully.');
    const s3 = await SuppressionModel.findOne({ workspaceId: workspace.id, email: spamEmail });
    assert(!!s3 && s3.reason === 'complaint', 'Complaint: Recipient suppressed immediately.');

    // Test 4: Immutability Controls
    console.log('Testing bounce event immutability...');
    try {
      b1.bounceType = 'soft';
      await b1.save();
      assert(false, 'Immutability: Modifying bounce events must be blocked.');
    } catch (e: any) {
      assert(e.message.includes('Immutable bounce event history'), 'Immutability: Successfully blocked modifications to existing bounce events.');
    }

  } catch (error) {
    console.error('An error occurred during test execution:', error);
  } finally {
    // Teardown
    await BounceEventModel.deleteMany({ workspaceId: workspace.id });
    await ComplaintEventModel.deleteMany({ workspaceId: workspace.id });
    await SuppressionModel.deleteMany({ workspaceId: workspace.id });
    await workspaceRepo.delete(workspace.id);

    await mongoose.connection.close();
    console.log('[Test Teardown] MongoDB Connection closed.');

    // Disconnect Redis
    const disconnectRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    await disconnectRedis.quit();
  }

  console.log(`\n--- Bounce Test Summary: ${passed} passed, ${failed} failed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

runBounceTests();
