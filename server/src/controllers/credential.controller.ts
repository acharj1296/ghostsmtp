import { Request, Response } from 'express';
import { z } from 'zod';
import { CredentialService } from '../services/credential.service';

const credentialService = new CredentialService();

const createSmtpSchema = z.object({
  // If creating an external SMTP credential provide host/port/secure/smtpUsername/password
  host: z.string().optional(),
  port: z.number().optional(),
  secure: z.boolean().optional(),
  smtpUsername: z.string().optional(),
  password: z.string().optional(),
  authenticationType: z.enum(['plain','login','oauth']).optional(),
  description: z.string().optional(),
});

const updateSmtpStatusSchema = z.object({
  status: z.enum(['active', 'disabled']),
});

const createApiKeySchema = z.object({
  name: z.string({ required_error: 'Key name is required.' }).min(1),
  scopes: z.array(z.enum(['send', 'read', 'admin'])).min(1, 'At least one permission scope is required.'),
});

const updateApiKeyStatusSchema = z.object({
  status: z.enum(['active', 'disabled', 'revoked']),
});

export class CredentialController {
  // --- SMTP Credentials Actions ---

  async createSmtp(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      const parsed = createSmtpSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const result = await credentialService.createSmtpCredential(workspaceId, parsed.data);
      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async listSmtp(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      const creds = await credentialService.listSmtpCredentials(workspaceId);
      return res.status(200).json(creds);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async deleteSmtp(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    const { id } = req.params;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      await credentialService.deleteSmtpCredential(workspaceId, id);
      return res.status(200).json({ success: true, message: 'SMTP Credential deleted successfully.' });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async regenerateSmtpPassword(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    const { id } = req.params;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      const result = await credentialService.regenerateSmtpPassword(workspaceId, id);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async updateSmtpStatus(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    const { id } = req.params;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      const parsed = updateSmtpStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const cred = await credentialService.updateSmtpStatus(workspaceId, id, parsed.data.status);
      return res.status(200).json(cred);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  // --- API Key Actions ---

  async createApiKey(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      const parsed = createApiKeySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const result = await credentialService.createApiKey(workspaceId, parsed.data.name, parsed.data.scopes);
      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async listApiKeys(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      const keys = await credentialService.listApiKeys(workspaceId);
      return res.status(200).json(keys);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async updateApiKeyStatus(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    const { id } = req.params;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      const parsed = updateApiKeyStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const key = await credentialService.updateApiKeyStatus(workspaceId, id, parsed.data.status);
      return res.status(200).json(key);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
export default CredentialController;
