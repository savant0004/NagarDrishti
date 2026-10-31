const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const net = require('node:net');
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

test('demo HTTP and Socket.IO flow: readiness, auth, report lifecycle, analytics, and events', { timeout: 30000 }, async (t) => {
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
    const deadline = Date.now() + 12000;
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
    const registeredResponse = await fetch(`${base}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Integration Citizen', email: `citizen-${Date.now()}@example.test`, password }),
    });
    assert.equal(registeredResponse.status, 201);
    const registered = await registeredResponse.json();
    const citizenHeaders = { Authorization: `Bearer ${registered.data.token}`, 'Content-Type': 'application/json' };

    const adminResponse = await fetch(`${base}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: env.DEMO_ADMIN_EMAIL, password }),
    });
    assert.equal(adminResponse.status, 200);
    const admin = await adminResponse.json();
    const adminHeaders = { Authorization: `Bearer ${admin.data.token}`, 'Content-Type': 'application/json' };

    const staffSocket = io(base, { transports: ['websocket'], auth: { token: admin.data.token }, reconnection: false });
    sockets.push(staffSocket);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Socket.IO connection timed out')), 5000);
      staffSocket.once('connect', () => { clearTimeout(timer); resolve(); });
      staffSocket.once('connect_error', (error) => { clearTimeout(timer); reject(error); });
    });
    const reportCreatedEvent = eventOnce(staffSocket, 'report:created');
    const issueCreatedEvent = eventOnce(staffSocket, 'issue:created');

    const idempotencyKey = `integration-${Date.now()}`;
    const form = new FormData();
    for (const [key, value] of Object.entries({ issueType: 'Road Obstruction', description: 'Integration test report.', latitude: '12.80001', longitude: '77.80001', streetName: 'Integration Test Road', severity: 'Medium' })) form.append(key, value);
    form.append('photo', new Blob([Buffer.from([0xff, 0xd8, 0xff])], { type: 'image/jpeg' }), 'integration.jpg');
    const reportResponse = await fetch(`${base}/api/reports`, {
      method: 'POST', headers: { Authorization: citizenHeaders.Authorization, 'Idempotency-Key': idempotencyKey }, body: form,
    });
    assert.equal(reportResponse.status, 201);
    const createdBody = await reportResponse.json();
    uploadedImagePath = path.resolve(__dirname, '../uploads', path.basename(createdBody.data.image));
    const reportCreatedPayload = await reportCreatedEvent;
    const issueCreatedPayload = await issueCreatedEvent;
    assert.equal(reportCreatedPayload.reportId, createdBody.data.reportId);
    assert.equal(issueCreatedPayload.id, createdBody.createdIssue.id);

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
      method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ status: 'RESOLVED' }),
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
