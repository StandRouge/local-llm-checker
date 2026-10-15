import { createApp } from './app.js';
import { loadConfig } from './config/index.js';
import { createHttpServer } from './httpServer.js';

const config = loadConfig();
const server = createHttpServer(createApp({ config }));

server.listen(config.port, config.host);

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
