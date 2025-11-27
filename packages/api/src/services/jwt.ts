import crypto from 'crypto';

/**
 * JWT (JSON Web Token) service for authentication
 * Uses HMAC-SHA256 for signing tokens
 */

interface JWTPayload {
  sub: string; // Subject (user ID)
  email?: string;
  role?: string;
  iat: number; // Issued at
  exp: number; // Expiration
}

interface JWTHeader {
  alg: 'HS256';
  typ: 'JWT';
}

/**
 * Gets the JWT secret from environment
 * @throws {Error} If JWT_SECRET is not set
 */
function getJWTSecret(): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET environment variable must be set and at least 32 characters long'
    );
  }
  return secret;
}

/**
 * Base64URL encodes a buffer
 */
function base64url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Base64URL decodes a string
 */
function base64urlDecode(str: string): Buffer {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(base64 + padding, 'base64');
}

/**
 * Signs a JWT token
 * @param payload - Token payload
 * @param expiresIn - Expiration time in seconds (default: 24 hours)
 * @returns Signed JWT token
 */
export function signToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  expiresIn: number = 24 * 60 * 60
): string {
  const secret = getJWTSecret();
  const now = Math.floor(Date.now() / 1000);

  const header: JWTHeader = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const encodedHeader = base64url(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64url(Buffer.from(JSON.stringify(fullPayload)));

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();

  const encodedSignature = base64url(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Verifies and decodes a JWT token
 * @param token - JWT token to verify
 * @returns Decoded payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyToken(token: string): JWTPayload {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token format');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token structure');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  // Verify signature
  try {
    const secret = getJWTSecret();
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();

    const expectedSignature = base64url(signature);

    if (encodedSignature !== expectedSignature) {
      throw new Error('Invalid signature');
    }
  } catch (error) {
    throw new Error('Token verification failed: Invalid signature');
  }

  // Decode payload
  let payload: JWTPayload;
  try {
    const payloadBuffer = base64urlDecode(encodedPayload);
    payload = JSON.parse(payloadBuffer.toString('utf8'));
  } catch (error) {
    throw new Error('Token verification failed: Invalid payload');
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token expired');
  }

  return payload;
}

/**
 * Generates an access token (short-lived)
 * @param userId - User ID
 * @param email - User email (optional)
 * @param role - User role (optional)
 * @returns Access token (expires in 15 minutes)
 */
export function generateAccessToken(
  userId: string,
  email?: string,
  role?: string
): string {
  return signToken(
    {
      sub: userId,
      email,
      role,
    },
    15 * 60 // 15 minutes
  );
}

/**
 * Generates a refresh token (long-lived)
 * @param userId - User ID
 * @returns Refresh token (expires in 7 days)
 */
export function generateRefreshToken(userId: string): string {
  return signToken(
    {
      sub: userId,
    },
    7 * 24 * 60 * 60 // 7 days
  );
}

/**
 * Generates both access and refresh tokens
 * @param userId - User ID
 * @param email - User email (optional)
 * @param role - User role (optional)
 * @returns Object with accessToken and refreshToken
 */
export function generateTokenPair(
  userId: string,
  email?: string,
  role?: string
): { accessToken: string; refreshToken: string } {
  return {
    accessToken: generateAccessToken(userId, email, role),
    refreshToken: generateRefreshToken(userId),
  };
}

/**
 * Extracts token from Authorization header
 * @param authHeader - Authorization header value (Bearer <token>)
 * @returns Token or null if invalid format
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return null;
  }

  return parts[1];
}

/**
 * Generates a random session ID for tracking
 * @returns Random 32-character hex string
 */
export function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex');
}
