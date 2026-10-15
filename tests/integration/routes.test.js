import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { VALID_DEVICE, postJson, startServer } from '../helpers/server.js';

describe('routes', () => {
  let app;

  before(async () => {
    app = await startServer();
  });

  after(async () => {
    await app.close();
  });

  it('GET / menampilkan form spesifikasi dan memuat script modul', async () => {
    const response = await fetch(`${app.url}/`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.ok(html.includes('id="spec-form"'));
    assert.ok(html.includes('<script type="module" src="/js/main.js"></script>'));
  });

  it('GET /models menampilkan seluruh model', async () => {
    const response = await fetch(`${app.url}/models`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.equal((html.match(/class="card model-card"/g) ?? []).length, 17);
  });

  it('GET /models/:slug menampilkan panduan instalasi', async () => {
    const response = await fetch(`${app.url}/models/qwen3.6-27b`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.ok(html.includes('ollama run qwen3.6:27b'));
    assert.ok(html.includes('Panduan instalasi untuk Windows'));
    assert.ok(html.includes('data-copy-target="cmd-1"'));
  });

  it('tab OS mengganti panduan', async () => {
    const html = await (await fetch(`${app.url}/models/qwen3.6-27b?os=linux`)).text();
    assert.ok(html.includes('Panduan instalasi untuk Linux'));
    assert.ok(html.includes('https://ollama.com/install.sh'));
  });

  it('menampilkan kecocokan bila query perangkat valid', async () => {
    const html = await (await fetch(`${app.url}/models/gpt-oss-20b?ram=16&vram=8&cores=8&os=windows&unified=0`)).text();
    assert.ok(html.includes('Kecocokan dengan perangkat Anda'));
    assert.ok(html.includes('Bisa dijalankan, lebih lambat'));
  });

  it('mengabaikan query perangkat yang tidak valid tanpa error', async () => {
    const response = await fetch(`${app.url}/models/gpt-oss-20b?ram=abc&os=linux`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.equal(html.includes('Kecocokan dengan perangkat Anda'), false);
  });

  it('menangani parameter ganda tanpa crash', async () => {
    const response = await fetch(`${app.url}/models/gpt-oss-20b?ram=1&ram=2&os=linux&os=windows`);
    assert.equal(response.status, 200);
  });

  it('slug tak dikenal menghasilkan 404', async () => {
    const response = await fetch(`${app.url}/models/tidak-ada`);
    assert.equal(response.status, 404);
    assert.match(response.headers.get('content-type'), /text\/html/);
  });

  it('healthz mengembalikan status ok', async () => {
    const response = await fetch(`${app.url}/healthz`);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });

  it('menyajikan aset statis dengan tipe konten yang benar', async () => {
    const css = await fetch(`${app.url}/css/main.css`);
    const js = await fetch(`${app.url}/js/main.js`);
    const icon = await fetch(`${app.url}/favicon.svg`);
    assert.equal(css.status, 200);
    assert.match(css.headers.get('content-type'), /text\/css/);
    assert.equal(js.status, 200);
    assert.match(js.headers.get('content-type'), /javascript/);
    assert.equal(icon.status, 200);
    assert.match(icon.headers.get('content-type'), /svg/);
  });

  it('POST /api/match mengembalikan hasil berperingkat', async () => {
    const response = await postJson(app.url, '/api/match', VALID_DEVICE);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.equal(data.results.length, 17);
    assert.equal(data.summary.smooth + data.summary.usable + data.summary.unsupported, 17);
    assert.equal(data.device.pools.gpuGb, 7.5);
    assert.equal(Object.hasOwn(data.device, 'gpuRenderer'), false);
    assert.equal(data.results[0].verdict, 'smooth');
  });

  it('POST /api/gpu memperkirakan VRAM', async () => {
    const response = await postJson(app.url, '/api/gpu', { renderer: 'NVIDIA GeForce RTX 4090' });
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.vramGb, 24);
    assert.equal(data.vendor, 'nvidia');
  });

  it('endpoint API tak dikenal menghasilkan 404 JSON', async () => {
    const response = await fetch(`${app.url}/api/tidak-ada`);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error, 'not_found');
  });
});
