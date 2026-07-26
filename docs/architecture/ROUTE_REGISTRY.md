# ROUTE_REGISTRY.md — RSTC_App

## 1. Route Inventory

### 1.1 Authentication

| HTTP Method | Path | Line(s) | Auth Required | Required Middleware | Required Permission | Request Body | URL Parameters | Query Parameters | Response Format | Possible Status Codes | Domain Ownership | Future Destination | Notes |
|-------------|------|---------|---------------|---------------------|---------------------|--------------|----------------|------------------|-----------------|-----------------------|------------------|--------------------|-------|
| POST | /api/login | 394 | No | rateLimitLogin | None | `{ username, password }` | — | — | `{ success, token, role, username, permissions }` or `{ success: false, message }` or `{ error }` | 200, 400, 401, 403, 429, 500 | auth | `src/domains/auth/routes.js` | Returns JWT. Rate limited to 10 attempts per 15 min per IP. |

### 1.2 Dashboard

| HTTP Method | Path | Line(s) | Auth Required | Required Middleware | Required Permission | Request Body | URL Parameters | Query Parameters | Response Format | Possible Status Codes | Domain Ownership | Future Destination | Notes |
|-------------|------|---------|---------------|---------------------|---------------------|--------------|----------------|------------------|-----------------|-----------------------|------------------|--------------------|-------|
| GET | /api/dashboard | 426 | Yes | authenticateToken | None | — | — | — | `{ total, active, inactive, missionCount, userCount, byType, byDegree, byRegion, byMissionType, singleVsGroup, suppliedVsUn, recentPersonnel, recentMissions }` | 200, 401, 403, 500 | dashboard | `src/domains/dashboard/routes.js` | Aggregates data from Personnel, Missions, Users tables. |

### 1.3 Users

| HTTP Method | Path | Line(s) | Auth Required | Required Middleware | Required Permission | Request Body | URL Parameters | Query Parameters | Response Format | Possible Status Codes | Domain Ownership | Future Destination | Notes |
|-------------|------|---------|---------------|---------------------|---------------------|--------------|----------------|------------------|-----------------|-----------------------|------------------|--------------------|-------|
| PUT | /api/users/self/self-password | 456 | Yes | authenticateToken | None | `{ currentPassword, newPassword }` | — | — | `{ success: true }` or `{ error }` | 200, 400, 401, 404, 500 | users | `src/domains/users/routes.js` | Must be defined before `/api/users/:id` to avoid Express param shadowing. |
| GET | /api/users | 470 | Yes | authenticateToken | USERS_VIEW | — | — | — | `[{ id, username, role, permissions, status, last_login, login_count, created_at }]` | 200, 401, 403, 500 | users | `src/domains/users/routes.js` | Excludes `password` column. |
| POST | /api/users | 474 | Yes | authenticateToken, auditMiddleware('User') | USERS_CREATE | `{ username, password, role, permissions? }` | — | — | `{ success: true }` or `{ error }` | 200, 400, 401, 403, 500 | users | `src/domains/users/routes.js` | Creates admin if environment requires. Validates username regex `^[a-zA-Z0-9_]+$`. |
| PUT | /api/users/:id | 491 | Yes | authenticateToken, auditMiddleware('User') | USERS_EDIT | `{ username?, role?, status?, permissions? }` | `:id` (userId) | — | `{ success: true }` or `{ error }` | 200, 400, 401, 403, 404, 500 | users | `src/domains/users/routes.js` | Protects userId 1 from disable/role change/delete. |
| PUT | /api/users/:id/password | 523 | Yes | authenticateToken | USERS_EDIT | `{ password }` | `:id` (userId) | — | `{ success: true }` or `{ error }` | 200, 400, 401, 403, 500 | users | `src/domains/users/routes.js` | Admin password reset. Min length 4. |
| DELETE | /api/users/:id | 532 | Yes | authenticateToken, auditMiddleware('User') | USERS_DELETE | — | `:id` (userId) | — | `{ success: true }` or `{ error }` | 200, 400, 401, 403, 500 | users | `src/domains/users/routes.js` | Protects userId 1 from deletion. |

