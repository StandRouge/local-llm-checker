import { rateLimit } from 'express-rate-limit';
import { RATE } from '../config/limits.js';
import { respondError } from './errorHandler.js';

function build(windowMs, limit) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    validate: { trustProxy: false, xForwardedForHeader: false },
    handler: (req, res) => respondError(req, res, 429, 'too_many_requests'),
  });
}

export function createLimiters(overrides = {}) {
  const windowMs = overrides.windowMs ?? RATE.windowMs;
  return {
    global: build(windowMs, overrides.globalMax ?? RATE.globalMax),
    api: build(windowMs, overrides.apiMax ?? RATE.apiMax),
  };
}
