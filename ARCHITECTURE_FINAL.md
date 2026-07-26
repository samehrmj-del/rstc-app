# ARCHITECTURE_FINAL.md

Date: 2026-07-26
Status: Production frozen

---

## 1. Directory Tree

```
RSTC_App/
├── server.js                          # Thin entry point (72 lines)
├── .env                               # Environment config (gitignored)
├── package.json
├── REGRESSION_CHECKLIST.md
├── PHASE_8_PRODUCTION_READINESS.md
└── src/
    ├── domains/                       # Domain-driven modules
    │   ├── index.js                   # Empty barrel (unused)
    │   ├── auth/
    │   │   ├── routes.js              # POST /api/login
    │   │   ├── service.js             # login, legacy hash migration
    │   │   ├── repository.js          # DB: Users
    │   │   └── index.js               # Empty barrel (unused)
    │   ├── users/
    │   │   ├── routes.js              # CRUD /api/users
    │   │   ├── service.js             # createUserRecord, updateUserRecord, ...
    │   │   ├── repository.js          # DB: Users queries
    │   │   └── index.js               # Empty barrel (unused)
    │   ├── personnel/
    │   │   ├── routes.js              # CRUD + bulk /api/personnel
    │   │   ├── service.js             # createPersonnelRecord, bulkImportPersonnel, ...
    │   │   ├── repository.js          # DB: Personnel queries + transaction
    │   │   ├── validator.js           # Validation rules
    │   │   └── index.js               # Empty barrel (unused)
    │   ├── missions/
    │   │   ├── routes.js              # CRUD /api/missions
    │   │   ├── service.js             # createMissionRecord, generateDecreeNum, ...
    │   │   ├── repository.js          # DB: Missions queries
    │   │   ├── constants.js           # MISSION_FIELDS
    │   │   └── index.js               # Empty barrel (unused)
    │   ├── reports/
    │   │   ├── routes.js              # POST /api/reports/missions
    │   │   ├── service.js             # searchMissionsService
    │   │   ├── repository.js          # DB: Missions search with filters
    │   │   └── index.js               # Empty barrel (unused)
    │   ├── dashboard/
    │   │   ├── routes.js              # GET /api/dashboard
    │   │   ├── service.js             # getDashboardData
    │   │   ├── repository.js          # DB: Dashboard metrics
    │   │   └── index.js               # Empty barrel (unused)
    │   ├── backup/
    │   │   ├── routes.js              # Backup CRUD + restore /api/backup*
    │   │   ├── service.js             # backupDownload, backupRestore, scheduledBackup
    │   │   ├── repository.js          # File I/O, validation, cleanup
    │   │   └── index.js               # Empty barrel (unused)
    │   ├── options/
    │   │   ├── routes.js              # Options CRUD /api/options
    │   │   ├── service.js             # getAllOptions, createOptionValue, ...
    │   │   ├── repository.js          # DB: SystemOptions queries
    │   │   └── index.js               # Empty barrel (unused)
    │   ├── audit/
    │   │   ├── routes.js              # GET /api/audit
    │   │   ├── service.js             # auditSearch
    │   │   ├── repository.js          # DB: AuditLog search
    │   │   └── index.js               # Empty barrel (unused)
    │   └── ai/
    │       ├── routes.js              # POST /api/ai/ask
    │       ├── service.js             # askQuestion
    │       └── index.js               # Empty barrel (unused)
    ├── infrastructure/
    │   ├── config/
    │   │   ├── env.js                 # dotenv config, JWT_SECRET, DB_PATH, ...
    │   │   ├── constants.js           # PERMISSIONS map
    │   │   └── index.js               # Empty barrel (unused)
    │   ├── database/
    │   │   ├── connection.js          # better-sqlite3 instance, dbRun/dbGet/dbAll
    │   │   ├── schema.js              # CREATE TABLE + CREATE INDEX SQL
    │   │   ├── initialize.js          # createTables, seedAdmin, migrateOptions
    │   │   └── index.js               # Empty barrel (unused)
    │   ├── security/
    │   │   ├── password.service.js    # hashPassword, legacyHash (SHA-256)
    │   │   ├── jwt.service.js         # signJwt, verifyJwt
    │   │   ├── permission.service.js  # serializePermissions, deserializePermissions
    │   │   ├── audit.service.js       # logAudit
    │   │   └── index.js               # Empty barrel (unused)
    │   ├── middleware/
    │   │   ├── auth.middleware.js     # createAuthenticateToken
    │   │   ├── audit.middleware.js    # auditMiddleware
    │   │   ├── security.middleware.js # helmet, cors, rateLimitLogin, loginAttempts
    │   │   └── index.js               # Empty barrel (unused)
    │   └── utils/
    │       ├── string.js              # normalizeDigits
    │       ├── json.js                # safeParse
    │       ├── date.js                # toJalaali
    │       └── index.js               # Empty barrel (unused)
    └── shared/
        └── index.js                   # Empty barrel (unused)
```

