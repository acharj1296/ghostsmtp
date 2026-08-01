import { Request, Response } from 'express';
import { EmailSendService } from '../services/emailSend.service';

const emailSendService = new EmailSendService();

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
}
export default EmailController;
