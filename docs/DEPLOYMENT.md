# Deployment Guide

Complete guide for deploying MediaOS to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Docker Deployment](#docker-deployment)
- [Environment Configuration](#environment-configuration)
- [HTTPS Setup](#https-setup)
- [Database Backup](#database-backup)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker 20+ or Node.js 18+
- Reverse proxy (nginx, Caddy, Traefik)
- SSL certificates (Let's Encrypt recommended)
- 512MB RAM minimum, 1GB+ recommended
- 1GB disk space minimum

## Docker Deployment

### Using Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mediaos:
    image: mediaos:latest
    container_name: mediaos
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - RATE_LIMIT_MAX=100
      - RATE_LIMIT_WINDOW=60000
    volumes:
      - ./config:/app/config
      - ./media:/app/media
    secrets:
      - jwt_secret
      - encryption_key
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  encryption_key:
    file: ./secrets/encryption_key.txt
```

### Generate Secrets

```bash
# Create secrets directory
mkdir -p secrets

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" > secrets/jwt_secret.txt

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" > secrets/encryption_key.txt

# Secure the files
chmod 600 secrets/*
```

### Start Services

```bash
docker-compose up -d
```

### Build Custom Image

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY packages/*/package.json ./packages/
RUN npm ci --only=production

# Copy source
COPY . .

# Build
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package*.json ./

# Create config directory
RUN mkdir -p /app/config && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t mediaos:latest .
docker run -d \
  --name mediaos \
  -p 3000:3000 \
  -e JWT_SECRET="$(cat secrets/jwt_secret.txt)" \
  -e ENCRYPTION_KEY="$(cat secrets/encryption_key.txt)" \
  -v $(pwd)/config:/app/config \
  mediaos:latest
```

## Environment Configuration

### Production Environment Variables

```bash
# Required
NODE_ENV=production
JWT_SECRET=your-64-char-hex-secret
ENCRYPTION_KEY=your-64-char-hex-key

# Optional - Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# Optional - Paths
CONFIG_DIR=/app/config
LOG_LEVEL=info

# Optional - Server
PORT=3000
HOST=0.0.0.0
```

### Using Environment Files

Create `.env.production`:

```bash
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
RATE_LIMIT_MAX=100
```

Load with Docker:

```bash
docker run --env-file .env.production mediaos:latest
```

## HTTPS Setup

### Option 1: Nginx Reverse Proxy

Create `/etc/nginx/sites-available/mediaos`:

```nginx
server {
    listen 80;
    server_name mediaos.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mediaos.example.com;

    ssl_certificate /etc/letsencrypt/live/mediaos.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mediaos.example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/mediaos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option 2: Caddy (Automatic HTTPS)

Create `Caddyfile`:

```caddy
mediaos.example.com {
    reverse_proxy localhost:3000
    encode gzip

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
    }
}
```

Start Caddy:

```bash
caddy run --config Caddyfile
```

### Option 3: Traefik

Add to `docker-compose.yml`:

```yaml
labels:
  - 'traefik.enable=true'
  - 'traefik.http.routers.mediaos.rule=Host(`mediaos.example.com`)'
  - 'traefik.http.routers.mediaos.entrypoints=websecure'
  - 'traefik.http.routers.mediaos.tls.certresolver=letsencrypt'
```

## Database Backup

### File-Based Storage (Current)

Backup the config directory:

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/mediaos"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" /app/config

# Keep only last 30 days
find "$BACKUP_DIR" -name "config_*.tar.gz" -mtime +30 -delete
```

Schedule with cron:

```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup.sh
```

### Automated Backup with Docker

Add to `docker-compose.yml`:

```yaml
services:
  backup:
    image: offen/docker-volume-backup:latest
    restart: always
    environment:
      BACKUP_CRON_EXPRESSION: '0 2 * * *'
      BACKUP_FILENAME: 'mediaos-backup-%Y%m%d-%H%M%S.tar.gz'
      BACKUP_RETENTION_DAYS: '30'
    volumes:
      - ./config:/backup/config:ro
      - ./backups:/archive
```

### Restore from Backup

```bash
# Stop the service
docker-compose down

# Restore
tar -xzf /backups/config_20251127_020000.tar.gz -C /app

# Start the service
docker-compose up -d
```

## Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3000/health
```

Add health check route to `packages/api/src/index.ts`:

```typescript
app.get('/health', async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
});
```

### Docker Health Check

```bash
docker inspect --format='{{.State.Health.Status}}' mediaos
```

### Logging

Configure logging in production:

```typescript
// packages/api/src/index.ts
app.register(fastify.default, {
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    file: '/app/logs/mediaos.log',
  },
});
```

### Prometheus Metrics

Add metrics endpoint:

```typescript
import promClient from 'prom-client';

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

app.get('/metrics', async () => {
  return register.metrics();
});
```

### Log Aggregation

Use Docker logging driver:

```yaml
services:
  mediaos:
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
```

Or send to external service:

```yaml
logging:
  driver: 'syslog'
  options:
    syslog-address: 'tcp://logs.example.com:514'
```

## Security Best Practices

### 1. Secrets Management

**Never** commit secrets to git:

```bash
# .gitignore
.env
.env.production
secrets/
config/users.json
```

Use Docker secrets or environment variables.

### 2. User Permissions

Run as non-root user:

```dockerfile
USER node
```

### 3. Network Security

Limit exposed ports:

```yaml
ports:
  - '127.0.0.1:3000:3000' # Only localhost
```

Use reverse proxy for external access.

### 4. Regular Updates

```bash
# Update dependencies
npm audit fix

# Update Docker image
docker pull mediaos:latest
docker-compose up -d
```

### 5. Firewall Rules

```bash
# Allow HTTPS only
ufw allow 443/tcp
ufw allow 80/tcp
ufw deny 3000/tcp
```

## Performance Tuning

### Node.js Options

```bash
NODE_OPTIONS="--max-old-space-size=2048"
```

### Docker Resources

```yaml
services:
  mediaos:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### nginx Caching

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=mediaos_cache:10m max_size=1g inactive=60m;

location / {
    proxy_cache mediaos_cache;
    proxy_cache_valid 200 10m;
    proxy_cache_bypass $http_cache_control;
}
```

## Troubleshooting

### Container Won't Start

Check logs:

```bash
docker logs mediaos
```

Common issues:

- Missing environment variables
- Port already in use
- Volume mount permissions

### High Memory Usage

```bash
# Check container stats
docker stats mediaos

# Restart container
docker restart mediaos
```

### Database Corruption

```bash
# Restore from backup
docker-compose down
tar -xzf /backups/latest.tar.gz -C /app
docker-compose up -d
```

### Permission Errors

```bash
# Fix ownership
chown -R 1000:1000 /app/config
```

## Scaling

### Horizontal Scaling

Use load balancer with session affinity:

```yaml
services:
  mediaos:
    deploy:
      replicas: 3
```

**Note:** Requires shared session storage (Redis) - see database migration guide.

### Vertical Scaling

Increase container resources:

```yaml
deploy:
  resources:
    limits:
      memory: 4G
```

## Support

For deployment issues:

- Check logs: `docker logs mediaos`
- Review [AUTHENTICATION.md](./AUTHENTICATION.md)
- Open issue: https://github.com/garthpuckerin/mediaos/issues