### 1.4 Personnel

| HTTP Method | Path | Line(s) | Auth Required | Required Middleware | Required Permission | Request Body | URL Parameters | Query Parameters | Response Format | Possible Status Codes | Domain Ownership | Future Destination | Notes |
|-------------|------|---------|---------------|---------------------|---------------------|--------------|----------------|------------------|-----------------|-----------------------|------------------|--------------------|-------|
| POST | /api/personnel | 578 | Yes | authenticateToken, auditMiddleware('Personnel') | PERSONNEL_CREATE | `{ name, lname, father_name?, national_id?, emp_num?, hire_date?, emp_type?, org_post?, job_title?, last_degree?, phone?, address?, status?, notes? }` | — | — | `{ success: true }` or `{ error }` | 200, 400, 401, 403, 500 | personnel | `src/domains/personnel/routes.js` | Normalizes Persian/Arabic digits. Enforces national_id uniqueness. |
| GET | /api/personnel | 592 | Yes | authenticateToken | PERSONNEL_VIEW | — | — | — | `[ Personnel row ]` | 200, 401, 403, 500 | personnel | `src/domains/personnel/routes.js` | Returns all personnel ordered by id DESC. |
| PUT | /api/personnel/:id | 596 | Yes | authenticateToken, auditMiddleware('Personnel') | PERSONNEL_EDIT | `{ name, lname, father_name?, national_id?, emp_num?, hire_date?, emp_type?, org_post?, job_title?, last_degree?, phone?, address?, status?, notes? }` | `:id` (personnelId) | — | `{ success: true }` or `{ error }` | 200, 400, 401, 403, 500 | personnel | `src/domains/personnel/routes.js` | Normalizes digits, validates national_id length. |
| DELETE | /api/personnel/:id | 610 | Yes | authenticateToken, auditMiddleware('Personnel') | PERSONNEL_DELETE | — | `:id` (personnelId) | — | `{ success: true }` or `{ error }` | 200, 401, 403, 500 | personnel | `src/domains/personnel/routes.js` | Hard delete. |
| POST | /api/personnel/bulk | 616 | Yes | authenticateToken | None (all authenticated) | `[{ Persian/English headers }]` (array, max 1000) | — | — | `{ success: true, imported, failed, errors }` | 200, 400, 401, 500 | personnel | `src/domains/personnel/routes.js` | Accepts bilingual headers. Wraps in explicit transaction. |

### 1.5 Missions

| HTTP Method | Path | Line(s) | Auth Required | Required Middleware | Required Permission | Request Body | URL Parameters | Query Parameters | Response Format | Possible Status Codes | Domain Ownership | Future Destination | Notes |
|-------------|------|---------|---------------|---------------------|---------------------|--------------|----------------|------------------|-----------------|-----------------------|------------------|--------------------|-------|
| POST | /api/missions | 686 | Yes | authenticateToken, auditMiddleware('Mission') | MISSIONS_CREATE | `{ name, start_date, end_date, issue_date, lname?, emp_num?, job_title?, mission_type?, device_type?, repair_type?, region?, location?, subject?, device_serial?, duration?, overtime_hours?, is_single?, is_group?, is_supplied?, is_unsupplied?, is_issued?, is_extended?, is_gov?, is_plane?, is_train?, is_agency?, is_bus?, is_personal? }` | — | — | `{ success: true, decree_num }` or `{ error }` | 200, 400, 401, 403, 500 | missions | `src/domains/missions/routes.js` | Auto-generates decree_num in `RSTC-YYYYMMDD-XXXX` format. Uses `MISSION_FIELDS` array for column mapping. |
| GET | /api/missions | 702 | Yes | authenticateToken | MISSIONS_VIEW | — | — | — | `[ Mission row ]` | 200, 401, 403, 500 | missions | `src/domains/missions/routes.js` | Returns all missions ordered by id DESC. |
| PUT | /api/missions/:id | 709 | Yes | authenticateToken, auditMiddleware('Mission') | MISSIONS_EDIT | `{ name, start_date, end_date, issue_date, lname?, emp_num?, ... }` | `:id` (missionId) | — | `{ success: true }` or `{ error }` | 200, 400, 401, 403, 500 | missions | `src/domains/missions/routes.js` | Updates all fields except decree_num. Uses `MISSION_FIELDS` filter. |
| DELETE | /api/missions/:id | 724 | Yes | authenticateToken, auditMiddleware('Mission') | MISSIONS_DELETE | — | `:id` (missionId) | — | `{ success: true }` or `{ error }` | 200, 401, 403, 500 | missions | `src/domains/missions/routes.js` | Hard delete. |
| GET | /api/missions/:id/pdf | 967 | No | None | None | — | `:id` (missionId) | — | `{ error: 'PDF export is now client-side only...' }` | 404, — | missions | `src/domains/missions/routes.js` | Stub endpoint. Client-side PDF via jsPDF. |

