import { Router } from 'express';
import { runSimulation } from '../controllers/simulationController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.post('/', requireAuth, requireRole('municipal_staff', 'admin'), runSimulation);

export default router;
