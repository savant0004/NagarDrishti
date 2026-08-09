import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { getReports, getReportById, createReport, analyzeImageEndpoint } from '../controllers/reportController';

const router = Router();

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({ storage });

router.get('/', getReports);
router.get('/:id', getReportById);
router.post('/', upload.single('photo'), createReport);
router.post('/analyze-image', upload.single('photo'), analyzeImageEndpoint);

export default router;
