import crypto from 'crypto';
import { WebhookRepository } from '../repositories/webhook.repository';
import { WebhookEventModel } from '../models/webhookEvent.model';
import { WebhookQueueService } from './webhookQueue.service';
import { SecurityService } from './security.service';

export class WebhookService {
  private webhookRepo = new WebhookRepository();
  private queueService = new WebhookQueueService();

  /**
   * The signing secret is encrypted at rest. Legacy rows created before
   * encryption still carry a plaintext `whsec_...` value; this resolves both.
   */
  private resolveSecretForDispatch(storedSecret: string): string {
    if (storedSecret.startsWith('whsec_')) {
      return storedSecret;
    }
    return SecurityService.decryptSecret(storedSecret);
  }

  /**
   * Strips the (encrypted) secret from a document before it leaves the API so
   * plaintext secrets are only ever revealed once — at creation or rotation.
   */
  private stripSecret(doc: any) {
    const raw = doc.toObject ? doc.toObject() : doc;
    const { secret, ...rest } = raw;
    const id = (rest._id ?? rest.id)?.toString?.() ?? rest._id ?? rest.id;
    return {
      ...rest,
      _id: id,
      id,
      workspaceId: rest.workspaceId?.toString?.() ?? rest.workspaceId,
    };
  }

  /**
   * Registers a new webhook endpoint. The plaintext signing secret is returned
   * exactly once in the create response.
   */
  async createWebhook(workspaceId: string, url: string, events: string[]) {
    // Generate secure signing secret (whsec_...)
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const saved = await this.webhookRepo.create({
      workspaceId: workspaceId as any,
      url,
      secret: SecurityService.encryptSecret(secret),
      events,
      active: true,
      isDeleted: false,
    } as any);

    // Return plain object with _id for frontend compatibility
    const webhookObj = saved.toObject ? saved.toObject() : saved;
    return {
      _id: webhookObj._id?.toString() || webhookObj.id,
      id: webhookObj._id?.toString() || webhookObj.id,
      workspaceId: webhookObj.workspaceId?.toString(),
      url: webhookObj.url,
      events: webhookObj.events,
      active: webhookObj.active,
      secret: secret,
      createdAt: webhookObj.createdAt,
    };
  }

  /**
   * Lists all registered webhooks for a workspace (secret never included).
   */
  async listWebhooks(workspaceId: string) {
    const webhooks = await this.webhookRepo.find({ workspaceId, isDeleted: false });
    return webhooks.map((wh: any) => this.stripSecret(wh));
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
    const saved = await webhook.save();
    return this.stripSecret(saved);
  }

  /**
   * Rotates signature secret keys. The new plaintext secret is returned exactly
   * once in the rotate response.
   */
  async rotateSecret(workspaceId: string, webhookId: string) {
    const webhook = await this.webhookRepo.findOne({ _id: webhookId, workspaceId, isDeleted: false });
    if (!webhook) {
      throw new Error('Webhook endpoint not found.');
    }

    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    webhook.secret = SecurityService.encryptSecret(secret);
    const saved = await webhook.save();
    const webhookObj = saved.toObject ? saved.toObject() : saved;
    return {
      _id: webhookObj._id?.toString() || webhookObj.id,
      id: webhookObj._id?.toString() || webhookObj.id,
      workspaceId: webhookObj.workspaceId?.toString(),
      url: webhookObj.url,
      events: webhookObj.events,
      active: webhookObj.active,
      secret: secret,
      createdAt: webhookObj.createdAt,
    };
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
      secret: this.resolveSecretForDispatch(webhook.secret),
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
        secret: this.resolveSecretForDispatch(wh.secret),
      })
    );

    await Promise.all(enqueuePromises);

    return webhooks;
  }
}
export default WebhookService;
