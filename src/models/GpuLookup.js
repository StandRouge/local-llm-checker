import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'gpus.json');
const LAPTOP_MARKER = /laptop|max-q|mobile/;
const AMD_INTEGRATED = /radeon(?:\(tm\))? (?:graphics|\d{3}m)|vega \d/;
const INTEL_INTEGRATED = /uhd|iris|hd graphics|intel\(r\) graphics|xe graphics/;

function detectVendor(text) {
  if (text.includes('nvidia') || text.includes('geforce')) {
    return 'nvidia';
  }
  if (text.includes('apple')) {
    return 'apple';
  }
  if (text.includes('amd') || text.includes('radeon')) {
    return 'amd';
  }
  if (text.includes('intel')) {
    return 'intel';
  }
  return 'unknown';
}

export class GpuLookup {
  #entries;

  constructor(raw) {
    if (!Array.isArray(raw?.gpus)) {
      throw new TypeError('Data GPU tidak valid');
    }
    this.#entries = Object.freeze(
      [...raw.gpus].sort((a, b) => b.pattern.length - a.pattern.length).map((entry) => Object.freeze({ ...entry })),
    );
  }

  resolve(renderer) {
    const text = String(renderer).toLowerCase();
    const vendor = detectVendor(text);
    const laptop = LAPTOP_MARKER.test(text);
    const unified = vendor === 'apple';
    const entry = this.#entries.find((item) => text.includes(item.pattern)) ?? null;
    let vramGb = null;
    if (entry !== null) {
      vramGb = laptop && entry.laptopVramGb !== null ? entry.laptopVramGb : entry.vramGb;
    }
    const integrated =
      entry === null &&
      !unified &&
      ((vendor === 'intel' && INTEL_INTEGRATED.test(text)) || (vendor === 'amd' && AMD_INTEGRATED.test(text)));
    return Object.freeze({
      vendor,
      vramGb,
      laptop,
      unified,
      integrated,
      known: entry !== null,
    });
  }
}

export function loadGpuLookup(file = DATA_FILE) {
  return new GpuLookup(JSON.parse(readFileSync(file, 'utf8')));
}
