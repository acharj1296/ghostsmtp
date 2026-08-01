import { BaseRepository } from './base.repository';
import { WebhookModel, IWebhook } from '../models/webhook.model';

export class WebhookRepository extends BaseRepository<IWebhook> {
  constructor() {
    super(WebhookModel);
  }

  async findActiveByWorkspace(workspaceId: string): Promise<IWebhook[]> {
    return this.model.find({ workspaceId, active: true, isDeleted: false }).exec();
  }

  async findActiveByEvent(workspaceId: string, eventName: string): Promise<IWebhook[]> {
    return this.model.find({
      workspaceId,
      active: true,
      isDeleted: false,
      events: eventName,
    }).exec();
  }
}
export default WebhookRepository;
