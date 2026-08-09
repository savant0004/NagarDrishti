import { Router } from 'express';
import { runSimulation } from '../controllers/simulationController';

const router = Router();

router.post('/', runSimulation);

export default router;
