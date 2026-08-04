import { Request, Response } from 'express';
import { EmailSendService } from '../services/emailSend.service';
import { EmailLogModel } from '../models/emailLog.model';
import { DeliveryTrackingService } from '../services/deliveryTracking.service';

const emailSendService = new EmailSendService();
const trackingService = new DeliveryTrackingService();

export class EmailController {
  async send(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing active workspace identification.' });
    }

    try {
      const result = await emailSendService.sendEmail(workspaceId, req.body);
      return res.status(202).json(result); // 202 Accepted for queued jobs
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async sendComposer(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing active workspace identification.' });
    }

    try {
      const result = await emailSendService.sendComposerEmail(workspaceId, req.body);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async list(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing active workspace identification.' });
    }

    try {
      const logs = await EmailLogModel.find({ workspaceId })
        .sort({ createdAt: -1 })
        .limit(100)
        .exec();
      return res.status(200).json(logs);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getEvents(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    let { messageId } = req.params;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing active workspace identification.' });
    }

    try {
      // Decode the messageId since it may contain URL-encoded characters (like <, >, @)
      messageId = decodeURIComponent(messageId);
      const events = await trackingService.getEventHistory(workspaceId, messageId);
      return res.status(200).json(events);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async getStats(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing active workspace identification.' });
    }

    try {
      const [sent, delivered, bounced, failed, queued] = await Promise.all([
        EmailLogModel.countDocuments({ workspaceId, status: 'sent' }),
        EmailLogModel.countDocuments({ workspaceId, status: 'delivered' }),
        EmailLogModel.countDocuments({ workspaceId, status: 'bounced' }),
        EmailLogModel.countDocuments({ workspaceId, status: 'failed' }),
        EmailLogModel.countDocuments({ workspaceId, status: { $in: ['queued', 'processing'] } }),
      ]);

      return res.status(200).json({
        sent: sent + delivered,
        delivered,
        bounced,
        failed,
        queued,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  }
export default EmailController;
