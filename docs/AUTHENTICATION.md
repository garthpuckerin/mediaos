# Authentication System

MediaOS uses a complete JWT-based authentication system with encryption for sensitive data.

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Authentication Flow](#authentication-flow)
- [API Endpoints](#api-endpoints)
- [Frontend Integration](#frontend-integration)
- [Security Features](#security-features)
- [Rate Limiting](#rate-limiting)

## Quick Start

### 1. Generate Security Keys

```bash
# Generate JWT secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate encryption key (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Set Environment Variables

Create a `.env` file in the root directory:

```bash
# Required - Authentication
JWT_SECRET=your-generated-jwt-secret-here
ENCRYPTION_KEY=your-generated-encryption-key-here

# Optional - Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000
```

### 3. Start the Application

```bash
npm install
npm run dev
```

### 4. Register First User

The first user automatically becomes an admin:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"SecurePass123!"}'
```

## Environment Variables

### Required Variables

| Variable         | Description                       | Example              |
| ---------------- | --------------------------------- | -------------------- |
| `JWT_SECRET`     | Secret for signing JWT tokens     | `64-char hex string` |
| `ENCRYPTION_KEY` | Key for encrypting sensitive data | `64-char hex string` |

**Important:** These must be at least 32 characters long.

### Optional Variables

| Variable            | Default    | Description                 |
| ------------------- | ---------- | --------------------------- |
| `RATE_LIMIT_MAX`    | `100`      | Max requests per window     |
| `RATE_LIMIT_WINDOW` | `60000`    | Window size in milliseconds |
| `CONFIG_DIR`        | `./config` | Directory for config files  |

## Authentication Flow

### Registration Flow

```mermaid
sequenceDiagram
    User->>Frontend: Enter email/password
    Frontend->>API: POST /api/auth/register
    API->>UserStore: Create user (hash password)
    UserStore->>API: User created
    API->>Frontend: { accessToken, refreshToken, user }
    Frontend->>LocalStorage: Store tokens
```

### Login Flow

```mermaid
sequenceDiagram
    User->>Frontend: Enter credentials
    Frontend->>API: POST /api/auth/login
    API->>UserStore: Verify credentials
    UserStore->>API: Credentials valid
    API->>Frontend: { accessToken, refreshToken, user }
    Frontend->>LocalStorage: Store tokens
```

### Token Refresh Flow

```mermaid
sequenceDiagram
    Frontend->>API: Request with expired access token
    API->>Frontend: 401 Unauthorized
    Frontend->>API: POST /api/auth/refresh (with refresh token)
    API->>Frontend: { accessToken, refreshToken }
    Frontend->>API: Retry original request
```

## API Endpoints

### Authentication Routes

#### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin",
    "createdAt": "2025-11-27T10:00:00.000Z"
  },
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGci..."
}
```

#### Logout

```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
```

### Protected Endpoints

All API endpoints require authentication except:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`

**Example authenticated request:**

```http
GET /api/library/series
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Admin-Only Endpoints

These endpoints require admin role:

- `POST /api/settings/*` - Update settings
- `DELETE /api/users/:id` - Delete users
- `POST /api/indexers` - Add indexers

## Frontend Integration

### Using AuthContext

```typescript
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user, login, logout, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <LoginForm />;

  return (
    <div>
      <p>Welcome, {user.email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Protected Routes

```typescript
import { ProtectedRoute } from './components/ProtectedRoute';

<ProtectedRoute requireAdmin={true}>
  <AdminPanel />
</ProtectedRoute>
```

### Using API Client

```typescript
import { apiClient } from './api/client';

// Automatically includes auth token
const data = await apiClient.get('/api/library/series');

// POST with data
await apiClient.post('/api/library/series', {
  title: 'My Series',
  kind: 'series',
});
```

## Security Features

### Password Hashing

- Algorithm: PBKDF2 with SHA-512
- Iterations: 100,000
- Salt: 16 bytes (random per password)
- Output: 64 bytes

### JWT Tokens

- Algorithm: HMAC-SHA256
- Access Token: 15 minutes expiry
- Refresh Token: 7 days expiry
- Auto-refresh: 14 minutes (1 min before expiry)

### Credential Encryption

- Algorithm: AES-256-GCM
- Key Derivation: PBKDF2 (100k iterations)
- IV: Random 16 bytes per encryption
- Auth Tag: 16 bytes for integrity

**Encrypted Data:**

- Download client passwords (qBittorrent, NZBGet)
- API keys (SABnzbd, indexers)
- Any sensitive configuration

## Rate Limiting

### Per-Route Limits

| Route Type     | Max Requests | Window |
| -------------- | ------------ | ------ |
| General API    | 100/min      | 60s    |
| Search         | 20/min       | 60s    |
| Authentication | 5/min        | 60s    |
| Downloads      | 30/min       | 60s    |

### Rate Limit Headers

Responses include:

- `X-RateLimit-Limit`: Maximum requests
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Reset timestamp

### Handling Rate Limits

```typescript
try {
  await apiClient.post('/api/auth/login', credentials);
} catch (error) {
  if (error.message.includes('429')) {
    // Rate limited - wait and retry
    const retryAfter = response.headers['retry-after'];
  }
}
```

## Troubleshooting

### "JWT_SECRET environment variable must be set"

Ensure your `.env` file contains `JWT_SECRET` with at least 32 characters.

### "ENCRYPTION_KEY environment variable must be set"

Ensure your `.env` file contains `ENCRYPTION_KEY` with at least 32 characters.

### "Invalid credentials"

Check:

1. Email is correct (case-insensitive)
2. Password matches exactly
3. User exists in `config/users.json`

### "Authentication required"

Ensure:

1. Authorization header is present: `Authorization: Bearer {token}`
2. Token hasn't expired
3. Token is valid (not tampered with)

### Rate Limited (429)

Wait for the rate limit window to reset. Check `X-RateLimit-Reset` header.

## Production Deployment

### Security Checklist

- [ ] Generate strong random keys (64 characters minimum)
- [ ] Use HTTPS in production
- [ ] Set secure cookie flags
- [ ] Enable CORS only for trusted origins
- [ ] Rotate JWT_SECRET regularly
- [ ] Backup `config/users.json` regularly
- [ ] Monitor failed login attempts
- [ ] Set up log aggregation

### Docker Deployment

```bash
# Use secrets for sensitive data
docker run -d \
  --name mediaos \
  -e JWT_SECRET="$(cat /run/secrets/jwt_secret)" \
  -e ENCRYPTION_KEY="$(cat /run/secrets/encryption_key)" \
  -v /path/to/config:/app/config \
  mediaos:latest
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete Docker setup.

## API Reference

Complete API reference available at:

- Swagger UI: `/api/docs` (when running)
- OpenAPI Spec: `/api/docs/json`

## Support

For issues or questions:

- GitHub Issues: https://github.com/garthpuckerin/mediaos/issues
- Documentation: https://github.com/garthpuckerin/mediaos/docs
