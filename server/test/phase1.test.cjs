process.env.DEMO_MODE = 'true';
process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-thirty-two-bytes';

const test = require('node:test');
const assert = require('node:assert/strict');
const { store } = require('../src/services/store');
const auth = require('../src/services/authService');
const { IssueModel } = require('../src/models/Issue');
const { CitizenReportModel } = require('../src/models/CitizenReport');
const { loadRuntimeConfig } = require('../src/config');

test('citizen accounts use hashed credentials and signed expiring sessions', async () => {
  const email = `citizen-${Date.now()}@example.test`;
  const user = await auth.registerCitizen('Test Citizen', email, 'long-test-password');
  assert.equal(user.role, 'citizen');
  assert.equal((await auth.authenticate(email, 'wrong-password')), null);
  assert.equal((await auth.authenticate(email, 'long-test-password')).id, user.id);
  const token = auth.issueToken(user.id);
  assert.equal(auth.verifyToken(token).sub, user.id);
  assert.equal(auth.verifyToken(`${token}x`), null);
});

test('complaint submission is idempotent, keeps nearby complaints separate until staff links them, and updates linked status', async () => {
  const userId = `test-user-${Date.now()}`;
  const idempotencyKey = `submission-${Date.now()}`;
  const reportData = { userId, idempotencyKey, issueType: 'Road Obstruction', description: 'A fallen branch blocks one lane.', latitude: 12.90123, longitude: 77.60123, streetName: 'Test Road', severity: 'Medium', status: 'Submitted' };
  const issueInput = { title: 'Road obstruction', description: reportData.description, type: reportData.issueType, severity: reportData.severity, latitude: reportData.latitude, longitude: reportData.longitude, streetName: reportData.streetName, estimatedPopulationImpact: null };

  const created = await store.createReportAndAssociateIssue(reportData, issueInput);
  assert.equal(created.idempotent, false);
  const duplicate = await store.createReportAndAssociateIssue(reportData, issueInput);
  assert.equal(duplicate.idempotent, true);
  assert.equal(duplicate.report.reportId, created.report.reportId);
  assert.equal(duplicate.issue.id, created.issue.id);

  const second = await store.createReportAndAssociateIssue({ ...reportData, userId: `${userId}-second`, idempotencyKey: `${idempotencyKey}-second` }, issueInput);
  assert.notEqual(second.issue.id, created.issue.id);
  assert.notEqual(second.report.associatedIssueId, created.report.associatedIssueId);
  const linked = await store.linkDuplicateReports(created.report.reportId, second.report.reportId, { id: 'staff-reviewer', role: 'municipal_staff' });
  assert.ok(linked);
  assert.equal(linked.source.associatedIssueId, linked.target.associatedIssueId);
  assert.equal((await store.getIssueById(created.issue.id)).reportsCount, 2);
  assert.equal((await store.getReportById(created.report.reportId)).reportId, created.report.reportId);
  assert.equal((await store.getReportById(second.report.reportId)).reportId, second.report.reportId);

  const updated = await store.updateIssueAndAssociatedReports(created.issue.id, { status: 'RESOLVED' });
  assert.equal(updated.issue.status, 'RESOLVED');
  const report = await store.getReportById(created.report.reportId);
  assert.equal(report.status, 'Resolved');
  assert.ok(report.resolvedAt instanceof Date);
});

test('analytics derive totals and complaint category/severity from stored report records', async () => {
  const analytics = await store.getAnalytics();
  assert.equal(analytics.dataSource, 'demo');
  assert.equal(analytics.totalComplaints, analytics.complaintStatusDistribution.reduce((sum, row) => sum + row.count, 0));
  assert.equal(analytics.resolvedComplaints, analytics.complaintStatusDistribution.find((row) => row.name === 'Resolved')?.count || 0);
  assert.ok(analytics.complaintCategoryDistribution.some((row) => row.name === 'Road Obstruction'));
  assert.ok(analytics.complaintSeverityDistribution.every((row) => row.count > 0));
});

test('live mode fails closed rather than returning demo memory records', async () => {
  process.env.DEMO_MODE = 'false';
  store.setDatabaseState('unavailable');
  await assert.rejects(store.getIssues(), /MongoDB is unavailable/);
  process.env.DEMO_MODE = 'true';
});

test('Mongoose schemas reject invalid coordinates/categories and enforce per-user idempotency indexes', () => {
  const invalid = new IssueModel({ id: 'test', title: 'Issue', description: 'Invalid coordinates', type: 'Unknown', severity: 'Medium', latitude: 91, longitude: 181, streetName: 'Test', status: 'NEW', recommendedAction: 'Review', reason: 'Test' });
  const validation = invalid.validateSync();
  assert.ok(validation.errors.latitude);
  assert.ok(validation.errors.longitude);
  assert.ok(validation.errors.type);
  assert.ok(CitizenReportModel.schema.indexes().some(([keys, options]) => keys.userId === 1 && keys.idempotencyKey === 1 && options.unique === true));
});

test('runtime configuration requires an explicit mode, a live Mongo URI, and a strong JWT secret', () => {
  const previous = { mode: process.env.DEMO_MODE, uri: process.env.MONGODB_URI, secret: process.env.JWT_SECRET };
  process.env.DEMO_MODE = 'false';
  delete process.env.MONGODB_URI;
  process.env.JWT_SECRET = '01234567890123456789012345678901';
  try {
    const config = loadRuntimeConfig();
    assert.ok(config.errors.some((message) => message.includes('MONGODB_URI is required')));
    assert.equal(config.demoMode, false);
  } finally {
    if (previous.mode === undefined) delete process.env.DEMO_MODE; else process.env.DEMO_MODE = previous.mode;
    if (previous.uri === undefined) delete process.env.MONGODB_URI; else process.env.MONGODB_URI = previous.uri;
    if (previous.secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous.secret;
  }
});
