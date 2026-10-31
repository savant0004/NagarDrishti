import { Router } from 'express';
import multer from 'multer';
import { getReports, getReportById, getReportImage, createReport, analyzeImageEndpoint } from '../controllers/reportController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) ? cb(null, true) : cb(new Error('Only JPEG, PNG, and WEBP images are supported')),
});

router.get('/', requireAuth, requireRole('municipal_staff', 'admin'), getReports);
router.get('/:id/image', requireAuth, getReportImage);
router.get('/:id', requireAuth, getReportById);
router.post('/', requireAuth, upload.single('photo'), createReport);
router.post('/analyze-image', requireAuth, upload.single('photo'), analyzeImageEndpoint);

export default router;
