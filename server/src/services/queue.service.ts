import { Queue, Worker, Job } from 'bullmq';
import crypto from 'crypto';
import Redis from 'ioredis';
import { env } from '../config/env';
import { QueueJobRepository } from '../repositories/queueJob.repository';

// Keep shared redis connections specifically for BullMQ
const queueRedisConnection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const workerRedisConnection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

export class QueueService {
  private queue: Queue;
  private worker: Worker | null = null;
  private queueJobRepo = new QueueJobRepository();

  constructor() {
    // 1. Initialize BullMQ Queue
    this.queue = new Queue('email-queue', {
      connection: queueRedisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // wait 5s, then 10s, etc.
        },
        removeOnComplete: false, // Keep logs for status checks
        removeOnFail: false,
      },
    });
  }

  /**
   * Schedules/Queues an outbound email transmission.
   */
  async addEmailJob(workspaceId: string, payload: { to: string; from: string; subject: string; body: string }, delayMs = 0) {
    const messageId = `msg_${crypto.randomBytes(12).toString('hex')}`;

    // Workspace and payload validation
    if (!payload.to || !payload.from || !payload.subject) {
      throw new Error('Invalid email payload parameters.');
    }

    // Duplicate protection check
    const existing = await this.queueJobRepo.findByMessageId(messageId);
    if (existing) {
      throw new Error('Duplicate message ID detection.');
    }

    // Prepare options
    const jobOptions: any = {};
    if (delayMs > 0) {
      jobOptions.delay = delayMs;
    }

    // Create Job document in MongoDB as 'pending'
    const queueJob = await this.queueJobRepo.create({
      workspaceId: workspaceId as any,
      jobId: 'pending_assignment',
      messageId,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      payload,
    } as any);

    // Push into BullMQ Queue
    const job = await this.queue.add(
      'send-email',
      { workspaceId, messageId, payload },
      { ...jobOptions, jobId: messageId }
    );

    // Update MongoDB status to 'queued' with assigned job ID
    queueJob.jobId = job.id || messageId;
    queueJob.status = delayMs > 0 ? 'pending' : 'queued';
    await queueJob.save();

    return queueJob;
  }

  /**
   * Start the Worker engine processing queue items.
   */
  startWorker(simulateFailureRatio = 0) {
    if (this.worker) return;

    this.worker = new Worker(
      'email-queue',
      async (job: Job) => {
        const { messageId, workspaceId } = job.data;
        console.log(`[Worker] Started processing job: ${job.id} for msg: ${messageId}`);

        // Update DB to processing
        const dbJob = await this.queueJobRepo.findByMessageId(messageId);
        if (dbJob) {
          dbJob.status = 'processing';
          await dbJob.save();
        }

        // Mock delivery process (Do NOT send real mail, do NOT connect Postfix)
        // Simulate random failure according to simulateFailureRatio parameter
        if (simulateFailureRatio > 0 && Math.random() < simulateFailureRatio) {
          throw new Error('Simulated transmission network timeout.');
        }

        // Simulating processing latency
        await new Promise((resolve) => setTimeout(resolve, 800));
        console.log(`[Worker] Job completed successfully: ${job.id}`);
      },
      {
        connection: workerRedisConnection,
        concurrency: 5,
      }
    );

    // Handle completed events
    this.worker.on('completed', async (job) => {
      const { messageId } = job.data;
      const dbJob = await this.queueJobRepo.findByMessageId(messageId);
      if (dbJob) {
        dbJob.status = 'completed';
        await dbJob.save();
      }
    });

    // Handle failed events (including retries and dead-letter queue routing)
    this.worker.on('failed', async (job, err) => {
      if (!job) return;
      const { messageId } = job.data;
      const dbJob = await this.queueJobRepo.findByMessageId(messageId);
      if (dbJob) {
        dbJob.retryCount = job.attemptsMade;
        dbJob.errorInfo = err.message;

        // Check if retry threshold is exhausted (moves to Dead Letter Queue state)
        if (job.attemptsMade >= (job.opts.attempts || 3)) {
          dbJob.status = 'failed';
          console.error(`[Worker] Job msg:${messageId} permanently failed. Moved to DLQ.`);
        } else {
          dbJob.status = 'retrying';
          console.warn(`[Worker] Job msg:${messageId} failed (attempt ${job.attemptsMade}). Retrying...`);
        }
        await dbJob.save();
      }
    });
  }

  /**
   * Stops the active worker connection threads.
   */
  async stopWorker() {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }

  /**
   * Dynamic status monitors mapping current lengths.
   */
  async getQueueMetrics() {
    const [active, completed, failed, delayed, waiting] = await Promise.all([
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
      this.queue.getWaitingCount(),
    ]);

    return {
      active,
      completed,
      failed,
      delayed,
      waiting,
      total: active + completed + failed + delayed + waiting,
    };
  }

  /**
   * Queries status and logs from database.
   */
  async getJobStatus(messageId: string) {
    return this.queueJobRepo.findByMessageId(messageId);
  }

  /**
   * Cancel / revoke queued email job.
   */
  async cancelJob(workspaceId: string, messageId: string) {
    const dbJob = await this.queueJobRepo.findByMessageId(messageId);
    if (!dbJob || dbJob.workspaceId.toString() !== workspaceId) {
      throw new Error('Mail job not found.');
    }

    if (dbJob.status === 'completed' || dbJob.status === 'failed') {
      throw new Error('Cannot cancel a completed or failed job.');
    }

    // Remove from BullMQ
    const job = await this.queue.getJob(messageId);
    if (job) {
      await job.remove();
    }

    dbJob.status = 'cancelled';
    await dbJob.save();

    return dbJob;
  }
}
export default QueueService;
