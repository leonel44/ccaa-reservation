const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('security headers are enabled and x-powered-by is removed', async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-powered-by'), null);
    assert.ok(response.headers.get('x-frame-options') || response.headers.get('content-security-policy'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
