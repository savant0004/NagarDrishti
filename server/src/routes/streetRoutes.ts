import { Router } from 'express';
import { getStreets, getStreetByName } from '../controllers/streetController';

const router = Router();

router.get('/', getStreets);
router.get('/:name', getStreetByName);

export default router;
