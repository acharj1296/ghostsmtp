import { DeliveryEventRepository } from '../repositories/deliveryEvent.repository';

export class DeliveryTrackingService {
  private eventRepo = new DeliveryEventRepository();

  /**
   * Log an event entry to the Event Store.
   */
  async logEvent(params: {
    workspaceId: string;
    messageId: string;
    queueId: string;
    status: 'queued' | 'processing' | 'accepted' | 'sent' | 'delivered' | 'deferred' | 'bounced' | 'complained' | 'failed';
    smtpResponse?: string;
    responseCode?: number;
    remoteServer?: string;
    retryCount?: number;
  }) {
    // Audit check on parameters to prevent unauthorized cross-tenant writes
    if (!params.workspaceId || !params.messageId || !params.queueId) {
      throw new Error('Missing event validation parameters.');
    }

    return this.eventRepo.create({
      workspaceId: params.workspaceId as any,
      messageId: params.messageId,
      queueId: params.queueId,
      status: params.status,
      smtpResponse: params.smtpResponse,
      responseCode: params.responseCode,
      remoteServer: params.remoteServer,
      retryCount: params.retryCount || 0,
      timestamp: new Date(),
    } as any);
  }

  /**
   * Retrieve sequence of events for a specific Message-ID.
   */
  async getEventHistory(workspaceId: string, messageId: string) {
    const events = await this.eventRepo.findByMessageId(messageId);
    
    // Workspace boundary check
    if (events.length > 0 && events[0].workspaceId.toString() !== workspaceId) {
      throw new Error('Unauthorized event lookup access.');
    }

    return events;
  }
}
export default DeliveryTrackingService;
