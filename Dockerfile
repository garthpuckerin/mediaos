# --- builder (npm workspaces) ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/api/package.json packages/api/package.json
COPY packages/web/package.json packages/web/package.json
COPY packages/workers/package.json packages/workers/package.json
COPY packages/adapters/package.json packages/adapters/package.json
RUN npm ci
COPY . .
RUN npm run build

# --- runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Create config mount & default dirs
RUN mkdir -p /config /downloads /media && \
    adduser -D -u 1000 app && \
    chown -R app:app /app /config /downloads /media
USER app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/db ./db
COPY --from=builder /app/package.json ./package.json

# Define volumes
VOLUME ["/config", "/downloads", "/media"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });"

EXPOSE 8080
CMD ["node", "packages/api/dist/index.js"]
