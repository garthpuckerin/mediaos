import type { FastifyRequest, FastifyReply } from 'fastify';

import { extractTokenFromHeader, verifyToken } from '../services/jwt';
import { findUserById, type UserResponse } from '../services/userStore';

/**
 * Extended request with user info
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user?: UserResponse;
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticate(
  req: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    reply.code(401).send({
      ok: false,
      error: 'Authentication required',
    });
    return;
  }

  try {
    // Verify token
    const payload = verifyToken(token);

    // Get user from store
    const user = await findUserById(payload.sub);
    if (!user) {
      reply.code(401).send({
        ok: false,
        error: 'User not found',
      });
      return;
    }

    // Attach user to request
    const { passwordHash, ...sanitizedUser } = user;
    req.user = sanitizedUser;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        reply.code(401).send({
          ok: false,
          error: 'Token expired',
        });
        return;
      }

      if (error.message.includes('JWT_SECRET')) {
        reply.code(503).send({
          ok: false,
          error: 'Authentication not configured',
        });
        return;
      }
    }

    reply.code(401).send({
      ok: false,
      error: 'Invalid token',
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  _reply: FastifyReply
): Promise<void> {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    return; // No token, continue without user
  }

  try {
    const payload = verifyToken(token);
    const user = await findUserById(payload.sub);

    if (user) {
      const { passwordHash, ...sanitizedUser } = user;
      req.user = sanitizedUser;
    }
  } catch (_error) {
    // Invalid token, continue without user
  }
}

/**
 * Role-based authorization middleware
 * Requires authentication and specific role
 */
export function requireRole(...allowedRoles: string[]) {
  return async (req: AuthenticatedRequest, reply: FastifyReply) => {
    // First authenticate
    await authenticate(req, reply);

    // Check if response was already sent (authentication failed)
    if (reply.sent) {
      return;
    }

    // Check role
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      reply.code(403).send({
        ok: false,
        error: 'Insufficient permissions',
      });
    }
  };
}

/**
 * Admin-only middleware
 */
export const requireAdmin = requireRole('admin');
