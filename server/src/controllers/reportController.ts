import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { store } from '../services/store';
import { analyzeUploadedImage, getCachedImageAnalysis, validateImageContent, VisionAnalysisError } from '../services/aiVisionService';
import { IssueType, IssueSeverity } from '../models/Issue';
import { AuthenticatedRequest } from '../middleware/auth';

const validIssueTypes: IssueType[] = ['Pothole', 'Broken Streetlight', 'Blocked Drainage', 'Garbage Accumulation', 'Water Leakage', 'Traffic Congestion', 'Damaged Sidewalk', 'Road Obstruction', 'Waterlogging', 'Road Damage', 'Other Urban Infrastructure'];
const validSeverities: IssueSeverity[] = ['Low', 'Medium', 'High', 'Critical'];
const unavailable = (error: any) => String(error?.message || '').includes('DEMO_MODE is disabled') || String(error?.message || '').includes('MongoDB is unavailable');
const safeAnalysisError = (error: unknown) => {
  if (error instanceof VisionAnalysisError) {
    const statuses: Record<VisionAnalysisError['kind'], number> = { not_configured: 503, provider_unavailable: 503, invalid_response: 502, invalid_image: 415, rate_limited: 429, provider_rejected: 502, timeout: 504 };
    return { status: statuses[error.kind], message: error.message };
  }
  return { status: 503, message: 'Image analysis is temporarily unavailable. You can still submit a manually categorized report.' };
};

export async function getReports(_req: Request, res: Response) {
  try {
    const reports = await store.getReports();
    return res.json({ success: true, count: reports.length, data: reports, dataSource: store.getMode() });
  } catch (error: any) {
    const status = unavailable(error) ? 503 : 500;
    return res.status(status).json({ success: false, code: status === 503 ? 'DATABASE_UNAVAILABLE' : 'REPORT_READ_FAILED', error: status === 503 ? 'Complaint records are temporarily unavailable.' : 'Unable to retrieve complaints.' });
  }
}

export async function getReportById(req: Request, res: Response) {
  try {
    const report = await store.getReportById(req.params.id);
    if (!report) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Report not found.' });
    const user = (req as AuthenticatedRequest).authUser!;
    if (user.role === 'citizen' && String(report.userId) !== user.id) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Report not found.' });
    return res.json({ success: true, data: report });
  } catch (error: any) {
    const status = unavailable(error) ? 503 : 500;
    return res.status(status).json({ success: false, code: status === 503 ? 'DATABASE_UNAVAILABLE' : 'REPORT_READ_FAILED', error: status === 503 ? 'Complaint records are temporarily unavailable.' : 'Unable to retrieve this complaint.' });
  }
}

export async function getReportImage(req: Request, res: Response) {
  try {
    const report = await store.getReportById(req.params.id);
    if (!report) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Report not found.' });
    const user = (req as AuthenticatedRequest).authUser!;
    if (user.role === 'citizen' && String(report.userId) !== user.id) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Report not found.' });
    const filename = path.basename(String(report.image || ''));
    if (!filename || filename === '.' || filename === path.sep) return res.status(404).json({ success: false, code: 'IMAGE_NOT_FOUND', error: 'No image is attached to this report.' });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.sendFile(filename, { root: path.join(__dirname, '../../uploads') }, (error) => {
      if (error && !res.headersSent) res.status((error as any).statusCode === 404 ? 404 : 500).json({ success: false, code: 'IMAGE_READ_FAILED', error: 'Unable to retrieve the report image.' });
    });
  } catch (error: any) {
    const status = unavailable(error) ? 503 : 500;
    return res.status(status).json({ success: false, code: status === 503 ? 'DATABASE_UNAVAILABLE' : 'IMAGE_READ_FAILED', error: status === 503 ? 'Complaint records are temporarily unavailable.' : 'Unable to retrieve the report image.' });
  }
}

