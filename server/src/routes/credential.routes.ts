import { Router } from 'express';
import { CredentialController } from '../controllers/credential.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();
const controller = new CredentialController();

// Apply Firebase auth token checks across all credential endpoints
router.use(authenticateUser);

// SMTP Credentials Router mapping
router.post('/smtp', controller.createSmtp);
router.get('/smtp', controller.listSmtp);
router.delete('/smtp/:id', controller.deleteSmtp);
router.post('/smtp/:id/regenerate', controller.regenerateSmtpPassword);
router.patch('/smtp/:id/status', controller.updateSmtpStatus);

// API Keys Router mapping
router.post('/apikeys', controller.createApiKey);
router.get('/apikeys', controller.listApiKeys);
router.patch('/apikeys/:id/status', controller.updateApiKeyStatus);

export default router;
