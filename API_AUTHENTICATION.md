# API Authentication Guide

## Overview

All MediaOS API endpoints are now protected with JWT-based authentication. Users must authenticate to access the API, and certain administrative operations require admin privileges.

## Authentication Flow

### 1. Register First User (Becomes Admin)

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your-secure-password"
}
```

The first user registered automatically receives admin privileges.

### 2. Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your-secure-password"
}
```

Response:
```json
{
  "ok": true,
  "user": {
    "id": "user_...",
    "email": "admin@example.com",
    "role": "admin"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### 3. Access Protected Endpoints

Include the access token in the Authorization header:

```bash
GET /api/library
Authorization: Bearer eyJhbGc...
```

### 4. Refresh Token

Access tokens expire after 15 minutes. Use the refresh token to get a new access token:

```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

## Endpoint Protection Levels

### Public Endpoints (No Authentication Required)

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/status` - Check if authentication is configured

### Authenticated Endpoints (Requires Login)

All authenticated users can access these endpoints:

#### Library
- `GET /api/library` - List library items
- `GET /api/library/:id` - Get library item details

#### Downloads
- `GET /api/downloads/last` - Get last download status
- `POST /api/downloads/grab` - Initiate download

#### Activity
- `GET /api/activity/queue` - View download queue
- `GET /api/activity/history` - View download history
- `GET /api/activity/live` - View live download status
- `POST /api/activity/action` - Control downloads (pause/resume/delete)

#### Wanted
- `GET /api/wanted` - List wanted items
- `POST /api/wanted` - Add wanted item
- `POST /api/wanted/scan` - Scan wanted items
- `DELETE /api/wanted/:kind/:id` - Remove wanted item

#### Indexers
- `GET /api/indexers` - List indexers
- `POST /api/indexers/search` - Search indexers

#### Calendar
- `GET /api/calendar` - View calendar events

#### Requests
- `GET /api/requests` - List requests
- `POST /api/requests` - Create request

#### Settings
- `GET /api/settings/downloaders` - View downloader settings
- `GET /api/settings/quality` - View quality profiles

#### User Management
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout (client-side)

### Admin-Only Endpoints

Only users with admin role can access these endpoints:

#### Library Management
- `POST /api/library` - Add library item
- `POST /api/library/artwork` - Update artwork
- `PATCH /api/library/:id` - Update library item
- `DELETE /api/library/:id` - Delete library item

#### Indexer Management
- `POST /api/indexers` - Add indexer
- `PATCH /api/indexers/:id` - Update indexer
- `DELETE /api/indexers/:id` - Delete indexer

#### Settings Management
- `POST /api/settings/downloaders` - Update downloader settings
- `POST /api/settings/downloaders/test` - Test downloader connection
- `POST /api/settings/quality` - Update quality profiles

#### Request Management
- `POST /api/requests/:id/approve` - Approve request

## Token Management

### Access Token
- **Expiration**: 15 minutes
- **Purpose**: Authenticate API requests
- **Storage**: Store in memory (not localStorage for security)

### Refresh Token
- **Expiration**: 7 days
- **Purpose**: Obtain new access tokens
- **Storage**: Can be stored in httpOnly cookies or secure storage

## Error Responses

### 401 Unauthorized

Request missing or invalid authentication token:

```json
{
  "ok": false,
  "error": "Authentication required"
}
```

### 403 Forbidden

User authenticated but lacks required permissions:

```json
{
  "ok": false,
  "error": "Admin privileges required"
}
```

## Security Best Practices

1. **Use HTTPS**: Always use HTTPS in production to protect tokens in transit
2. **Store Tokens Securely**:
   - Access tokens: Store in memory
   - Refresh tokens: Use httpOnly cookies or secure storage
3. **Set Strong Passwords**: Passwords are hashed with PBKDF2 (100,000 iterations)
4. **Rotate Secrets**: Change JWT_SECRET and ENCRYPTION_KEY periodically
5. **Monitor Access**: Review user access logs regularly

## Environment Variables

Required for production:

```bash
# JWT signing secret (min 32 characters)
JWT_SECRET=your-random-secret-here

# Encryption key for credentials (min 32 characters)
ENCRYPTION_KEY=your-encryption-key-here
```

Generate secure secrets:

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Migration from Unauthenticated API

If you have existing API clients or scripts accessing MediaOS:

1. **Update API Clients**: Add authentication flow to obtain access token
2. **Include Authorization Header**: Add `Authorization: Bearer <token>` to all requests
3. **Handle Token Refresh**: Implement logic to refresh expired access tokens
4. **Update Documentation**: Document the authentication requirements for your clients

## Example Client Implementation

```javascript
class MediaOSClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.accessToken = null;
    this.refreshToken = null;
  }

  async login(email, password) {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    return data;
  }

  async request(endpoint, options = {}) {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.accessToken}`
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    // If token expired, refresh and retry
    if (response.status === 401) {
      await this.refresh();
      return this.request(endpoint, options);
    }

    return response.json();
  }

  async refresh() {
    const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });
    const data = await response.json();
    this.accessToken = data.accessToken;
    return data;
  }

  async getLibrary() {
    return this.request('/api/library');
  }

  async grabDownload(kind, id, title, link, protocol) {
    return this.request('/api/downloads/grab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, id, title, link, protocol })
    });
  }
}

// Usage
const client = new MediaOSClient('http://localhost:8080');
await client.login('admin@example.com', 'password');
const library = await client.getLibrary();
```

## Support

For issues or questions about authentication:
- Check the logs: `docker-compose logs api`
- Verify environment variables are set correctly
- Ensure JWT_SECRET and ENCRYPTION_KEY are at least 32 characters
- Review user management in the UI or via `/api/auth/me`
