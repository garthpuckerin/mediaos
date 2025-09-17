import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Fastify instance
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

// Security & utility middleware
await app.register(sensible);
await app.register(helmet);
await app.register(rateLimit, {
  max: Number(process.env.RATE_LIMIT_MAX || 100),
  timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute'
});

// CORS configuration
await app.register(cors, {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || false
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
});

// Health check endpoint
app.get('/api/system/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development'
  };
});

// System info endpoint
app.get('/api/system/info', async (request, reply) => {
  return {
    name: 'MediaOS',
    version: process.env.npm_package_version || '0.1.0',
    description: 'Unified media management platform',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  };
});

// Error handling
app.setErrorHandler(async (error, request, reply) => {
  app.log.error(error);
  
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : error.message;
  
  reply.code(statusCode).send({
    error: true,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: request.url
  });
});

// Start server
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port, host });
  app.log.info(`Server listening on http://${host}:${port}`);
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, shutting down gracefully`);
  try {
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;