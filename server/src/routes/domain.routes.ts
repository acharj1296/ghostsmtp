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

// DNS & Deliverability endpoints
router.get('/:id/dns-comprehensive', controller.getDnsComprehensive);
router.get('/:id/dns-health', controller.getHealthScore);
router.get('/:id/dns-propagation', controller.getPropagation);
router.get('/:id/deliverability', controller.getDeliverability);

// DNS Provider integrations
router.post('/dns-provider/setup', controller.setupDnsProvider);
router.post('/:id/dns-provider/auto-setup', controller.autoSetupDns);

export default router;
