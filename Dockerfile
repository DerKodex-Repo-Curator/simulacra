# ── Stage 1: Build ────────────────────────────────────────────────────────────
# We use a multi-stage build. Stage 1 installs deps and compiles the app.
# Stage 2 copies only what's needed to run it — keeping the image small.
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (Docker caches this layer if they don't change)
COPY package*.json ./
RUN npm ci --frozen-lockfile

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Run ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Only copy what Next.js needs to run
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]