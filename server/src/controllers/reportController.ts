import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { store } from '../services/store';
import { analyzeUploadedImage, getCachedImageAnalysis, validateImageContent, VisionAnalysisError } from '../services/aiVisionService';
import { IssueType, IssueSeverity } from '../models/Issue';
import { AuthenticatedRequest } from '../middleware/auth';
import { createNotification, notifyRoles } from '../services/notificationService';
import { sanitizeCitizenReport } from '../services/reportPrivacy';
import { assessPossibleDuplicates } from '../services/aiDuplicateService';

const validIssueTypes: IssueType[] = ['Pothole', 'Broken Streetlight', 'Blocked Drainage', 'Garbage Accumulation', 'Water Leakage', 'Traffic Congestion', 'Damaged Sidewalk', 'Road Obstruction', 'Waterlogging', 'Road Damage', 'Other Urban Infrastructure'];
const validSeverities: IssueSeverity[] = ['Low', 'Medium', 'High', 'Critical'];
const unavailable = (error: any) => String(error?.message || '').includes('DEMO_MODE is disabled') || String(error?.message || '').includes('MongoDB is unavailable');
const safeAnalysisError = (error: unknown) => {
  if (error instanceof VisionAnalysisError) {
    const statuses: Record<VisionAnalysisError['kind'], number> = { not_configured: 503, provider_unavailable: 503, model_unavailable: 503, invalid_response: 502, invalid_image: 415, rate_limited: 429, provider_rejected: 502, timeout: 504 };
    return { status: statuses[error.kind], message: error.message };
  }
  return { status: 503, message: 'Image analysis is temporarily unavailable. You can still submit a manually categorized report.' };
};

function textSimilarity(left: string, right: string): number {
  const stop = new Set(['the', 'a', 'an', 'is', 'on', 'at', 'to', 'of', 'in', 'near', 'and', 'with', 'road']);
  const tokens = (value: string) => new Set(value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((word) => word.length > 2 && !stop.has(word)));
  const a = tokens(left), b = tokens(right);
  if (!a.size || !b.size) return 0;
  const common = [...a].filter((word) => b.has(word)).length;
  return common / new Set([...a, ...b]).size;
}

async function findPossibleDuplicates(input: { issueType: string; description: string; latitude: number; longitude: number; imageHash?: string }) {
  const nearby = await store.getNearbyReports(input.latitude, input.longitude, 500, input.issueType);
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const radians = Math.PI / 180;
  return nearby.map((report: any) => {
    const dLat = (Number(report.latitude) - input.latitude) * radians;
    const dLng = (Number(report.longitude) - input.longitude) * radians;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(input.latitude * radians) * Math.cos(Number(report.latitude) * radians) * Math.sin(dLng / 2) ** 2;
    const distanceMeters = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const similarity = textSimilarity(input.description, String(report.description || ''));
    const imageMatch = !!input.imageHash && !!report.imageHash && input.imageHash === report.imageHash;
    const recent = new Date(report.createdAt).getTime() >= cutoff;
    return { report, distanceMeters: Math.round(distanceMeters), similarity, imageMatch, recent };
  }).filter((item) => item.recent && (item.similarity >= 0.2 || item.imageMatch))
    .sort((a, b) => Number(b.imageMatch) - Number(a.imageMatch) || b.similarity - a.similarity || a.distanceMeters - b.distanceMeters)
    .slice(0, 5);
}

export async function checkPossibleDuplicates(req: Request, res: Response) {
  const { issueType, description, latitude, longitude } = req.body || {};
  const imageHash = req.body?.imageHash;
  const lat = Number(latitude), lng = Number(longitude);
  if (!validIssueTypes.includes(issueType) || typeof description !== 'string' || description.trim().length < 3 || description.length > 5000
    || !Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180
    || (imageHash !== undefined && (typeof imageHash !== 'string' || !/^[a-f0-9]{64}$/i.test(imageHash)))) {
    return res.status(400).json({ success: false, code: 'INVALID_DUPLICATE_CHECK', error: 'Provide a supported category, description, valid coordinates, and a valid optional image digest.' });
  }
  try {
    const candidates = await findPossibleDuplicates({ issueType, description: description.trim(), latitude: lat, longitude: lng, imageHash });
    const aiReview = candidates.length ? await assessPossibleDuplicates([
      { category: issueType, description: description.trim(), distanceMeters: 0, ageHours: 0, textSimilarity: 1, imageHashMatch: false },
      ...candidates.map((candidate) => ({
        category: candidate.report.issueType,
        description: String(candidate.report.description || ''),
        distanceMeters: candidate.distanceMeters,
        ageHours: Math.max(0, (Date.now() - new Date(candidate.report.createdAt).getTime()) / (60 * 60 * 1000)),
        textSimilarity: candidate.similarity,
        imageHashMatch: candidate.imageMatch,
      })),
    ]) : undefined;
    // Citizens only need a warning before submitting. Do not disclose other
    // residents' report IDs, exact locations, descriptions, or timestamps.
    return res.json({ success: true, data: { hasPossibleDuplicates: candidates.length > 0, ...(aiReview ? { aiReview } : {}) } });
  } catch (error: any) {
    const status = unavailable(error) ? 503 : 500;
    return res.status(status).json({ success: false, code: status === 503 ? 'DATABASE_UNAVAILABLE' : 'DUPLICATE_CHECK_FAILED', error: status === 503 ? 'Complaint records are temporarily unavailable.' : 'Potential duplicates could not be checked.' });
  }
}

