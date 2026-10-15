import { ERROR_MESSAGES } from '../config/messages.js';

const STATUS_CODES = Object.freeze({
  400: 'bad_request',
  403: 'forbidden_origin',
  404: 'not_found',
  405: 'method_not_allowed',
  413: 'payload_too_large',
  415: 'unsupported_media_type',
  421: 'misdirected_request',
  429: 'too_many_requests',
  500: 'internal_error',
});

export function isApiRequest(req) {
  return req.originalUrl.startsWith('/api/');
}

export function respondError(req, res, status, code) {
  const message = ERROR_MESSAGES[code] ?? ERROR_MESSAGES.internal_error;
  res.status(status);
  res.set('Cache-Control', 'no-store');
  if (isApiRequest(req)) {
    res.json({ error: code, message });
    return;
  }
  res.render('pages/error', { title: 'Terjadi kendala', description: message, status, message, scripts: [] }, (error, html) => {
    if (error) {
      res.type('text/plain').send(message);
      return;
    }
    res.type('html').send(html);
  });
}

export function notFound(req, res) {
  respondError(req, res, 404, 'not_found');
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }
  const raw = Number.isInteger(err?.status) ? err.status : 500;
  const status = Object.hasOwn(STATUS_CODES, raw) ? raw : raw >= 400 && raw < 500 ? 400 : 500;
  respondError(req, res, status, STATUS_CODES[status]);
}
