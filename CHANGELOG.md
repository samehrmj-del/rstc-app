# Changelog

All notable changes to this project will be documented in this file.  
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2026-07-27

### Added
- Multi-domain Express API: auth, personnel, missions, users, reports, dashboard, backup, options, audit, AI chat
- JWT authentication with permission-based authorization
- SQLite database with WAL mode and connection pooling
- Automatic daily backup scheduler (02:00) with retention policy
- Backup verification, listing, download, delete, and restore endpoints
- Audit logging infrastructure
- AI chat integration with configurable provider
- Dashboard with statistics and chart data
- Personnel and mission management with decree numbering
- User management with role-based access control
- Options management for dynamic dropdowns
- Report generation and export
- Persian/French bilingual error messages and UI

### Architecture
- Extracted from monolithic `server.js` into layered domain structure:
  - `src/domains/{domain}/routes.js`
  - `src/domains/{domain}/service.js`
  - `src/domains/{domain}/repository.js`
- Centralized infrastructure layer: database connection, security, middleware, config
- Environment-based configuration with sane defaults

### Infrastructure
- Docker multi-stage build with non-root user
- Docker Compose for one-command deployment
- PM2 ecosystem configuration for process management
- Health check endpoint (`/api/health`)
- Persistent Docker volume for database
- Environment variable validation on startup

### Security
- Helmet security headers
- CORS configuration
- JWT token validation with expiry
- Permission-based route protection
- SQL injection prevention via parameterized queries
- Input validation and sanitization
- Password hashing with bcrypt
- Backup file name validation to prevent path traversal

### Testing
- 409 unit tests across 38 test suites
- 96.60% statement coverage
- 92.92% branch coverage
- 96.68% function coverage
- 96.77% line coverage
- GitHub Actions CI pipeline with matrix testing (Ubuntu/Windows, Node 18.x/current)

### Performance
- Connection-based database access (singleton pattern)
- WAL mode for concurrent reads during writes
- Backup compression and validation
- Static asset caching disabled for development, configurable for production
- JSON body size limit (10mb) to prevent memory exhaustion

### Documentation
- Deployment guide (Docker and local)
- Backup and restore procedures
- API endpoint documentation in code
- Environment variable reference
- Troubleshooting guides
