# DOMAIN_AUDIT.md

Date: 2025-07-26
Auditor: Automated / Kilo
Scope: auth, users, personnel, missions, reports, dashboard, backup

---

## 1. AUTH DOMAIN

### 1.1 Dependency Graph
```
src/domains/auth/routes.js
    └── src/domains/auth/service.js
            ├── src/infrastructure/security/password.service.js (hashPassword, legacyHash)
            ├── src/infrastructure/security/jwt.service.js (signJwt)
            ├── src/infrastructure/security/permission.service.js (deserializePermissions)
            └── src/domains/auth/repository.js
                    └── src/infrastructure/database/connection.js
```

### 1.2 Imports
- **routes.js**: `express`, `./service`, `../../infrastructure/middleware/security.middleware`
- **service.js**: `bcrypt`, `../../infrastructure/security/password.service`, `../../infrastructure/security/jwt.service`, `../../infrastructure/security/permission.service`, `./repository`
- **repository.js**: `../../infrastructure/database/connection`

### 1.3 Unused Imports
None.

### 1.4 Unused Functions
None. All exported functions are consumed.

### 1.5 Dead Code
None.

### 1.6 Circular Dependency Check
No circular dependencies detected.

### 1.7 Relative Path Correctness
All domain-to-infrastructure paths use `../../infrastructure/...`, which is correct for src/domains/*/.

### 1.8 Repository Contains SQL Only
Yes. All SQL is in repository.js. No business logic. Queries:
- `SELECT * FROM Users WHERE username = ?`
- `UPDATE Users SET password = ? WHERE id = ?`
- `UPDATE Users SET last_login = ?, login_count = login_count + 1 WHERE id = ?`

### 1.9 Service Contains Business Logic Only
Yes. Login orchestration, legacy SHA-256 upgrade path, permission deserialization, JWT issuance. No Express objects. No raw SQL.

### 1.10 Routes Contain Express Wiring Only
Yes. Single POST / route wrapping `login()` with `rateLimitLogin` middleware.

### 1.11 No Duplicated Helper Functions
- `findUserByUsername` is duplicated in `auth/repository.js` and `users/repository.js` (see Users domain note).
- `updateUserPassword` is duplicated in `auth/repository.js` and `users/repository.js`.

### 1.12 No Duplicated Constants
None.

### 1.13 No Duplicated Validation Logic
Validation is minimal in auth (required fields), unique to this domain.

### 1.14 TODO/FIXME
None.

### 1.15 Potential Refactoring Candidates
- Extract shared user repository helpers (`findUserByUsername`, `updateUserPassword`) into a shared `src/domains/users/` utility or keep duplicated given different call sites.

---

## 2. USERS DOMAIN

### 2.1 Dependency Graph
```
src/domains/users/routes.js
    └── src/domains/users/service.js
            ├── src/infrastructure/security/password.service.js
            ├── src/infrastructure/security/permission.service.js
            └── src/domains/users/repository.js
                    └── src/infrastructure/database/connection.js
```

### 2.2 Imports
- **routes.js**: `express`, `./service`, `../../infrastructure/middleware/auth.middleware`, `../../infrastructure/security/permission.service`, `../../infrastructure/database/connection`, `../../infrastructure/middleware/audit.middleware`, `../../infrastructure/config/constants`
- **service.js**: `bcrypt`, `../../infrastructure/security/password.service`, `../../infrastructure/security/permission.service`, `./repository`
- **repository.js**: `../../infrastructure/database/connection`

### 2.3 Unused Imports
None.

### 2.4 Unused Functions
None. All service functions are used by routes. All repository functions are used by service.

### 2.5 Dead Code
None.

### 2.6 Circular Dependency Check
No circular dependencies detected.

### 2.7 Relative Path Correctness
Correct (`../../infrastructure/...`).

### 2.8 Repository Contains SQL Only
Yes. SQL limited to Users table CRUD.

### 2.9 Service Contains Business Logic Only
Yes. Validation, permission resolution, password hashing, admin-protection rules. No raw SQL. No Express.

### 2.10 Routes Contain Express Wiring Only
Yes. RESTful routes with auth + permission + audit middleware.

### 2.11 No Duplicated Helper Functions
- `findUserByUsername` duplicated with `auth/repository.js`.
- `updateUserPassword` duplicated with `auth/repository.js`.

### 2.12 No Duplicated Constants
None.

### 2.13 No Duplicated Validation Logic
Username validation regex (`/^[a-zA-Z0-9_]+$/`) and length rules are unique to users.

### 2.14 TODO/FIXME
None.

### 2.15 Potential Refactoring Candidates
- Remove passthrough wrappers `getUserById` and `getAllUsers` — they add no logic.
- `findUserById` and `findUserByUsername` duplicated from auth domain; consider sharing via a common user-query module.

---

## 3. PERSONNEL DOMAIN

### 3.1 Dependency Graph
```
src/domains/personnel/routes.js
    └── src/domains/personnel/service.js
            ├── src/domains/personnel/validator.js (validatePersonnel, normalizeDigits)
            └── src/domains/personnel/repository.js
                    └── src/infrastructure/database/connection.js
```

### 3.2 Imports
- **routes.js**: `express`, `./service`, `../../infrastructure/middleware/auth.middleware`, `../../infrastructure/database/connection`, `../../infrastructure/security/permission.service`, `../../infrastructure/middleware/audit.middleware`, `../../infrastructure/config/constants`, `./repository`
- **service.js**: `./validator`, `./repository`, `../../infrastructure/database/connection` (via `dbRun` for transaction)
- **repository.js**: `../../infrastructure/database/connection`
- **validator.js**: no external deps (pure validation)

### 3.3 Unused Imports
None.

### 3.4 Unused Functions
None.

### 3.5 Dead Code
None.

### 3.6 Circular Dependency Check
No circular dependencies detected.

### 3.7 Relative Path Correctness
Correct.

### 3.8 Repository Contains SQL Only
Yes.

### 3.9 Service Contains Business Logic Only
Yes. Validation, transaction handling, duplicate detection during bulk import. No raw SQL in routes. Note: `dbRun("BEGIN TRANSACTION")` and `dbRun("COMMIT")` are called in service.js for transaction control — acceptable as orchestration, but could be moved to repository if desired.

### 3.10 Routes Contain Express Wiring Only
Yes. Note: routes.js imports `findAllPersonnel` from `./repository` directly to bypass service layer for the GET endpoint — minor inconsistency but intentional.

### 3.11 No Duplicated Helper Functions
- `normalizeDigits` exists in `personnel/validator.js` and was previously in `server.js`; no other domain duplicates it.

### 3.12 No Duplicated Constants
None.

### 3.13 No Duplicated Validation Logic
`validatePersonnel` and `normalizeDigits` are unique to personnel.

### 3.14 TODO/FIXME
None.

### 3.15 Potential Refactoring Candidates
- Move transaction BEGIN/COMMIT/ROLLBACK out of service.js into repository to keep service pure.
- `findAllPersonnel` imported directly in routes bypasses service abstraction.

---

## 4. MISSIONS DOMAIN

### 4.1 Dependency Graph
```
src/domains/missions/routes.js
    └── src/domains/missions/service.js
            ├── src/domains/missions/constants.js (MISSION_FIELDS)
            └── src/domains/missions/repository.js
                    └── src/infrastructure/database/connection.js
```

### 4.2 Imports
- **routes.js**: `express`, `./service`, `../../infrastructure/middleware/auth.middleware`, `../../infrastructure/security/permission.service`, `../../infrastructure/database/connection`, `../../infrastructure/middleware/audit.middleware`, `../../infrastructure/config/constants`
- **service.js**: `./constants`, `./repository`
- **repository.js**: `../../infrastructure/database/connection`, `./constants`
- **constants.js**: no external deps

### 4.3 Unused Imports
None.

### 4.4 Unused Functions
None.

### 4.5 Dead Code
- `router.get('/:id/pdf')` returns a 404 stub. This is intentional migration residue but is effectively dead route logic.

### 4.6 Circular Dependency Check
No circular dependencies detected.

### 4.7 Relative Path Correctness
Correct.

### 4.8 Repository Contains SQL Only
Yes.

### 4.9 Service Contains Business Logic Only
Yes. Decree-number generation, Jalaali date conversion, field mapping. No Express. No raw SQL.

### 4.10 Routes Contain Express Wiring Only
Yes.

### 4.11 No Duplicated Helper Functions
None.

### 4.12 No Duplicated Constants
`MISSION_FIELDS` is unique to missions.

### 4.13 No Duplicated Validation Logic
None.

### 4.14 TODO/FIXME
None.

### 4.15 Potential Refactoring Candidates
- `toJalaali` is an inline minified function; consider extracting to `src/infrastructure/utils/date.js` or keeping in service if only used here.
- The 404 PDF route stub could be removed entirely since client-side PDF is the intended path.

---

## 5. REPORTS DOMAIN

### 5.1 Dependency Graph
```
src/domains/reports/routes.js
    └── src/domains/reports/service.js
            └── src/domains/reports/repository.js
                    └── src/infrastructure/database/connection.js
```

### 5.2 Imports
- **routes.js**: `express`, `./service`, `../../infrastructure/middleware/auth.middleware`, `../../infrastructure/database/connection`
- **service.js**: `./repository`
- **repository.js**: `../../infrastructure/database/connection`

### 5.3 Unused Imports
None.

### 5.4 Unused Functions
None.

### 5.5 Dead Code
None.

### 5.6 Circular Dependency Check
No circular dependencies detected.

### 5.7 Relative Path Correctness
Correct.

### 5.8 Repository Contains SQL Only
Yes. Dynamic WHERE clause builder is in service, repository just executes parameterized query.

### 5.9 Service Contains Business Logic Only
Yes. Filter-to-SQL condition mapping. No Express. No raw SQL in routes.

### 5.10 Routes Contain Express Wiring Only
Yes. Minimal single-route router.

### 5.11 No Duplicated Helper Functions
None.

### 5.12 No Duplicated Constants
None.

### 5.13 No Duplicated Validation Logic
None.

### 5.14 TODO/FIXME
None.

### 5.15 Potential Refactoring Candidates
- `buildConditions` in service.js could be reused by missions domain if missions ever gains a search endpoint; consider moving to shared filter builder.

---

## 6. DASHBOARD DOMAIN

### 6.1 Dependency Graph
```
src/domains/dashboard/routes.js
    └── src/domains/dashboard/service.js
            └── src/domains/dashboard/repository.js
                    └── src/infrastructure/database/connection.js
```

### 6.2 Imports
- **routes.js**: `express`, `./service`, `../../infrastructure/middleware/auth.middleware`, `../../infrastructure/database/connection`
- **service.js**: `./repository`
- **repository.js**: `../../infrastructure/database/connection`

### 6.3 Unused Imports
None.

### 6.4 Unused Functions
None. All 13 repository functions are consumed.

### 6.5 Dead Code
None.

### 6.6 Circular Dependency Check
No circular dependencies detected.

### 6.7 Relative Path Correctness
Correct.

### 6.8 Repository Contains SQL Only
Yes. 13 read-only aggregate/listing queries.

### 6.9 Service Contains Business Logic Only
Yes. Parallel aggregation via Promise.all. No Express. No raw SQL in routes.

### 6.10 Routes Contain Express Wiring Only
Yes.

### 6.11 No Duplicated Helper Functions
None.

### 6.12 No Duplicated Constants
None.

### 6.13 No Duplicated Validation Logic
None.

### 6.14 TODO/FIXME
None.

### 6.15 Potential Refactoring Candidates
- The 13 repository functions could be grouped by entity (Personnel vs Missions) if dashboard grows further.

---

## 7. BACKUP DOMAIN

### 7.1 Dependency Graph
```
src/domains/backup/routes.js
    └── src/domains/backup/service.js
            └── src/domains/backup/repository.js
                    ├── src/infrastructure/database/connection.js
                    └── src/infrastructure/config/env.js
```

### 7.2 Imports
- **routes.js**: `express`, `fs`, `path`, `./service`, `../../infrastructure/middleware/auth.middleware`, `../../infrastructure/database/connection`, `../../infrastructure/security/permission.service`, `../../infrastructure/config/constants`, `../../infrastructure/config/env`
- **service.js**: `path`, `fs`, `../../infrastructure/config/env`, `./repository`
- **repository.js**: `path`, `fs`, `better-sqlite3`, `../../infrastructure/database/connection`, `../../infrastructure/config/env`

### 7.3 Unused Imports
- **routes.js**: `path` is imported but not used (BACKUP_DIR is constructed inline in routes only for use in service? Actually `BACKUP_DIR` is computed locally but not used because service functions receive it implicitly; still, route handlers call service functions without BACKUP_DIR arg, so service uses its own. `path` in routes is unused.)
- **service.js**: `path` is used for BACKUP_DIR construction and in error cleanup path joins — actually used.

Wait, let me re-check routes.js. `path` is imported but I don't see it used in the route handlers. Let me verify: line 3 imports `path = require('path')`, but backup routes don't use `path` directly. Service functions use `DB_PATH` and `BACKUP_DIR` from env. So `path` in routes.js is unused.

- **repository.js**: No unused imports.

### 7.4 Unused Functions
- **service.js**: exports `BACKUP_DIR`, but routes.js computes its own `BACKUP_DIR` and never imports the exported constant from service. `BACKUP_DIR` export is unused outside service.js.
- **repository.js**: All functions appear used by service.js.

### 7.5 Dead Code
- `BACKUP_DIR` in service.js is exported but unused.
- `BACKUP_DIR` in routes.js is computed locally but also unused because route handlers don't pass it.

### 7.6 Circular Dependency Check
No circular dependencies detected.

### 7.7 Relative Path Correctness
Correct.

### 7.8 Repository Contains SQL Only
Yes. SQLite3 `PRAGMA` and `sqlite_master` queries are in repository. File I/O is also in repository, which is acceptable for a filesystem/backup domain.

### 7.9 Service Contains Business Logic Only
Yes. Orchestration of backup/restore workflows. No Express. No raw SQL. No direct fs operations (delegated to repository).

### 7.10 Routes Contain Express Wiring Only
Yes. Routes wire Express middleware, call service, handle streaming responses.

### 7.11 No Duplicated Helper Functions
None.

### 7.12 No Duplicated Constants
`BACKUP_DIR` construction pattern is duplicated between service.js and routes.js (redundant).

### 7.13 No Duplicated Validation Logic
None.

### 7.14 TODO/FIXME
None.

### 7.15 Potential Refactoring Candidates
- Remove unused `path` import from `routes.js`.
- Remove unused `BACKUP_DIR` export from `service.js` and local `BACKUP_DIR` from `routes.js` — rely on service internally.
- `createBackupFile` and `cleanupOldBackups` are exported from repository but only used by `scheduledBackup` in service. Could be inlined or kept for testability.

---

## CROSS-DOMAIN FINDINGS

### 8.1 Duplicated Repository Helpers
| Function | Locations |
|----------|-----------|
| `findUserByUsername` | `auth/repository.js`, `users/repository.js` |
| `updateUserPassword` | `auth/repository.js`, `users/repository.js` |

Both are identical SQL wrappers.

### 8.2 Duplicated Validation Helpers
| Function | Locations |
|----------|-----------|
| `normalizeDigits` | `personnel/validator.js`, `server.js` (inline) |

### 8.3 Duplicated Constants
None across domains.

### 8.4 Shared Infrastructure Dependencies
All domains correctly depend only on `src/infrastructure/...`. No domain imports another domain.

### 8.5 Thin Wrapper Functions
- `users/service.js`: `getUserById(id)` and `getAllUsers()` are trivial passthroughs.
- `auth/service.js`: none.
- Consider removing trivial wrappers to reduce indirection.

---

## FILE-LEVEL SUMMARY

| Domain | repository.js | service.js | routes.js | validator.js | constants.js | Total Lines |
|--------|---------------|------------|-----------|--------------|--------------|-------------|
| auth | 19 | 52 | 16 | — | — | 87 |
| users | 41 | 151 | 46 | — | — | 238 |
| personnel | 39 | 109 | 42 | 35 | — | 225 |
| missions | 37 | 75 | 36 | — | 3 | 151 |
| reports | 10 | 34 | 14 | — | — | 58 |
| dashboard | 69 | 57 | 14 | — | — | 140 |
| backup | 113 | 90 | 54 | — | — | 257 |

---

## RISKS & RECOMMENDATIONS

1. **Shared user queries duplicated between auth and users domains** — extract common repository functions into `src/domains/users/` or a shared utility.
2. **Backup exports unused constants** — clean up `BACKUP_DIR` exports in service.js and unused `path` import in routes.js.
3. **Transactions in service layer** — personnel bulk import manages transaction in service; consider moving to repository for consistency.
4. **Minified `toJalaali` in missions/service.js** — hard to maintain; extract to utility module.
5. **PDF route stub** — `missions/routes.js` has dead 404 route (`GET /:id/pdf`); remove if client-side PDF is permanent.
6. **Thin wrappers in users/service.js** — `getUserById` and `getAllUsers` add no logic; consider direct repository use or remove wrappers.
