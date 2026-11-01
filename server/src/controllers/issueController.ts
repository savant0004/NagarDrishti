import { Request, Response } from 'express';
import { ISSUE_SEVERITIES, ISSUE_STATUSES, ISSUE_TYPES } from '../models/Issue';
import { store } from '../services/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { getUserById } from '../services/authService';
import { calculatePriorityScore } from '../services/priorityEngine';
import { createNotification } from '../services/notificationService';
import { sanitizeCitizenReport } from '../services/reportPrivacy';

const unavailable = (error: any) => String(error?.message || '').includes('DEMO_MODE is disabled') || String(error?.message || '').includes('MongoDB is unavailable');
function sendServerError(res: Response, error: any, event: string) {
  const status = unavailable(error) ? 503 : 500;
  if (status === 500) console.error(JSON.stringify({ level: 'error', event, errorName: error?.name || 'Error' }));
  return res.status(status).json({ success: false, code: status === 503 ? 'DATABASE_UNAVAILABLE' : 'INTERNAL_ERROR', error: status === 503 ? 'Issue records are temporarily unavailable.' : 'The issue request failed.' });
}

export async function getIssues(req: Request, res: Response) {
  try {
    const issues = await store.getIssues();
    const user = (req as AuthenticatedRequest).authUser;
    const data = user && user.role !== 'citizen' ? issues : issues.map((issue: any) => ({
      ...issue,
      // Public maps show neighborhood-scale locations, not precise citizen pins.
      latitude: Math.round(Number(issue.latitude) * 1000) / 1000,
      longitude: Math.round(Number(issue.longitude) * 1000) / 1000,
      location: undefined,
      assignedUserId: undefined,
      assignedTeam: undefined,
      department: undefined,
      resolutionNotes: undefined,
    }));
    return res.json({ success: true, count: data.length, data, dataSource: store.getDataSource() });
  } catch (error) { return sendServerError(res, error, 'issue_list_failed'); }
}

export async function getWorkQueue(req: Request, res: Response) {
  try {
    const user = (req as AuthenticatedRequest).authUser!;
    let issues = await store.getIssues();
    issues = issues.filter((issue) => issue.status !== 'RESOLVED');
    if (user.role === 'municipal_staff') {
      issues = issues.filter((issue) => (!issue.department || issue.department === user.department) && (!issue.assignedUserId || issue.assignedUserId === user.id));
    }
    return res.json({ success: true, count: issues.length, data: issues.sort((a, b) => b.priorityScore - a.priorityScore), dataSource: store.getDataSource() });
  } catch (error) { return sendServerError(res, error, 'work_queue_failed'); }
}

export async function getIssueById(req: Request, res: Response) {
  try {
    const issue = await store.getIssueById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Issue not found.' });
    const user = (req as AuthenticatedRequest).authUser;
    const value = user && user.role !== 'citizen' ? issue : { ...issue, latitude: Math.round(Number(issue.latitude) * 1000) / 1000, longitude: Math.round(Number(issue.longitude) * 1000) / 1000, location: undefined, assignedUserId: undefined, assignedTeam: undefined, department: undefined, resolutionNotes: undefined };
    return res.json({ success: true, data: value });
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
    return res.status(201).json({ success: true, data: issue, dataSource: store.getDataSource() });
  } catch (error) { return sendServerError(res, error, 'issue_create_failed'); }
}

