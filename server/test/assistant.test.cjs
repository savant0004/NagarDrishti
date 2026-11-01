const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DEMO_MODE = 'true';
const conversations = require('../src/services/assistantConversationService');
const assistant = require('../src/services/aiAssistantService');

test('assistant conversations are private, retain bounded turns, and can be deleted', async () => {
  const first = await conversations.createConversation('citizen-a');
  assert.ok(first.id);
  assert.equal(await conversations.getConversation('citizen-b', first.id), null);
  assert.equal(await conversations.appendConversationTurn('citizen-b', first.id, 'hi', 'hello'), null);
  const updated = await conversations.appendConversationTurn('citizen-a', first.id, 'How do I report a pothole?', 'Open Report Problem and submit the form.');
  assert.equal(updated.messages.length, 2);
  assert.equal((await conversations.listConversations('citizen-b')).length, 0);
  assert.equal(await conversations.deleteConversation('citizen-b', first.id), false);
  assert.equal(await conversations.deleteConversation('citizen-a', first.id), true);
});

test('validated backend context restricts citizen analytics and limits complaint fields', async () => {
  const citizen = await assistant.prepareAssistantToolContext({ id: 'citizen-a', role: 'citizen' }, 'How many complaints are unresolved?');
  assert.deepEqual(citizen, { tool: 'getComplaintStatistics', result: { access: 'restricted' } });

  const admin = await assistant.prepareAssistantToolContext({ id: 'admin-a', role: 'admin' }, 'Which complaints need immediate attention?');
  assert.equal(admin.tool, 'getPriorityIssues');
  assert.ok(Array.isArray(admin.result.issues));
  assert.ok(['demo', 'live'].includes(admin.result.dataSource));

  const areaStats = await assistant.prepareAssistantToolContext({ id: 'admin-a', role: 'admin' }, 'Which areas have the highest complaint volumes?');
  assert.equal(areaStats.tool, 'getAreaComplaintSummary');
  assert.ok(Array.isArray(areaStats.result.areas));

  const own = await assistant.prepareAssistantToolContext({ id: 'citizen-a', role: 'citizen' }, 'Track complaint ST-2026-0000000000000001');
  assert.equal(own.tool, 'getComplaintById');
  if (own.result.found) {
    assert.equal('contactEmail' in own.result.report, false);
    assert.equal('userId' in own.result.report, false);
  }
});

test('public assistant can answer from aggregate data and returns only safe tracking fields', async (t) => {
  const publicActor = { id: 'public', role: 'public', department: '' };
  const stats = await assistant.prepareAssistantToolContext(publicActor, 'How many complaints are unresolved?');
  assert.equal(stats.tool, 'getComplaintStatistics');
  assert.ok(Number.isFinite(stats.result.totalComplaints));
  assert.ok(['demo', 'live'].includes(stats.result.dataSource));
  assert.equal('staffWorkload' in stats.result, false);

  const { store } = require('../src/services/store');
  const original = store.getReportById;
  t.after(() => { store.getReportById = original; });
  store.getReportById = async () => ({ reportId: 'ST-2026-0123456789ABCDEF', issueType: 'Pothole', severity: 'Medium', status: 'Submitted', streetName: 'Sample Road', description: 'Private citizen detail', contactEmail: 'private@example.test', latitude: 12.123456, longitude: 77.123456, userId: 'citizen-a' });
  const tracking = await assistant.prepareAssistantToolContext(publicActor, 'Track complaint ST-2026-0123456789ABCDEF');
  assert.deepEqual(Object.keys(tracking.result.report).sort(), ['area', 'category', 'severity', 'status']);
});

