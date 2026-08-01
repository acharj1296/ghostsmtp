import { EmailLogRepository } from '../repositories/emailLog.repository';
import { DeliveryTrackingService } from './deliveryTracking.service';

export class StatusUpdateService {
  private emailLogRepo = new EmailLogRepository();
  private trackingService = new DeliveryTrackingService();

  /**
   * Updates state of delivery logs and records status histories.
   */
  async updateStatus(
    workspaceId: string,
    messageId: string,
    queueId: string,
    status: 'queued' | 'processing' | 'accepted' | 'sent' | 'delivered' | 'deferred' | 'bounced' | 'complained' | 'failed',
    options?: {
      smtpResponse?: string;
      responseCode?: number;
      remoteServer?: string;
      retryCount?: number;
    }
  ) {
    // 1. Fetch EmailLog
    const emailLog = await this.emailLogRepo.findByMessageId(messageId);
    if (!emailLog || emailLog.workspaceId.toString() !== workspaceId) {
      throw new Error('Email log not found.');
    }

    // 2. Update status and flags
    emailLog.status = status;
    if (options?.retryCount !== undefined) {
      emailLog.retryCount = options.retryCount;
    }
    if (options?.smtpResponse) {
      emailLog.smtpResponse = options.smtpResponse;
    }
    await emailLog.save();

    // 3. Log event inside immutable Event Store
    await this.trackingService.logEvent({
      workspaceId,
      messageId,
      queueId,
      status,
      smtpResponse: options?.smtpResponse,
      responseCode: options?.responseCode,
      remoteServer: options?.remoteServer,
      retryCount: options?.retryCount,
    });

    // 4. Dispatch webhook event if subscribing
    const webhookEventsList = ['queued', 'processing', 'sent', 'delivered', 'deferred', 'bounced', 'complained', 'suppressed', 'opened', 'clicked'];
    if (webhookEventsList.includes(status)) {
      try {
        const { WebhookService } = await import('./webhook.service');
        const webhookService = new WebhookService();
        await webhookService.triggerEvent(workspaceId, status as any, {
          messageId,
          queueId,
          recipient: emailLog.recipient,
          sender: emailLog.sender,
          subject: emailLog.subject,
          smtpResponse: options?.smtpResponse,
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        console.error(`[StatusUpdateService] Failed to dispatch webhook event: ${err.message}`);
      }
    }

    // 5. Trigger future callback events placeholders
    switch (status) {
      case 'delivered':
        await this.onDelivery(messageId);
        break;
      case 'bounced':
        await this.onBounce(messageId);
        break;
      case 'complained':
        await this.onComplaint(messageId);
        break;
    }

    return emailLog;
  }

  // Placeholder handlers for hooks and triggers
  private async onDelivery(messageId: string) {
    console.log(`[Event Hook] Future delivery trigger for message: ${messageId}`);
  }

  private async onBounce(messageId: string) {
    console.log(`[Event Hook] Future bounce trigger for message: ${messageId}`);
  }

  private async onComplaint(messageId: string) {
    console.log(`[Event Hook] Future complaint trigger for message: ${messageId}`);
  }

  async onOpen(messageId: string) {
    console.log(`[Event Hook] Future open tracking trigger for message: ${messageId}`);
  }

  async onClick(messageId: string) {
    console.log(`[Event Hook] Future click tracking trigger for message: ${messageId}`);
  }
}
export default StatusUpdateService;
