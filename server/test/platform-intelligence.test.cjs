const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DEMO_MODE = 'true';
const { store } = require('../src/services/store');
const { calculatePriorityScore } = require('../src/services/priorityEngine');
const { runScenarioSimulation } = require('../src/services/simulationEngine');
const notifications = require('../src/services/notificationService');

test('nearby complaint search and hotspot summaries use actual stored coordinates', async () => {
  const nearby = await store.getNearbyReports(12.9716, 77.5946, 10000);
  assert.ok(nearby.length > 0);
  assert.ok(nearby.every((report) => Number.isFinite(report.latitude) && Number.isFinite(report.longitude)));
  const hotspots = await store.getComplaintHotspots();
  assert.ok(Array.isArray(hotspots));
  assert.ok(hotspots.every((spot) => Number.isFinite(spot.latitude) && spot.count >= 2));
});

test('priority scores are deterministic, use evidence only after verification, and calculate response targets', () => {
  const params = { type: 'Pothole', severity: 'Medium', reportsCount: 2, nearbyInfrastructure: { schools: 0, hospitals: 0, busStops: 0, residentialCount: 0, commercialCount: 0 }, createdAt: new Date(Date.now() - 48 * 3600000), aiDetectedSeverity: 'Critical' };
  const first = calculatePriorityScore(params);
  assert.deepEqual(first, calculatePriorityScore(params));
  assert.equal(first.breakdown.traffic, 0);
  assert.match(first.priorityExplanation, /traffic volume.*not treated as measured evidence/i);
  assert.doesNotMatch(first.priorityExplanation, /high traffic density|high density residential area|5,000L\/day/i);
  const scenarioTraffic = calculatePriorityScore({ ...params, trafficVolume: 50 });
  assert.match(scenarioTraffic.priorityExplanation, /Scenario traffic load \(50%; not a live measurement\)/);
  const verified = calculatePriorityScore({ ...params, verifiedVisualEvidence: true });
  assert.ok(verified.priorityScore > first.priorityScore);
  assert.ok([4, 24, 72, 168].includes(verified.recommendedResponseHours));
  assert.equal(verified.priorityExplanation.includes('Staff-verified visual evidence'), true);
});

test('flood simulation separates user scenario inputs from historical observations', async () => {
  const issues = await store.getIssues();
  const reports = await store.getReports();
  const result = runScenarioSimulation({ rainfall: 100, traffic: 50, drainageCapacity: 60, garbageDelay: 2 }, issues, reports);
  assert.equal(result.sensorDataAvailable, false);
  assert.equal(result.elevationDataAvailable, false);
  assert.equal(result.estimatedPopulationImpact, null);
  assert.equal(result.historicalObservations.floodRelatedComplaints, reports.filter((report) => ['Waterlogging', 'Blocked Drainage'].includes(report.issueType)).length);
  assert.ok(result.assumptions.some((item) => item.includes('user-entered scenario')));
});

test('notifications are private, unread counts are accurate, and duplicate keys do not emit duplicates', async () => {
  const first = await notifications.createNotification('citizen-a', { kind: 'status_changed', title: 'Updated', message: 'Complaint status changed.', dedupeKey: 'status:one' });
  assert.ok(first);
  assert.equal(await notifications.createNotification('citizen-a', { kind: 'status_changed', title: 'Updated', message: 'Complaint status changed.', dedupeKey: 'status:one' }), null);
  assert.equal((await notifications.listNotifications('citizen-b')).length, 0);
  assert.equal(await notifications.getUnreadNotificationCount('citizen-a'), 1);
  await notifications.markNotificationRead('citizen-a', first.id);
  assert.equal(await notifications.getUnreadNotificationCount('citizen-a'), 0);
});