---

## 2. Dependency Graph

```
server.js
├── dotenv
├── express
├── helmet
├── cors
├── better-sqlite3
├── bcrypt
├── jsonwebtoken
└── ai_engine

src/infrastructure/
├── config/env.js ────────────────┐
├── database/connection.js ◄──────┤
├── database/schema.js ───────────┤
├── database/initialize.js ◄──────┤
├── security/password.service.js ◄┤
├── security/jwt.service.js ◄─────┤
├── security/permission.service.js◄┤
├── security/audit.service.js ◄───┤
├── middleware/auth.middleware.js ◄┤
├── middleware/audit.middleware.js◄┤
├── middleware/security.middleware.js
└── utils/string.js, json.js, date.js

src/domains/
├── auth/
│   ├── routes.js ────────────────► infrastructure/middleware/security.middleware.js
│   ├── service.js ───────────────► security/password.service.js, jwt.service.js, permission.service.js, users/repository.js
│   └── repository.js ────────────► database/connection.js
├── users/
│   ├── routes.js ────────────────► infrastructure/middleware/auth.middleware.js, security/permission.service.js, middleware/audit.middleware.js, config/constants.js, database/connection.js
│   ├── service.js ───────────────► infrastructure/security/password.service.js, permission.service.js, users/repository.js
│   └── repository.js ────────────► database/connection.js
├── personnel/
│   ├── routes.js ────────────────► middleware/auth.middleware.js, security/permission.service.js, middleware/audit.middleware.js, config/constants.js, database/connection.js
│   ├── service.js ───────────────► personnel/validator.js, personnel/repository.js
│   ├── repository.js ────────────► database/connection.js, utils/string.js
│   └── validator.js ─────────────► utils/string.js
├── missions/
│   ├── routes.js ────────────────► middleware/auth.middleware.js, security/permission.service.js, middleware/audit.middleware.js, config/constants.js, database/connection.js
│   ├── service.js ───────────────► missions/constants.js, missions/repository.js, utils/date.js
│   └── repository.js ────────────► database/connection.js
├── reports/
│   ├── routes.js ────────────────► middleware/auth.middleware.js, database/connection.js
│   ├── service.js ───────────────► reports/repository.js
│   └── repository.js ────────────► database/connection.js
├── dashboard/
│   ├── routes.js ────────────────► middleware/auth.middleware.js, database/connection.js
│   ├── service.js ───────────────► dashboard/repository.js
│   └── repository.js ────────────► database/connection.js
├── backup/
│   ├── routes.js ────────────────► middleware/auth.middleware.js, security/permission.service.js, config/constants.js, config/env.js, database/connection.js
│   ├── service.js ───────────────► config/env.js, backup/repository.js
│   └── repository.js ────────────► database/connection.js, config/env.js
├── options/
│   ├── routes.js ────────────────► middleware/auth.middleware.js, security/permission.service.js, middleware/audit.middleware.js, config/constants.js, database/connection.js
│   ├── service.js ───────────────► options/repository.js
│   └── repository.js ────────────► database/connection.js
├── audit/
│   ├── routes.js ────────────────► middleware/auth.middleware.js, security/permission.service.js, config/constants.js, database/connection.js
│   ├── service.js ───────────────► audit/repository.js
│   └── repository.js ────────────► database/connection.js
└── ai/
    ├── routes.js ────────────────► middleware/auth.middleware.js, database/connection.js
    └── service.js ───────────────► database/connection.js, ai_engine
```

---

## 3. Domain List

