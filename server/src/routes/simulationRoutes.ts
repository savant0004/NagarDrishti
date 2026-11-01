import { Router } from 'express';
import { runSimulation } from '../controllers/simulationController';
import { publicIpRateLimit } from '../middleware/assistantRateLimit';

const router = Router();

router.post('/', publicIpRateLimit(30, 60_000), runSimulation);

export default router;
