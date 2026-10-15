import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG_PATTERN = /^[a-z0-9][a-z0-9._-]{0,40}:[a-z0-9][a-z0-9._-]{0,40}$/;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9.-]{0,80}$/;
const INPUT_VALUES = new Set(['text', 'image']);
const CAPABILITY_VALUES = new Set(['ringan', 'multimodal', 'coding', 'agent', 'reasoning']);
const DATA_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'models.json');

function deepFreeze(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

function assertText(value, field, max) {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) {
    throw new TypeError(`Katalog: ${field} tidak valid`);
  }
}

function normalize(raw) {
  assertText(raw.ollamaTag, 'ollamaTag', 90);
  if (!TAG_PATTERN.test(raw.ollamaTag)) {
    throw new TypeError('Katalog: format ollamaTag tidak valid');
  }
  assertText(raw.name, 'name', 80);
  assertText(raw.family, 'family', 40);
  assertText(raw.parameterLabel, 'parameterLabel', 30);
  assertText(raw.summary, 'summary', 300);
  if (typeof raw.moe !== 'boolean') {
    throw new TypeError('Katalog: moe harus boolean');
  }
  if (typeof raw.sizeGb !== 'number' || !(raw.sizeGb > 0) || raw.sizeGb > 2048) {
    throw new TypeError('Katalog: sizeGb tidak valid');
  }
  if (!Number.isInteger(raw.contextK) || raw.contextK <= 0) {
    throw new TypeError('Katalog: contextK tidak valid');
  }
  if (!Array.isArray(raw.inputs) || raw.inputs.length === 0 || !raw.inputs.every((v) => INPUT_VALUES.has(v))) {
    throw new TypeError('Katalog: inputs tidak valid');
  }
  if (!Array.isArray(raw.capabilities) || !raw.capabilities.every((v) => CAPABILITY_VALUES.has(v))) {
    throw new TypeError('Katalog: capabilities tidak valid');
  }
  if (raw.license !== null) {
    assertText(raw.license, 'license', 40);
  }
  const [base, variant] = raw.ollamaTag.split(':');
  const slug = `${base}-${variant}`;
  if (!SLUG_PATTERN.test(slug)) {
    throw new TypeError('Katalog: slug tidak valid');
  }
  return {
    slug,
    ollamaTag: raw.ollamaTag,
    name: raw.name,
    family: raw.family,
    parameterLabel: raw.parameterLabel,
    moe: raw.moe,
    sizeGb: raw.sizeGb,
    contextK: raw.contextK,
    inputs: [...raw.inputs],
    capabilities: [...raw.capabilities],
    license: raw.license,
    summary: raw.summary,
    sourceUrl: `https://ollama.com/library/${base}`,
  };
}

export class Catalog {
  #items;
  #bySlug;
  #meta;

  constructor(raw) {
    if (!Array.isArray(raw?.models) || raw.models.length === 0) {
      throw new TypeError('Katalog: daftar model kosong');
    }
    const items = raw.models.map(normalize);
    const bySlug = new Map();
    for (const item of items) {
      if (bySlug.has(item.slug)) {
        throw new TypeError('Katalog: slug duplikat');
      }
      bySlug.set(item.slug, item);
    }
    this.#items = deepFreeze(items);
    this.#bySlug = bySlug;
    this.#meta = Object.freeze({ verifiedAt: String(raw.verifiedAt), source: String(raw.source) });
  }

  all() {
    return this.#items;
  }

  meta() {
    return this.#meta;
  }

  findBySlug(slug) {
    if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) {
      return null;
    }
    return this.#bySlug.get(slug) ?? null;
  }
}

export function loadCatalog(file = DATA_FILE) {
  return new Catalog(JSON.parse(readFileSync(file, 'utf8')));
}
