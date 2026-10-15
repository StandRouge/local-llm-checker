export const LIMITS = Object.freeze({
  ramGb: Object.freeze({ min: 1, max: 2048 }),
  vramGb: Object.freeze({ min: 0, max: 512 }),
  cores: Object.freeze({ min: 1, max: 512 }),
  rendererMaxLength: 200,
  bodyBytes: '2kb',
});

export const OS_VALUES = Object.freeze(['windows', 'macos', 'linux', 'android', 'ios', 'other']);

export const GUIDE_OS_VALUES = Object.freeze(['windows', 'macos', 'linux']);

export const POOLS = Object.freeze({
  osReserveGb: 4,
  gpuReserveGb: 0.5,
  unifiedShare: 0.7,
  mobileShare: 0.5,
});

export const OVERHEAD = Object.freeze({
  smallModelGb: 3,
  smallOverheadGb: 0.8,
  mediumModelGb: 10,
  mediumOverheadGb: 1.5,
  largeOverheadGb: 2.5,
});

export const CPU = Object.freeze({
  smoothMaxModelGb: 3,
  denseMaxModelGb: 10,
  smoothMinCores: 4,
  denseOffloadMinGpuShare: 0.5,
  mobileMaxModelGb: 3,
});

export const RATE = Object.freeze({
  windowMs: 60_000,
  globalMax: 240,
  apiMax: 40,
});
