# --- builder (pnpm workspaces) ---
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY packages/api/package.json packages/api/package.json
COPY packages/web/package.json packages/web/package.json
COPY packages/workers/package.json packages/workers/package.json
COPY packages/adapters/package.json packages/adapters/package.json
RUN pnpm install --frozen-lockfile || pnpm install
COPY . .
RUN pnpm -w build

# --- runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Create config mount & default dirs
RUN mkdir -p /config /downloads /media && adduser -D -u 1000 app && chown -R app:app /app /config /downloads
USER app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/db ./db
COPY --from=builder /app/package.json ./package.json
EXPOSE 8080
CMD ["node", "packages/api/dist/index.js"]
