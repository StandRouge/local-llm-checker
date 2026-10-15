import express, { Router } from 'express';
import { LIMITS } from '../config/limits.js';
import { noStore, originGuard, requireJson } from '../middleware/security.js';

export function createApiRouter({ matchController, gpuController }, limiter) {
  const router = Router();
  router.use(noStore);
  router.use(limiter);
  router.use(originGuard);
  router.post(
    '/match',
    requireJson,
    express.json({ limit: LIMITS.bodyBytes, strict: true, type: 'application/json' }),
    matchController.match,
  );
  router.post(
    '/gpu',
    requireJson,
    express.json({ limit: LIMITS.bodyBytes, strict: true, type: 'application/json' }),
    gpuController.resolve,
  );
  return router;
}
