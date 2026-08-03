import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { QueueJobRepository } from '../repositories/queueJob.repository';
import { EmailLogRepository } from '../repositories/emailLog.repository';
import { SmtpCredentialRepository } from '../repositories/smtpCredential.repository';
import { SmtpTransportService, ResolvedSmtpConfig } from './smtpTransport.service';

const queueRedisConnection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const workerRedisConnection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

let queueServiceInstance: QueueService | null = null;

export function getQueueService(): QueueService {
  if (!queueServiceInstance) {
    queueServiceInstance = new QueueService();
  }
  return queueServiceInstance;
}

function normalizeCredentialId(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const trimmed = raw.trim();
  if (trimmed === 'default') return null;
  return trimmed;
}

export class QueueService {
  private queue: Queue;
  private worker: Worker | null = null;
  private queueJobRepo = new QueueJobRepository();
  private emailLogRepo = new EmailLogRepository();
  private smtpRepo = new SmtpCredentialRepository();

  constructor() {
    this.queue = new Queue('email-queue', {
      connection: queueRedisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      },
    });
  }

  async addEmailJob(
    workspaceId: string,
    payload: {
      to: string[];
      from: string;
      subject: string;
      text?: string;
      html?: string;
      cc?: string[];
      bcc?: string[];
      replyTo?: string;
      attachments?: any[];
      headers?: any;
      messageId: string;
      credentialId?: string;
    },
    delayMs = 0
  ) {
    const messageId = payload.messageId;

    if (!payload.to || !payload.from || !payload.subject) {
      throw new Error('Invalid email payload parameters.');
    }

    const existing = await this.queueJobRepo.findByMessageId(messageId);
    if (existing) {
      throw new Error('Duplicate message ID detection.');
    }

    const jobOptions: any = {};
    if (delayMs > 0) {
      jobOptions.delay = delayMs;
    }

    const queueJob = await this.queueJobRepo.create({
      workspaceId: workspaceId as any,
      jobId: 'pending_assignment',
      messageId,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      payload,
    } as any);

    const credentialIdFromPayload = normalizeCredentialId(
      (payload as any).credentialId ||
        payload.headers?.['X-GhostSMTP-Credential'] ||
        (payload as any).deliveryMetadata?.credentialId
    );

    const job = await this.queue.add(
      'send-email',
      { workspaceId, messageId, credentialId: credentialIdFromPayload, payload },
      { ...jobOptions, jobId: messageId }
    );

    queueJob.jobId = job.id || messageId;
    queueJob.status = delayMs > 0 ? 'pending' : 'queued';
    await queueJob.save();

    return queueJob;
  }

  private async resolveSmtpConfig(
    workspaceId: string,
    credentialId: string | null
  ): Promise<ResolvedSmtpConfig> {
    if (credentialId) {
      const cred = await this.smtpRepo.findById(credentialId);
      if (!cred) {
        throw new Error('SMTP Credential not found.');
      }
      if (cred.workspaceId.toString() !== workspaceId) {
        throw new Error('Unauthorized credential access.');
      }
      if (cred.status !== 'active') {
        throw new Error('SMTP Credential is disabled.');
      }

      cred.lastUsedAt = new Date();
      await cred.save();

      return SmtpTransportService.resolveCredentialConfig(cred);
    }

    if (process.env.SMTP_HOST) {
      return SmtpTransportService.resolveLocalRelayConfig();
    }

    throw new Error(
      'No SMTP credential provided and no fallback SMTP_HOST configured.'
    );
  }

  startWorker(simulateFailureRatio = 0) {
    if (this.worker) return;

    this.worker = new Worker(
      'email-queue',
      async (job: Job) => {
        const startedAt = Date.now();
        const workerId = `${process.pid}-${job.id}`;
        const { messageId, workspaceId, payload, credentialId } = job.data as any;
        const normalizedCredentialId = normalizeCredentialId(credentialId);

        console.log(
          `[Worker ${workerId}] Processing job ${job.id} messageId=${messageId} credentialId=${normalizedCredentialId || 'none'}`
        );

        const dbJob = await this.queueJobRepo.findByMessageId(messageId);
        if (dbJob) {
          dbJob.status = 'processing';
          await dbJob.save();
        }

        const dbLog = await this.emailLogRepo.findByMessageId(messageId);
        if (dbLog) {
          dbLog.status = 'processing';
          dbLog.workerId = workerId;
          await dbLog.save();
        }

        if (process.env.NODE_ENV === 'test' && !process.env.SMTP_INTEGRATION_TEST) {
          if (simulateFailureRatio > 0 && Math.random() < simulateFailureRatio) {
            throw new Error('Simulated transmission network timeout.');
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
          console.log(`[Worker Mock] Completed message: ${messageId}`);
          return;
        }

        const formattedAttachments = (payload.attachments || []).map((att: any) => ({
          filename: att.filename,
          content: Buffer.from(att.content, 'base64'),
        }));

        let transporter: nodemailer.Transporter | null = null;
        let smtpConfig: ResolvedSmtpConfig | null = null;

        try {
          smtpConfig = await this.resolveSmtpConfig(workspaceId, normalizedCredentialId);
          transporter = SmtpTransportService.createTransporter(smtpConfig);

          try {
            await SmtpTransportService.verifyTransporter(transporter);
            console.log(`[Worker ${workerId}] SMTP verify() passed for ${smtpConfig.host}:${smtpConfig.port}`);
          } catch (verifyErr: unknown) {
            const classified = SmtpTransportService.classifySmtpError(verifyErr);
            const verifyError = verifyErr as Error;
            if (dbLog) {
              dbLog.status = 'failed';
              dbLog.errorReason = `SMTP verification failed: ${classified}`;
              dbLog.errorStack = verifyError.stack;
              dbLog.processingTimeMs = Date.now() - startedAt;
              dbLog.deliveryMetadata = {
                ...(dbLog.deliveryMetadata || {}),
                smtpConfig: smtpConfig.debugInfo,
                verifyFailed: true,
              };
              await dbLog.save();
            }
            throw new Error(`SMTP verification failed: ${classified}`);
          }

          const mailOptions = {
            from: payload.from,
            to: payload.to,
            cc: payload.cc,
            bcc: payload.bcc,
            replyTo: payload.replyTo,
            subject: payload.subject,
            text: payload.text,
            html: payload.html,
            headers: {
              ...payload.headers,
              'Message-ID': messageId,
            },
            attachments: formattedAttachments,
          };

          console.log(`[Worker ${workerId}] sendMail envelope:`, {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject,
          });

          const info = await transporter.sendMail(mailOptions);
          const processingTimeMs = Date.now() - startedAt;

          console.log(`[Worker ${workerId}] Mail sent. Response: ${info.response}`);
          console.log(`[Worker ${workerId}] Message-ID: ${info.messageId}`);
          console.log(`[Worker ${workerId}] Accepted: ${JSON.stringify(info.accepted)}`);
          console.log(`[Worker ${workerId}] Rejected: ${JSON.stringify(info.rejected)}`);

          if (dbLog) {
            dbLog.status = 'sent';
            dbLog.smtpResponse = info.response || '';
            dbLog.processingTimeMs = processingTimeMs;
            dbLog.workerId = workerId;
            dbLog.deliveryMetadata = {
              ...(dbLog.deliveryMetadata || {}),
              smtpConfig: smtpConfig.debugInfo,
              nodemailerMessageId: info.messageId,
              envelope: info.envelope,
              accepted: info.accepted || [],
              rejected: info.rejected || [],
              response: info.response,
            };
            await dbLog.save();
          }
        } finally {
          try {
            if (transporter && typeof transporter.close === 'function') {
              transporter.close();
            }
          } catch {
            // ignore close errors
          }
        }
      },
      {
        connection: workerRedisConnection,
        concurrency: 5,
      }
    );

    this.worker.on('completed', async (job) => {
      const { messageId } = job.data;
      const dbJob = await this.queueJobRepo.findByMessageId(messageId);
      if (dbJob) {
        dbJob.status = 'completed';
        await dbJob.save();
      }

      const dbLog = await this.emailLogRepo.findByMessageId(messageId);
      if (dbLog && dbLog.status !== 'sent') {
        dbLog.status = 'sent';
        await dbLog.save();
      }
    });

    this.worker.on('failed', async (job, err) => {
      if (!job) return;

      const { messageId } = job.data;
      const classified = SmtpTransportService.classifySmtpError(err);
      const dbJob = await this.queueJobRepo.findByMessageId(messageId);
      const dbLog = await this.emailLogRepo.findByMessageId(messageId);

      const attemptsMade = job.attemptsMade;
      const maxAttempts = job.opts.attempts || 3;

      console.error(
        `[Worker] Job msg:${messageId} failed (attempt ${attemptsMade}/${maxAttempts}): ${classified}`
      );
      if (err.stack) {
        console.error(err.stack);
      }

      if (dbJob) {
        dbJob.retryCount = attemptsMade;
        dbJob.errorInfo = classified;
        dbJob.status = attemptsMade >= maxAttempts ? 'failed' : 'retrying';
        await dbJob.save();
      }

      if (dbLog) {
        dbLog.retryCount = attemptsMade;
        dbLog.errorReason = classified;
        dbLog.errorStack = err.stack;
        dbLog.status = attemptsMade >= maxAttempts ? 'failed' : 'queued';
        await dbLog.save();
      }
    });

    console.log('[QueueService] BullMQ worker started on queue: email-queue');
  }

  async stopWorker() {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }

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

  async getJobStatus(messageId: string) {
    return this.queueJobRepo.findByMessageId(messageId);
  }

  async cancelJob(workspaceId: string, messageId: string) {
    const dbJob = await this.queueJobRepo.findByMessageId(messageId);
    if (!dbJob || dbJob.workspaceId.toString() !== workspaceId) {
      throw new Error('Mail job not found.');
    }

    if (dbJob.status === 'completed' || dbJob.status === 'failed') {
      throw new Error('Cannot cancel a completed or failed job.');
    }

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
