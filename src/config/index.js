const HOST_PATTERN = /^[a-zA-Z0-9.:-]{1,253}$/;

const HOSTNAME_PATTERN = /^(?:[a-z0-9-]{1,63}(?:\.[a-z0-9-]{1,63})*|\[[0-9a-f:]{2,45}\])$/;
const DEFAULT_ALLOWED_HOSTS = Object.freeze(['localhost', '127.0.0.1', '[::1]']);

function parseAllowedHosts(value) {
  if (typeof value !== 'string' || value === '') {
    return DEFAULT_ALLOWED_HOSTS;
  }
  const items = value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => HOSTNAME_PATTERN.test(item));
  return items.length > 0 ? Object.freeze(items) : DEFAULT_ALLOWED_HOSTS;
}

function toInt(value, fallback, min, max) {
  if (typeof value !== 'string' || !/^\d{1,5}$/.test(value)) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return parsed >= min && parsed <= max ? parsed : fallback;
}

function platformHosts(env) {
  return [env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL]
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => HOSTNAME_PATTERN.test(item));
}

export function loadConfig(env = process.env) {
  const hops = toInt(env.TRUST_PROXY, env.VERCEL === '1' ? 1 : 0, 0, 10);
  return Object.freeze({
    env: env.NODE_ENV === 'production' ? 'production' : 'development',
    host: typeof env.HOST === 'string' && HOST_PATTERN.test(env.HOST) ? env.HOST : '127.0.0.1',
    port: toInt(env.PORT, 3000, 0, 65535),
    trustProxy: hops === 0 ? false : hops,
    allowLan: env.ALLOW_LAN === '1',
    allowedHosts: Object.freeze([...new Set([...parseAllowedHosts(env.ALLOWED_HOSTS), ...platformHosts(env)])]),
  });
}
