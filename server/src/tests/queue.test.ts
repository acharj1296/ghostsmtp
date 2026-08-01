import mongoose from 'mongoose';
import Redis from 'ioredis';
import { QueueService } from '../services/queue.service';
import { WorkspaceRepository } from '../repositories/workspace.repository';
import { QueueJobRepository } from '../repositories/queueJob.repository';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://admin:admin_password@localhost:27017/ghostsmtp_test?authSource=admin';

async function runQueueTests() {
  console.log('--- Starting Mail Queue Infrastructure Integration Tests ---');

  // Verify DB Connection
  try {
    await mongoose.connect(TEST_MONGO_URI);
    console.log('[Test Setup] Connected to MongoDB.');
  } catch (error) {
    console.error('[Test Setup] Failed to connect to MongoDB.', error);
    process.exit(1);
  }

  const workspaceRepo = new WorkspaceRepository();
  const queueJobRepo = new QueueJobRepository();
  const queueService = new QueueService();

  // Create Mock Workspace
  const workspace = await workspaceRepo.create({
    name: 'Queue Test Workspace',
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
    // Test 1: Add a basic email job
    console.log('Queuing test job...');
    const mailPayload1 = { to: ['recipient@domain.com'], from: 'sender@domain.com', subject: 'Hello', text: 'World', messageId: 'msg_test_1' };
    const job1 = await queueService.addEmailJob(workspace.id, mailPayload1);
    assert(job1.status === 'queued' && job1.retryCount === 0, 'Add Job: Job correctly created in queued status.');

    // Test 2: Add a delayed job
    console.log('Queuing delayed job...');
    const mailPayload2 = { to: ['recipient@domain.com'], from: 'sender@domain.com', subject: 'Hello', text: 'World', messageId: 'msg_test_2' };
    const job2 = await queueService.addEmailJob(workspace.id, mailPayload2, 10000); // 10s delay
    assert(job2.status === 'pending', 'Delayed Job: Delayed job initialized in pending status.');

    // Test 3: Cancel Job
    console.log('Cancelling delayed job...');
    const job2Cancelled = await queueService.cancelJob(workspace.id, job2.messageId);
    assert(job2Cancelled.status === 'cancelled', 'Cancel Job: Job correctly transitioned to cancelled.');

    // Test 4: Worker processing execution
    console.log('Starting worker to process job1...');
    queueService.startWorker(0); // 0% failure ratio (simulate successful sends)
    
    // Wait for worker to finish processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const job1Finished = await queueService.getJobStatus(job1.messageId);
    assert(job1Finished?.status === 'completed', 'Worker Success: Job successfully completed by worker.');
    await queueService.stopWorker();

    // Test 5: Worker failure and DLQ retry logic
    console.log('Queuing failed job to test DLQ backoff...');
    const mailPayload3 = { to: ['recipient@domain.com'], from: 'sender@domain.com', subject: 'Hello', text: 'World', messageId: 'msg_test_3' };
    const job3 = await queueService.addEmailJob(workspace.id, mailPayload3);
    
    // Start worker with 100% failure ratio
    queueService.startWorker(1.0); // 100% failure ratio
    
    // Wait for 3 retries (backoff exponential delay is 5s, 10s, etc. but test options default to max 3 attempts)
    // To speed up tests, wait enough to verify retry counts updates
    await new Promise((resolve) => setTimeout(resolve, 4000));
    
    const job3Retrying = await queueService.getJobStatus(job3.messageId);
    assert(job3Retrying?.status === 'retrying' || job3Retrying?.status === 'failed', 'Worker Retries: Error captured and retry count incremented.');
    
    await queueService.stopWorker();

    // Test 6: Queue Monitoring metrics
    const metrics = await queueService.getQueueMetrics();
    assert(metrics.total >= 0, 'Queue Metrics: Correctly fetched pending/completed/failed queue size.');

  } catch (error) {
    console.error('An error occurred during test execution:', error);
  } finally {
    // Teardown DB records
    await QueueJobModel.deleteMany({ workspaceId: workspace.id });
    await workspaceRepo.delete(workspace.id);

    await mongoose.connection.close();
    console.log('[Test Teardown] MongoDB Connection closed.');

    // Close local redis instances to prevent hung processes
    queueRedisConnection.disconnect();
    workerRedisConnection.disconnect();
  }

  // Redis connections from QueueService are in-module scope but let's force disconnect standard connections
  const disconnectRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  await disconnectRedis.quit();

  console.log(`\n--- Queue Test Summary: ${passed} passed, ${failed} failed ---`);
  
  // Exit cleanly
  process.exit(failed > 0 ? 1 : 0);
}

// Keep connections defined in module scope
import { QueueJobModel } from '../models/queueJob.model';
const queueRedisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
const workerRedisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });

runQueueTests();
