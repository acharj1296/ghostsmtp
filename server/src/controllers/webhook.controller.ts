import { Request, Response } from 'express';
import { z } from 'zod';
import { WebhookService } from '../services/webhook.service';

const webhookService = new WebhookService();

const createWebhookSchema = z.object({
  url: z.string().url('Invalid webhook endpoint URL.'),
  events: z.array(z.string()).min(1, 'At least one event selection is required.'),
});

const updateWebhookStatusSchema = z.object({
  active: z.boolean(),
});

export class WebhookController {
  async create(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing active workspace identification.' });
    }

    try {
      const parsed = createWebhookSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const result = await webhookService.createWebhook(workspaceId, parsed.data.url, parsed.data.events);
      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async updateStatus(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    const { id } = req.params;

    try {
      const parsed = updateWebhookStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const result = await webhookService.updateWebhookStatus(workspaceId!, id, parsed.data.active);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async rotate(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    const { id } = req.params;

    try {
      const result = await webhookService.rotateSecret(workspaceId!, id);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    const { id } = req.params;

    try {
      await webhookService.deleteWebhook(workspaceId!, id);
      return res.status(200).json({ message: 'Webhook endpoint deleted successfully.' });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async test(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    const { id } = req.params;

    try {
      const result = await webhookService.testWebhook(workspaceId!, id);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
export default WebhookController;
