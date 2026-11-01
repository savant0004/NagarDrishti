const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeUploadedImage, validateImageContent } = require('../src/services/aiVisionService');

const validResult = {
  detected: true,
  category: 'Pothole',
  description: 'A visible depression in the road surface.',
  severity: 'Medium',
  severityExplanation: 'The visible damage is localized and has no clear scale reference.',
  confidence: 0.82,
  evidence: ['A depression interrupts the road surface.'],
  recommendedAction: 'Have municipal staff inspect the road surface.',
  requiresHumanReview: true,
};

test('vision uses the configured multimodal model through the Groq SDK and validates the response', async (t) => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GROQ_API_KEY;
  const originalModel = process.env.GROQ_VISION_MODEL;
  t.after(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.GROQ_VISION_MODEL; else process.env.GROQ_VISION_MODEL = originalModel;
  });
  process.env.GROQ_API_KEY = 'unit-test-only';
  process.env.GROQ_VISION_MODEL = 'qwen/qwen3.8-27b';
  // A signature-only PNG fixture is used only to inspect SDK request construction.
  const image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);
  global.fetch = async (url, options) => {
    assert.match(String(url), /^https:\/\/api\.groq\.com\/openai\/v1\/chat\/completions$/);
    assert.ok(options.headers.get('authorization').startsWith('Bearer '));
    const request = JSON.parse(options.body);
    assert.equal(request.model, 'qwen/qwen3.8-27b');
    assert.deepEqual(request.response_format, { type: 'json_object' });
    assert.equal(request.messages[0].content[1].image_url.url, `data:image/png;base64,${image.toString('base64')}`);
    return new Response(JSON.stringify({ id: 'test-vision', created: 1, model: request.model, object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify(validResult) }, finish_reason: 'stop', logprobs: null }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const result = await analyzeUploadedImage(image, 'image/png');
  assert.equal(result.category, 'Pothole');
  assert.equal(result.modelIdentifier, 'qwen/qwen3.8-27b');
});

test('vision rejects invalid images and maps provider failures without exposing provider bodies', async (t) => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GROQ_API_KEY;
  t.after(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = originalKey;
  });
  process.env.GROQ_API_KEY = 'unit-test-only';
  await assert.rejects(() => analyzeUploadedImage(Buffer.from('not an image'), 'image/png'), (error) => error.kind === 'invalid_image');

  const image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 2]);
  for (const [status, kind] of [[401, 'provider_rejected'], [429, 'rate_limited'], [404, 'model_unavailable'], [503, 'provider_unavailable']]) {
    global.fetch = async () => new Response(JSON.stringify({ error: { message: 'provider private error text' } }), { status });
    await assert.rejects(() => analyzeUploadedImage(image, 'image/png'), (error) => error.kind === kind && error.providerStatus === status);
  }
  global.fetch = async () => { throw Object.assign(new Error('request timeout'), { name: 'TimeoutError' }); };
  const timedImage = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 3]);
  await assert.rejects(() => analyzeUploadedImage(timedImage, 'image/png'), (error) => error.kind === 'timeout');
});
