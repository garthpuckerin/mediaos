# API Reference

Complete API documentation for MediaOS backend endpoints.

## Table of Contents

- [Authentication](#authentication)
- [Base URL & Headers](#base-url--headers)
- [Rate Limiting](#rate-limiting)
- [Authentication Endpoints](#authentication-endpoints)
- [Library Endpoints](#library-endpoints)
- [Downloader Settings](#downloader-settings)
- [Indexer Endpoints](#indexer-endpoints)
- [Search & Wanted](#search--wanted)
- [Downloads & Activity](#downloads--activity)
- [Quality Profiles](#quality-profiles)
- [Requests](#requests)
- [Calendar](#calendar)
- [Verify & Subtitles](#verify--subtitles)
- [Files & Artwork](#files--artwork)
- [Error Responses](#error-responses)

## Authentication

MediaOS uses JWT (JSON Web Token) authentication with access and refresh tokens.

### Token Types

- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to get new access tokens

### How to Authenticate

1. **Register or Login** to get tokens
2. **Include Access Token** in Authorization header:
   ```
   Authorization: Bearer {accessToken}
   ```
3. **Refresh Token** automatically before expiry (recommended at 14 minutes)

See [Authentication Guide](./AUTHENTICATION.md) for complete setup.

## Base URL & Headers

### Base URL

```
http://localhost:3000/api
```

### Standard Headers

```http
Content-Type: application/json
Authorization: Bearer {accessToken}  # For protected routes
```

## Rate Limiting

Rate limits are enforced per-route:

| Route Type     | Limit        | Window     |
| -------------- | ------------ | ---------- |
| Authentication | 5 requests   | 60 seconds |
| Search         | 20 requests  | 60 seconds |
| Downloads      | 30 requests  | 60 seconds |
| General API    | 100 requests | 60 seconds |

**Response Headers:**

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Timestamp when limit resets

**Rate Limit Response:**

```json
{
  "ok": false,
  "error": "Rate limit exceeded",
  "statusCode": 429
}
```

---

## Authentication Endpoints

### Register User

Create a new user account. First user automatically becomes admin.

```http
POST /api/auth/register
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Validation:**

- Email must be valid and include `@`
- Password must be at least 8 characters

**Success Response (201):**

```json
{
  "ok": true,
  "user": {
    "id": "abc123",
    "email": "user@example.com",
    "role": "admin",
    "createdAt": "2025-11-27T10:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "isFirstUser": true
}
```

**Error Responses:**

- `400`: Invalid email or password too short
- `409`: Email already exists

---

### Login

Authenticate with email and password.

```http
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200):**

```json
{
  "ok": true,
  "user": {
    "id": "abc123",
    "email": "user@example.com",
    "role": "admin",
    "createdAt": "2025-11-27T10:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Response (401):**

```json
{
  "ok": false,
  "error": "Invalid credentials"
}
```

---

### Refresh Token

Get a new access token using refresh token.

```http
POST /api/auth/refresh
Content-Type: application/json
```

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Success Response (200):**

```json
{
  "ok": true,
  "user": {
    "id": "abc123",
    "email": "user@example.com",
    "role": "admin"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses:**

- `401`: Invalid or expired refresh token

---

### Get Current User

Get information about the currently authenticated user.

```http
GET /api/auth/me
Authorization: Bearer {accessToken}
```

**Success Response (200):**

```json
{
  "ok": true,
  "user": {
    "id": "abc123",
    "email": "user@example.com",
    "role": "admin",
    "createdAt": "2025-11-27T10:00:00.000Z"
  }
}
```

**Error Responses:**

- `401`: Missing, invalid, or expired token

---

### Logout

Logout current user (client-side token deletion).

```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
```

**Success Response (200):**

```json
{
  "ok": true,
  "message": "Logged out successfully"
}
```

**Note:** With JWT authentication, logout is primarily handled client-side by deleting tokens from storage. Server-side token blacklisting is a future enhancement.

---

### Authentication Status

Check if authentication is configured and if users exist.

```http
GET /api/auth/status
```

**Success Response (200):**

```json
{
  "ok": true,
  "configured": true,
  "hasUsers": true,
  "requiresSetup": false
}
```

**Fields:**

- `configured`: Whether JWT_SECRET is properly set (32+ characters)
- `hasUsers`: Whether any users have been created
- `requiresSetup`: Whether initial setup is needed (no users exist)

---

## Library Endpoints

All library endpoints require authentication.

### List Library Items

Get all items in the media library.

```http
GET /api/library
Authorization: Bearer {accessToken}
```

**Success Response (200):**

```json
{
  "items": [
    {
      "id": "abc123",
      "kind": "series",
      "title": "Breaking Bad",
      "posterUrl": "https://example.com/poster.jpg",
      "backgroundUrl": "https://example.com/background.jpg"
    },
    {
      "id": "def456",
      "kind": "movie",
      "title": "The Matrix"
    }
  ]
}
```

---

### Get Library Item

Get a specific library item by ID or title.

```http
GET /api/library/{id}
Authorization: Bearer {accessToken}
```

**Path Parameters:**

- `id`: Item ID or title (case-sensitive)

**Success Response (200):**

```json
{
  "ok": true,
  "item": {
    "id": "abc123",
    "kind": "series",
    "title": "Breaking Bad",
    "posterUrl": "https://example.com/poster.jpg"
  }
}
```

**Error Response (404):**

```json
{
  "ok": false,
  "error": "not_found"
}
```

---

### Add Library Item

Add a new item to the library. **Requires admin role.**

```http
POST /api/library
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**

```json
{
  "id": "custom-id",
  "kind": "series",
  "title": "Breaking Bad",
  "posterUrl": "https://example.com/poster.jpg",
  "backgroundUrl": "https://example.com/background.jpg"
}
```

**Fields:**

- `id` (optional): Custom ID (auto-generated if not provided)
- `kind` (required): One of `movie`, `series`, `music`, `book`
- `title` (required): Item title
- `posterUrl` (optional): Poster image URL
- `backgroundUrl` (optional): Background image URL

**Success Response (200):**

```json
{
  "ok": true,
  "item": {
    "id": "abc123",
    "kind": "series",
    "title": "Breaking Bad",
    "posterUrl": "https://example.com/poster.jpg"
  }
}
```

**Behavior:**

- If item with same `kind` and `title` exists, returns existing item
- If provided `id` conflicts with existing item, returns error

**Error Responses:**

- `400`: Invalid input (Zod validation error)
- `409`: Duplicate ID
- `403`: Requires admin role

---

## Downloader Settings

Configure and test download clients (qBittorrent, NZBGet, SABnzbd).

### Get Downloader Settings

```http
GET /api/settings/downloaders
Authorization: Bearer {accessToken}
```

**Success Response (200):**

```json
{
  "qbittorrent": {
    "enabled": true,
    "baseUrl": "http://localhost:8080",
    "username": "admin",
    "hasPassword": true,
    "category": "mediaos",
    "timeoutMs": 5000
  },
  "nzbget": {
    "enabled": false,
    "hasPassword": false
  },
  "sabnzbd": {
    "enabled": true,
    "baseUrl": "http://localhost:8081",
    "hasApiKey": true,
    "category": "tv",
    "timeoutMs": 5000
  }
}
```

**Note:** Sensitive credentials (passwords, API keys) are never returned. Use `hasPassword` and `hasApiKey` flags to check if credentials are set.

---

### Update Downloader Settings

Update configuration for download clients. **Requires admin role.**

```http
POST /api/settings/downloaders
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**

```json
{
  "qbittorrent": {
    "enabled": true,
    "baseUrl": "http://localhost:8080",
    "username": "admin",
    "password": "secret123",
    "category": "mediaos",
    "timeoutMs": 5000
  },
  "sabnzbd": {
    "enabled": true,
    "baseUrl": "http://localhost:8081",
    "apiKey": "1234567890abcdef",
    "category": "tv"
  }
}
```

**Password Handling:**

- If `password` or `apiKey` is empty string or omitted, existing credential is preserved
- Credentials are encrypted with AES-256-GCM before storage
- To clear a credential, disable the client

**Success Response (200):**

```json
{
  "ok": true,
  "downloaders": {
    "qbittorrent": {
      "enabled": true,
      "baseUrl": "http://localhost:8080",
      "username": "admin",
      "hasPassword": true,
      "category": "mediaos"
    },
    "sabnzbd": {
      "enabled": true,
      "baseUrl": "http://localhost:8081",
      "hasApiKey": true,
      "category": "tv"
    }
  }
}
```

---

### Test Downloader Connection

Test connection to a download client.

```http
POST /api/settings/downloaders/test
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**

```json
{
  "client": "qbittorrent",
  "settings": {
    "baseUrl": "http://localhost:8080",
    "username": "admin",
    "password": "secret123"
  }
}
```

**Fields:**

- `client` (required): One of `qbittorrent`, `sabnzbd`, `nzbget`
- `settings` (optional): Override saved settings for testing

**Success Response (200):**

```json
{
  "ok": true,
  "status": 200
}
```

**Error Responses:**

- `400`: Missing or invalid client
- `200` with `ok: false`: Connection failed

**Example Error:**

```json
{
  "ok": false,
  "error": "login_failed: Unauthorized"
}
```

**Client-Specific Tests:**

**qBittorrent:**

- If credentials provided: Tests login via `/api/v2/auth/login`
- If no credentials: Tests unauthenticated access via `/api/v2/app/version`

**SABnzbd:**

- Tests API access via `/api?mode=queue&output=json&apikey={key}`
- Requires `apiKey` to be provided

**NZBGet:**

- Tests JSON-RPC access via `/jsonrpc` with `version` method
- Uses HTTP Basic Auth if credentials provided

---

## Indexer Endpoints

Manage indexers for searching torrents and Usenet.

### List Indexers

```http
GET /api/indexers
Authorization: Bearer {accessToken}
```

**Success Response (200):**

```json
{
  "indexers": [
    {
      "id": "abc123",
      "name": "1337x",
      "type": "torrent",
      "enabled": true,
      "baseUrl": "https://1337x.to"
    }
  ]
}
```

---

### Add Indexer

**Requires admin role.**

```http
POST /api/indexers
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "RARBG",
  "type": "torrent",
  "baseUrl": "https://rarbg.to",
  "apiKey": "optional-api-key",
  "enabled": true
}
```

---

## Search & Wanted

### Search for Media

Search across configured indexers.

```http
GET /api/search?q={query}&type={type}
Authorization: Bearer {accessToken}
```

**Query Parameters:**

- `q` (required): Search query
- `type` (optional): Filter by `torrent` or `usenet`

**Rate Limit:** 20 requests per 60 seconds

---

### Get Wanted List

```http
GET /api/wanted
Authorization: Bearer {accessToken}
```

**Success Response (200):**

```json
{
  "items": [
    {
      "id": "abc123",
      "title": "Breaking Bad S01E01",
      "status": "wanted",
      "addedAt": "2025-11-27T10:00:00.000Z"
    }
  ]
}
```

---

### Add to Wanted

**Requires admin role.**

```http
POST /api/wanted
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "Breaking Bad S01E01",
  "kind": "series"
}
```

---

## Downloads & Activity

### List Downloads

Get active downloads from configured clients.

```http
GET /api/downloads
Authorization: Bearer {accessToken}
```

**Rate Limit:** 30 requests per 60 seconds

---

### Activity Feed

Get recent download activity.

```http
GET /api/activity
Authorization: Bearer {accessToken}
```

---

## Quality Profiles

### List Quality Profiles

```http
GET /api/quality
Authorization: Bearer {accessToken}
```

---

### Create Quality Profile

**Requires admin role.**

```http
POST /api/quality
Authorization: Bearer {accessToken}
Content-Type: application/json
```

---

## Requests

### List Requests

```http
GET /api/requests
Authorization: Bearer {accessToken}
```

---

### Create Request

```http
POST /api/requests
Authorization: Bearer {accessToken}
Content-Type: application/json
```

---

## Calendar

### Get Calendar Events

```http
GET /api/calendar
Authorization: Bearer {accessToken}
```

**Query Parameters:**

- `start` (optional): ISO date string (default: today)
- `end` (optional): ISO date string (default: 30 days from start)

---

## Verify & Subtitles

### List Verify Jobs

```http
GET /api/verify/jobs
Authorization: Bearer {accessToken}
```

---

### Get Verify Settings

```http
GET /api/verify/settings
Authorization: Bearer {accessToken}
```

---

### List Subtitles

```http
GET /api/subtitles
Authorization: Bearer {accessToken}
```

---

## Files & Artwork

### List Files

```http
GET /api/files?path={path}
Authorization: Bearer {accessToken}
```

---

### Get Artwork

```http
GET /api/artwork/{itemId}
Authorization: Bearer {accessToken}
```

---

### Update Artwork

**Requires admin role.**

```http
POST /api/artwork
Authorization: Bearer {accessToken}
Content-Type: application/json
```

---

## Error Responses

### Standard Error Format

All errors follow this format:

```json
{
  "ok": false,
  "error": "Error message",
  "statusCode": 400
}
```

### Common HTTP Status Codes

| Code | Meaning               | Description                                     |
| ---- | --------------------- | ----------------------------------------------- |
| 200  | OK                    | Request succeeded                               |
| 201  | Created               | Resource created successfully                   |
| 400  | Bad Request           | Invalid input or validation error               |
| 401  | Unauthorized          | Missing, invalid, or expired authentication     |
| 403  | Forbidden             | Insufficient permissions (e.g., requires admin) |
| 404  | Not Found             | Resource not found                              |
| 409  | Conflict              | Duplicate resource (e.g., email already exists) |
| 429  | Too Many Requests     | Rate limit exceeded                             |
| 500  | Internal Server Error | Server error                                    |

### Error Examples

**Validation Error (400):**

```json
{
  "ok": false,
  "error": "Validation failed",
  "issues": [
    {
      "path": ["email"],
      "message": "Invalid email"
    }
  ]
}
```

**Authentication Required (401):**

```json
{
  "ok": false,
  "error": "Authentication required"
}
```

**Forbidden (403):**

```json
{
  "ok": false,
  "error": "Admin access required"
}
```

**Rate Limited (429):**

```json
{
  "ok": false,
  "error": "Rate limit exceeded. Try again in 60 seconds.",
  "retryAfter": 60
}
```

---

## Additional Resources

- **Authentication Guide**: [AUTHENTICATION.md](./AUTHENTICATION.md)
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Frontend Integration**: See [Authentication Guide - Frontend Integration](./AUTHENTICATION.md#frontend-integration)

## Support

For API issues or questions:

- GitHub Issues: https://github.com/garthpuckerin/mediaos/issues
- Documentation: https://github.com/garthpuckerin/mediaos/docs
