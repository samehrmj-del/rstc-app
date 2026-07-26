# Phase 12.3 – Docker & Production Deployment Report

Date: 2026-07-27
Objective: Prepare the project for production deployment using Docker and PM2.

---

## Files Created

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build for production image |
| `docker-compose.yml` | Application service with persistent volume |
| `.dockerignore` | Exclude dev/test files from build context |
| `.env.example` | Environment variable template |
| `ecosystem.config.js` | PM2 process manager configuration |
| `README_DEPLOYMENT.md` | Deployment, update, and troubleshooting guide |
| `README_BACKUP.md` | Backup procedures and API endpoints |
| `README_RESTORE.md` | Restore and rollback procedures |
| `src/infrastructure/config/env.js` | Added `BACKUP_DIR` with backward-compatible default |

---

## Docker Configuration

### Base Image
- `node:20-bookworm` (deps stage)
- `node:20-bookworm-slim` (runtime stage)

### Multi-Stage Build
1. **deps**: Installs production dependencies with `npm ci --only=production`
2. **runtime**: Copies only necessary artifacts, reduces image size and attack surface

### Security
- Non-root user: `nodejs` (created, owns `/app`)
- No shell in final stage
- Minimal package footprint (bookworm-slim)

### Healthcheck
- Endpoint: `/api/health`
- Check: HTTP 200 on port 4000
- Interval: 30s, timeout: 3s, retries: 3, start period: 10s

### Restart Policy
- `unless-stopped` (docker-compose)
- PM2: `autorestart: true`, `max_restarts: 10`, `restart_delay: 4000ms`

### Volumes
- `rstc-data`: Named Docker volume mapped to `/app/data` for database persistence
- `./backups:/app/backups`: Bind mount for manual backup access (optional)

---

## Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `PORT` | `4000` | No | Application listen port |
| `JWT_SECRET` | — | Yes | JWT signing secret (change in production) |
| `INIT_ADMIN_PASSWORD` | — | Yes | Initial admin password |
| `DB_PATH` | `/app/data/rstc_database.db` | No | SQLite database file path |
| `BACKUP_DIR` | `/app/backups` | No | Backup storage directory |
| `NODE_ENV` | `production` | No | Runtime environment |
| `CORS_ORIGIN` | `false` | No | CORS allowed origin |

---

## PM2 Configuration

### ecosystem.config.js
- **Name**: `rstc-app`
- **Script**: `server.js`
- **Exec mode**: `cluster`
- **Instances**: `max`
- **Memory limit**: `500M` (`max_memory_restart`)
- **Logs**: `./logs/pm2-error.log`, `./logs/pm2-out.log`
- **Restart**: autorestart with 10 max restarts, 4s delay

### Cluster Mode Note
SQLite WAL mode supports concurrent readers and serialized writers. PM2 cluster mode creates multiple worker processes, each with its own `better-sqlite3` connection. This is safe for typical workloads. For extremely high write concurrency, consider `exec_mode: 'fork'` with a single instance.

---

## Deployment Instructions

### Local (without Docker)
```bash
cp .env.example .env
npm ci
npm start
```

### Docker (Recommended)
```bash
cp .env.example .env
# Edit .env with production values
docker compose up --build -d
```

### Verify
```bash
curl http://localhost:4000/api/health
```

### PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Updating

### Docker
```bash
git pull origin main
docker compose down
docker compose up --build -d
```

### Local
```bash
git pull origin main
npm ci
npm start
```

---

## Documentation

### README_DEPLOYMENT.md
- Local and Docker deployment steps
- Environment variable reference
- Troubleshooting (container exits, DB locked, permissions, health check)

### README_BACKUP.md
- Automatic daily backup schedule (02:00)
- Manual backup API endpoint
- Backup verification and listing
- Best practices

### README_RESTORE.md
- Restore API endpoint
- Automatic rollback on failure
- Manual rollback procedure
- Post-restore checklist

---

## Validation

### Validated
- Dockerfile syntax and best practices
- docker-compose.yml service/volume/port configuration
- .env.example completeness
- ecosystem.config.js PM2 settings
- Healthcheck command correctness

### Not Validated (Docker not available in this environment)
- Docker image build
- Container startup and health endpoint response
- Volume persistence across container restarts
- Backup folder mount permissions

---

## Estimated Metrics

| Metric | Value |
|--------|-------|
| Estimated image size | ~350–450 MB |
| Startup time | ~3–8 seconds |
| Base image | node:20-bookworm-slim |

---

## Known Limitations

1. **Docker not installed**: Could not perform live build/run validation on this Windows environment.
2. **Bind mount permissions**: On Linux, `./backups` bind mount may be root-owned by default. Fix with `sudo chown -R 1000:1000 ./backups` or use a named volume instead.
3. **SQLite cluster concurrency**: PM2 cluster mode works well with WAL, but extreme write concurrency may require fork mode.
4. **No log rotation**: PM2 logs should be managed externally (e.g., `pm2-logrotate`).
5. **Single-node only**: SQLite does not support multi-node clustering. For horizontal scaling, migrate to PostgreSQL or MySQL.
