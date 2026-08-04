import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const serverRoot = resolve(root, 'server');
const requireFromServer = createRequire(resolve(serverRoot, 'package.json'));
const jwt = requireFromServer('jsonwebtoken');
const port = 3011;
const baseUrl = `http://127.0.0.1:${port}/api`;
const secret = 'petverse-v12-production-smoke-secret-32chars';
let output = '';

const child = spawn(process.execPath, ['dist/main.js'], {
  cwd: serverRoot,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    JWT_SECRET: secret,
    DB_SYNCHRONIZE: 'false',
    ALLOW_TEST_USER_HEADER: 'false',
    CORS_ORIGINS: 'http://localhost:7456',
    WX_APPID: 'v12-smoke-app-id',
    WX_SECRET: 'v12-smoke-app-secret',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
child.stdout.on('data', (chunk) => { output += String(chunk); });
child.stderr.on('data', (chunk) => { output += String(chunk); });

const stop = () => {
  if (!child.killed) child.kill();
};
process.on('exit', stop);
process.on('SIGINT', () => { stop(); process.exit(130); });

async function waitUntilReady() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Production server exited early\n${output}`);
    try {
      const response = await fetch(`${baseUrl}/server-time`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }
  throw new Error(`Production server did not start\n${output}`);
}

async function expectStatus(path, expectedStatus, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  if (response.status !== expectedStatus) {
    throw new Error(`${path}: expected ${expectedStatus}, received ${response.status}: ${await response.text()}`);
  }
  console.log(`PASS ${response.status} ${path}`);
  return response;
}

try {
  await waitUntilReady();
  if (!output.includes(`http://localhost:${port}/api`)) {
    throw new Error(`Startup log does not report the actual port\n${output}`);
  }

  await expectStatus('/user/profile', 401);
  await expectStatus('/auth/login', 401, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ openid: 'spoofed-production-openid' }),
  });

  const hiddenRoutes = [
    '/dev/seed-all',
    '/backend/status',
    '/maintenance/run',
    '/season/settle',
    '/trade/expire',
    '/expedition/dev/complete',
  ];
  for (const path of hiddenRoutes) {
    await expectStatus(path, 404, { method: path.endsWith('status') ? 'GET' : 'POST' });
  }

  const token = jwt.sign({ sub: 3, openid: 'smoke-user' }, secret, { expiresIn: '5m' });
  const profileResponse = await expectStatus('/user/profile', 200, {
    headers: { authorization: `Bearer ${token}`, 'x-user-id': '1' },
  });
  const profile = await profileResponse.json();
  const resolvedUserId = Number(
    profile?.data?.user?.id || profile?.data?.id || profile?.user?.id || profile?.id || 0,
  );
  if (resolvedUserId !== 3) {
    throw new Error(`JWT identity did not override spoofed X-User-Id: ${JSON.stringify(profile)}`);
  }
  console.log('PASS JWT identity is authoritative');
  console.log('V12 production smoke passed');
} finally {
  stop();
  await new Promise((resolveWait) => child.once('exit', resolveWait));
}
