import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import fastifyStatic from '@fastify/static';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
await app.register(formbody);

// static (serve built web if exists)
const webDist = join(__dirname, '../../web/dist');
try {
  await app.register(fastifyStatic, { root: webDist, prefix: '/' });
  app.log.info('Static UI enabled:', webDist);
} catch (e) {
  app.log.warn('Static UI not available yet.');
}

// health
app.get('/api/system/health', async () => ({ ok: true }));

// routes
import routes from './routes/index.js';
await app.register(routes, { prefix: '/api' });

const port = Number(process.env.PORT || 8080);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
