import { BaseRepository } from './base.repository';
import { WebhookModel, IWebhook } from '../models/webhook.model';

export class WebhookRepository extends BaseRepository<IWebhook> {
  constructor() {
    super(WebhookModel);
  }

  async findByWorkspace(workspaceId: string): Promise<IWebhook[]> {
    return this.find({ workspaceId });
  }
}
