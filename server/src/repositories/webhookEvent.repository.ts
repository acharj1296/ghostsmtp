import { BaseRepository } from './base.repository';
import { WebhookEventModel, IWebhookEvent } from '../models/webhookEvent.model';

export class WebhookEventRepository extends BaseRepository<IWebhookEvent> {
  constructor() {
    super(WebhookEventModel);
  }
}
export default WebhookEventRepository;