### 1.6 Reports

| HTTP Method | Path | Line(s) | Auth Required | Required Middleware | Required Permission | Request Body | URL Parameters | Query Parameters | Response Format | Possible Status Codes | Domain Ownership | Future Destination | Notes |
|-------------|------|---------|---------------|---------------------|---------------------|--------------|----------------|------------------|-----------------|-----------------------|------------------|--------------------|-------|
| POST | /api/reports/missions | 730 | Yes | authenticateToken | None | `{ name?, lname?, emp_num?, decree_num?, device_type?, device_serial?, region?, mission_type?, location?, start_date_from?, start_date_to?, end_date_from?, end_date_to?, issue_date_from?, issue_date_to? }` | — | — | `{ results: [Mission row], total }` | 200, 401, 403, 500 | reports | `src/domains/reports/routes.js` | Dynamic WHERE builder with LIKE and range filters. |

### 1.7 Backup

| HTTP Method | Path | Line(s) | Auth Required | Required Middleware | Required Permission | Request Body | URL Parameters | Query Parameters | Response Format | Possible Status Codes | Domain Ownership | Future Destination | Notes |
|-------------|------|---------|---------------|---------------------|---------------------|--------------|----------------|------------------|-----------------|-----------------------|------------------|--------------------|-------|
| GET | /api/backup | 759 | Yes | authenticateToken | BACKUP_CREATE | — | — | — | Binary `.db` stream or `{ error }` | 200, 401, 403, 404, 500 | backup | `src/domains/backup/routes.js` | Downloads active database file. Sets `Content-Disposition` and `Content-Type: application/octet-stream`. |
| GET | /api/backups | 769 | Yes | authenticateToken | BACKUP_VIEW | — | — | — | `{ backups: [{ name, size, sizeMB, modified, modifiedJalali }], settings: { maxBackups: 30, scheduleHour: 2 } }` | 200, 401, 403, 500 | backup | `src/domains/backup/routes.js` | Lists `.db` files in `BACKUP_DIR`. |
| GET | /api/backups/:name | 789 | Yes | authenticateToken | BACKUP_VIEW | — | `:name` (filename) | — | Binary `.db` stream or `{ error }` | 200, 401, 403, 404, 500 | backup | `src/domains/backup/routes.js` | Downloads specific backup file. |
| POST | /api/backups/validate | 797 | Yes | authenticateToken, express.raw middleware | BACKUP_VIEW | Binary `application/octet-stream` (max 50mb) | — | — | `{ valid: true, sizeMB, tables, counts, integrity, pageCount, pageSize, estimatedSizeMB }` or `{ valid: false, error }` | 200, 400, 401, 403, 500 | backup | `src/domains/backup/routes.js` | Saves temp file, opens with better-sqlite3, runs `PRAGMA integrity_check`, deletes temp. |
| DELETE | /api/backups/:name | 828 | Yes | authenticateToken | BACKUP_VIEW | — | `:name` (filename) | — | `{ success: true, message }` or `{ error }` | 200, 401, 403, 404, 500 | backup | `src/domains/backup/routes.js` | Hard delete from filesystem. |
| POST | /api/restore | 837 | Yes | authenticateToken, express.raw middleware | BACKUP_RESTORE | Binary `application/octet-stream` (max 50mb) | — | — | `{ success: true, message }` or `{ error }` | 200, 401, 403, 500 | backup | `src/domains/backup/routes.js` | Closes DB, backs up current `.db` to `.bak`, writes uploaded file, clears WAL/SHM, reopens DB. **Security-critical.** |

