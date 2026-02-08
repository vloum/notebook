# ============================================================
# NoteBrain MCP Server - Production Dockerfile
# ============================================================

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Production ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 mcp && \
    adduser --system --uid 1001 mcp

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder --chown=mcp:mcp /app/dist ./dist

USER mcp

# MCP Server uses stdio transport, no port to expose
# It's typically run as a subprocess by the MCP client
CMD ["node", "dist/index.js"]
