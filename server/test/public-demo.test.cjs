const test = require('node:test');
const assert = require('node:assert/strict');
const issueRouter = require('../src/routes/issueRoutes').default;
const reportRouter = require('../src/routes/reportRoutes').default;
const analyticsRouter = require('../src/routes/analyticsRoutes').default;
const simulationRouter = require('../src/routes/simulationRoutes').default;
const authRouter = require('../src/routes/authRoutes').default;
const assistantRouter = require('../src/routes/assistantRoutes').default;

function route(router, method, path) {
  const layer = router.stack.find((item) => item.route?.path === path && item.route.methods[method]);
  assert.ok(layer, `missing ${method.toUpperCase()} ${path}`);
  return layer.route.stack.map((handler) => handler.name);
}

test('public demo reads are available without opening protected operations', () => {
  assert.deepEqual(route(issueRouter, 'get', '/'), ['optionalAuth', 'getIssues']);
  assert.deepEqual(route(issueRouter, 'get', '/:id'), ['optionalAuth', 'getIssueById']);
  assert.deepEqual(route(analyticsRouter, 'get', '/'), ['optionalAuth', 'getAnalytics']);
  assert.deepEqual(route(reportRouter, 'get', '/:id'), ['optionalAuth', 'getReportById']);
  assert.deepEqual(route(simulationRouter, 'post', '/'), ['<anonymous>', 'runSimulation']);
  assert.deepEqual(route(assistantRouter, 'post', '/public-chat'), ['<anonymous>', 'sendPublicAssistantMessage']);
  const assistantAuthLayer = assistantRouter.stack.findIndex((layer) => layer.name === 'requireAuth');
  const publicChatLayer = assistantRouter.stack.findIndex((layer) => layer.route?.path === '/public-chat');
  const savedChatLayer = assistantRouter.stack.findIndex((layer) => layer.route?.path === '/conversations' && layer.route.methods.get);
  assert.ok(publicChatLayer >= 0 && publicChatLayer < assistantAuthLayer && assistantAuthLayer < savedChatLayer, 'public chat must precede auth while saved conversations remain protected');

  for (const [method, path] of [['post', '/'], ['patch', '/:id'], ['delete', '/:id']]) {
    const handlers = route(issueRouter, method, path);
    assert.equal(handlers[0], 'requireAuth', `${method.toUpperCase()} ${path} must require authentication`);
    assert.ok(handlers.length >= 3, `${method.toUpperCase()} ${path} must include role authorization`);
  }
  for (const [method, path] of [['post', '/'], ['patch', '/:id/link-duplicate'], ['post', '/:id/resolution-evidence']]) {
    assert.equal(route(reportRouter, method, path)[0], 'requireAuth', `${method.toUpperCase()} ${path} must remain authenticated`);
  }
  assert.equal(route(reportRouter, 'get', '/')[0], 'requireAuth', 'full complaint listing must remain staff-only');
  assert.equal(route(authRouter, 'post', '/staff')[0], 'requireAuth', 'staff management must remain authenticated');
});
