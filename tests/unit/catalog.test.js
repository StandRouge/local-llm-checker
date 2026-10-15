import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Catalog, loadCatalog } from '../../src/models/Catalog.js';
import { GpuLookup, loadGpuLookup } from '../../src/models/GpuLookup.js';

function rawModel(overrides = {}) {
  return {
    ollamaTag: 'demo:1b',
    name: 'Demo',
    family: 'Demo',
    parameterLabel: '1B',
    moe: false,
    sizeGb: 1,
    contextK: 8,
    inputs: ['text'],
    capabilities: ['ringan'],
    license: null,
    summary: 'Ringkasan',
    ...overrides,
  };
}

function build(models) {
  return new Catalog({ verifiedAt: '2026-10-13', source: 'x', models });
}

describe('Catalog', () => {
  const catalog = loadCatalog();

  it('memuat seluruh model dengan slug unik dan aman', () => {
    const slugs = catalog.all().map((item) => item.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    assert.ok(slugs.length >= 15);
    for (const slug of slugs) {
      assert.match(slug, /^[a-z0-9][a-z0-9.-]{0,80}$/);
    }
  });

  it('menyimpan tag Ollama dengan format aman', () => {
    for (const item of catalog.all()) {
      assert.match(item.ollamaTag, /^[a-z0-9][a-z0-9._-]{0,40}:[a-z0-9][a-z0-9._-]{0,40}$/);
      assert.ok(item.sourceUrl.startsWith('https://ollama.com/library/'));
    }
  });

  it('seluruh data bernilai masuk akal dan beku', () => {
    for (const item of catalog.all()) {
      assert.ok(item.sizeGb > 0 && item.sizeGb < 1000);
      assert.ok(item.contextK >= 8);
      assert.equal(Object.isFrozen(item), true);
    }
    assert.throws(() => {
      'use strict';
      catalog.all()[0].name = 'diubah';
    });
  });

  it('menemukan model berdasarkan slug', () => {
    assert.equal(catalog.findBySlug('qwen3.6-27b').ollamaTag, 'qwen3.6:27b');
  });

  it('menolak slug yang tidak valid atau berbahaya', () => {
    const bad = [null, undefined, 5, {}, [], '', '../etc/passwd', '__proto__', 'constructor', 'toString', 'a b', 'QWEN', '%00', 'x'.repeat(200), 'qwen3.6-27b/../x'];
    for (const value of bad) {
      assert.equal(catalog.findBySlug(value), null, JSON.stringify(value));
    }
  });

  it('menolak data katalog yang rusak', () => {
    assert.throws(() => build([]));
    assert.throws(() => build([rawModel({ ollamaTag: 'demo;rm -rf:1b' })]));
    assert.throws(() => build([rawModel({ ollamaTag: 'demo' })]));
    assert.throws(() => build([rawModel({ sizeGb: -1 })]));
    assert.throws(() => build([rawModel({ inputs: ['video'] })]));
    assert.throws(() => build([rawModel({ capabilities: ['hack'] })]));
    assert.throws(() => build([rawModel({ moe: 'ya' })]));
    assert.throws(() => build([rawModel(), rawModel()]));
  });
});

describe('GpuLookup', () => {
  const lookup = loadGpuLookup();

  it('mengenali laptop GPU dan memakai VRAM varian laptop', () => {
    const result = lookup.resolve('ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11 vs_5_0 ps_5_0, D3D11)');
    assert.equal(result.vendor, 'nvidia');
    assert.equal(result.vramGb, 8);
    assert.equal(result.laptop, true);
    assert.equal(result.known, true);
    assert.equal(lookup.resolve('NVIDIA GeForce RTX 3060 Laptop GPU').vramGb, 6);
    assert.equal(lookup.resolve('NVIDIA GeForce RTX 3060').vramGb, 12);
  });

  it('memilih pola paling spesifik', () => {
    assert.equal(lookup.resolve('NVIDIA GeForce RTX 4070 Ti SUPER').vramGb, 16);
    assert.equal(lookup.resolve('NVIDIA GeForce RTX 4070 Ti').vramGb, 12);
    assert.equal(lookup.resolve('NVIDIA GeForce RTX 3060 Ti').vramGb, 8);
    assert.equal(lookup.resolve('AMD Radeon RX 7600 XT').vramGb, 16);
    assert.equal(lookup.resolve('AMD Radeon RX 7600').vramGb, 8);
  });

  it('mengenali Apple sebagai memori terpadu', () => {
    const result = lookup.resolve('Apple M2 Pro');
    assert.equal(result.unified, true);
    assert.equal(result.vramGb, null);
  });

  it('mengenali GPU terintegrasi dan GPU tak dikenal', () => {
    assert.equal(lookup.resolve('Intel(R) UHD Graphics 630').integrated, true);
    assert.equal(lookup.resolve('AMD Radeon(TM) Graphics').integrated, true);
    const unknown = lookup.resolve('Mystery Device 9000');
    assert.equal(unknown.vendor, 'unknown');
    assert.equal(unknown.vramGb, null);
    assert.equal(unknown.known, false);
  });

  it('menolak data GPU yang rusak', () => {
    assert.throws(() => new GpuLookup({}));
  });
});
