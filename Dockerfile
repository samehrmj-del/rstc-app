FROM node:20-bookworm AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:20-bookworm-slim
WORKDIR /app

RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

RUN mkdir -p /app/data /app/backups /app/logs && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 4000

ENV PORT=4000 \
    NODE_ENV=production \
    DB_PATH=/app/data/rstc_database.db \
    BACKUP_DIR=/app/backups

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