### 1.8 Options

| HTTP Method | Path | Line(s) | Auth Required | Required Middleware | Required Permission | Request Body | URL Parameters | Query Parameters | Response Format | Possible Status Codes | Domain Ownership | Future Destination | Notes |
|-------------|------|---------|---------------|---------------------|---------------------|--------------|----------------|------------------|-----------------|-----------------------|------------------|--------------------|-------|
| GET | /api/options | 869 | Yes | authenticateToken | None | — | — | — | `{ [field]: { label, options: [string] } }` | 200, 401, 403, 500 | options | `src/domains/options/routes.js` | Returns all SystemOptions rows parsed from JSON. |
| GET | /api/options/:field | 874 | Yes | authenticateToken | None | — | `:field` (option key) | — | `{ label, options: [string] }` or `{ error }` | 200, 401, 403, 404, 500 | options | `src/domains/options/routes.js` | Returns single option field. |
| POST | /api/options/:field | 883 | Yes | authenticateToken, auditMiddleware('Option') | OPTIONS_EDIT | `{ label?, value }` | `:field` (option key) | — | `{ success: true, options }` or `{ error }` | 200, 400, 401, 403, 404, 500 | options | `src/domains/options/routes.js` | Adds value to options array. Checks duplicates. |
| PUT | /api/options/:field | 897 | Yes | authenticateToken, auditMiddleware('Option') | OPTIONS_EDIT | `{ oldValue, newValue, label? }` | `:field` (option key) | — | `{ success: true, options }` or `{ error }` | 200, 400, 401, 403, 404, 500 | options | `src/domains/options/routes.js` | Renames option value by index. |
| DELETE | /api/options/:field/:index | 916 | Yes | authenticateToken, auditMiddleware('Option') | OPTIONS_EDIT | — | `:field` (option key), `:index` (numeric) | — | `{ success: true, options }` or `{ error }` | 200, 400, 401, 403, 404, 500 | options | `src/domains/options/routes.js` | Removes option by array index. |

### 1.9 Audit

| HTTP Method | Path | Line(s) | Auth Required | Required Middleware | Required Permission | Request Body | URL Parameters | Query Parameters | Response Format | Possible Status Codes | Domain Ownership | Future Destination | Notes |
|-------------|------|---------|---------------|---------------------|---------------------|--------------|----------------|------------------|-----------------|-----------------------|------------------|--------------------|-------|
| GET | /api/audit | 930 | Yes | authenticateToken | AUDIT_VIEW | — | — | `entity?`, `username?`, `limit?` | `{ results: [AuditLog row] }` | 200, 401, 403, 500 | audit | `src/domains/audit/routes.js` | Default limit 100. Filters by entity and username LIKE. |

### 1.10 AI Chat

| HTTP Method | Path | Line(s) | Auth Required | Required Middleware | Required Permission | Request Body | URL Parameters | Query Parameters | Response Format | Possible Status Codes | Domain Ownership | Future Destination | Notes |
|-------------|------|---------|---------------|---------------------|---------------------|--------------|----------------|------------------|-----------------|-----------------------|------------------|--------------------|-------|
| POST | /api/ai/ask | 976 | Yes | authenticateToken | None | `{ question }` | — | — | `{ success: true, question, answer }` or `{ error }` | 200, 400, 401, 500 | ai | `src/domains/ai/routes.js` | Passes `dbGet` and `dbAll` to `ai_engine.parseAndAnswer`. No rate limiting. |