export async function getNearbyReports(req: Request, res: Response) {
  const latitude = Number(req.query.latitude), longitude = Number(req.query.longitude), radiusMeters = Number(req.query.radiusMeters || 1000);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isFinite(radiusMeters) || radiusMeters < 1 || radiusMeters > 50000) return res.status(400).json({ success: false, code: 'INVALID_GEO_QUERY', error: 'Provide valid coordinates and a radius from 1 to 50,000 metres.' });
  try {
    const user = (req as AuthenticatedRequest).authUser!;
    let reports = await store.getNearbyReports(latitude, longitude, radiusMeters, typeof req.query.issueType === 'string' ? req.query.issueType : undefined);
    if (user.role === 'citizen') reports = reports.filter((report: any) => String(report.userId) === user.id);
    else if (user.role === 'municipal_staff') reports = reports.filter((report: any) => report.assignedTo === user.id || (user.department && report.department === user.department) || (!report.assignedTo && !report.department));
    const data = reports.map((report: any) => ({ reportId: report.reportId, issueType: report.issueType, severity: report.severity, status: report.status, latitude: report.latitude, longitude: report.longitude, location: report.location, streetName: report.streetName, createdAt: report.createdAt, associatedIssueId: report.associatedIssueId }));
    return res.json({ success: true, data, count: data.length, dataSource: store.getDataSource() });
  } catch (error: any) {
    const status = unavailable(error) ? 503 : 500;
    return res.status(status).json({ success: false, code: status === 503 ? 'DATABASE_UNAVAILABLE' : 'GEO_QUERY_FAILED', error: status === 503 ? 'Complaint records are temporarily unavailable.' : 'Nearby complaints could not be retrieved.' });
  }
}

export async function getReports(req: Request, res: Response) {
  try {
    const user = (req as AuthenticatedRequest).authUser!;
    let reports = await store.getReports();
    if (user.role === 'municipal_staff') reports = reports.filter((report: any) => report.assignedTo === user.id || (user.department && report.department === user.department) || (!report.assignedTo && !report.department));
    const visibleReportIds = new Set(reports.map((report: any) => String(report.reportId)));
    const data = reports.map((report: any) => {
      const value = typeof report.toObject === 'function' ? report.toObject() : { ...report };
      delete value.contactEmail; delete value.userId;
      if (user.role === 'municipal_staff') {
        value.possibleDuplicateReportIds = (value.possibleDuplicateReportIds || []).filter((id: string) => visibleReportIds.has(String(id)));
        value.duplicateLinkedReportIds = (value.duplicateLinkedReportIds || []).filter((id: string) => visibleReportIds.has(String(id)));
      }
      return value;
    });
    return res.json({ success: true, count: data.length, data, dataSource: store.getDataSource() });
  } catch (error: any) {
    const status = unavailable(error) ? 503 : 500;
    return res.status(status).json({ success: false, code: status === 503 ? 'DATABASE_UNAVAILABLE' : 'REPORT_READ_FAILED', error: status === 503 ? 'Complaint records are temporarily unavailable.' : 'Unable to retrieve complaints.' });
  }
}

