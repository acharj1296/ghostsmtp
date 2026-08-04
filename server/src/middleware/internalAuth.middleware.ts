import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { SecurityService } from '../services/security.service';

export const HEADER_INTERNAL_AUTH_TOKEN = 'x-internal-token';

/**
 * Protects internal, cross-service endpoints (e.g. the Dovecot SMTP auth
 * helper) from the public internet. The caller must present the same
 * INTERNAL_AUTH_TOKEN that is provisioned to both services; comparison is
 * timing-safe to prevent side-channel leakage.
 */
export const requireInternalToken = (req: Request, res: Response, next: NextFunction) => {
  const presented = req.headers[HEADER_INTERNAL_AUTH_TOKEN];

  if (typeof presented !== 'string' || presented.length === 0) {
    return res.status(401).json({ error: 'Unauthorized. Missing internal token.' });
  }

  if (!SecurityService.timingSafeCompare(presented, env.INTERNAL_AUTH_TOKEN)) {
    return res.status(403).json({ error: 'Forbidden. Invalid internal token.' });
  }

  return next();
};

export default requireInternalToken;
