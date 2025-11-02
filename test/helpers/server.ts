import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

let testServer: FastifyInstance | null = null;

export async function setupTestServer(): Promise<void> {
  testServer = Fastify({ logger: false });

  // Register test routes
  testServer.get('/api/test/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  await testServer.listen({ port: 0 }); // Random available port
}

export async function cleanupTestServer(): Promise<void> {
  if (testServer) {
    await testServer.close();
    testServer = null;
  }
}

export function getTestServer(): FastifyInstance | null {
  return testServer;
}