export async function getReportById(req: Request, res: Response) {
  try {
    const report = await store.getReportById(req.params.id);
    if (!report) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Report not found.' });
    const user = (req as AuthenticatedRequest).authUser;
    if (user?.role === 'citizen' && String(report.userId) !== user.id) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Report not found.' });
    if (user?.role === 'municipal_staff' && ((report.assignedTo && report.assignedTo !== user.id) || (report.department && report.department !== user.department))) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Report not found.' });
    const value = typeof report.toObject === 'function' ? report.toObject() : { ...report };
    delete value.contactEmail; delete value.userId;
    delete value.possibleDuplicateReportIds;
    delete value.duplicateLinkedReportIds;
    if (!user) {
      delete value.latitude; delete value.longitude; delete value.location; delete value.image;
      delete value.associatedIssueId; delete value.duplicateGroupId; delete value.assignedTo; delete value.assignedUserId; delete value.department;
      delete value.resolutionNotes; delete value.resolutionEvidence;
      value.history = (value.history || []).map((event: any) => ({ action: event.action, createdAt: event.createdAt }));
    }
    return res.json({ success: true, data: value });
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
    if (user.role === 'municipal_staff' && ((report.assignedTo && report.assignedTo !== user.id) || (report.department && report.department !== user.department))) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Report not found.' });
    if (user.role === 'municipal_staff' && ((report.assignedTo && report.assignedTo !== user.id) || (report.department && report.department !== user.department))) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Report not found.' });
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

export async function getResolutionEvidence(req: Request, res: Response) {
  try {
    const report = await store.getReportById(req.params.id);
    if (!report) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Report not found.' });
    const user = (req as AuthenticatedRequest).authUser!;
    if (user.role === 'citizen' && String(report.userId) !== user.id) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Report not found.' });
    if (user.role === 'municipal_staff' && ((report.assignedTo && report.assignedTo !== user.id) || (report.department && report.department !== user.department))) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Report not found.' });
    const filename = path.basename(req.params.filename);
    const authorized = (report.resolutionEvidence || []).some((item: string) => path.basename(item) === filename);
    if (!authorized) return res.status(404).json({ success: false, code: 'EVIDENCE_NOT_FOUND', error: 'Resolution evidence not found.' });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.sendFile(filename, { root: path.join(__dirname, '../../uploads') }, (error) => { if (error && !res.headersSent) res.status(404).json({ success: false, code: 'EVIDENCE_NOT_FOUND', error: 'Resolution evidence could not be retrieved.' }); });
  } catch (error: any) {
    const status = unavailable(error) ? 503 : 500;
    return res.status(status).json({ success: false, code: status === 503 ? 'DATABASE_UNAVAILABLE' : 'EVIDENCE_READ_FAILED', error: status === 503 ? 'Complaint records are temporarily unavailable.' : 'Resolution evidence could not be retrieved.' });
  }
}

export async function uploadResolutionEvidence(req: Request, res: Response) {
  const user = (req as AuthenticatedRequest).authUser!;
  if (!req.file) return res.status(400).json({ success: false, code: 'IMAGE_REQUIRED', error: 'Choose an evidence image to upload.' });
  const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
  if (note.length > 1000) return res.status(400).json({ success: false, code: 'INVALID_NOTE', error: 'Evidence note must be 1,000 characters or fewer.' });
  try { validateImageContent(req.file.buffer, req.file.mimetype); }
  catch (error) { return res.status(415).json({ success: false, code: 'INVALID_IMAGE', error: error instanceof Error ? error.message : 'Invalid evidence image.' }); }
  let imagePath = '';
  try {
    const report = await store.getReportById(req.params.id);
    if (!report) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Report not found.' });
    if (user.role === 'municipal_staff' && report.associatedIssueId) {
      const issue = await store.getIssueById(report.associatedIssueId);
      if (issue?.department && issue.department !== user.department) return res.status(403).json({ success: false, code: 'DEPARTMENT_FORBIDDEN', error: 'This complaint belongs to a different department.' });
      if (issue?.assignedUserId && issue.assignedUserId !== user.id) return res.status(403).json({ success: false, code: 'ASSIGNMENT_FORBIDDEN', error: 'This complaint is assigned to another staff member.' });
    }
    const suffix = req.file.mimetype === 'image/jpeg' ? '.jpg' : req.file.mimetype === 'image/png' ? '.png' : '.webp';
    const filename = `${Date.now()}-${randomUUID()}-resolution${suffix}`;
    imagePath = `/uploads/${filename}`;
    await fs.writeFile(path.join(__dirname, '../../uploads', filename), req.file.buffer, { flag: 'wx' });
    const updated = await store.addResolutionEvidence(report.reportId, imagePath, note, { id: user.id, role: user.role });
    if (!updated) { await fs.unlink(path.join(__dirname, '../../uploads', filename)).catch(() => undefined); return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Report not found.' }); }
    return res.status(201).json({ success: true, data: sanitizeCitizenReport(updated) });
  } catch (error: any) {
    if (imagePath) await fs.unlink(path.join(__dirname, '../../uploads', path.basename(imagePath))).catch(() => undefined);
    const status = unavailable(error) ? 503 : 500;
    return res.status(status).json({ success: false, code: status === 503 ? 'DATABASE_UNAVAILABLE' : 'EVIDENCE_UPLOAD_FAILED', error: status === 503 ? 'Complaint records are temporarily unavailable.' : 'Resolution evidence could not be saved.' });
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
  const imageHash = req.file ? createHash('sha256').update(req.file.buffer).digest('hex') : '';
  const imageFilename = req.file ? `${Date.now()}-${randomUUID()}${req.file.mimetype === 'image/jpeg' ? '.jpg' : req.file.mimetype === 'image/png' ? '.png' : '.webp'}` : '';
  const imagePath = path.join(__dirname, '../../uploads', imageFilename);
  let imageWritten = false;
  try {
    if (req.file) { await fs.writeFile(imagePath, req.file.buffer, { flag: 'wx' }); imageWritten = true; }
    const reportData: Record<string, any> = {
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
      imageHash,
      history: [{ action: 'submitted', note: 'Citizen complaint received.', actorId: user.id, actorRole: user.role, createdAt: new Date() }],
    };
    const possibleDuplicates = await findPossibleDuplicates({ issueType, description: description.trim(), latitude: reportLat, longitude: reportLng, imageHash });
    reportData.possibleDuplicateReportIds = possibleDuplicates.map(({ report }) => report.reportId);
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
      aiDetectedSeverity: aiAnalysis?.severity,
    };
    const result = await store.createReportAndAssociateIssue(reportData, issueInput);
    if (result.idempotent && imageWritten) { await fs.unlink(imagePath).catch(() => undefined); imageWritten = false; }
    const io = req.app.get('io');
    if (io && !result.idempotent) {
      io.to('staff').emit('report:created', sanitizeCitizenReport(result.report));
      io.to(`reporter:${user.id}`).emit('report:created', sanitizeCitizenReport(result.report));
      if (result.issueCreated) io.to('staff').emit('issue:created', result.issue);
      else io.to('staff').emit('issue:updated', result.issue);
    }
    if (!result.idempotent) {
      const reportId = result.report.reportId;
      await createNotification(user.id, { kind: 'complaint_submitted', title: 'Complaint submitted', message: `Complaint ${reportId} has been received.`, reportId, dedupeKey: `submitted:${reportId}:${user.id}` }, io).catch(() => null);
      await notifyRoles(['municipal_staff', 'admin'], { kind: 'complaint_submitted', title: 'New citizen complaint', message: `${issueType} reported in ${reportData.streetName}.`, reportId, dedupeKey: `submitted:${reportId}` }, io).catch(() => null);
      if (!result.issueCreated && result.issue) {
        const linkedReports = await store.getReports().catch(() => []);
        const recipients = new Set(linkedReports.filter((report: any) => report.associatedIssueId === result.issue.id && report.userId).map((report: any) => String(report.userId)));
        await Promise.all([...recipients].map((recipient) => createNotification(recipient, { kind: 'priority_changed', title: 'Nearby complaint group updated', message: `A nearby complaint was added to issue ${result.issue.id}; its priority was recalculated.`, reportId, dedupeKey: `priority:${result.issue.id}:${result.issue.updatedAt}:${recipient}` }, io).catch(() => null)));
      }
    }
    return res.status(result.idempotent ? 200 : 201).json({ success: true, data: sanitizeCitizenReport(result.report), dataSource: store.getDataSource(), createdIssue: result.issue, isClustered: !result.issueCreated, idempotent: result.idempotent });
  } catch (error: any) {
    if (imageWritten) await fs.unlink(imagePath).catch(() => undefined);
    const status = unavailable(error) ? 503 : error?.code === 11000 ? 409 : 500;
    if (status === 500) console.error(JSON.stringify({ level: 'error', event: 'complaint_creation_failed', errorName: error?.name || 'Error' }));
    return res.status(status).json({ success: false, code: status === 503 ? 'DATABASE_UNAVAILABLE' : status === 409 ? 'CONFLICT' : 'COMPLAINT_CREATION_FAILED', error: status === 503 ? 'Complaint storage is temporarily unavailable.' : status === 409 ? 'A duplicate complaint request was detected.' : 'Complaint creation failed. Please try again.' });
  }
}

export async function linkDuplicateReport(req: Request, res: Response) {
  const user = (req as AuthenticatedRequest).authUser!;
  const { targetReportId, confirm } = req.body || {};
  if (typeof targetReportId !== 'string' || targetReportId.length > 64 || targetReportId === req.params.id) return res.status(400).json({ success: false, code: 'INVALID_DUPLICATE_LINK', error: 'Provide a different valid target complaint ID.' });
  if (confirm !== true) return res.status(400).json({ success: false, code: 'STAFF_CONFIRMATION_REQUIRED', error: 'Explicit staff confirmation is required before linking these complaints.' });
  try {
    const [source, target] = await Promise.all([store.getReportById(req.params.id), store.getReportById(targetReportId)]);
    if (!source || !target) return res.status(404).json({ success: false, code: 'REPORT_NOT_FOUND', error: 'Complaint not found.' });
    if (user.role === 'municipal_staff' && [source, target].some((report) => (report.assignedTo && report.assignedTo !== user.id) || (report.department && report.department !== user.department))) return res.status(404).json({ success: false, code: 'REPORT_NOT_FOUND', error: 'Complaint not found.' });
    if (source.issueType !== target.issueType) return res.status(409).json({ success: false, code: 'CATEGORY_MISMATCH', error: 'Complaints must have the same category to be linked.' });
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (new Date(source.createdAt).getTime() < cutoff || new Date(target.createdAt).getTime() < cutoff) return res.status(409).json({ success: false, code: 'DUPLICATE_TOO_OLD', error: 'Only recent complaint pairs can be linked as duplicates.' });
    const radians = Math.PI / 180, dLat = (Number(source.latitude) - Number(target.latitude)) * radians, dLng = (Number(source.longitude) - Number(target.longitude)) * radians;
    const haversine = 6371000 * 2 * Math.atan2(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(Number(source.latitude) * radians) * Math.cos(Number(target.latitude) * radians) * Math.sin(dLng / 2) ** 2), Math.sqrt(1 - (Math.sin(dLat / 2) ** 2 + Math.cos(Number(source.latitude) * radians) * Math.cos(Number(target.latitude) * radians) * Math.sin(dLng / 2) ** 2)));
    const similarity = textSimilarity(String(source.description || ''), String(target.description || ''));
    const exactImageMatch = !!source.imageHash && source.imageHash === target.imageHash;
    if (haversine > 500 || (similarity < 0.2 && !exactImageMatch)) return res.status(409).json({ success: false, code: 'DUPLICATE_EVIDENCE_INSUFFICIENT', error: 'These complaints do not meet the proximity and text or image evidence threshold for linking.' });
    const update = await store.linkDuplicateReports(source.reportId, target.reportId, { id: user.id, role: user.role });
    if (!update) return res.status(409).json({ success: false, code: 'ISSUE_LINK_UNAVAILABLE', error: 'The complaint records could not be linked.' });
    const io = req.app.get('io');
    io?.to('staff').emit('report:updated', sanitizeCitizenReport(update.source));
    io?.to(`reporter:${update.source.userId}`).emit('report:updated', sanitizeCitizenReport(update.source));
    if (update.target.userId) io?.to(`reporter:${update.target.userId}`).emit('report:updated', sanitizeCitizenReport(update.target));
    await createNotification(String(update.source.userId), { kind: 'duplicate_linked', title: 'Complaint linked', message: `Complaint ${update.source.reportId} was linked for combined municipal handling.`, reportId: update.source.reportId, dedupeKey: `duplicate:${update.source.reportId}:${update.target.reportId}` }, io).catch(() => null);
    if (update.target.userId && String(update.target.userId) !== String(update.source.userId)) await createNotification(String(update.target.userId), { kind: 'duplicate_linked', title: 'Complaint linked', message: `Complaint ${update.target.reportId} was linked for combined municipal handling.`, reportId: update.target.reportId, dedupeKey: `duplicate:${update.target.reportId}:${update.source.reportId}` }, io).catch(() => null);
    return res.json({ success: true, data: sanitizeCitizenReport(update.source), linkedIssueId: update.source.associatedIssueId });
  } catch (error: any) {
    const status = unavailable(error) ? 503 : 500;
    return res.status(status).json({ success: false, code: status === 503 ? 'DATABASE_UNAVAILABLE' : 'DUPLICATE_LINK_FAILED', error: status === 503 ? 'Complaint records are temporarily unavailable.' : 'Complaint linking failed.' });
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