| Domain | Purpose | Extract? |
|--------|---------|----------|
| auth | Login, rate limiting, JWT issuance | No |
| users | User management, password changes | Yes |
| personnel | Personnel records, bulk import | Yes |
| missions | Mission records, decree numbering | Yes |
| reports | Mission search/filter | Yes |
| dashboard | Aggregate statistics | Yes |
| backup | Database backup/restore/list | Yes |
| options | Dropdown management | Yes |
| audit | Audit log search | Yes |
| ai | AI chat integration | Yes |

---

## 4. Infrastructure List

| Layer | Module | Purpose |
|-------|--------|---------|
| Config | `env.js`, `constants.js` | Dotenv, JWT secret, DB path, permissions enum |
| Database | `connection.js` | SQLite instance, dbRun/dbGet/dbAll wrappers, reconnectDatabase |
| Database | `schema.js` | CREATE TABLE and CREATE INDEX statements |
| Database | `initialize.js` | Table creation, admin seeding, options migration |
| Security | `password.service.js` | bcrypt hashing, legacy SHA-256 migration |
| Security | `jwt.service.js` | signJwt (HS256, 8h), verifyJwt |
| Security | `permission.service.js` | serializePermissions, deserializePermissions, getDefaultPermissions |
| Security | `audit.service.js` | logAudit insert |
| Middleware | `auth.middleware.js` | createAuthenticateToken, JWT validation |
| Middleware | `audit.middleware.js` | auditMiddleware, success-only logging |
| Middleware | `security.middleware.js` | helmet, CORS, rateLimitLogin, loginAttempts cleanup |
| Utils | `string.js` | normalizeDigits |
| Utils | `json.js` | safeParse |
| Utils | `date.js` | toJalaali |

---

## 5. Startup Flow

```
1. require('dotenv').config()
   └── Loads .env variables
2. require('./src/infrastructure/config/env')
   └── Exports PORT, JWT_SECRET, DB_PATH, CORS_ORIGIN, INIT_ADMIN_PASSWORD
3. require('./src/infrastructure/database/connection')
   └── new Database(DB_PATH) → console.log('✅ DB Connected')
4. require middleware modules
   └── helmet, cors, auth, audit, security
5. require domain routers
   └─ Mounts all 10 domain routers
6. const app = express()
   └── helmet, cors, json, static
7. startScheduledBackup()
   └── setInterval every 60s (fires at 02:00)
8. initializeDatabase()
   ├── createTables()
   ├── runMigrations()
   ├── seedAdmin()
   └── migrateOptions()
9. app.listen(PORT)
   └── console.log('🚀 RSTC running → http://localhost:${PORT}')
```

---

## 6. Request Lifecycle

```
Client Request
    │
    ▼
helmetMiddleware + corsMiddleware
    │
    ▼
express.json({ limit: '10mb' })
    │
    ▼
Route matching
    │
    ├── Public (no auth)
    │   ├── POST /api/login → rateLimitLogin → login() → response
    │   └── GET /api/health → inline handler → response
    │
    └── Protected routes
        │
        ▼
        authenticateToken
        │   ├── Extract JWT from Authorization header
        │   ├── verifyJwt(token, JWT_SECRET)
        │   └── Req.user = { id, username, role, permissions }
        │
        ▼
        requirePermission(PERMISSION) [if write endpoint]
        │   ├── Admin bypass (role === 'admin')
        │   └── Check req.user.permissions array
        │
        ▼
        express.raw(...) [if backup endpoint]
        │
        ▼
        auditMiddleware('Entity') [if write endpoint]
        │   └── On 2xx response → logAudit()
        │
        ▼
        Route handler
        │
        ▼
        service function
        │   ├── Validation
        │   ├── Business logic
        │   └── repository function call(s)
        │
        ▼
        repository function
        │   └── Parameterized SQL via dbRun / dbGet / dbAll
        │
        ▼
        JSON response
```

---

## 7. Authentication Flow

```
POST /api/login
    │
    ▼
rateLimitLogin middleware
    │   ├── ip + loginAttempts Map
    │   ├── Track failed attempts
    │   └── Reject if count > 5
    │
    ▼
login(username, password, ip, loginAttempts)
    │
    ├── findUserByUsername(username)
    │   └── SELECT * FROM Users WHERE username = ?
    │
    ├── Password verification
    │   ├── bcrypt.compare(password, hash) [modern]
    │   └── legacyHash(password) [SHA-256 migration]
    │
    ├── On success:
    │   ├── updateUserPassword(id, hash) if legacy
    │   ├── loginAttempts.delete(ip)
    │   ├── updateUserLogin(id, now)
    │   ├── deserializePermissions(user.permissions)
    │   └── signJwt({ id, username, role, permissions })
    │       └── jsonwebtoken.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '8h' })
    │
    └── Response: { success: true, token, role, username, permissions }
```

