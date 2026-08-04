import { Router } from 'express';
import { EmailController } from '../controllers/email.controller';
import { authenticateApiKey } from '../middleware/apiKey.middleware';
import { authenticateUser } from '../middleware/auth.middleware';
import { requireScope } from '../middleware/requireScope.middleware';

const router = Router();
const controller = new EmailController();

// Programmatic transactional email send routes require API Keys verification
// and the `send` scope.
router.post('/send', authenticateApiKey, requireScope('send'), controller.send);

// Dashboard route actions require Firebase user token checks
// IMPORTANT: /stats must be registered before /:messageId/events so "stats" is not treated as a messageId.
router.post('/composer-send', authenticateUser, controller.sendComposer);
router.get('/stats', authenticateUser, controller.getStats);
router.get('/', authenticateUser, controller.list);
router.get('/:messageId/events', authenticateUser, controller.getEvents);

export default router;
