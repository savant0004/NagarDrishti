import { Request, Response } from 'express';
import { ISSUE_SEVERITIES, ISSUE_STATUSES, ISSUE_TYPES } from '../models/Issue';
import { store } from '../services/store';

const unavailable = (error: any) => String(error?.message || '').includes('DEMO_MODE is disabled') || String(error?.message || '').includes('MongoDB is unavailable');
function sendServerError(res: Response, error: any, event: string) {
  const status = unavailable(error) ? 503 : 500;
  if (status === 500) console.error(JSON.stringify({ level: 'error', event, errorName: error?.name || 'Error' }));
  return res.status(status).json({ success: false, code: status === 503 ? 'DATABASE_UNAVAILABLE' : 'INTERNAL_ERROR', error: status === 503 ? 'Issue records are temporarily unavailable.' : 'The issue request failed.' });
}

export async function getIssues(_req: Request, res: Response) {
  try {
    const issues = await store.getIssues();
    return res.json({ success: true, count: issues.length, data: issues, dataSource: store.getMode() });
  } catch (error) { return sendServerError(res, error, 'issue_list_failed'); }
}

export async function getIssueById(req: Request, res: Response) {
  try {
    const issue = await store.getIssueById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Issue not found.' });
    return res.json({ success: true, data: issue });
  } catch (error) { return sendServerError(res, error, 'issue_lookup_failed'); }
}

export async function createIssue(req: Request, res: Response) {
  const { title, description, type, severity = 'Medium', latitude, longitude, streetName } = req.body || {};
  if (typeof title !== 'string' || !title.trim() || title.length > 200 || typeof description !== 'string' || !description.trim() || description.length > 5000 || !ISSUE_TYPES.includes(type) || !ISSUE_SEVERITIES.includes(severity) || typeof streetName !== 'string' || !streetName.trim() || streetName.length > 200) {
    return res.status(400).json({ success: false, code: 'INVALID_INPUT', error: 'Provide a title, description, supported type/severity and street name.' });
  }
  const lat = Number(latitude), lng = Number(longitude);
  if (latitude === undefined || longitude === undefined || !Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) return res.status(400).json({ success: false, code: 'INVALID_COORDINATES', error: 'Latitude must be between -90 and 90 and longitude between -180 and 180.' });
  try {
    const issue = await store.createIssue({ title: title.trim(), description: description.trim(), type, severity, latitude: lat, longitude: lng, streetName: streetName.trim(), estimatedPopulationImpact: null });
    req.app.get('io')?.to('staff').emit('issue:created', issue);
    return res.status(201).json({ success: true, data: issue, dataSource: store.getMode() });
  } catch (error) { return sendServerError(res, error, 'issue_create_failed'); }
}

export async function updateIssue(req: Request, res: Response) {
  const body = req.body || {};
  const allowedKeys = ['status', 'assignedTeam'];
  const keys = Object.keys(body);
  if (!keys.length || keys.some((key) => !allowedKeys.includes(key))) return res.status(400).json({ success: false, code: 'INVALID_UPDATE', error: 'Only authorized issue workflow fields may be updated.' });
  if (body.status !== undefined && !ISSUE_STATUSES.includes(body.status)) return res.status(400).json({ success: false, code: 'INVALID_STATUS', error: 'Unsupported issue status.' });
  if (body.assignedTeam !== undefined && (typeof body.assignedTeam !== 'string' || body.assignedTeam.length > 120)) return res.status(400).json({ success: false, code: 'INVALID_TEAM', error: 'Assigned team must be 120 characters or fewer.' });
  try {
    const result = await store.updateIssueAndAssociatedReports(req.params.id, body);
    if (!result) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Issue not found.' });
    const io = req.app.get('io');
    io?.to('staff').emit('issue:updated', result.issue);
    for (const report of result.reports) {
      io?.to('staff').emit('report:updated', report);
      if (report.userId) io?.to(`reporter:${report.userId}`).emit('report:updated', report);
    }
    return res.json({ success: true, data: result.issue, dataSource: store.getMode() });
  } catch (error) { return sendServerError(res, error, 'issue_update_failed'); }
}

export async function deleteIssue(req: Request, res: Response) {
  try {
    const deleted = await store.deleteIssue(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Issue not found.' });
    req.app.get('io')?.to('staff').emit('issue:deleted', { id: req.params.id });
    return res.json({ success: true, message: 'Issue deleted.' });
  } catch (error: any) {
    if (error?.message === 'ISSUE_HAS_ASSOCIATED_REPORTS') return res.status(409).json({ success: false, code: 'ISSUE_HAS_ASSOCIATED_REPORTS', error: 'This issue has linked citizen reports and cannot be deleted.' });
    return sendServerError(res, error, 'issue_delete_failed');
  }
}
