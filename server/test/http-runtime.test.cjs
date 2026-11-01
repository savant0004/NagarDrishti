const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const net = require('node:net');
const { createHash } = require('node:crypto');
const { spawn } = require('node:child_process');
let io;
try { ({ io } = require(require.resolve('socket.io-client', { paths: [path.resolve(__dirname, '../../client')] }))); }
catch { io = null; }

async function unusedPort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => listener.listen(0, '127.0.0.1', resolve).once('error', reject));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  return port;
}

function eventOnce(socket, name, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(name, handler); reject(new Error(`Timed out waiting for ${name}`)); }, timeoutMs);
    const handler = (payload) => { clearTimeout(timer); resolve(payload); };
    socket.once(name, handler);
  });
}

test('demo HTTP and Socket.IO flow: readiness, auth, Groq endpoint, report lifecycle, analytics, and events', { timeout: 60000 }, async (t) => {
  if (!io) { t.skip('Install the client dependencies to run the Socket.IO integration check.'); return; }
  const port = await unusedPort();
  const base = `http://127.0.0.1:${port}`;
  const password = 'integration-test-password';
  const env = {
    ...process.env,
    DEMO_MODE: 'true',
    JWT_SECRET: 'http-integration-test-secret-over-thirty-two-bytes',
    DEMO_ADMIN_EMAIL: 'demo-admin@example.test',
    DEMO_ADMIN_PASSWORD: password,
    // Keep the HTTP suite local-only; live Groq authentication is checked by scripts/groq-diagnostic.cjs.
    GROQ_API_KEY: '',
    PORT: String(port),
    CLIENT_URL: 'http://localhost:5173',
  };
  const child = spawn(process.execPath, ['-r', require.resolve('ts-node/register'), path.resolve(__dirname, '../src/server.ts')], {
    cwd: path.resolve(__dirname, '..'), env, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let childOutput = '';
  child.stdout.on('data', (chunk) => { childOutput += chunk.toString(); });
  child.stderr.on('data', (chunk) => { childOutput += chunk.toString(); });
  const sockets = [];
  let uploadedImagePath;
  try {
    let readyBody;
    const deadline = Date.now() + 25000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error(`Demo server exited before becoming ready: ${childOutput.slice(-3000)}`);
      try {
        const response = await fetch(`${base}/api/ready`);
        readyBody = await response.json();
        if (response.status === 200 && readyBody.applicationMode === 'demo') break;
      } catch { await new Promise((resolve) => setTimeout(resolve, 200)); }
    }
    if (!readyBody && childOutput.includes('http_server_listening')) {
      t.skip('This execution sandbox blocks loopback HTTP connections; run this test in a local environment with loopback access.');
      return;
    }
    if (!readyBody && child.exitCode === null && childOutput.includes('demo_mode_enabled')) {
      t.skip('This execution sandbox did not allow the demo HTTP listener to become reachable; run this test locally with loopback access.');
      return;
    }
    assert.ok(readyBody, `Demo server did not become ready: ${childOutput.slice(-3000)}`);
    assert.equal(readyBody.status, 'degraded');
    assert.equal(readyBody?.database?.status, 'demo');
    const healthResponse = await fetch(`${base}/api/health`);
    const health = await healthResponse.json();
    assert.equal(healthResponse.status, 200);
    assert.equal(health.kind, 'liveness');
    assert.equal(health.database.status, 'demo');

    const unauthenticated = await fetch(`${base}/api/reports`, { headers: { Accept: 'application/json' } });
    assert.equal(unauthenticated.status, 401);
    const unauthenticatedIssues = await fetch(`${base}/api/issues`);
    assert.equal(unauthenticatedIssues.status, 200);
    assert.ok(Array.isArray((await unauthenticatedIssues.json()).data));
    assert.equal((await fetch(`${base}/api/analytics`)).status, 200);
    assert.equal((await fetch(`${base}/api/streets`)).status, 200);
    assert.equal((await fetch(`${base}/api/simulation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rainfall: 20, traffic: 50, drainageCapacity: 75, garbageDelay: 1 }) })).status, 200);
    assert.equal((await fetch(`${base}/api/issues/demo-issue`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'RESOLVED' }) })).status, 401);
    assert.equal((await fetch(`${base}/api/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })).status, 401);
    assert.equal((await fetch(`${base}/api/auth/staff`)).status, 401);
    const registeredResponse = await fetch(`${base}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Integration Citizen', email: `citizen-${Date.now()}@example.test`, password }),
    });
    assert.equal(registeredResponse.status, 201);
    const registered = await registeredResponse.json();
    const citizenHeaders = { Authorization: `Bearer ${registered.data.token}`, 'Content-Type': 'application/json' };
    const citizenIssues = await fetch(`${base}/api/issues`, { headers: citizenHeaders });
    assert.equal(citizenIssues.status, 200);

    const citizenSocket = io(base, { transports: ['websocket'], auth: { token: registered.data.token }, reconnection: false });
    sockets.push(citizenSocket);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Citizen Socket.IO connection timed out')), 5000);
      citizenSocket.once('connect', () => { clearTimeout(timer); resolve(); });
      citizenSocket.once('connect_error', (error) => { clearTimeout(timer); reject(error); });
    });

    const adminResponse = await fetch(`${base}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: env.DEMO_ADMIN_EMAIL, password }),
    });
    assert.equal(adminResponse.status, 200);
    const admin = await adminResponse.json();
    const adminHeaders = { Authorization: `Bearer ${admin.data.token}`, 'Content-Type': 'application/json' };

    const assistantConversationResponse = await fetch(`${base}/api/assistant/conversations`, { method: 'POST', headers: adminHeaders });
    assert.equal(assistantConversationResponse.status, 201);
    const assistantConversation = await assistantConversationResponse.json();
    const assistantMessageResponse = await fetch(`${base}/api/assistant/conversations/${assistantConversation.data.id}/messages`, {
      method: 'POST', headers: adminHeaders, body: JSON.stringify({ content: 'Give one concise civic tip for preventing blocked drains.' }),
    });
    const assistantMessageBody = await assistantMessageResponse.json();
    if (assistantMessageResponse.status === 200) {
      console.log('Groq authenticated assistant endpoint: live text response succeeded.');
      assert.equal(assistantMessageBody.success, true);
      assert.equal(assistantMessageBody.data.model, 'openai/gpt-oss-120b');
      assert.ok(typeof assistantMessageBody.data.reply === 'string' && assistantMessageBody.data.reply.trim());
    } else {
      console.log(`Groq authenticated assistant endpoint: provider returned HTTP ${assistantMessageResponse.status}; safe error response verified.`);
      assert.ok([429, 502, 503, 504].includes(assistantMessageResponse.status), `Unexpected assistant HTTP status ${assistantMessageResponse.status}`);
      assert.equal(assistantMessageBody.success, false);
      assert.ok(typeof assistantMessageBody.error === 'string' && assistantMessageBody.error.length > 0);
    }

    const staffSocket = io(base, { transports: ['websocket'], auth: { token: admin.data.token }, reconnection: false });
    sockets.push(staffSocket);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Socket.IO connection timed out')), 5000);
      staffSocket.once('connect', () => { clearTimeout(timer); resolve(); });
      staffSocket.once('connect_error', (error) => { clearTimeout(timer); reject(error); });
    });
    const reportCreatedEvent = eventOnce(staffSocket, 'report:created');
    const issueCreatedEvent = eventOnce(staffSocket, 'issue:created');
    const citizenNotification = eventOnce(citizenSocket, 'notification:new');

    const idempotencyKey = `integration-${Date.now()}`;
    const form = new FormData();
    const imageBytes = Buffer.from([0xff, 0xd8, 0xff]);
    for (const [key, value] of Object.entries({ issueType: 'Road Obstruction', description: 'Integration test report.', latitude: '12.80001', longitude: '77.80001', streetName: 'Integration Test Road', severity: 'Medium', contactEmail: 'private@example.test' })) form.append(key, value);
    form.append('photo', new Blob([imageBytes], { type: 'image/jpeg' }), 'integration.jpg');
    const reportResponse = await fetch(`${base}/api/reports`, {
      method: 'POST', headers: { Authorization: citizenHeaders.Authorization, 'Idempotency-Key': idempotencyKey }, body: form,
    });
    assert.equal(reportResponse.status, 201);
    const createdBody = await reportResponse.json();
    const publicTrackingResponse = await fetch(`${base}/api/reports/${encodeURIComponent(createdBody.data.reportId)}`);
    assert.equal(publicTrackingResponse.status, 200);
    const publicTracking = (await publicTrackingResponse.json()).data;
    assert.equal(publicTracking.reportId, createdBody.data.reportId);
    assert.equal('contactEmail' in publicTracking, false);
    assert.equal('userId' in publicTracking, false);
    assert.equal('latitude' in publicTracking, false);
    assert.equal('location' in publicTracking, false);
    uploadedImagePath = path.resolve(__dirname, '../uploads', path.basename(createdBody.data.image));
    const reportCreatedPayload = await reportCreatedEvent;
    const issueCreatedPayload = await issueCreatedEvent;
    assert.equal(reportCreatedPayload.reportId, createdBody.data.reportId);
    assert.equal(issueCreatedPayload.id, createdBody.createdIssue.id);
    assert.deepEqual(createdBody.data.location, { type: 'Point', coordinates: [77.80001, 12.80001] });
    assert.equal((await citizenNotification).kind, 'complaint_submitted');

    const duplicateCheck = await fetch(`${base}/api/reports/duplicates`, { method: 'POST', headers: citizenHeaders, body: JSON.stringify({ issueType: 'Road Obstruction', description: 'Integration test report.', latitude: 12.80001, longitude: 77.80001, imageHash: createHash('sha256').update(imageBytes).digest('hex') }) });
    assert.equal(duplicateCheck.status, 200);
    const duplicateSuggestions = (await duplicateCheck.json()).data;
    assert.equal(duplicateSuggestions.hasPossibleDuplicates, true);
    assert.equal(JSON.stringify(duplicateSuggestions).includes(createdBody.data.reportId), false);
    assert.deepEqual(Object.keys(duplicateSuggestions).sort(), ['aiReview', 'hasPossibleDuplicates'].sort());
    assert.ok(['possible_match', 'uncertain', 'no_likely_match', 'unavailable'].includes(duplicateSuggestions.aiReview));
    assert.equal(JSON.stringify(duplicateSuggestions).includes('latitude'), false);

    const nearbyResponse = await fetch(`${base}/api/reports/nearby?latitude=12.80001&longitude=77.80001&radiusMeters=500`, { headers: citizenHeaders });
    assert.equal(nearbyResponse.status, 200);
    assert.ok((await nearbyResponse.json()).data.some((report) => report.reportId === createdBody.data.reportId));

    const secondForm = new FormData();
    for (const [key, value] of Object.entries({ issueType: 'Road Obstruction', description: 'Integration test report.', latitude: '12.80002', longitude: '77.80002', streetName: 'Integration Test Road', severity: 'Medium' })) secondForm.append(key, value);
    const secondCreated = await fetch(`${base}/api/reports`, { method: 'POST', headers: { Authorization: citizenHeaders.Authorization, 'Idempotency-Key': `group-${Date.now()}` }, body: secondForm });
    assert.equal(secondCreated.status, 201);
    const secondBody = await secondCreated.json();
    const secondReport = secondBody.data;
    assert.notEqual(secondReport.associatedIssueId, createdBody.createdIssue.id, 'similar nearby complaints remain separate until staff confirms a link');
    const hotspotResponse = await fetch(`${base}/api/issues/hotspots`, { headers: adminHeaders });
    assert.equal(hotspotResponse.status, 200);
    assert.ok((await hotspotResponse.json()).data.some((spot) => spot.count >= 2));

    const staffCreateResponse = await fetch(`${base}/api/auth/staff`, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ name: 'Road Staff', email: `staff-${Date.now()}@example.test`, password, role: 'municipal_staff', department: 'Roads' }) });
    assert.equal(staffCreateResponse.status, 201);
    const staffUser = (await staffCreateResponse.json()).data.user;
    const staffLoginResponse = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: staffUser.email, password }) });
    assert.equal(staffLoginResponse.status, 200);
    const staff = (await staffLoginResponse.json()).data;
    const staffHeaders = { Authorization: `Bearer ${staff.token}`, 'Content-Type': 'application/json' };
    const assignedEvent = eventOnce(citizenSocket, 'notification:new');
    const assignment = await fetch(`${base}/api/issues/${createdBody.createdIssue.id}`, { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ status: 'ASSIGNED', assignedUserId: staffUser.id, department: 'Roads', resolutionNotes: 'Assigned for field inspection.' }) });
    assert.equal(assignment.status, 200);
    assert.equal((await assignedEvent).kind, 'complaint_assigned');
    const staffQueue = await fetch(`${base}/api/issues/work-queue`, { headers: staffHeaders });
    assert.equal(staffQueue.status, 200);
    assert.ok((await staffQueue.json()).data.some((issue) => issue.id === createdBody.createdIssue.id));
    const staffReports = await fetch(`${base}/api/reports`, { headers: staffHeaders });
    assert.equal(staffReports.status, 200);
    const staffReportData = (await staffReports.json()).data;
    assert.equal('contactEmail' in staffReportData.find((report) => report.reportId === createdBody.data.reportId), false);

    const unconfirmedLink = await fetch(`${base}/api/reports/${createdBody.data.reportId}/link-duplicate`, { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ targetReportId: secondReport.reportId }) });
    assert.equal(unconfirmedLink.status, 400);
    const duplicateLink = await fetch(`${base}/api/reports/${createdBody.data.reportId}/link-duplicate`, { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ targetReportId: secondReport.reportId, confirm: true }) });
    assert.equal(duplicateLink.status, 200);
    const linkedIssue = await fetch(`${base}/api/issues/${createdBody.createdIssue.id}`, { headers: adminHeaders });
    assert.equal(linkedIssue.status, 200);
    assert.equal((await linkedIssue.json()).data.reportsCount, 2);

    const duplicateResponse = await fetch(`${base}/api/reports`, {
      method: 'POST', headers: { ...citizenHeaders, 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ issueType: 'Road Obstruction', description: 'Integration test report.', latitude: 12.80001, longitude: 77.80001, streetName: 'Integration Test Road', severity: 'Medium' }),
    });
    assert.equal(duplicateResponse.status, 200);
    assert.equal((await duplicateResponse.json()).idempotent, true);

    const unauthorizedUpdate = await fetch(`${base}/api/issues/${createdBody.createdIssue.id}`, {
      method: 'PATCH', headers: citizenHeaders, body: JSON.stringify({ status: 'RESOLVED' }),
    });
    assert.equal(unauthorizedUpdate.status, 403);
    const invalidReport = await fetch(`${base}/api/reports`, {
      method: 'POST', headers: citizenHeaders,
      body: JSON.stringify({ issueType: 'Road Obstruction', description: 'Invalid coordinate test.', latitude: 100, longitude: 77.8 }),
    });
    assert.equal(invalidReport.status, 400);

    const reportUpdatedEvent = eventOnce(staffSocket, 'report:updated');
    const issueUpdatedEvent = eventOnce(staffSocket, 'issue:updated');
    const updateResponse = await fetch(`${base}/api/issues/${createdBody.createdIssue.id}`, {
      method: 'PATCH', headers: staffHeaders, body: JSON.stringify({ status: 'RESOLVED', resolutionNotes: 'Repair verified in field.' }),
    });
    assert.equal(updateResponse.status, 200);
    assert.equal((await issueUpdatedEvent).status, 'RESOLVED');
    assert.equal((await reportUpdatedEvent).status, 'Resolved');

    const linkedIssueDelete = await fetch(`${base}/api/issues/${createdBody.createdIssue.id}`, { method: 'DELETE', headers: adminHeaders });
    assert.equal(linkedIssueDelete.status, 409);
    const missingIssueUpdate = await fetch(`${base}/api/issues/ISSUE-MISSING`, { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ status: 'RESOLVED' }) });
    assert.equal(missingIssueUpdate.status, 404);

    const retrievedResponse = await fetch(`${base}/api/reports/${createdBody.data.reportId}`, { headers: citizenHeaders });
    assert.equal(retrievedResponse.status, 200);
    assert.equal((await retrievedResponse.json()).data.status, 'Resolved');
    const imageResponse = await fetch(`${base}/api/reports/${createdBody.data.reportId}/image`, { headers: { Authorization: citizenHeaders.Authorization } });
    assert.equal(imageResponse.status, 200);
    const citizenNotifications = await fetch(`${base}/api/notifications`, { headers: { Authorization: citizenHeaders.Authorization } });
    assert.equal(citizenNotifications.status, 200);
    assert.ok((await citizenNotifications.json()).data.some((notification) => notification.kind === 'complaint_resolved'));

    const analyticsResponse = await fetch(`${base}/api/analytics`, { headers: adminHeaders });
    assert.equal(analyticsResponse.status, 200);
    const analytics = (await analyticsResponse.json()).data;
    assert.equal(analytics.dataSource, 'demo');
    assert.ok(analytics.resolvedComplaints >= 1);
    assert.ok(analytics.complaintCategoryDistribution.some((row) => row.name === 'Road Obstruction'));
  } finally {
    for (const socket of sockets) socket.disconnect();
    child.kill('SIGTERM');
    await new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', resolve);
      setTimeout(resolve, 5000);
    });
    if (uploadedImagePath) await fs.unlink(uploadedImagePath).catch(() => undefined);
  }
});
