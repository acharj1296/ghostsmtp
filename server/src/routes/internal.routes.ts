import { Router } from 'express';
import { InternalController } from '../controllers/internal.controller';
import { requireInternalToken } from '../middleware/internalAuth.middleware';

const router = Router();
const controller = new InternalController();

// Internal endpoints are only reachable by sibling containers on the mail
// network (Dovecot auth helper) and require the shared INTERNAL_AUTH_TOKEN.
router.post('/smtp-auth', requireInternalToken, controller.authenticateSmtp);
router.post('/queue/replay', requireInternalToken, controller.replayQueueJob);

export default router;
