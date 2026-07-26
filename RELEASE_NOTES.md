# Release Notes – RSTC 1.0.0

## Overview

RSTC (Resource Scheduling and Tracking Console) is a full-stack web application for managing personnel, missions, reports, and administrative workflows. Version 1.0.0 marks the first stable release with production-ready deployment, security hardening, and comprehensive test coverage.

---

## New Features

### Core Application
- **Authentication & Authorization**: JWT-based login with permission system
- **Personnel Management**: Employee records, validation, search
- **Mission Management**: Decree numbering, date tracking, overtime calculations
- **User Management**: Admin/user accounts with role-based access
- **Dashboard**: Real-time statistics and chart data
- **Reports**: Data export and summary generation
- **Backup System**: Automatic daily backups, manual triggers, validation, restore
- **Options Management**: Dynamic dropdown configurations stored in database
- **Audit Log**: Infrastructure for tracking changes
- **AI Chat**: Configurable AI assistant integration
- **Bilingual Support**: Persian and French error messages

### Infrastructure
- Docker multi-stage builds with non-root user
- Docker Compose orchestration
- PM2 process manager configuration
- GitHub Actions CI/CD pipeline
- Health check endpoint
- Persistent database volumes

---

## Breaking Changes

**None.** This is the first stable release. No migration from previous versions is required.

---

## Migration Notes

### From Development to Production
1. Set `JWT_SECRET` to a strong random value
2. Set `INIT_ADMIN_PASSWORD` to a secure password
3. Configure `DB_PATH` to a persistent location
4. Set `NODE_ENV=production`
5. Use Docker or PM2 for process management

### Database
- SQLite database is created automatically on first run
- WAL mode is enabled for concurrent access
- No manual schema migrations required

---

## Deployment Notes

### Docker (Recommended)
```bash
cp .env.example .env
# Edit .env with production values
docker compose up --build -d
```

### Local
```bash
cp .env.example .env
npm ci
npm start
```

### PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Known Limitations

1. **SQLite Only**: Single-node deployment. No built-in replication or clustering.
2. **Write Concurrency**: SQLite serializes writes. High write concurrency may require application-level queuing.
3. **Backup Size**: Large databases (>2GB) may experience performance degradation during backup/restore.
4. **AI Provider**: AI chat requires external API configuration.
5. **Docker on Windows**: Bind mounts for backups may require permission adjustments on Linux hosts.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Application port |
| `JWT_SECRET` | *(required)* | JWT signing secret |
| `INIT_ADMIN_PASSWORD` | *(required)* | Initial admin password |
| `DB_PATH` | `./rstc_database.db` | Database file path |
| `BACKUP_DIR` | `./backups` | Backup directory |
| `NODE_ENV` | `production` | Runtime environment |
| `CORS_ORIGIN` | `false` | CORS allowed origin |

---

## Support

- Documentation: See `README.md`, `README_DEPLOYMENT.md`, `README_BACKUP.md`, `README_RESTORE.md`
- Issues: Report via GitHub Issues
- Security: See `SECURITY.md`

---

## Statistics

- **Test Coverage**: 96.60% statements, 92.92% branches
- **Test Count**: 409 tests, 0 failures
- **Codebase**: 38 source files, 10 domains
- **Dependencies**: 7 production, 2 dev