test('authorized complaint summaries include redacted report text only for the report owner', async (t) => {
  const { store } = require('../src/services/store');
  const original = store.getReportById;
  t.after(() => { store.getReportById = original; });
  store.getReportById = async () => ({
    reportId: 'ST-2026-0123456789ABCDEF', userId: 'citizen-a', issueType: 'Pothole', severity: 'Medium', status: 'Submitted',
    streetName: 'Sample Road', description: 'Pothole here. Contact citizen@example.com or 555-123-4567.', createdAt: new Date(0),
  });
  const owner = await assistant.prepareAssistantToolContext({ id: 'citizen-a', role: 'citizen' }, 'Track complaint ST-2026-0123456789ABCDEF');
  assert.equal(owner.result.report.description.includes('citizen@example.com'), false);
  assert.equal(owner.result.report.description.includes('555-123-4567'), false);
  const otherCitizen = await assistant.prepareAssistantToolContext({ id: 'citizen-b', role: 'citizen' }, 'Track complaint ST-2026-0123456789ABCDEF');
  assert.deepEqual(otherCitizen.result, { found: false });
});

test('Groq responses are validated and failures do not fabricate answers', async (t) => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GROQ_API_KEY;
  const originalModel = process.env.GROQ_MODEL;
  t.after(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.GROQ_MODEL; else process.env.GROQ_MODEL = originalModel;
  });
  process.env.GROQ_API_KEY = 'unit-test-only';
  process.env.GROQ_MODEL = 'openai/gpt-oss-120b';

  global.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    assert.match(String(_url), /^https:\/\/api\.groq\.com\/openai\/v1\/chat\/completions$/);
    assert.equal(request.model, 'openai/gpt-oss-120b');
    assert.ok(options.headers.get('authorization').startsWith('Bearer '));
    assert.equal(request.messages[0].role, 'system');
    assert.ok(request.messages.some((message) => message.content.includes('actual details')));
    return new Response(JSON.stringify({ id: 'test-completion', created: 1, model: request.model, object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: 'Use Report Problem to send the details.' }, finish_reason: 'stop', logprobs: null }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  assert.equal(await assistant.generateAssistantReply({ id: 'citizen-a', role: 'citizen' }, [], 'actual details'), 'Use Report Problem to send the details.');

  global.fetch = async () => new Response(JSON.stringify({ choices: [] }), { status: 200 });
  await assert.rejects(() => assistant.generateAssistantReply({ id: 'citizen-a', role: 'citizen' }, [], 'hello'), (error) => error.kind === 'invalid_response');

  global.fetch = async () => new Response('{}', { status: 403 });
  await assert.rejects(() => assistant.generateAssistantReply({ id: 'citizen-a', role: 'citizen' }, [], 'hello'), (error) => error.kind === 'provider_rejected' && error.providerStatus === 403);

  global.fetch = async () => new Response('{}', { status: 429 });
  await assert.rejects(() => assistant.generateAssistantReply({ id: 'citizen-a', role: 'citizen' }, [], 'hello'), (error) => error.kind === 'rate_limited' && error.providerStatus === 429);

  global.fetch = async () => new Response('{}', { status: 404 });
  await assert.rejects(() => assistant.generateAssistantReply({ id: 'citizen-a', role: 'citizen' }, [], 'hello'), (error) => error.kind === 'model_unavailable' && error.providerStatus === 404);

  global.fetch = async () => { throw Object.assign(new Error('network unavailable'), { code: 'ECONNRESET' }); };
  await assert.rejects(() => assistant.generateAssistantReply({ id: 'citizen-a', role: 'citizen' }, [], 'hello'), (error) => error.kind === 'provider_unavailable');

  global.fetch = async () => { throw Object.assign(new Error('request timeout'), { name: 'TimeoutError' }); };
  await assert.rejects(() => assistant.generateAssistantReply({ id: 'citizen-a', role: 'citizen' }, [], 'hello'), (error) => error.kind === 'timeout');
});

test('assistant rejects missing Groq configuration without making a request', async (t) => {
  const original = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  t.after(() => { if (original !== undefined) process.env.GROQ_API_KEY = original; });
  await assert.rejects(() => assistant.generateAssistantReply({ id: 'citizen-a', role: 'citizen' }, [], 'hello'), (error) => error.kind === 'not_configured');
});