### JWT Usage in Subsequent Requests
```
Authorization: Bearer <token>
    │
    ▼
authenticateToken
    │   ├── Extract token from header
    │   ├── verifyJwt(token, JWT_SECRET)
    │   ├── If permissions missing → DB lookup for fresh permissions
    │   └── req.user = payload
    │
    ▼
requirePermission(check)
    │   ├── admin role bypass
    │   └── Array.includes(req.user.permissions)
```

---

## 8. Database Flow

```
connection.js
    │
    ├── let db = new Database(DB_PATH)  [singleton]
    ├── db.pragma('journal_mode = WAL')
    │
    ├── dbRun(sql, params)     → db.prepare(sql).run(params)
    ├── dbGet(sql, params)     → db.prepare(sql).get(params)
    └── dbAll(sql, params)     → db.prepare(sql).all(params)

initialize.js
    │
    ├── createTables()
    │   ├── TABLE_USERS
    │   ├── ALTER TABLE Users ADD COLUMN ...
    │   ├── TABLE_PERSONNEL
    │   ├── CREATE INDEX Personnel_code ...
    │   ├── TABLE_MISSIONS
    │   ├── INDEX_DECREE_NUM
    │   ├── TABLE_AUDIT_LOG
    │   ├── INDEX_AUDIT_CREATED
    │   └── TABLE_SYSTEM_OPTIONS
    │
    ├── runMigrations()
    │   └── Check Missions schema version
    │
    ├── seedAdmin()
    │   └── INSERT/UPDATE admin user with hashPassword(INIT_ADMIN_PASSWORD)
    │
    └── migrateOptions()
        └── Migrate legacy options.json → SystemOptions table

Backup Flow
    │
    ├── createBackupFile()
    │   ├── ensureBackupDir()
    │   ├── fs.promises.copyFile(dbPath, backupPath)
    │   └── Returns dest path
    │
    ├── listBackupFiles()
    │   ├── fs.promises.readdir(BACKUP_DIR)
    │   ├── Filter .db files
    │   └── fs.promises.stat per file → size, mtime, jalali date
    │
    ├── validateBackupFile(data)
    │   ├── Write temp .db file
    │   ├── new Database(tmp) → read tables + counts
    │   ├── PRAGMA integrity_check
    │   ├── PRAGMA page_count / page_size
    │   └── Delete temp file
    │
    └── restoreBackupFile(body)
        ├── db.close()
        ├── fs.promises.copyFile(dbPath, dbPath + '.bak')
        ├── fs.promises.writeFile(dbPath, body)
        ├── Clean WAL/SHM files
        └── reconnectDatabase(dbPath) → new Database(dbPath)
```

---

## 9. Security Hardening Inventory

| Control | Implementation |
|---------|----------------|
| Helmet | `helmetMiddleware` applied globally |
| CORS | `corsMiddleware` with `CORS_ORIGIN` |
| Rate limiting | `rateLimitLogin` — 5 attempts per IP per window |
| JWT | HS256, 8h expiration, required at startup |
| Password hashing | bcrypt with 10 rounds |
| SQL injection | 100% parameterized queries |
| Path traversal | `isValidBackupName()` on all backup file access |
| JSON parsing | `safeParse()` fallback for SystemOptions |
| File uploads | 50MB raw limit, isolated temp file for validation |
| Backup restore | Pre-restore DB backup, WAL/SHM cleanup, reconnect |

---

## 10. Known Technical Debt

| Item | Priority | Recommended Action |
|------|----------|-------------------|
| Empty barrel files | Low | Remove in next cleanup |
| Dashboard sequential queries | Low | Parallelize with Promise.all |
| Stream error handling | Medium | Add `.on('error', ...)` handlers |
| Personnel bulk permissions | Low | Evaluate permission requirement |
| Startup order | Low | Move startScheduledBackup inside initializeDatabase |
