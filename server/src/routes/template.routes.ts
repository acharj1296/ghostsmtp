import { Router } from 'express';
import { TemplateController } from '../controllers/template.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();
const controller = new TemplateController();

router.get('/', authenticateUser, controller.list);
router.post('/', authenticateUser, controller.create);
router.delete('/:id', authenticateUser, controller.delete);

export default router;