export async function createReport(req: Request, res: Response) {
  const user = (req as AuthenticatedRequest).authUser!;
  const { issueType, description, latitude, longitude, streetName, severity, contactEmail } = req.body || {};
  if (!validIssueTypes.includes(issueType) || typeof description !== 'string' || !description.trim() || description.length > 5000) {
    return res.status(400).json({ success: false, code: 'INVALID_INPUT', error: 'Provide a supported issue category and description up to 5000 characters.' });
  }
  if (severity && !validSeverities.includes(severity)) return res.status(400).json({ success: false, code: 'INVALID_INPUT', error: 'Choose a supported severity.' });
  const reportLat = Number(latitude);
  const reportLng = Number(longitude);
  if (latitude === undefined || longitude === undefined || !Number.isFinite(reportLat) || reportLat < -90 || reportLat > 90 || !Number.isFinite(reportLng) || reportLng < -180 || reportLng > 180) {
    return res.status(400).json({ success: false, code: 'INVALID_COORDINATES', error: 'Latitude must be between -90 and 90 and longitude between -180 and 180.' });
  }
  if (streetName !== undefined && (typeof streetName !== 'string' || streetName.trim().length > 200)) return res.status(400).json({ success: false, code: 'INVALID_INPUT', error: 'Street or location must be 200 characters or fewer.' });
  if (contactEmail && (typeof contactEmail !== 'string' || contactEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))) return res.status(400).json({ success: false, code: 'INVALID_INPUT', error: 'Provide a valid contact email.' });
  if (req.file) {
    try { validateImageContent(req.file.buffer, req.file.mimetype); }
    catch (error) { return res.status(415).json({ success: false, code: 'INVALID_IMAGE', error: error instanceof Error ? error.message : 'Invalid image.' }); }
  }

  const idempotencyKey = req.header('Idempotency-Key')?.trim();
  if (idempotencyKey && (idempotencyKey.length > 128 || !/^[\w.-]+$/.test(idempotencyKey))) return res.status(400).json({ success: false, code: 'INVALID_IDEMPOTENCY_KEY', error: 'Invalid idempotency key.' });
  const aiAnalysis = req.file ? getCachedImageAnalysis(req.file.buffer, req.file.mimetype) : undefined;
  const imageFilename = req.file ? `${Date.now()}-${randomUUID()}${req.file.mimetype === 'image/jpeg' ? '.jpg' : req.file.mimetype === 'image/png' ? '.png' : '.webp'}` : '';
  const imagePath = path.join(__dirname, '../../uploads', imageFilename);
  let imageWritten = false;
  try {
    if (req.file) { await fs.writeFile(imagePath, req.file.buffer, { flag: 'wx' }); imageWritten = true; }
    const reportData = {
      issueType,
      description: description.trim(),
      latitude: reportLat,
      longitude: reportLng,
      streetName: streetName?.trim() || 'General Area',
      severity: severity || 'Medium',
      contactEmail: contactEmail || '',
      userId: user.id,
      idempotencyKey,
      image: req.file ? `/uploads/${imageFilename}` : '',
      aiAnalysis: aiAnalysis ? { ...aiAnalysis, detectedIssue: aiAnalysis.category, suggestedSeverity: aiAnalysis.severity } : undefined,
      aiAnalysisStatus: aiAnalysis ? 'analyzed' : req.file ? 'not_analyzed' : 'no_image',
    };
    const issueInput = {
      title: `${issueType} reported on ${streetName?.trim() || 'City Corridor'}`,
      description: description.trim(),
      type: issueType,
      severity: severity || 'Medium',
      latitude: reportLat,
      longitude: reportLng,
      streetName: streetName?.trim() || 'General Area',
      estimatedPopulationImpact: null,
      nearbyInfrastructure: { schools: 0, hospitals: 0, busStops: 0, residentialCount: 0, commercialCount: 0 },
    };
    const result = await store.createReportAndAssociateIssue(reportData, issueInput);
    if (result.idempotent && imageWritten) { await fs.unlink(imagePath).catch(() => undefined); imageWritten = false; }
    const io = req.app.get('io');
    if (io && !result.idempotent) {
      io.to('staff').emit('report:created', result.report);
      io.to(`reporter:${user.id}`).emit('report:created', result.report);
      if (result.issueCreated) io.to('staff').emit('issue:created', result.issue);
      else io.to('staff').emit('issue:updated', result.issue);
    }
    return res.status(result.idempotent ? 200 : 201).json({ success: true, data: result.report, dataSource: store.getMode(), createdIssue: result.issue, isClustered: !result.issueCreated, idempotent: result.idempotent });
  } catch (error: any) {
    if (imageWritten) await fs.unlink(imagePath).catch(() => undefined);
    const status = unavailable(error) ? 503 : error?.code === 11000 ? 409 : 500;
    if (status === 500) console.error(JSON.stringify({ level: 'error', event: 'complaint_creation_failed', errorName: error?.name || 'Error' }));
    return res.status(status).json({ success: false, code: status === 503 ? 'DATABASE_UNAVAILABLE' : status === 409 ? 'CONFLICT' : 'COMPLAINT_CREATION_FAILED', error: status === 503 ? 'Complaint storage is temporarily unavailable.' : status === 409 ? 'A duplicate complaint request was detected.' : 'Complaint creation failed. Please try again.' });
  }
}

export async function analyzeImageEndpoint(req: Request, res: Response) {
  try {
    if (!req.file) return res.status(400).json({ success: false, code: 'IMAGE_REQUIRED', error: 'Upload an image file in the photo field.' });
    const result = await analyzeUploadedImage(req.file.buffer, req.file.mimetype);
    return res.json({ success: true, data: result });
  } catch (error: unknown) {
    const failure = safeAnalysisError(error);
    return res.status(failure.status).json({ success: false, code: error instanceof VisionAnalysisError ? error.kind.toUpperCase() : 'VISION_UNAVAILABLE', error: failure.message });
  }
}
