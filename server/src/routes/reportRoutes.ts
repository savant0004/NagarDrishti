import { Router } from 'express';
import multer from 'multer';
import { getReports, getReportById, getReportImage, createReport, analyzeImageEndpoint, checkPossibleDuplicates, linkDuplicateReport, getNearbyReports, getResolutionEvidence, uploadResolutionEvidence } from '../controllers/reportController';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth';
import { assistantRateLimit, publicIpRateLimit } from '../middleware/assistantRateLimit';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) ? cb(null, true) : cb(new Error('Only JPEG, PNG, and WEBP images are supported')),
});

router.get('/', requireAuth, requireRole('municipal_staff', 'admin'), getReports);
router.get('/nearby', requireAuth, getNearbyReports);
router.get('/:id/image', requireAuth, getReportImage);
router.get('/:id/evidence/:filename', requireAuth, getResolutionEvidence);
router.get('/:id', optionalAuth, getReportById);
router.post('/duplicates', requireAuth, assistantRateLimit(8, 60_000), checkPossibleDuplicates);
router.patch('/:id/link-duplicate', requireAuth, requireRole('municipal_staff', 'admin'), linkDuplicateReport);
router.post('/:id/resolution-evidence', requireAuth, requireRole('municipal_staff', 'admin'), upload.single('photo'), uploadResolutionEvidence);
router.post('/', requireAuth, upload.single('photo'), createReport);
router.post('/analyze-image', publicIpRateLimit(8, 60_000), upload.single('photo'), analyzeImageEndpoint);

export default router;
