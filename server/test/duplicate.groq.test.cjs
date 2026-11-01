const test = require('node:test');
const assert = require('node:assert/strict');
const { assessPossibleDuplicates } = require('../src/services/aiDuplicateService');

test('AI duplicate review uses minimal redacted evidence and returns only a suggestion', async (t) => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GROQ_API_KEY;
  const originalModel = process.env.GROQ_MODEL;
  t.after(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.GROQ_MODEL; else process.env.GROQ_MODEL = originalModel;
  });
  process.env.GROQ_API_KEY = 'unit-test-placeholder';
  process.env.GROQ_MODEL = 'openai/gpt-oss-120b';
  global.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    assert.equal(request.model, 'openai/gpt-oss-120b');
    assert.equal(request.response_format.type, 'json_object');
    const evidence = JSON.parse(request.messages[1].content);
    assert.equal(evidence.newComplaint.description.includes('citizen@example.com'), false);
    assert.equal(evidence.newComplaint.description.includes('555-123-4567'), false);
    assert.equal(JSON.stringify(evidence).includes('ST-2026-0123456789ABCDEF'), false);
    assert.equal(JSON.stringify(evidence).includes('reportId'), false);
    assert.equal(JSON.stringify(evidence).includes('latitude'), false);
    assert.match(request.messages[0].content, /suggestion only/);
    return new Response(JSON.stringify({ id: 'test-duplicate', created: 1, model: request.model, object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify({ assessment: 'possible_match' }) }, finish_reason: 'stop', logprobs: null }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const review = await assessPossibleDuplicates([
    { category: 'Pothole', description: 'Pothole at 12.971598, 77.594566 email citizen@example.com phone 555-123-4567', distanceMeters: 0, ageHours: 0, textSimilarity: 1, imageHashMatch: false },
    { category: 'Pothole', description: 'Same pothole ST-2026-0123456789ABCDEF', distanceMeters: 24, ageHours: 4, textSimilarity: 0.7, imageHashMatch: false },
  ]);
  assert.equal(review, 'possible_match');
});

test('AI duplicate review degrades to unavailable without blocking separate complaints', async (t) => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GROQ_API_KEY;
  t.after(() => { global.fetch = originalFetch; if (originalKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = originalKey; });
  process.env.GROQ_API_KEY = 'unit-test-placeholder';
  global.fetch = async () => new Response('{}', { status: 401 });
  const review = await assessPossibleDuplicates([
    { category: 'Road Damage', description: 'Cracked road', distanceMeters: 20, ageHours: 4, textSimilarity: 0.4, imageHashMatch: false },
    { category: 'Road Damage', description: 'Road crack', distanceMeters: 30, ageHours: 5, textSimilarity: 0.3, imageHashMatch: false },
  ]);
  assert.equal(review, 'unavailable');
});
