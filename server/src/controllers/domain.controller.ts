import { Request, Response } from 'express';
import { z } from 'zod';
import { DomainService } from '../services/domain.service';
import { DnsProviderService } from '../services/dnsProvider.service';

const domainService = new DomainService();
const dnsProviderService = new DnsProviderService();

const createDomainSchema = z.object({
  name: z.string({ required_error: 'Domain name is required.' }).min(1),
});

const setupDnsProviderSchema = z.object({
  type: z.enum(['cloudflare', 'route53', 'namecheap', 'godaddy']),
  credentials: z.record(z.string()),
});

const autoSetupDnsSchema = z.object({
  providerType: z.enum(['cloudflare', 'route53', 'namecheap', 'godaddy']),
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

  async getDnsComprehensive(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    const { id } = req.params;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      const result = await domainService.getDnsComprehensive(workspaceId, id);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async getHealthScore(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    const { id } = req.params;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      const result = await domainService.calculateHealthScore(workspaceId, id);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async getPropagation(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    const { id } = req.params;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      const result = await domainService.checkPropagation(workspaceId, id);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async getDeliverability(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    const { id } = req.params;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      const result = await domainService.analyzeDeliverability(workspaceId, id);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async setupDnsProvider(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      const parsed = setupDnsProviderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const result = await dnsProviderService.setupProvider({
        type: parsed.data.type,
        credentials: parsed.data.credentials,
      });

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async autoSetupDns(req: Request, res: Response) {
    const workspaceId = req.workspaceId;
    const { id } = req.params;
    if (!workspaceId) {
      return res.status(400).json({ error: 'Missing X-Workspace-ID header context.' });
    }

    try {
      const parsed = autoSetupDnsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const domainDetails = await domainService.getDomainDetails(workspaceId, id);
      if (!domainDetails) {
        return res.status(404).json({ error: 'Domain not found.' });
      }

      // Convert DNS records to provider format
      const dnsRecords = Object.values(domainDetails.dnsRecords).map((record: any) => ({
        type: record.type,
        host: record.host,
        value: record.value,
        priority: record.priority,
        ttl: record.ttl || 3600,
        purpose: record.purpose,
      }));

      const result = await dnsProviderService.autoSetupDomain(
        parsed.data.providerType,
        domainDetails.domain.name,
        dnsRecords
      );

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
export default DomainController;
