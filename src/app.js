import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { loadConfig } from './config/index.js';
import { LIMITS, OS_VALUES } from './config/limits.js';
import { CAPABILITY_LABELS, INPUT_LABELS, OS_DISPLAY } from './config/messages.js';
import { loadCatalog } from './models/Catalog.js';
import { loadGpuLookup } from './models/GpuLookup.js';
import { HomeController } from './controllers/HomeController.js';
import { ModelController } from './controllers/ModelController.js';
import { MatchController } from './controllers/MatchController.js';
import { GpuController } from './controllers/GpuController.js';
import { createPageRouter } from './routes/pages.js';
import { createApiRouter } from './routes/api.js';
import { hostGuard, methodGuard, securityHeaders } from './middleware/security.js';
import { createLimiters } from './middleware/rateLimiters.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export function createApp({ config = loadConfig(), limits = {}, catalog = loadCatalog(), gpuLookup = loadGpuLookup() } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.set('query parser', 'simple');
  app.set('view engine', 'ejs');
  app.set('views', path.join(ROOT, 'src', 'views'));
  app.set('view cache', config.env === 'production');

  const limiters = createLimiters(limits);

  app.use(hostGuard(config.allowedHosts, config.allowLan));
  app.use(securityHeaders(config));
  app.use((req, res, next) => {
    res.locals.appName = 'Local LLM Checker';
    res.locals.limits = LIMITS;
    res.locals.osOptions = OS_VALUES;
    res.locals.osLabels = OS_DISPLAY;
    res.locals.capabilityLabels = CAPABILITY_LABELS;
    res.locals.inputLabels = INPUT_LABELS;
    next();
  });
  app.use(methodGuard);
  app.use(limiters.global);
  app.use(
    express.static(path.join(ROOT, 'public'), {
      dotfiles: 'ignore',
      index: false,
      redirect: false,
      maxAge: config.env === 'production' ? '1h' : 0,
    }),
  );
  app.use(createPageRouter({ homeController: new HomeController({ catalog }), modelController: new ModelController({ catalog }) }));
  app.use(
    '/api',
    createApiRouter(
      { matchController: new MatchController({ catalog }), gpuController: new GpuController({ gpuLookup }) },
      limiters.api,
    ),
  );
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export default createApp();
