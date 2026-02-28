# ─────────────────────────────────────────────────────────────
# Stage 1: deps  (separate layer for better caching)
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Install only production deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --legacy-peer-deps

# ─────────────────────────────────────────────────────────────
# Stage 2: runner
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy deps from previous stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source (respect .dockerignore)
COPY . .

# Ensure app writes to /tmp, not project dir
ENV TMPDIR=/tmp
ENV NODE_ENV=production
# Railway overrides PORT at runtime — default 3001 for local Docker
ENV PORT=3001

# Drop root
USER appuser

# Railway detects the port from the PORT env var automatically
EXPOSE ${PORT}

# Health check — containers are restarted if this fails
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "src/server.js"]
