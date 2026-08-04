import { Request, Response, NextFunction } from 'express';

/**
 * Enforces API-key scopes after `authenticateApiKey` has attached `req.apiKey`.
 * A request is allowed when the key's scope list contains any of the required
 * scopes. Must run after authenticateApiKey (it needs req.apiKey).
 */
export const requireScope =
  (...requiredScopes: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.apiKey;

    if (!apiKey) {
      return res.status(401).json({ error: 'Unauthorized. API key authentication is required.' });
    }

    const scopes: string[] = Array.isArray(apiKey.scopes) ? apiKey.scopes : [];
    const hasScope = requiredScopes.some((scope) => scopes.includes(scope));

    if (!hasScope) {
      return res.status(403).json({
        error: `Forbidden. API key lacks required scope: ${requiredScopes.join(', ')}.`,
      });
    }

    return next();
  };

export default requireScope;
