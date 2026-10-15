import http from 'node:http';

export const SERVER_LIMITS = Object.freeze({
  maxHeaderSize: 16_384,
  headersTimeoutMs: 10_000,
  requestTimeoutMs: 15_000,
  keepAliveTimeoutMs: 5_000,
  maxHeadersCount: 50,
  maxRequestsPerSocket: 200,
});

export function createHttpServer(app) {
  const server = http.createServer({ maxHeaderSize: SERVER_LIMITS.maxHeaderSize }, app);
  server.headersTimeout = SERVER_LIMITS.headersTimeoutMs;
  server.requestTimeout = SERVER_LIMITS.requestTimeoutMs;
  server.keepAliveTimeout = SERVER_LIMITS.keepAliveTimeoutMs;
  server.maxHeadersCount = SERVER_LIMITS.maxHeadersCount;
  server.maxRequestsPerSocket = SERVER_LIMITS.maxRequestsPerSocket;
  return server;
}
