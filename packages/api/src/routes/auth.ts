import type { FastifyPluginAsync } from 'fastify';

import {
  generateTokenPair,
  verifyToken,
  extractTokenFromHeader,
} from '../services/jwt';
import {
  authenticateUser,
  createUser,
  createFirstAdmin,
  hasUsers,
  sanitizeUser,
  findUserById,
} from '../services/userStore';
import { rateLimits } from '../middleware/rateLimits';

const plugin: FastifyPluginAsync = async (app) => {
  /**
   * POST /api/auth/register
   * Register a new user account
   */
  app.post(
    '/api/auth/register',
    {
      config: {
        rateLimit: rateLimits.auth,
      },
    },
    async (req, reply) => {
      const body = (req.body || {}) as any;
      const email = String(body.email || '').trim();
      const password = String(body.password || '');

      // Validation
      if (!email || !email.includes('@')) {
        return reply.code(400).send({
          ok: false,
          error: 'Valid email is required',
        });
      }

      if (!password || password.length < 8) {
        return reply.code(400).send({
          ok: false,
          error: 'Password must be at least 8 characters',
        });
      }

      try {
        // Check if this is the first user (will be admin)
        const usersExist = await hasUsers();
        const user = usersExist
          ? await createUser(email, password, 'user')
          : await createFirstAdmin(email, password);

        // Generate tokens
        const tokens = generateTokenPair(user.id, user.email, user.role);

        return {
          ok: true,
          user,
          ...tokens,
          isFirstUser: !usersExist,
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'Email already exists'
        ) {
          return reply.code(409).send({
            ok: false,
            error: 'Email already exists',
          });
        }

        app.log.error({ err: error }, 'Registration error');
        return reply.code(500).send({
          ok: false,
          error: 'Registration failed',
        });
      }
    }
  );

  /**
   * POST /api/auth/login
   * Authenticate and get tokens
   */
  app.post(
    '/api/auth/login',
    {
      config: {
        rateLimit: rateLimits.auth,
      },
    },
    async (req, reply) => {
      const body = (req.body || {}) as any;
      const email = String(body.email || '').trim();
      const password = String(body.password || '');

      if (!email || !password) {
        return reply.code(400).send({
          ok: false,
          error: 'Email and password are required',
        });
      }

      try {
        // Authenticate user
        const user = await authenticateUser(email, password);

        // Generate tokens
        const tokens = generateTokenPair(user.id, user.email, user.role);

        return {
          ok: true,
          user,
          ...tokens,
        };
      } catch (error) {
        // Don't reveal whether email exists
        return reply.code(401).send({
          ok: false,
          error: 'Invalid credentials',
        });
      }
    }
  );

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  app.post('/api/auth/refresh', async (req, reply) => {
    const body = (req.body || {}) as any;
    const refreshToken = String(body.refreshToken || '');

    if (!refreshToken) {
      return reply.code(400).send({
        ok: false,
        error: 'Refresh token is required',
      });
    }

    try {
      // Verify refresh token
      const payload = verifyToken(refreshToken);

      // Get user from database
      const user = await findUserById(payload.sub);
      if (!user) {
        return reply.code(401).send({
          ok: false,
          error: 'Invalid token',
        });
      }

      // Generate new token pair
      const tokens = generateTokenPair(user.id, user.email, user.role);

      return {
        ok: true,
        user: sanitizeUser(user),
        ...tokens,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Token expired') {
        return reply.code(401).send({
          ok: false,
          error: 'Refresh token expired. Please login again.',
        });
      }

      return reply.code(401).send({
        ok: false,
        error: 'Invalid refresh token',
      });
    }
  });

  /**
   * GET /api/auth/me
   * Get current user info (requires authentication)
   */
  app.get('/api/auth/me', async (req, reply) => {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return reply.code(401).send({
        ok: false,
        error: 'Authentication required',
      });
    }

    try {
      const payload = verifyToken(token);
      const user = await findUserById(payload.sub);

      if (!user) {
        return reply.code(401).send({
          ok: false,
          error: 'User not found',
        });
      }

      return {
        ok: true,
        user: sanitizeUser(user),
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Token expired') {
        return reply.code(401).send({
          ok: false,
          error: 'Token expired',
        });
      }

      return reply.code(401).send({
        ok: false,
        error: 'Invalid token',
      });
    }
  });

  /**
   * POST /api/auth/logout
   * Logout (client-side token deletion, server does nothing)
   */
  app.post('/api/auth/logout', async (_req, _reply) => {
    // With JWT, logout is handled client-side by deleting tokens
    // Server-side logout requires token blacklist (future enhancement)
    return {
      ok: true,
      message: 'Logged out successfully',
    };
  });

  /**
   * GET /api/auth/status
   * Check if authentication is configured and if users exist
   */
  app.get('/api/auth/status', async (_req, _reply) => {
    try {
      const usersExist = await hasUsers();
      const jwtConfigured = !!(
        process.env['JWT_SECRET'] && process.env['JWT_SECRET'].length >= 32
      );

      return {
        ok: true,
        configured: jwtConfigured,
        hasUsers: usersExist,
        requiresSetup: !usersExist,
      };
    } catch (error) {
      return {
        ok: true,
        configured: false,
        hasUsers: false,
        requiresSetup: true,
      };
    }
  });
};

export default plugin;
