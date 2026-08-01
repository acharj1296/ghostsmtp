import crypto from 'crypto';
import { WebhookRepository } from '../repositories/webhook.repository';
import { WebhookEventModel } from '../models/webhookEvent.model';
import { WebhookQueueService } from './webhookQueue.service';

export class WebhookService {
  private webhookRepo = new WebhookRepository();
  private queueService = new WebhookQueueService();

  /**
   * Registers a new webhook endpoint.
   */
  async createWebhook(workspaceId: string, url: string, events: string[]) {
    // Generate secure signing secret (whsec_...)
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    return this.webhookRepo.create({
      workspaceId: workspaceId as any,
      url,
      secret,
      events,
      active: true,
      isDeleted: false,
    } as any);
  }

  /**
   * Lists all registered webhooks for a workspace.
   */
  async listWebhooks(workspaceId: string) {
    return this.webhookRepo.find({ workspaceId, isDeleted: false });
  }

  /**
   * Toggles webhook state.
   */
  async updateWebhookStatus(workspaceId: string, webhookId: string, active: boolean) {
    const webhook = await this.webhookRepo.findOne({ _id: webhookId, workspaceId, isDeleted: false });
    if (!webhook) {
      throw new Error('Webhook endpoint not found.');
    }

    webhook.active = active;
    return webhook.save();
  }

  /**
   * Rotates signature secret keys.
   */
  async rotateSecret(workspaceId: string, webhookId: string) {
    const webhook = await this.webhookRepo.findOne({ _id: webhookId, workspaceId, isDeleted: false });
    if (!webhook) {
      throw new Error('Webhook endpoint not found.');
    }

    webhook.secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    return webhook.save();
  }

  /**
   * Soft deletes a registered webhook.
   */
  async deleteWebhook(workspaceId: string, webhookId: string) {
    const webhook = await this.webhookRepo.findOne({ _id: webhookId, workspaceId, isDeleted: false });
    if (!webhook) {
      throw new Error('Webhook endpoint not found.');
    }

    webhook.isDeleted = true;
    webhook.deletedAt = new Date();
    return webhook.save();
  }

  /**
   * Dispatches a test payload to target endpoint URL.
   */
  async testWebhook(workspaceId: string, webhookId: string) {
    const webhook = await this.webhookRepo.findOne({ _id: webhookId, workspaceId, isDeleted: false });
    if (!webhook) {
      throw new Error('Webhook endpoint not found.');
    }

    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      message: 'Hello from GhostSMTP webhook test dispatcher!',
    };

    // Save event in events store
    const testEvent = await WebhookEventModel.create({
      workspaceId: workspaceId as any,
      event: 'queued', // Use queued or sent as type
      payload: testPayload,
      status: 'pending',
    });

    // Enqueue
    await this.queueService.addWebhookJob({
      workspaceId,
      webhookId: webhook.id,
      eventId: testEvent.id,
      url: webhook.url,
      payload: testPayload,
      secret: webhook.secret,
    });

    return { success: true, message: 'Test webhook job successfully enqueued.' };
  }

  /**
   * Triggers an outbound event, enqueuing it for all matching active webhooks.
   */
  async triggerEvent(workspaceId: string, eventName: 'queued' | 'processing' | 'sent' | 'delivered' | 'deferred' | 'bounced' | 'complained' | 'suppressed' | 'opened' | 'clicked', payload: any) {
    const webhooks = await this.webhookRepo.findActiveByEvent(workspaceId, eventName);

    if (webhooks.length === 0) return [];

    // 2. Log event in WebhookEvent Store
    const webhookEvent = await WebhookEventModel.create({
      workspaceId: workspaceId as any,
      event: eventName,
      payload,
      status: 'pending',
    });

    // 3. Enqueue job for each matched webhook subscription
    const enqueuePromises = webhooks.map((wh) =>
      this.queueService.addWebhookJob({
        workspaceId,
        webhookId: wh.id,
        eventId: webhookEvent.id,
        url: wh.url,
        payload,
        secret: wh.secret,
      })
    );

    await Promise.all(enqueuePromises);

    return webhooks;
  }
}
export default WebhookService;
