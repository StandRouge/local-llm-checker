import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import { loadConfig } from '../../src/config/index.js';
import { rawRequest } from '../helpers/server.js';

describe('konfigurasi Vercel', () => {
  it('menambahkan host deployment dan trust proxy otomatis', () => {
    const config = loadConfig({
      VERCEL: '1',
      VERCEL_URL: 'proj-abc123.vercel.app',
      VERCEL_BRANCH_URL: 'proj-git-main-user.vercel.app',
      VERCEL_PROJECT_PRODUCTION_URL: 'proj.vercel.app',
    });
    assert.equal(config.trustProxy, 1);
    for (const host of ['proj-abc123.vercel.app', 'proj-git-main-user.vercel.app', 'proj.vercel.app', 'localhost']) {
      assert.ok(config.allowedHosts.includes(host), host);
    }
  });

  it('mengabaikan nilai host platform yang tidak valid', () => {
    const config = loadConfig({ VERCEL_URL: 'evil.com/<script>', VERCEL_BRANCH_URL: '*.vercel.app' });
    assert.deepEqual([...config.allowedHosts], ['localhost', '127.0.0.1', '[::1]']);
  });

  it('TRUST_PROXY eksplisit mengalahkan nilai bawaan Vercel', () => {
    assert.equal(loadConfig({ VERCEL: '1', TRUST_PROXY: '2' }).trustProxy, 2);
    assert.equal(loadConfig({}).trustProxy, false);
  });

  it('vercel.json merutekan semua permintaan ke fungsi dan menyertakan view serta data', () => {
    const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
    assert.deepEqual(config.rewrites, [{ source: '/(.*)', destination: '/api' }]);
    assert.match(config.functions['api/index.js'].includeFiles, /views/);
    assert.match(config.functions['api/index.js'].includeFiles, /data/);
  });
});

describe('fungsi api/index.js', () => {
  let server;
  let port;

  before(async () => {
    process.env.VERCEL = '1';
    process.env.VERCEL_URL = 'proj-abc123.vercel.app';
    const { default: handler } = await import('../../api/index.js');
    server = http.createServer(handler);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
  });

  after(async () => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_URL;
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  it('melayani halaman untuk host Vercel dan menolak host lain', async () => {
    const ok = await rawRequest(port, { headers: { Host: 'proj-abc123.vercel.app', 'X-Forwarded-For': '203.0.113.9' } });
    const denied = await rawRequest(port, { headers: { Host: 'evil.com' } });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.includes('id="spec-form"'));
    assert.equal(denied.status, 421);
  });

  it('merender halaman detail model', async () => {
    const response = await rawRequest(port, { path: '/models/qwen3.6-27b', headers: { Host: 'proj-abc123.vercel.app' } });
    assert.equal(response.status, 200);
    assert.ok(response.body.includes('ollama run qwen3.6:27b'));
  });
});
