import { z } from 'zod';
import crypto from 'crypto';
import { DomainRepository } from '../repositories/domain.repository';
import { EmailLogRepository } from '../repositories/emailLog.repository';
import { QueueService } from './queue.service';

const emailAddressSchema = z.string().email();

const sendEmailSchema = z.object({
  to: z.union([emailAddressSchema, z.array(emailAddressSchema)]).transform(val => Array.isArray(val) ? val : [val]),
  from: emailAddressSchema,
  subject: z.string().min(1, 'Subject is required.'),
  text: z.string().optional(),
  html: z.string().optional(),
  cc: z.union([emailAddressSchema, z.array(emailAddressSchema)]).optional().transform(val => val ? (Array.isArray(val) ? val : [val]) : []),
  bcc: z.union([emailAddressSchema, z.array(emailAddressSchema)]).optional().transform(val => val ? (Array.isArray(val) ? val : [val]) : []),
  replyTo: emailAddressSchema.optional(),
  attachments: z.array(z.object({
    filename: z.string().min(1),
    content: z.string(), // base64 string
  })).optional().default([]),
  headers: z.record(z.string()).optional().default({}),
});

export class EmailSendService {
  private domainRepo = new DomainRepository();
  private emailLogRepo = new EmailLogRepository();
  private queueService = new QueueService();

  async sendEmail(workspaceId: string, inputPayload: any) {
    // 1. Zod input validation
    const parsed = sendEmailSchema.safeParse(inputPayload);
    if (!parsed.success) {
      throw new Error(parsed.error.errors[0].message);
    }

    const emailData = parsed.data;

    // 2. Validate maximum recipients threshold (max 50)
    const totalRecipients = emailData.to.length + emailData.cc.length + emailData.bcc.length;
    if (totalRecipients > 50) {
      throw new Error('Maximum recipients threshold exceeded (max 50).');
    }

    // 3. Sender domain validation
    // Sender email format: user@domain.com -> extract domain.com
    const senderDomain = emailData.from.split('@')[1];
    const verifiedDomain = await this.domainRepo.findVerifiedGlobally(senderDomain);
    if (!verifiedDomain || verifiedDomain.workspaceId.toString() !== workspaceId) {
      throw new Error(`Sender domain "${senderDomain}" is not verified in this workspace.`);
    }

    // 4. Attachment size limit check (max 10MB total)
    let totalAttachmentSize = 0;
    for (const file of emailData.attachments) {
      const buffer = Buffer.from(file.content, 'base64');
      totalAttachmentSize += buffer.length;
    }
    // 10MB = 10 * 1024 * 1024 bytes
    if (totalAttachmentSize > 10 * 1024 * 1024) {
      throw new Error('Attachments size limit exceeded (max 10MB).');
    }

    // Rate limiting hooks placeholder
    // await this.checkRateLimits(workspaceId);

    // Virus and Spam scanning hooks placeholder
    // await this.scanForVirus(emailData);
    // await this.scanForSpam(emailData);

    // 5. Generate SMTP compliant unique Message-ID
    const messageId = `<${crypto.randomUUID()}@${senderDomain}>`;

    // 6. Log email record inside MongoDB database
    const primaryRecipient = emailData.to[0];
    const emailLog = await this.emailLogRepo.create({
      workspaceId: workspaceId as any,
      domainId: verifiedDomain.id,
      sender: emailData.from,
      recipient: primaryRecipient,
      subject: emailData.subject,
      status: 'queued',
      retryCount: 0,
      messageId,
      deliveryMetadata: {
        allTo: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        attachmentsCount: emailData.attachments.length,
        headers: emailData.headers,
      },
    } as any);

    // 7. Enqueue email job to BullMQ Redis Queue
    await this.queueService.addEmailJob(workspaceId, {
      ...emailData,
      messageId,
    } as any);

    return {
      messageId,
      status: 'queued',
      logId: emailLog.id,
    };
  }
}
export default EmailSendService;
