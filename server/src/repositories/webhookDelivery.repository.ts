import { BaseRepository } from './base.repository';
import { WebhookDeliveryModel, IWebhookDelivery } from '../models/webhookDelivery.model';

export class WebhookDeliveryRepository extends BaseRepository<IWebhookDelivery> {
  constructor() {
    super(WebhookDeliveryModel);
  }

  async findByWebhook(webhookId: string): Promise<IWebhookDelivery[]> {
    return this.model.find({ webhookId }).sort({ timestamp: -1 }).exec();
  }

  override async delete(id: string): Promise<IWebhookDelivery | null> {
    throw new Error('Immutable webhook delivery history violation. Deletes are prohibited.');
  }
}
export default WebhookDeliveryRepository;
