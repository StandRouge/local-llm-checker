import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deviceToQuery, parseDeviceQuery, validateDevice, validateGpuLookup } from '../../src/validators/DeviceInput.js';

const BASE = { ramGb: 16, vramGb: 8, cores: 8, os: 'windows', unifiedMemory: false, gpuRenderer: 'NVIDIA GeForce RTX 4060' };

describe('validateDevice', () => {
  it('menerima input yang valid', () => {
    const result = validateDevice(BASE);
    assert.equal(result.valid, true);
    assert.equal(result.value.ramGb, 16);
    assert.equal(Object.isFrozen(result.value), true);
  });

  it('menerima vramGb kosong dan menjadikannya null', () => {
    const { vramGb, ...rest } = BASE;
    const result = validateDevice(rest);
    assert.equal(result.valid, true);
    assert.equal(result.value.vramGb, null);
  });

  it('menolak bentuk body yang bukan objek biasa', () => {
    for (const value of [null, undefined, [], 'teks', 5, true, () => {}, new Map(), new Date()]) {
      assert.equal(validateDevice(value).valid, false);
    }
  });

  it('menolak properti tak dikenal termasuk kunci prototype', () => {
    assert.equal(validateDevice({ ...BASE, admin: true }).valid, false);
    assert.equal(validateDevice(JSON.parse('{"__proto__":{"x":1},"ramGb":16,"cores":8,"os":"linux"}')).valid, false);
    assert.equal(validateDevice({ ...BASE, constructor: { prototype: {} } }).valid, false);
    assert.equal(validateDevice({ ...BASE, [Symbol('x')]: 1 }).valid, false);
  });

  it('menolak angka yang tidak valid', () => {
    const bad = [0, -1, 0.5, 2049, 1e9, Number.NaN, Infinity, -Infinity, '16', true, {}, [], null];
    for (const ramGb of bad) {
      assert.equal(validateDevice({ ...BASE, ramGb }).valid, false, `ramGb=${String(ramGb)}`);
    }
    for (const cores of [0, 1.5, 513, '8', null, Number.NaN]) {
      assert.equal(validateDevice({ ...BASE, cores }).valid, false, `cores=${String(cores)}`);
    }
    for (const vramGb of [-1, 513, '8', true, Number.NaN]) {
      assert.equal(validateDevice({ ...BASE, vramGb }).valid, false, `vramGb=${String(vramGb)}`);
    }
  });

  it('menolak os dan boolean yang tidak valid', () => {
    for (const os of ['plan9', '', 5, null, undefined, 'Windows', '__proto__']) {
      assert.equal(validateDevice({ ...BASE, os }).valid, false);
    }
    for (const unifiedMemory of ['yes', 1, 0, {}]) {
      assert.equal(validateDevice({ ...BASE, unifiedMemory }).valid, false);
    }
  });

  it('menolak renderer GPU dengan karakter berbahaya atau terlalu panjang', () => {
    const payloads = ['<script>alert(1)</script>', '"><img src=x onerror=1>', "'; DROP TABLE x;--", '`id`', '$(id)', '{{7*7}}', 'a\nb', 'a'.repeat(201), 'ünïcode', '\u0000'];
    for (const gpuRenderer of payloads) {
      assert.equal(validateDevice({ ...BASE, gpuRenderer }).valid, false, JSON.stringify(gpuRenderer));
    }
    assert.equal(validateDevice({ ...BASE, gpuRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11 vs_5_0 ps_5_0, D3D11)' }).valid, true);
    assert.equal(validateDevice({ ...BASE, gpuRenderer: 'a'.repeat(200) }).valid, true);
  });

  it('tidak pernah memantulkan input pada pesan error', () => {
    const marker = 'MARKER_XYZ_123';
    const result = validateDevice({ ...BASE, os: marker, gpuRenderer: `<${marker}>` });
    assert.equal(result.valid, false);
    assert.equal(JSON.stringify(result.errors).includes(marker), false);
  });
});

describe('validateGpuLookup', () => {
  it('menerima renderer yang valid dan menolak sisanya', () => {
    assert.equal(validateGpuLookup({ renderer: 'Apple M2' }).valid, true);
    assert.equal(validateGpuLookup({ renderer: '<b>' }).valid, false);
    assert.equal(validateGpuLookup({ renderer: 'x', extra: 1 }).valid, false);
    assert.equal(validateGpuLookup({ renderer: 5 }).valid, false);
    assert.equal(validateGpuLookup(null).valid, false);
  });
});

describe('parseDeviceQuery', () => {
  it('mengabaikan query kosong', () => {
    assert.deepEqual(parseDeviceQuery({}), { present: false, valid: false, value: null });
  });

  it('mengurai query yang valid', () => {
    const result = parseDeviceQuery({ ram: '16', vram: '8', cores: '8', os: 'linux', unified: '0' });
    assert.equal(result.valid, true);
    assert.equal(result.value.ramGb, 16);
    assert.equal(result.value.os, 'linux');
  });

  it('menolak nilai non numerik, array, dan objek', () => {
    const bad = [
      { ram: '16abc', cores: '8', os: 'linux' },
      { ram: ['16', '32'], cores: '8', os: 'linux' },
      { ram: '16', cores: '8', os: ['linux'] },
      { ram: '1e3', cores: '8', os: 'linux' },
      { ram: '-5', cores: '8', os: 'linux' },
      { ram: '16', cores: '8', os: 'linux', unified: '2' },
      { ram: '99999', cores: '8', os: 'linux' },
      { ram: '16', cores: '8', os: '<script>' },
    ];
    for (const query of bad) {
      assert.equal(parseDeviceQuery(query).valid, false, JSON.stringify(query));
    }
  });

  it('membangun query string yang aman dari hasil validasi', () => {
    const query = deviceToQuery({ ramGb: 16, vramGb: 8, cores: 8, os: 'windows', unifiedMemory: true }, 'linux');
    assert.equal(query, 'ram=16&vram=8&cores=8&os=linux&unified=1');
  });
});
