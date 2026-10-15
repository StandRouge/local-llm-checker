import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { loadConfig } from '../../src/config/index.js';
import { rawRequest, startServer } from '../helpers/server.js';

describe('host guard', () => {
  let app;

  before(async () => {
    app = await startServer();
  });

  after(async () => {
    await app.close();
  });

  it('menerima host lokal beserta port', async () => {
    for (const host of [`127.0.0.1:${app.port}`, `localhost:${app.port}`, 'LOCALHOST', `[::1]:${app.port}`]) {
      const response = await rawRequest(app.port, { headers: { Host: host } });
      assert.equal(response.status, 200, host);
    }
  });

  it('menolak host asing, injeksi, dan variasi penyamaran dengan 421', async () => {
    const hosts = [
      'evil.com',
      `evil.com:${app.port}`,
      'localhost.evil.com',
      'evil.com#localhost',
      'localhost@evil.com',
      'localhost:99999999',
      'localhost evil.com',
      '<script>alert(1)</script>',
      'localhost,evil.com',
      '',
    ];
    for (const host of hosts) {
      const response = await rawRequest(app.port, { path: '/', headers: { Host: host } });
      assert.equal(response.status, 421, JSON.stringify(host));
      assert.ok(!response.body.includes('<script>alert'), JSON.stringify(host));
    }
  });

  it('menolak host asing juga untuk endpoint API dan berkas statis', async () => {
    for (const path of ['/api/match', '/css/main.css', '/models']) {
      const response = await rawRequest(app.port, { path, headers: { Host: 'evil.com' } });
      assert.equal(response.status, 421, path);
    }
  });
});

describe('konfigurasi ALLOWED_HOSTS', () => {
  it('memakai nilai bawaan lokal saat kosong atau tidak valid', () => {
    const fallback = ['localhost', '127.0.0.1', '[::1]'];
    assert.deepEqual([...loadConfig({}).allowedHosts], fallback);
    assert.deepEqual([...loadConfig({ ALLOWED_HOSTS: '' }).allowedHosts], fallback);
    assert.deepEqual([...loadConfig({ ALLOWED_HOSTS: '*,<x>,a b' }).allowedHosts], fallback);
  });

  it('menerima daftar host valid dan menormalkan huruf kecil', () => {
    const config = loadConfig({ ALLOWED_HOSTS: 'Llm.Example.com, localhost' });
    assert.deepEqual([...config.allowedHosts], ['llm.example.com', 'localhost']);
  });

  it('server menerima host yang diizinkan lewat konfigurasi', async () => {
    const custom = await startServer({ env: { ALLOWED_HOSTS: 'llm.example.com' } });
    try {
      const allowed = await rawRequest(custom.port, { headers: { Host: 'llm.example.com' } });
      const denied = await rawRequest(custom.port, { headers: { Host: `127.0.0.1:${custom.port}` } });
      assert.equal(allowed.status, 200);
      assert.equal(denied.status, 421);
    } finally {
      await custom.close();
    }
  });
});