### 1.11 Health

| HTTP Method | Path | Line(s) | Auth Required | Required Middleware | Required Permission | Request Body | URL Parameters | Query Parameters | Response Format | Possible Status Codes | Domain Ownership | Future Destination | Notes |
|-------------|------|---------|---------------|---------------------|---------------------|--------------|----------------|------------------|-----------------|-----------------------|------------------|--------------------|-------|
| GET | /api/health | 972 | No | None | None | — | — | — | `{ ok: true, time }` | 200, — | app | `src/app/routes.js` | Liveness check. No auth. |

---

## 2. Route Statistics

| Metric | Count |
|--------|-------|
| **Total routes** | 33 |
| **GET** | 12 |
| **POST** | 10 |
| **PUT** | 6 |
| **DELETE** | 5 |
| **Protected routes** | 30 |
| **Public routes** | 3 |

### 2.1 Routes by Future Domain

| Future Domain | Routes | Count |
|---------------|--------|-------|
| auth | /api/login | 1 |
| dashboard | /api/dashboard | 1 |
| users | /api/users (5 routes) | 5 |
| personnel | /api/personnel (4 routes), /api/personnel/bulk | 5 |
| missions | /api/missions (4 routes), /api/missions/:id/pdf | 5 |
| reports | /api/reports/missions | 1 |
| backup | /api/backup, /api/backups (3 routes), /api/backups/validate, /api/restore | 6 |
| options | /api/options (5 routes) | 5 |
| audit | /api/audit | 1 |
| ai | /api/ai/ask | 1 |
| app | /api/health | 1 |
| **Total** | | **33** |

---

## 3. Migration Order

### Phase 2 — Extract Auth Domain

| Route | Reason |
|-------|--------|
| POST /api/login | Lowest business risk. Other domains remain in `server.js`. |

### Phase 3 — Extract Personnel Domain

| Route | Reason |
|-------|--------|
| POST /api/personnel | Simplest CRUD domain. Proves domain pattern. |
| GET /api/personnel | |
| PUT /api/personnel/:id | |
| DELETE /api/personnel/:id | |
| POST /api/personnel/bulk | Complex but contained. |

### Phase 4 — Extract Missions Domain

| Route | Reason |
|-------|--------|
| POST /api/missions | Core business capability. |
| GET /api/missions | |
| PUT /api/missions/:id | |
| DELETE /api/missions/:id | |
| GET /api/missions/:id/pdf | Stub route, low risk. |

### Phase 5 — Extract Users, Reports, Dashboard, AI

| Route | Reason |
|-------|--------|
| GET /api/dashboard | Aggregation across domains. |
| PUT /api/users/self/self-password | User self-service. |
| GET /api/users | |
| POST /api/users | |
| PUT /api/users/:id | |
| PUT /api/users/:id/password | |
| DELETE /api/users/:id | |
| POST /api/reports/missions | Read-heavy, query complexity. |
| POST /api/ai/ask | Depends on infrastructure only. |

### Phase 6 — Extract Backup, Options, Audit

| Route | Reason |
|-------|--------|
| GET /api/backup | File-system-dominant. |
| GET /api/backups | |
| GET /api/backups/:name | |
| POST /api/backups/validate | |
| DELETE /api/backups/:name | |
| POST /api/restore | Most sensitive. Extract last. |
| GET /api/options | Simple CRUD with JSON. |
| GET /api/options/:field | |
| POST /api/options/:field | |
| PUT /api/options/:field | |
| DELETE /api/options/:field/:index | |
| GET /api/audit | Read-only, depends on AuditLog table. |
