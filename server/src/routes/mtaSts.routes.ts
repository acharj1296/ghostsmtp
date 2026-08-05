import { Router, Request, Response } from 'express';
import { MtaStsService } from '../services/mtaSts.service';

/**
 * MTA-STS Policy Routes
 *
 * Serves MTA-STS policy files at the well-known location.
 * These endpoints must be accessible via HTTPS at:
 * https://mta-sts.<domain>/.well-known/mta-sts.txt
 *
 * Note: In production, this should be served from mta-sts.<domain>
 * which requires either:
 * 1. A separate subdomain with its own SSL certificate
 * 2. A wildcard SSL certificate covering *.domain
 * 3. SNI-based routing in nginx/Load Balancer
 */

const router = Router();
const mtaStsService = new MtaStsService();

/**
 * GET /.well-known/mta-sts.txt
 *
 * Serve the MTA-STS policy file for the default domain.
 * This is used when the server is accessed directly.
 *
 * In production, nginx should route requests to mta-sts.<domain>
 * to this endpoint.
 */
router.get('/.well-known/mta-sts.txt', (req: Request, res: Response) => {
  try {
    const baseDomain = process.env.MAIL_BASE_DOMAIN || 'ghostsmtp.com';
    const mode = (process.env.MTA_STS_MODE as 'enforce' | 'testing' | 'none') || 'enforce';

    const policy = mtaStsService.generatePolicy(baseDomain, mode);

    // Set appropriate headers
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.send(policy);
  } catch (error) {
    console.error('[MTA-STS] Error generating policy:', error);
    res.status(500).send('# Error generating MTA-STS policy');
  }
});

/**
 * GET /.well-known/mta-sts/:domain.txt
 *
 * Serve MTA-STS policy for a specific domain.
 * This allows serving policies for multiple hosted domains.
 */
router.get('/.well-known/mta-sts/:domain.txt', (req: Request, res: Response) => {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).send('# Domain parameter required');
    }

    // In production, you would verify this domain is hosted by your service
    // For now, we generate a policy using the infrastructure config
    const mode = (process.env.MTA_STS_MODE as 'enforce' | 'testing' | 'none') || 'enforce';
    const policy = mtaStsService.generatePolicy(domain, mode);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.send(policy);
  } catch (error) {
    console.error('[MTA-STS] Error generating policy for domain:', error);
    res.status(500).send('# Error generating MTA-STS policy');
  }
});

/**
 * GET /mta-sts/:domain
 *
 * Alternative endpoint for serving MTA-STS policy.
 * Useful when using path-based routing instead of subdomain.
 */
router.get('/mta-sts/:domain', (req: Request, res: Response) => {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({ error: 'Domain parameter required' });
    }

    const mode = (process.env.MTA_STS_MODE as 'enforce' | 'testing' | 'none') || 'enforce';
    const policy = mtaStsService.generatePolicy(domain, mode);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    res.send(policy);
  } catch (error) {
    console.error('[MTA-STS] Error:', error);
    res.status(500).json({ error: 'Failed to generate MTA-STS policy' });
  }
});

export default router;
