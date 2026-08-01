import { Request, Response, NextFunction } from 'express';
import { ApiKeyRepository } from '../repositories/apiKey.repository';
import { SecurityService } from '../services/security.service';

const apiKeyRepo = new ApiKeyRepository();

export const authenticateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let rawKey = req.headers['x-api-key'] || req.headers['x-api-token'];
    
    // Fallback to Authorization Header
    const authHeader = req.headers.authorization;
    if (!rawKey && authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      rawKey = authHeader.substring(7);
    }

    if (!rawKey || typeof rawKey !== 'string') {
      return res.status(401).json({ error: 'Unauthorized. API Key is missing.' });
    }

    // Key format: ghst_live_keyId.rawSecret
    const parts = rawKey.split('_');
    const secretPart = parts[2]; // e.g. keyId.rawSecret
    
    if (!secretPart) {
      return res.status(401).json({ error: 'Unauthorized. Invalid API Key format.' });
    }

    const keyId = secretPart.split('.')[0];
    if (!keyId) {
      return res.status(401).json({ error: 'Unauthorized. Invalid API Key layout.' });
    }

    // Hash raw key to verify against DB
    const keyHash = SecurityService.hashApiKey(rawKey);

    // Query API key
    const apiKey = await apiKeyRepo.findOne({ apiKeyId: keyId, keyHash, status: 'active', isDeleted: false });
    if (!apiKey) {
      return res.status(401).json({ error: 'Unauthorized. Invalid API Key.' });
    }

    // Attach workspace and scopes context
    req.workspaceId = apiKey.workspaceId.toString();
    req.apiKey = apiKey as any;

    return next();
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error during API Key authentication.' });
  }
};

export default authenticateApiKey;
