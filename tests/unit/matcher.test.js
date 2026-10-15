import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadCatalog } from '../../src/models/Catalog.js';
import { DeviceProfile } from '../../src/models/DeviceProfile.js';
import { evaluate, rank, requiredGb } from '../../src/models/Matcher.js';

const catalog = loadCatalog();

function verdictOf(profile, slug) {
  return evaluate(profile, catalog.findBySlug(slug));
}

function device(overrides) {
  return new DeviceProfile({ ramGb: 16, vramGb: null, cores: 8, os: 'windows', unifiedMemory: false, ...overrides });
}

describe('requiredGb', () => {
  it('menambahkan overhead sesuai ukuran model', () => {
    assert.equal(requiredGb({ sizeGb: 1.3 }), 2.1);
    assert.equal(requiredGb({ sizeGb: 7.6 }), 9.1);
    assert.equal(requiredGb({ sizeGb: 14 }), 16.5);
  });
});

describe('laptop RAM 16 GB dengan GPU 8 GB', () => {
  const profile = device({ ramGb: 16, vramGb: 8 });

  it('model kecil muat penuh di GPU', () => {
    const result = verdictOf(profile, 'llama3.2-1b');
    assert.equal(result.verdict, 'smooth');
    assert.equal(result.reason, 'fits_gpu');
  });

  it('model dense 9B memakai offload parsial', () => {
    const result = verdictOf(profile, 'qwen3.5-9b');
    assert.equal(result.verdict, 'usable');
    assert.equal(result.reason, 'offload_dense');
  });

  it('model MoE 20B masih layak dengan offload ke RAM', () => {
    const result = verdictOf(profile, 'gpt-oss-20b');
    assert.equal(result.verdict, 'usable');
    assert.equal(result.reason, 'offload_moe');
  });

  it('model 27B dan 120B tidak disarankan', () => {
    assert.equal(verdictOf(profile, 'qwen3.8-27b').verdict, 'unsupported');
    assert.equal(verdictOf(profile, 'gpt-oss-120b').verdict, 'unsupported');
  });
});

describe('perangkat tanpa GPU', () => {
  it('RAM 8 GB hanya cocok untuk model kecil', () => {
    const profile = device({ ramGb: 8, cores: 4 });
    assert.equal(verdictOf(profile, 'llama3.2-1b').verdict, 'smooth');
    assert.equal(verdictOf(profile, 'phi4-mini-3.8b').verdict, 'smooth');
    assert.equal(verdictOf(profile, 'qwen3.5-4b').verdict, 'unsupported');
  });

  it('CPU kurang dari 4 core menurunkan kelas model kecil', () => {
    const result = verdictOf(device({ ramGb: 8, cores: 2 }), 'llama3.2-1b');
    assert.equal(result.verdict, 'usable');
    assert.equal(result.reason, 'cpu_dense');
  });

  it('model dense besar terlalu lambat walau muat di RAM', () => {
    const result = verdictOf(device({ ramGb: 32, cores: 16 }), 'qwen3.8-27b');
    assert.equal(result.verdict, 'unsupported');
    assert.equal(result.reason, 'too_slow_cpu');
  });

  it('model MoE berjalan di CPU bila RAM cukup', () => {
    const result = verdictOf(device({ ramGb: 32, cores: 16 }), 'gpt-oss-20b');
    assert.equal(result.verdict, 'usable');
    assert.equal(result.reason, 'cpu_moe');
  });
});

describe('GPU kecil dengan RAM besar', () => {
  it('offload dense ditolak bila porsi GPU kurang dari separuh', () => {
    const result = verdictOf(device({ ramGb: 32, vramGb: 4 }), 'qwen3.5-9b');
    assert.equal(result.verdict, 'usable');
    assert.equal(result.reason, 'cpu_dense');
  });
});

describe('memori terpadu Apple Silicon', () => {
  const profile = device({ ramGb: 32, unifiedMemory: true, os: 'macos' });

  it('memakai 70 persen memori sebagai kolam efektif', () => {
    assert.equal(profile.unifiedPoolGb, 22.4);
  });

  it('batas kolam diterapkan tepat', () => {
    assert.equal(verdictOf(profile, 'qwen3.6-27b').verdict, 'smooth');
    assert.equal(verdictOf(profile, 'gemma4-31b').verdict, 'unsupported');
    assert.equal(verdictOf(profile, 'qwen3.6-35b').verdict, 'unsupported');
  });
});

describe('workstation GPU 24 GB dan RAM 64 GB', () => {
  const profile = device({ ramGb: 64, vramGb: 24, cores: 16 });

  it('model 31B muat di GPU', () => {
    assert.equal(verdictOf(profile, 'gemma4-31b').verdict, 'smooth');
  });

  it('model MoE besar memakai offload ke RAM', () => {
    assert.equal(verdictOf(profile, 'qwen3.6-35b').reason, 'offload_moe');
    assert.equal(verdictOf(profile, 'gpt-oss-120b').reason, 'offload_moe');
  });
});

describe('perangkat seluler', () => {
  it('hanya model sangat kecil yang bisa dicoba', () => {
    const profile = device({ ramGb: 8, os: 'android' });
    assert.equal(verdictOf(profile, 'llama3.2-1b').verdict, 'usable');
    assert.equal(verdictOf(profile, 'qwen3.5-4b').verdict, 'unsupported');
  });
});

describe('rank', () => {
  it('mengurutkan berdasarkan kelas lalu ukuran terbesar', () => {
    const { results, summary } = rank(device({ ramGb: 64, vramGb: 24, cores: 16 }), catalog.all());
    const order = { smooth: 0, usable: 1, unsupported: 2 };
    for (let index = 1; index < results.length; index += 1) {
      const previous = results[index - 1];
      const current = results[index];
      assert.ok(order[previous.verdict] <= order[current.verdict]);
      if (previous.verdict === current.verdict) {
        assert.ok(previous.sizeGb >= current.sizeGb);
      }
    }
    assert.equal(summary.smooth + summary.usable + summary.unsupported, catalog.all().length);
  });

  it('selalu menyertakan catatan dan label dalam bahasa Indonesia', () => {
    const { results } = rank(device({}), catalog.all());
    for (const item of results) {
      assert.equal(typeof item.note, 'string');
      assert.ok(item.note.length > 10);
      assert.equal(typeof item.verdictLabel, 'string');
    }
  });
});
