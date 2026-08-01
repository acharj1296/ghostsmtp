import { Router } from 'express';
import { InternalController } from '../controllers/internal.controller';

const router = Router();
const controller = new InternalController();

router.post('/smtp-auth', controller.authenticateSmtp);

export default router;
