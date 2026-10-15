const DISALLOWED_RENDERER_CHARS = /[^A-Za-z0-9 ._,()/:@+[\]-]/g;
const MAX_RENDERER_LENGTH = 200;

function sanitizeRenderer(value) {
  return String(value).replace(DISALLOWED_RENDERER_CHARS, '').trim().slice(0, MAX_RENDERER_LENGTH);
}

function detectOs() {
  const hint = navigator.userAgentData?.platform ?? '';
  const platform = `${hint} ${navigator.platform ?? ''}`.toLowerCase();
  const agent = (navigator.userAgent ?? '').toLowerCase();
  if (/iphone|ipad|ipod/.test(agent) || (platform.includes('mac') && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (agent.includes('android') || platform.includes('android')) {
    return 'android';
  }
  if (platform.includes('win')) {
    return 'windows';
  }
  if (platform.includes('mac')) {
    return 'macos';
  }
  if (platform.includes('linux') || platform.includes('cros')) {
    return 'linux';
  }
  return 'other';
}

function readWebGlRenderer() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) {
      return null;
    }
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    const value = extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return typeof value === 'string' && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

async function readWebGpuRenderer() {
  try {
    if (!navigator.gpu) {
      return null;
    }
    const adapter = await navigator.gpu.requestAdapter();
    const info = adapter?.info;
    if (!info) {
      return null;
    }
    const value = [info.vendor, info.description || info.device || info.architecture].filter(Boolean).join(' ');
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export async function detectSpecs() {
  const reportedRam = typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : null;
  const cores = Number.isInteger(navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : null;
  const renderer = readWebGlRenderer() ?? (await readWebGpuRenderer()) ?? '';
  return {
    cores,
    reportedRam,
    ramMayBeCapped: reportedRam !== null && reportedRam >= 8,
    os: detectOs(),
    gpuRenderer: sanitizeRenderer(renderer),
    webgpu: Boolean(navigator.gpu),
  };
}
