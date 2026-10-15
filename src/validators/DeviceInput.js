import { LIMITS, OS_VALUES } from '../config/limits.js';

const DEVICE_KEYS = new Set(['ramGb', 'vramGb', 'cores', 'os', 'unifiedMemory', 'gpuRenderer']);
const GPU_KEYS = new Set(['renderer']);
const RENDERER_PATTERN = /^[A-Za-z0-9 ._,()/:@+[\]-]*$/;
const QUERY_NUMBER = /^\d{1,4}(?:\.\d{1,2})?$/;

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasUnknownKeys(input, allowed) {
  return Reflect.ownKeys(input).some((key) => typeof key !== 'string' || !allowed.has(key));
}

function readNumber(input, key, rule, errors) {
  const present = Object.hasOwn(input, key) && input[key] !== null && input[key] !== undefined;
  if (!present) {
    if (!rule.optional) {
      errors.push(`${key} wajib diisi`);
    }
    return null;
  }
  const value = input[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${key} harus berupa angka`);
    return null;
  }
  if (rule.integer && !Number.isInteger(value)) {
    errors.push(`${key} harus berupa bilangan bulat`);
    return null;
  }
  if (value < rule.min || value > rule.max) {
    errors.push(`${key} di luar rentang yang diizinkan`);
    return null;
  }
  return Math.round(value * 100) / 100;
}

function readRenderer(value, key, errors) {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value !== 'string') {
    errors.push(`${key} harus berupa teks`);
    return '';
  }
  if (value.length > LIMITS.rendererMaxLength || !RENDERER_PATTERN.test(value)) {
    errors.push(`${key} tidak valid`);
    return '';
  }
  return value.trim();
}

export function validateDevice(input) {
  if (!isPlainObject(input)) {
    return { valid: false, errors: ['body harus berupa objek JSON'], value: null };
  }
  if (hasUnknownKeys(input, DEVICE_KEYS)) {
    return { valid: false, errors: ['terdapat properti yang tidak dikenal'], value: null };
  }
  const errors = [];
  const ramGb = readNumber(input, 'ramGb', { ...LIMITS.ramGb }, errors);
  const vramGb = readNumber(input, 'vramGb', { ...LIMITS.vramGb, optional: true }, errors);
  const cores = readNumber(input, 'cores', { ...LIMITS.cores, integer: true }, errors);
  let os = null;
  if (typeof input.os === 'string' && OS_VALUES.includes(input.os)) {
    os = input.os;
  } else {
    errors.push('os tidak valid');
  }
  let unifiedMemory = false;
  if (Object.hasOwn(input, 'unifiedMemory') && input.unifiedMemory !== null) {
    if (typeof input.unifiedMemory === 'boolean') {
      unifiedMemory = input.unifiedMemory;
    } else {
      errors.push('unifiedMemory harus berupa boolean');
    }
  }
  const gpuRenderer = readRenderer(input.gpuRenderer, 'gpuRenderer', errors);
  if (errors.length > 0) {
    return { valid: false, errors, value: null };
  }
  return {
    valid: true,
    errors: [],
    value: Object.freeze({ ramGb, vramGb, cores, os, unifiedMemory, gpuRenderer }),
  };
}

export function validateGpuLookup(input) {
  if (!isPlainObject(input)) {
    return { valid: false, errors: ['body harus berupa objek JSON'], value: null };
  }
  if (hasUnknownKeys(input, GPU_KEYS)) {
    return { valid: false, errors: ['terdapat properti yang tidak dikenal'], value: null };
  }
  const errors = [];
  const renderer = readRenderer(input.renderer, 'renderer', errors);
  if (errors.length > 0) {
    return { valid: false, errors, value: null };
  }
  return { valid: true, errors: [], value: Object.freeze({ renderer }) };
}

function readQueryString(query, key) {
  const value = query[key];
  return typeof value === 'string' ? value : undefined;
}

export function parseDeviceQuery(query) {
  const fields = { ram: 'ramGb', vram: 'vramGb', cores: 'cores', os: 'os', unified: 'unifiedMemory' };
  const hasAny = Object.keys(fields).some((key) => query[key] !== undefined);
  if (!hasAny) {
    return { present: false, valid: false, value: null };
  }
  const candidate = {};
  for (const key of ['ram', 'vram', 'cores']) {
    const raw = readQueryString(query, key);
    if (raw === undefined) {
      continue;
    }
    if (!QUERY_NUMBER.test(raw)) {
      return { present: true, valid: false, value: null };
    }
    candidate[fields[key]] = Number(raw);
  }
  const os = readQueryString(query, 'os');
  if (os !== undefined) {
    candidate.os = os;
  }
  const unified = readQueryString(query, 'unified');
  if (unified !== undefined) {
    if (unified !== '0' && unified !== '1') {
      return { present: true, valid: false, value: null };
    }
    candidate.unifiedMemory = unified === '1';
  }
  const result = validateDevice(candidate);
  return { present: true, valid: result.valid, value: result.value };
}

export function deviceToQuery(device, guideOs) {
  const params = new URLSearchParams();
  params.set('ram', String(device.ramGb));
  if (device.vramGb !== null && device.vramGb !== undefined) {
    params.set('vram', String(device.vramGb));
  }
  params.set('cores', String(device.cores));
  params.set('os', guideOs ?? device.os);
  params.set('unified', device.unifiedMemory ? '1' : '0');
  return params.toString();
}
