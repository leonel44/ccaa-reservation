const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

const BASE_URL = 'http://127.0.0.1';
let server;
let port;

async function setupTests() {
  const app = createApp();
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      port = server.address().port;
      resolve();
    });
  });
}

function cleanup() {
  return new Promise((resolve) => {
    if (server) server.close(resolve);
    else resolve();
  });
}

test('setup: app starts with hardened middleware', async () => {
  await setupTests();
  assert.ok(server);
  assert.ok(port);
  assert.ok(port > 0);
});

test('auth: POST /api/auth/login — reject invalid email format', async () => {
  const response = await fetch(`${BASE_URL}:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user-invalide', motDePasse: 'Passer123!' }),
  });
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.match(data.message, /invalide/i);
});

test('auth: POST /api/auth/login — reject short password', async () => {
  const response = await fetch(`${BASE_URL}:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@ccaa.cm', motDePasse: 'short' }),
  });
  assert.equal(response.status, 400);
});

test('auth: POST /api/auth/register — reject invalid email format', async () => {
  const response = await fetch(`${BASE_URL}:${port}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nom: 'Test',
      prenom: 'User',
      email: 'user-invalide',
      motDePasse: 'Secure1234!',
      serviceId: 1,
    }),
  });
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.match(data.message, /email invalide/i);
});

test('auth: POST /api/auth/register — reject short password', async () => {
  const response = await fetch(`${BASE_URL}:${port}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nom: 'Test',
      prenom: 'User',
      email: 'test@ccaa.cm',
      motDePasse: 'Short1!',
      serviceId: 1,
    }),
  });
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.match(data.message, /8 caractères/i);
});

test('auth: GET /api/reservations — reject missing auth header', async () => {
  const response = await fetch(`${BASE_URL}:${port}/api/reservations`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(response.status, 401);
  const data = await response.json();
  assert.match(data.message, /authentifi/i);
});

test('security: HTTP headers — disable x-powered-by', async () => {
  const response = await fetch(`${BASE_URL}:${port}/api/health`);
  assert.equal(response.headers.get('x-powered-by'), null);
});

test('security: HTTP headers — enable security headers', async () => {
  const response = await fetch(`${BASE_URL}:${port}/api/health`);
  const headers = response.headers;
  const hasSecurityHeaders = 
    headers.get('content-security-policy') || 
    headers.get('x-frame-options') || 
    headers.get('x-content-type-options') ||
    headers.get('strict-transport-security');
  assert.ok(hasSecurityHeaders, 'At least one security header should be present');
});

test('api: GET /api/health — returns ok', async () => {
  const response = await fetch(`${BASE_URL}:${port}/api/health`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
});

test('api: 404 — returns 404 for unknown route', async () => {
  const response = await fetch(`${BASE_URL}:${port}/api/unknown-route`);
  assert.equal(response.status, 404);
  const data = await response.json();
  assert.match(data.message, /introuvable/i);
});

test('cleanup: close server', async () => {
  await cleanup();
});
