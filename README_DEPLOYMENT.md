# RSTC Deployment Guide

## Local Deployment (without Docker)

### Prerequisites
- Node.js >= 18
- npm

### Steps
1. Clone repository
2. Copy `.env.example` to `.env` and set values:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   npm ci
   ```
4. Start application:
   ```bash
   npm start
   ```
5. Verify health:
   ```bash
   curl http://localhost:4000/api/health
   ```

### PM2 Deployment
1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```
2. Start with ecosystem:
   ```bash
   pm2 start ecosystem.config.js
   ```
3. Save PM2 config:
   ```bash
   pm2 save
   ```
4. Setup startup script:
   ```bash
   pm2 startup
   ```

---

## Docker Deployment

### Prerequisites
- Docker >= 20.10
- Docker Compose >= 1.29

### Steps
1. Clone repository
2. Copy `.env.example` to `.env` and set values:
   ```bash
   cp .env.example .env
   ```
3. Build and start:
   ```bash
   docker compose up --build -d
   ```
4. Verify health:
   ```bash
   curl http://localhost:4000/api/health
   ```
5. View logs:
   ```bash
   docker compose logs -f rstc-app
   ```

### Stopping
```bash
docker compose down
```

Data persists in the `rstc-data` Docker volume.

---

## Updating

### Local Update
```bash
git pull origin main
npm ci
npm start
```

### Docker Update
```bash
git pull origin main
docker compose down
docker compose up --build -d
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Application port |
| `JWT_SECRET` | (required) | Secret for JWT signing |
| `INIT_ADMIN_PASSWORD` | (required) | Initial admin user password. Application will **fail to start** if this is not set. |
| `DB_PATH` | `/app/data/rstc_database.db` | SQLite database file path |
| `BACKUP_DIR` | `/app/backups` | Backup storage directory |
| `NODE_ENV` | `production` | Runtime environment |
| `CORS_ORIGIN` | `false` | CORS allowed origin |

---

## Troubleshooting

### Container exits immediately
```bash
docker compose logs rstc-app
```
Check for missing `JWT_SECRET` or `INIT_ADMIN_PASSWORD`.

### Database locked errors
Ensure `NODE_ENV=production` is set. WAL mode is enabled in production.

### Permission denied on volumes
```bash
docker compose down
docker volume rm rstc-app_rstc-data
docker compose up -d
```

### Health check failing
Wait 15-20 seconds after startup for the database initialization to complete.
