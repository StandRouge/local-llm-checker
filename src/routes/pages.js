import { Router } from 'express';

export function createPageRouter({ homeController, modelController }) {
  const router = Router();
  router.get('/', homeController.index);
  router.get('/models', modelController.list);
  router.get('/models/:slug', modelController.show);
  router.get('/healthz', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ status: 'ok' });
  });
  return router;
}
