import { Request, Response } from 'express';
import { z } from 'zod';
import { SmtpAuthService } from '../services/smtpAuth.service';

const smtpAuthService = new SmtpAuthService();

const smtpAuthRequestSchema = z.object({
  username: z.string({ required_error: 'Username is required.' }),
  password: z.string({ required_error: 'Password is required.' }),
  clientIp: z.string().optional(),
});

export class InternalController {
  async authenticateSmtp(req: Request, res: Response) {
    try {
      const parsed = smtpAuthRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { username, password, clientIp } = parsed.data;
      const result = await smtpAuthService.authenticateSmtpUser(username, password, clientIp);

      if (result.authenticated) {
        return res.status(200).json({ success: true, message: 'Authentication successful.' });
      } else {
        return res.status(401).json({ success: false, error: result.error || 'Authentication failed.' });
      }
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
export default InternalController;
