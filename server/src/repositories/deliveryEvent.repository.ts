import { BaseRepository } from './base.repository';
import { DeliveryEventModel, IDeliveryEvent } from '../models/deliveryEvent.model';

export class DeliveryEventRepository extends BaseRepository<IDeliveryEvent> {
  constructor() {
    super(DeliveryEventModel);
  }

  async findByMessageId(messageId: string): Promise<IDeliveryEvent[]> {
    // Sort by timestamp to show sequence of states progression
    return this.model.find({ messageId }).sort({ timestamp: 1 }).exec();
  }

  async findByWorkspace(workspaceId: string): Promise<IDeliveryEvent[]> {
    return this.find({ workspaceId });
  }

  // Prevent deletions to enforce immutable history requirements
  override async delete(id: string): Promise<IDeliveryEvent | null> {
    throw new Error('Immutable delivery history violation. Event deletions are prohibited.');
  }
}
export default DeliveryEventRepository;
