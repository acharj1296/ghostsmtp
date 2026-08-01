import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();
const controller = new WebhookController();

// All Webhook CRUD operations are protected dashboard routes requiring firebase auth
router.use(authenticateUser);

router.post('/', controller.create);
router.patch('/:id/status', controller.updateStatus);
router.post('/:id/rotate', controller.rotate);
router.post('/:id/test', controller.test);
router.delete('/:id', controller.delete);

export default router;
