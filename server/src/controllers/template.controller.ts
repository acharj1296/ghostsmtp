import { Request, Response } from 'express';
import { TemplateModel } from '../models/template.model';

export class TemplateController {
  async list(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing active workspace identification.' });
    }

    try {
      const templates = await TemplateModel.find({
        workspaceId,
        isDeleted: { $ne: true },
      }).sort({ createdAt: -1 });
      return res.status(200).json(templates);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async create(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing active workspace identification.' });
    }

    const { name, htmlContent, textContent } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Template name is required.' });
    }

    try {
      const template = await TemplateModel.create({
        workspaceId: workspaceId as any,
        name: name.trim(),
        htmlContent: htmlContent || '',
        textContent: textContent || '',
      });
      return res.status(201).json(template);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    const { id } = req.params;

    try {
      const template = await TemplateModel.findOne({ _id: id, workspaceId });
      if (!template) {
        return res.status(404).json({ error: 'Template not found.' });
      }

      template.isDeleted = true;
      template.deletedAt = new Date();
      await template.save();

      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
export default TemplateController;
