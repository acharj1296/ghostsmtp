import { Request, Response } from 'express';
import { z } from 'zod';
import { DomainService } from '../services/domain.service';

const domainService = new DomainService();

const createDomainSchema = z.object({
  name: z.string({ required_error: 'Domain name is required.' }).min(1),
});

export class DomainController {
  async create(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      const parsed = createDomainSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const result = await domainService.createDomain(workspaceId, parsed.data.name);
      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async list(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      const domains = await domainService.listDomains(workspaceId);
      return res.status(200).json(domains);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getDetails(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    const { id } = req.params;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      const result = await domainService.getDomainDetails(workspaceId, id);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(404).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    const { id } = req.params;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      await domainService.deleteDomain(workspaceId, id);
      return res.status(200).json({ success: true, message: 'Domain deleted successfully.' });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async verify(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    const { id } = req.params;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      const result = await domainService.verifyDomain(workspaceId, id);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async regenerateDkim(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    const { id } = req.params;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      const result = await domainService.regenerateDkim(workspaceId, id);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
export default DomainController;
