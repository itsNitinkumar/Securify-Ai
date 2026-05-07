import { Router } from 'express';
import ClientController from '../controllers/client.controller';
import { protect, requireRole } from '../middlewares/auth';

const router = Router();

router.use(protect);

router.get('/', ClientController.listClients);
router.post('/', requireRole('manager'), ClientController.createClient);

export default router;
