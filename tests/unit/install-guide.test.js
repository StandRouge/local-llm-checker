import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadCatalog } from '../../src/models/Catalog.js';
import { OFFICIAL_COMMANDS, buildGuide, resolveGuideOs } from '../../src/models/InstallGuide.js';

const catalog = loadCatalog();
const OFFICIAL = new Set(Object.values(OFFICIAL_COMMANDS));
const SAFE_COMMAND = /^[A-Za-z0-9 ._:/"\\-]+$/;
const SHELL_METACHARACTERS = /[;&|$`<>(){}]/;

function allCommands(guide) {
  return [
    ...guide.steps.flatMap((step) => step.commands),
    ...guide.verify.map((item) => item.command),
    ...guide.troubleshooting.map((item) => item.command).filter((command) => command !== null),
  ];
}

describe('buildGuide', () => {
  it('hanya menghasilkan perintah dari whitelist aman untuk setiap model dan OS', () => {
    for (const model of catalog.all()) {
      for (const os of ['windows', 'macos', 'linux']) {
        for (const command of allCommands(buildGuide(model, os))) {
          if (OFFICIAL.has(command)) {
            continue;
          }
          assert.match(command, SAFE_COMMAND, command);
          assert.equal(SHELL_METACHARACTERS.test(command), false, command);
        }
      }
    }
  });

  it('perintah resmi dibatasi pada dua baris yang diketahui', () => {
    assert.equal(OFFICIAL.size, 2);
    for (const command of OFFICIAL) {
      assert.ok(command.startsWith('curl -fsSL https://ollama.com/'));
    }
  });

  it('menjalankan model dengan tag yang tepat', () => {
    for (const model of catalog.all()) {
      const commands = allCommands(buildGuide(model, 'linux'));
      assert.ok(commands.includes(`ollama run ${model.ollamaTag}`));
      assert.ok(commands.includes(`ollama rm ${model.ollamaTag}`));
    }
  });

  it('memberi persiapan dan langkah berbeda per OS', () => {
    const model = catalog.findBySlug('qwen3.6-27b');
    const windows = buildGuide(model, 'windows');
    const macos = buildGuide(model, 'macos');
    const linux = buildGuide(model, 'linux');
    assert.ok(windows.prerequisites.some((line) => line.includes('551.61')));
    assert.ok(macos.prerequisites.some((line) => line.includes('Sonoma')));
    assert.ok(linux.steps.some((step) => step.commands.includes(OFFICIAL_COMMANDS.linuxInstall)));
    assert.ok(windows.steps.some((step) => step.title.includes('lokasi model')));
    assert.equal(macos.steps.some((step) => step.title.includes('lokasi model')), false);
  });

  it('menghitung kebutuhan disk dari ukuran model', () => {
    const model = catalog.findBySlug('qwen3.6-27b');
    const windows = buildGuide(model, 'windows');
    assert.ok(windows.prerequisites.some((line) => line.includes('minimal 23 GB')));
  });

  it('selalu menyertakan langkah verifikasi dan pemecahan masalah', () => {
    const guide = buildGuide(catalog.all()[0], 'macos');
    assert.ok(guide.verify.length >= 2);
    assert.ok(guide.troubleshooting.length >= 2);
  });
});

describe('resolveGuideOs', () => {
  it('hanya menerima OS desktop dan menjatuhkan sisanya ke windows', () => {
    assert.equal(resolveGuideOs('linux'), 'linux');
    assert.equal(resolveGuideOs('macos'), 'macos');
    for (const value of ['android', 'ios', 'other', '', null, undefined, 5, {}, ['linux'], '__proto__', 'LINUX']) {
      assert.equal(resolveGuideOs(value), 'windows');
    }
  });
});