export async function updateIssue(req: Request, res: Response) {
  const body = req.body || {};
  const allowedKeys = ['status', 'assignedTeam', 'assignedUserId', 'department', 'resolutionNotes', 'verifiedVisualEvidence'];
  const keys = Object.keys(body);
  if (!keys.length || keys.some((key) => !allowedKeys.includes(key))) return res.status(400).json({ success: false, code: 'INVALID_UPDATE', error: 'Only authorized issue workflow fields may be updated.' });
  if (body.status !== undefined && !ISSUE_STATUSES.includes(body.status)) return res.status(400).json({ success: false, code: 'INVALID_STATUS', error: 'Unsupported issue status.' });
  if (body.assignedTeam !== undefined && (typeof body.assignedTeam !== 'string' || body.assignedTeam.length > 120)) return res.status(400).json({ success: false, code: 'INVALID_TEAM', error: 'Assigned team must be 120 characters or fewer.' });
  if (body.assignedUserId !== undefined && (typeof body.assignedUserId !== 'string' || body.assignedUserId.length > 64)) return res.status(400).json({ success: false, code: 'INVALID_ASSIGNEE', error: 'Assigned staff identifier is invalid.' });
  if (body.department !== undefined && (typeof body.department !== 'string' || body.department.trim().length > 100)) return res.status(400).json({ success: false, code: 'INVALID_DEPARTMENT', error: 'Department must be 100 characters or fewer.' });
  if (body.resolutionNotes !== undefined && (typeof body.resolutionNotes !== 'string' || body.resolutionNotes.length > 3000)) return res.status(400).json({ success: false, code: 'INVALID_RESOLUTION_NOTES', error: 'Resolution notes must be 3,000 characters or fewer.' });
  if (body.verifiedVisualEvidence !== undefined && typeof body.verifiedVisualEvidence !== 'boolean') return res.status(400).json({ success: false, code: 'INVALID_EVIDENCE_REVIEW', error: 'Visual evidence verification must be a boolean.' });
  try {
    const user = (req as AuthenticatedRequest).authUser!;
    const existing = await store.getIssueById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Issue not found.' });
    if (user.role === 'municipal_staff') {
      if (existing.department && existing.department !== user.department) return res.status(403).json({ success: false, code: 'DEPARTMENT_FORBIDDEN', error: 'This issue belongs to a different department.' });
      if (existing.assignedUserId && existing.assignedUserId !== user.id) return res.status(403).json({ success: false, code: 'ASSIGNMENT_FORBIDDEN', error: 'This issue is assigned to another staff member.' });
      if (body.department && body.department !== user.department) return res.status(403).json({ success: false, code: 'DEPARTMENT_FORBIDDEN', error: 'Municipal staff may not change an issue department.' });
      if (body.assignedUserId && body.assignedUserId !== user.id) return res.status(403).json({ success: false, code: 'ASSIGNMENT_FORBIDDEN', error: 'Municipal staff may only assign work to themselves.' });
      if (body.status === 'ASSIGNED' && existing.assignedUserId && existing.assignedUserId !== user.id) return res.status(403).json({ success: false, code: 'ASSIGNMENT_FORBIDDEN', error: 'This issue is assigned to another staff member.' });
      if (body.status === 'ASSIGNED') body.assignedUserId = user.id;
      body.department = body.department || user.department || existing.department || '';
    }
    if (body.assignedUserId) {
      const assigned = await getUserById(body.assignedUserId);
      if (!assigned || assigned.role !== 'municipal_staff') return res.status(400).json({ success: false, code: 'INVALID_ASSIGNEE', error: 'Select an active municipal staff account.' });
      if (user.role === 'municipal_staff' && assigned.id !== user.id) return res.status(403).json({ success: false, code: 'ASSIGNMENT_FORBIDDEN', error: 'Municipal staff may only assign work to themselves.' });
      body.department = body.department || assigned.department || '';
    }
    if (body.verifiedVisualEvidence === true && existing.verifiedVisualEvidence !== true && existing.aiDetectedSeverity) body.aiDetectedSeverity = existing.aiDetectedSeverity;
    const effectiveStatus = body.status || existing.status;
    const priority = calculatePriorityScore({ type: existing.type, severity: existing.severity, aiDetectedSeverity: body.aiDetectedSeverity || existing.aiDetectedSeverity, verifiedVisualEvidence: body.verifiedVisualEvidence ?? existing.verifiedVisualEvidence, reportsCount: existing.reportsCount, estimatedPopulationImpact: existing.estimatedPopulationImpact, nearbyInfrastructure: existing.nearbyInfrastructure, createdAt: existing.createdAt, isResolved: effectiveStatus === 'RESOLVED' });
    const updates = { ...body, priorityScore: priority.priorityScore, riskLevel: priority.riskLevel, priorityLevel: priority.priorityLevel, priorityBreakdown: priority.breakdown, priorityExplanation: priority.priorityExplanation, recommendedResponseHours: priority.recommendedResponseHours, recommendedAction: priority.recommendedAction, reason: priority.priorityExplanation };
    const result = await store.updateIssueAndAssociatedReports(req.params.id, updates, { id: user.id, role: user.role });
    if (!result) return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Issue not found.' });
    const io = req.app.get('io');
    io?.to('staff').emit('issue:updated', result.issue);
    for (const report of result.reports) {
      io?.to('staff').emit('report:updated', sanitizeCitizenReport(report));
      if (report.userId) io?.to(`reporter:${report.userId}`).emit('report:updated', sanitizeCitizenReport(report));
      if (report.userId && body.status) {
        const resolved = body.status === 'RESOLVED';
        const assignment = body.status === 'ASSIGNED' && !!body.assignedUserId;
          // Include the new status in the key: rapid successive transitions can share
          // a millisecond timestamp and must still produce distinct notifications.
          await createNotification(String(report.userId), { kind: resolved ? 'complaint_resolved' : assignment ? 'complaint_assigned' : 'status_changed', title: resolved ? 'Complaint resolved' : assignment ? 'Complaint assigned' : 'Complaint status updated', message: `Complaint ${report.reportId} is now ${report.status}.`, reportId: report.reportId, dedupeKey: `report-status:${report.reportId}:${body.status}:${report.updatedAt || result.issue.updatedAt}` }, io).catch(() => null);
      }
      if (report.userId && body.assignedUserId && body.status !== 'ASSIGNED') await createNotification(String(report.userId), { kind: 'complaint_assigned', title: 'Complaint assigned', message: `Complaint ${report.reportId} has been assigned for municipal follow-up.`, reportId: report.reportId, dedupeKey: `report-assignment:${report.reportId}:${result.issue.updatedAt}` }, io).catch(() => null);
      if (report.userId && body.verifiedVisualEvidence !== undefined) await createNotification(String(report.userId), { kind: 'priority_changed', title: 'Complaint reviewed', message: `Municipal staff reviewed the visual evidence for complaint ${report.reportId}.`, reportId: report.reportId, dedupeKey: `priority-review:${report.reportId}:${result.issue.updatedAt}` }, io).catch(() => null);
    }
    if (body.assignedUserId) await createNotification(body.assignedUserId, { kind: 'complaint_assigned', title: 'Work assigned', message: `Issue ${result.issue.id} has been assigned to you.`, reportId: result.reports[0]?.reportId, dedupeKey: `issue-assignment:${result.issue.id}:${result.issue.updatedAt}` }, io).catch(() => null);
    if (body.verifiedVisualEvidence !== undefined) io?.to('staff').emit('issue:updated', result.issue);
    return res.json({ success: true, data: result.issue, dataSource: store.getDataSource() });
  } catch (error) { return sendServerError(res, error, 'issue_update_failed'); }
}

export async function getIssueHotspots(_req: Request, res: Response) {
  try { return res.json({ success: true, data: await store.getComplaintHotspots(), dataSource: store.getDataSource() }); }
  catch (error) { return sendServerError(res, error, 'hotspot_read_failed'); }
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
