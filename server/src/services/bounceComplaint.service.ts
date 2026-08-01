import { BounceEventModel } from '../models/bounceEvent.model';
import { ComplaintEventModel } from '../models/complaintEvent.model';
import { SuppressionModel } from '../models/suppression.model';
import { SuppressionRepository } from '../repositories/suppression.repository';

export class BounceComplaintService {
  private suppressionRepo = new SuppressionRepository();

  /**
   * Processes a recipient bounce event, logging history and applying suppression logic.
   */
  async handleBounce(
    workspaceId: string,
    messageId: string,
    recipient: string,
    bounceType: 'hard' | 'soft' | 'temporary' | 'permanent',
    smtpCode?: number,
    smtpReason?: string
  ) {
    const cleanRecipient = recipient.toLowerCase().trim();

    // 1. Log immutable Bounce Event
    const event = await BounceEventModel.create({
      workspaceId: workspaceId as any,
      messageId,
      recipient: cleanRecipient,
      bounceType,
      smtpCode,
      smtpReason,
      timestamp: new Date(),
    });

    console.log(`[Bounce Service] Logged ${bounceType} bounce for: ${cleanRecipient}`);

    // 2. Evaluate Suppression rules
    if (bounceType === 'hard' || bounceType === 'permanent') {
      // Immediate Workspace suppression
      await this.suppressRecipient(workspaceId, cleanRecipient, 'bounce');
    } else {
      // Count total soft/temporary bounces in this workspace
      const softBounceCount = await BounceEventModel.countDocuments({
        workspaceId,
        recipient: cleanRecipient,
        bounceType: { $in: ['soft', 'temporary'] },
      });

      // If soft bounces reach limit (e.g. 5), suppress recipient
      if (softBounceCount >= 5) {
        console.warn(`[Bounce Service] Recipient ${cleanRecipient} reached 5 soft bounces. Suppressing account.`);
        await this.suppressRecipient(workspaceId, cleanRecipient, 'bounce');
      }
    }

    return event;
  }

  /**
   * Processes a spam/abuse complaint event, logging history and applying immediate suppressions.
   */
  async handleComplaint(
    workspaceId: string,
    messageId: string,
    recipient: string,
    complaintType: 'spam' | 'abuse',
    feedbackReport?: string
  ) {
    const cleanRecipient = recipient.toLowerCase().trim();

    // 1. Log immutable Complaint Event
    const event = await ComplaintEventModel.create({
      workspaceId: workspaceId as any,
      messageId,
      recipient: cleanRecipient,
      complaintType,
      feedbackReport,
      timestamp: new Date(),
    });

    console.log(`[Complaint Service] Logged ${complaintType} complaint for: ${cleanRecipient}`);

    // 2. Immediate suppression on complaint
    await this.suppressRecipient(workspaceId, cleanRecipient, 'complaint');

    return event;
  }

  /**
   * Adds an email address to the workspace suppression list.
   */
  private async suppressRecipient(workspaceId: string, email: string, reason: 'bounce' | 'complaint' | 'manual') {
    const cleanEmail = email.toLowerCase().trim();

    // Check if already suppressed in this workspace to prevent duplicate errors
    const existing = await this.suppressionRepo.findOne({
      workspaceId,
      email: cleanEmail,
      scope: 'workspace',
    });

    if (!existing) {
      await SuppressionModel.create({
        workspaceId: workspaceId as any,
        email: cleanEmail,
        reason,
        scope: 'workspace',
      });
      console.log(`[Suppression Service] Address ${cleanEmail} added to suppression list (reason: ${reason}).`);

      try {
        const { WebhookService } = await import('./webhook.service');
        const webhookService = new WebhookService();
        await webhookService.triggerEvent(workspaceId, 'suppressed', {
          email: cleanEmail,
          reason,
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        console.error(`[BounceComplaintService] Webhook trigger suppressed error: ${err.message}`);
      }
    }
  }
}
export default BounceComplaintService;
