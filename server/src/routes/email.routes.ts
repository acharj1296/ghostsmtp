import { Router } from 'express';
import { EmailController } from '../controllers/email.controller';
import { authenticateApiKey } from '../middleware/apiKey.middleware';

const router = Router();
const controller = new EmailController();

// Programmatic transactional email send routes require API Keys verification
router.post('/send', authenticateApiKey, controller.send);

export default router;
