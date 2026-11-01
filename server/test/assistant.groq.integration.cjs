const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/config');
const { generateAssistantReply, prepareAssistantToolContext } = require('../src/services/aiAssistantService');
const { store } = require('../src/services/store');

test('real Groq assistant handles civic questions, complaint guidance, statistics access, and multi-turn context', async (t) => {
  if (!process.env.GROQ_API_KEY?.trim()) return t.skip('GROQ_API_KEY is not configured.');
  const user = { id: 'integration-citizen', role: 'citizen' };
  const greeting = await generateAssistantReply(user, [], 'Hello. Briefly introduce yourself.');
  assert.ok(greeting.length > 0);
  console.log('Groq text request: received a non-empty English response.');

  const civic = await generateAssistantReply(user, [{ role: 'user', content: 'Hello.' }, { role: 'assistant', content: greeting }], 'Why should residents keep rubbish away from storm drains?');
  assert.ok(civic.length > 0);

  const guidance = await generateAssistantReply(user, [
    { role: 'user', content: 'Hello.' }, { role: 'assistant', content: greeting },
    { role: 'user', content: 'Why should residents keep rubbish away from storm drains?' }, { role: 'assistant', content: civic },
  ], 'How do I report a pothole?');
  assert.ok(guidance.length > 0);
  assert.match(guidance, /report|problem|complaint|submit/i);
  console.log('Groq complaint guidance: received a non-empty English response.');

  const restrictedContext = await prepareAssistantToolContext(user, 'How many complaints are pending?');
  assert.deepEqual(restrictedContext, { tool: 'getComplaintStatistics', result: { access: 'restricted' } });
  const statsReply = await generateAssistantReply(user, [{ role: 'user', content: 'How many complaints are pending?' }], 'Can you provide the pending complaint count?');
  assert.ok(statsReply.length > 0);
  if (store.isReady()) {
    const adminContext = await prepareAssistantToolContext({ id: 'integration-admin', role: 'admin' }, 'How many complaints are pending?');
    assert.equal(adminContext?.tool, 'getComplaintStatistics');
    assert.ok(['demo', 'live'].includes(adminContext.result.dataSource));
  } else {
    console.log('Municipal database-backed assistant statistics: skipped because no ready backend data store is available.');
  }
});
