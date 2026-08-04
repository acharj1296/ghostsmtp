import { z } from 'zod';
import crypto from 'crypto';
import { DomainRepository } from '../repositories/domain.repository';
import { EmailLogRepository } from '../repositories/emailLog.repository';
import { SuppressionRepository } from '../repositories/suppression.repository';
import { QueueService, getQueueService } from './queue.service';
import { SmtpCredentialRepository } from '../repositories/smtpCredential.repository';

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
  private smtpRepo = new SmtpCredentialRepository();
  private queueService = getQueueService();

  private async validateCredential(workspaceId: string, credentialId?: string) {
    // A missing credentialId is allowed when a fallback outbound relay is
    // configured (SMTP_HOST), which the queue worker resolves automatically.
    // This matches the Email Composer's "Using Default system relay" behavior.
    if (!credentialId) {
      if (process.env.SMTP_HOST) {
        return null;
      }
      throw new Error('SMTP credential is required. Select an active credential in the Email Composer.');
    }

    const cred = await this.smtpRepo.findById(credentialId);
    if (!cred || cred.workspaceId.toString() !== workspaceId) {
      throw new Error('SMTP credential not found in this workspace.');
    }
    if (cred.status !== 'active') {
      throw new Error('SMTP credential is disabled.');
    }

    const isExternal = !!(cred.host && cred.smtpUsername && cred.encryptedPassword);
    const isLocalRelay = !!cred.username;

    if (!isExternal && !isLocalRelay) {
      throw new Error(
        'Incomplete SMTP credential configuration. Recreate the credential with external SMTP settings (host, username, password) or as a local relay credential.'
      );
    }

    return cred;
  }

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

    // Validate recipient suppressions (Global and Workspace level)
    const suppressionRepo = new SuppressionRepository();
    const allRecipients = [...emailData.to, ...emailData.cc, ...emailData.bcc];
    for (const r of allRecipients) {
      const suppressed = await suppressionRepo.findSuppressed(workspaceId, r);
      if (suppressed) {
        throw new Error(`Recipient address "${r}" is suppressed.`);
      }
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
      // allow callers to pass credentialId to select outbound SMTP
      credentialId: (inputPayload as any).credentialId || undefined,
    } as any);

    return {
      messageId,
      status: 'queued',
      logId: emailLog.id,
    };
  }

  async sendComposerEmail(workspaceId: string, inputPayload: any) {
    const { 
      credentialId, 
      domainId, 
      fromName, 
      fromEmail, 
      to, 
      cc = [], 
      bcc = [], 
      subject, 
      replyTo, 
      priority = 'normal', 
      text, 
      html, 
      attachments = [],
      templateId
    } = inputPayload;

    if (!to || (Array.isArray(to) && to.length === 0)) {
      throw new Error('At least one recipient email address is required.');
    }
    if (!subject || subject.trim() === '') {
      throw new Error('Email subject line cannot be empty.');
    }
    if (!fromEmail) {
      throw new Error('From email address is required.');
    }

    const senderDomain = fromEmail.split('@')[1];
    if (!senderDomain) {
      throw new Error('Invalid sender email address format.');
    }

    // 1. Domain verification check
    const domainObj = await this.domainRepo.findByWorkspaceAndId(workspaceId, domainId);
    if (!domainObj) {
      throw new Error(`Domain with ID ${domainId} not found in this workspace.`);
    }

    if (domainObj.status !== 'verified') {
      throw new Error(`Domain "${domainObj.name}" is not verified. SPF, DKIM, and DMARC verification are required before sending.`);
    }

    await this.validateCredential(workspaceId, credentialId);

    // 2. Generate unique message ID
    const messageId = `<${crypto.randomUUID()}@${senderDomain}>`;

    const toArray = Array.isArray(to) ? to : [to];
    const ccArray = Array.isArray(cc) ? cc : (cc ? [cc] : []);
    const bccArray = Array.isArray(bcc) ? bcc : (bcc ? [bcc] : []);

    const fromFormatted = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;

    // 3. Log email in DB
    const primaryRecipient = toArray[0];
    const emailLog = await this.emailLogRepo.create({
      workspaceId: workspaceId as any,
      domainId: domainObj.id,
      sender: fromFormatted,
      recipient: primaryRecipient,
      subject,
      status: 'queued',
      retryCount: 0,
      messageId,
      deliveryMetadata: {
        allTo: toArray,
        cc: ccArray,
        bcc: bccArray,
        priority,
        templateId,
        credentialId,
        attachmentsCount: attachments.length,
      },
    } as any);

    // 4. Add to Queue
    await this.queueService.addEmailJob(workspaceId, {
      to: toArray,
      from: fromFormatted,
      subject,
      text,
      html,
      cc: ccArray,
      bcc: bccArray,
      replyTo,
      attachments,
      credentialId,
      headers: {
        'X-Priority': priority === 'high' ? '1' : priority === 'low' ? '5' : '3',
        ...(credentialId ? { 'X-GhostSMTP-Credential': credentialId } : {}),
      },
      messageId,
    } as any);

    return {
      success: true,
      messageId,
      status: 'queued',
      logId: emailLog.id,
    };
  }
}
export default EmailSendService;
