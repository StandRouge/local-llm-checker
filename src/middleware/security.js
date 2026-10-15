import helmet from 'helmet';
import { respondError } from './errorHandler.js';

const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST']);

const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'autoplay=()',
  'camera=()',
  'display-capture=()',
  'geolocation=()',
  'gyroscope=()',
  'magnetometer=()',
  'microphone=()',
  'payment=()',
  'usb=()',
  'interest-cohort=()',
].join(', ');

export function securityHeaders(config) {
  const directives = {
    'default-src': ["'none'"],
    'script-src': ["'self'"],
    'style-src': ["'self'"],
    'img-src': ["'self'"],
    'font-src': ["'self'"],
    'connect-src': ["'self'"],
    'manifest-src': ["'self'"],
    'base-uri': ["'none'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
  };
  if (config.env === 'production') {
    directives['upgrade-insecure-requests'] = [];
  }
  const helmetMiddleware = helmet({
    contentSecurityPolicy: { useDefaults: false, directives },
    crossOriginEmbedderPolicy: { policy: 'require-corp' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'no-referrer' },
    strictTransportSecurity: { maxAge: 63_072_000, includeSubDomains: true },
    frameguard: { action: 'deny' },
  });
  return (req, res, next) => {
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    helmetMiddleware(req, res, next);
  };
}

export function methodGuard(req, res, next) {
  if (!ALLOWED_METHODS.has(req.method)) {
    res.set('Allow', 'GET, HEAD, POST');
    respondError(req, res, 405, 'method_not_allowed');
    return;
  }
  next();
}

const HOST_HEADER = /^(\[[0-9a-fA-F:]{2,45}\]|[A-Za-z0-9.-]{1,253})(?::\d{1,5})?$/;

function isPrivateIpv4(host) {
  const parts = host.split('.');
  if (parts.length !== 4 || !parts.every((part) => /^\d{1,3}$/.test(part))) {
    return false;
  }
  const [a, b, c, d] = parts.map(Number);
  if ([a, b, c, d].some((value) => value > 255)) {
    return false;
  }
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

export function hostGuard(allowedHosts, allowLan = false) {
  const allowed = new Set(allowedHosts);
  return (req, res, next) => {
    const raw = req.headers.host;
    const match = typeof raw === 'string' ? HOST_HEADER.exec(raw) : null;
    const name = match === null ? null : match[1].toLowerCase();
    if (name === null || !(allowed.has(name) || (allowLan && isPrivateIpv4(name)))) {
      respondError(req, res, 421, 'misdirected_request');
      return;
    }
    next();
  };
}

export function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}

export function originGuard(req, res, next) {
  const site = req.get('sec-fetch-site');
  if (site !== undefined && site !== 'same-origin' && site !== 'none') {
    respondError(req, res, 403, 'forbidden_origin');
    return;
  }
  const origin = req.get('origin');
  if (origin !== undefined) {
    let originHost = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (originHost === null || originHost !== req.get('host')) {
      respondError(req, res, 403, 'forbidden_origin');
      return;
    }
  }
  next();
}

export function requireJson(req, res, next) {
  if (!req.is('application/json')) {
    respondError(req, res, 415, 'unsupported_media_type');
    return;
  }
  next();
}
