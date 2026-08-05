import { Router } from 'express';
import { DomainController } from '../controllers/domain.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();
const controller = new DomainController();

// All domain routes require Firebase authentication
router.use(authenticateUser);

router.post('/', controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getDetails);
router.delete('/:id', controller.delete);
router.post('/:id/verify', controller.verify);
router.post('/:id/regenerate-dkim', controller.regenerateDkim);

export default router;
