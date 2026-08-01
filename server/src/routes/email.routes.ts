import { Router } from 'express';
import { EmailController } from '../controllers/email.controller';
import { authenticateApiKey } from '../middleware/apiKey.middleware';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();
const controller = new EmailController();

// Programmatic transactional email send routes require API Keys verification
router.post('/send', authenticateApiKey, controller.send);

// Dashboard route actions require Firebase user token checks
router.get('/', authenticateUser, controller.list);
router.get('/stats', authenticateUser, controller.getStats);
router.get('/:messageId/events', authenticateUser, controller.getEvents);

export default router;
