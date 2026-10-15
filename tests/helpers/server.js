import net from 'node:net';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/index.js';
import { createHttpServer } from '../../src/httpServer.js';

const OPEN_LIMITS = Object.freeze({ globalMax: 100_000, apiMax: 100_000 });

export async function startServer({ env = {}, limits = OPEN_LIMITS } = {}) {
  const config = loadConfig({ NODE_ENV: 'test', ...env });
  const server = createHttpServer(createApp({ config, limits }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    server,
    port,
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  };
}

export function rawRequest(port, { method = 'GET', path = '/', headers = {}, body = '' } = {}) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1');
    const chunks = [];
    const merged = { Host: `127.0.0.1:${port}`, Connection: 'close', ...headers };
    if (body !== '') {
      merged['Content-Length'] = Buffer.byteLength(body);
    }
    const head = Object.entries(merged)
      .map(([name, value]) => `${name}: ${value}`)
      .join('\r\n');
    socket.setTimeout(5000, () => socket.destroy(new Error('timeout')));
    socket.on('connect', () => socket.write(`${method} ${path} HTTP/1.1\r\n${head}\r\n\r\n${body}`));
    socket.on('data', (chunk) => chunks.push(chunk));
    socket.on('error', reject);
    socket.on('close', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      const separator = text.indexOf('\r\n\r\n');
      const headText = separator === -1 ? text : text.slice(0, separator);
      const [statusLine, ...headerLines] = headText.split('\r\n');
      const parsed = {};
      for (const line of headerLines) {
        const index = line.indexOf(':');
        if (index > 0) {
          parsed[line.slice(0, index).toLowerCase()] = line.slice(index + 1).trim();
        }
      }
      resolve({
        status: Number(statusLine.split(' ')[1]),
        headers: parsed,
        body: separator === -1 ? '' : text.slice(separator + 4),
      });
    });
  });
}

export const VALID_DEVICE = Object.freeze({
  ramGb: 16,
  vramGb: 8,
  cores: 8,
  os: 'windows',
  unifiedMemory: false,
  gpuRenderer: 'NVIDIA GeForce RTX 4060 Laptop GPU',
});

export function postJson(url, path, body, headers = {}) {
  return fetch(`${url}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
