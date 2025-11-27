/**
 * Rate limiting configurations for different endpoint types
 *
 * These limits help protect against:
 * - Brute force attacks (auth endpoints)
 * - API abuse (write operations)
 * - DoS attacks (all endpoints)
 */

export const rateLimits = {
  /**
   * Authentication endpoints (login, register)
   * Very restrictive to prevent brute force attacks
   */
  auth: {
    max: 5, // 5 requests
    timeWindow: '15 minutes', // per 15 minutes
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message:
        'Too many authentication attempts. Please try again in 15 minutes.',
    }),
  },

  /**
   * Write operations (POST, PATCH, DELETE)
   * Moderate restrictions to prevent abuse
   */
  write: {
    max: 30, // 30 requests
    timeWindow: '1 minute', // per minute
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded for write operations. Please slow down.',
    }),
  },

  /**
   * Search and scan operations
   * More restrictive due to computational cost
   */
  expensive: {
    max: 10, // 10 requests
    timeWindow: '1 minute', // per minute
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded for expensive operations. Please wait.',
    }),
  },

  /**
   * Download/grab operations
   * Moderate to prevent queue flooding
   */
  downloads: {
    max: 20, // 20 requests
    timeWindow: '1 minute', // per minute
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Too many download requests. Please wait a moment.',
    }),
  },
};
