# Phase 7 – Repository Audit Report

Date: 2026-07-26
Scope: Full repository after Phase 6 infrastructure cleanup
Method: Static analysis of all `src/` files

---

## CRITICAL ISSUES

### C-1: Runtime crash in AI domain
**Location:** `src/domains/ai/service.js:245`
**Issue:** `askQuestion()` executes `const { repository } = require('./repository');` but `src/domains/ai/repository.js` exports individual functions (`getPersonnelCount`, `searchPersonnel`, etc.), NOT an object named `repository`. This will throw `TypeError: repository.parseAndAnswer is not a function` on the first `/api/ai/ask` request.
**Impact:** AI endpoint completely broken in production.
**Fix:** Replace dynamic destructuring with static imports at the top of the file, or require the correct named exports.

---

## HIGH ISSUES

### H-1: Massive code duplication — AI engine
**Locations:**
- `src/domains/ai/service.js` (255 lines)
- `ai_engine.js` (315 lines, root directory)

**Issue:** The entire NLP engine (`normalizeDigits`, `normalizePersian`, `esc`, `toJalaali`, `formatJalali`, `PERSIAN_STOP_WORDS`, `INTENT_WORDS`, `SEARCH_FILTER_WORDS`, `extractKeywords`, `detectEntity`, `buildPersonnelQuery`, `flexibleAnswer`, `parseAndAnswer`) is duplicated between `ai/service.js` and the root-level `ai_engine.js`. They are near-identical with minor parameter variations.
**Impact:** ~400 lines of duplicated logic. Any NLP change must be applied in two places.
**Fix:** Delete the duplicated block from `ai/service.js` and import from `ai_engine.js` (or move `ai_engine.js` into `src/domains/ai/` and have both `service.js` and `routes.js` use it).

### H-2: Duplicate repository functions — Users vs Auth
**Locations:**
- `src/domains/users/repository.js:7-8` — `findUserByUsername`
- `src/domains/auth/repository.js:3-4` — `findUserByUsername`

- `src/domains/users/repository.js:25-26` — `updateUserPassword`
- `src/domains/auth/repository.js:7-8` — `updateUserPassword`

**Issue:** Identical SQL wrappers in two separate domain repositories.
**Impact:** Maintenance burden; bug fixes must be applied twice.
**Fix:** Move to `src/domains/users/` as a shared internal module, or have `auth/repository.js` import from `users/repository.js`.

### H-3: Duplicate utility functions — `normalizeDigits`
**Locations:**
- `src/domains/personnel/validator.js:1-12`
- `src/domains/ai/service.js:6-9`
- `ai_engine.js:6-9`

**Issue:** Same Persian/Arabic digit normalization logic in three files.
**Fix:** Extract to `src/infrastructure/utils/string.js`.

### H-4: Duplicate `toJalaali` implementation
**Locations:**
- `src/domains/missions/service.js:67`
- `src/domains/ai/service.js:25-36`
- `ai_engine.js:25-36`

**Issue:** Minified Jalaali conversion duplicated in three places.
**Fix:** Extract to `src/infrastructure/utils/date.js`.

### H-5: Unused exported middleware — `requireAdmin`, `requireSuperAdmin`
**Location:** `src/infrastructure/middleware/auth.middleware.js:27-40`
**Issue:** Both functions are exported but never imported anywhere in the codebase.
**Impact:** Dead code; suggests incomplete feature or abandoned refactor.
**Fix:** Remove if truly unused, or document intended usage.

### H-6: Unused exported functions — `verifyJwt`, `JWT_OPTIONS`
**Location:** `src/infrastructure/security/jwt.service.js:13-25`
**Issue:** `verifyJwt` is defined, exported, but never called. `JWT_OPTIONS` is exported but never imported outside the module.
**Impact:** Dead exports; `JWT_OPTIONS` exposure increases surface area.
**Fix:** Remove unused exports, or document intended refresh-token flow.

---

## MEDIUM ISSUES

### M-1: Transaction logic in service layer
**Location:** `src/domains/personnel/service.js:62,96,99`
**Issue:** `bulkImportPersonnel()` uses raw `dbRun("BEGIN TRANSACTION")`, `dbRun("COMMIT")`, and `dbRun("ROLLBACK")` directly in the service layer. This violates the pattern of keeping database transactions in the repository.
**Impact:** Inconsistent architecture; harder to test or swap DB layer.
**Fix:** Move transaction boundary into `personnel/repository.js` as `bulkCreatePersonnel(rows)`.

### M-2: SQL construction leaked into repository
**Location:** `src/domains/missions/repository.js:16-19`
**Issue:** `updateMission(id, fields, values)` accepts an array of field names and builds `SET field=?,...` dynamically inside the repository. This mixes SQL construction with execution.
**Fix:** Accept a complete SET clause string from the service layer, or move field mapping to a query builder utility.

### M-3: SQL construction in service layer
**Location:** `src/domains/reports/service.js:3-22`
**Issue:** `buildConditions(filters)` translates filter objects into SQL `WHERE` clauses inside the service. This is query-building logic that belongs in the repository or a shared query builder.
**Fix:** Move `buildConditions` to `reports/repository.js` or a shared `src/infrastructure/database/query-builder.js`.

### M-4: Unsafe JSON.parse in options repository
**Location:** `src/domains/options/repository.js:7`
**Issue:** `JSON.parse(row.options)` has no try-catch. A corrupted `options` column value crashes the entire options endpoints.
**Fix:** Wrap in try-catch and return empty array or 500 with safe error.

### M-5: Missing path validation in backup routes
**Location:** `src/domains/backup/routes.js:30-36,44-46`
**Issue:** `req.params.name` is passed directly to `path.join(BACKUP_DIR, name)` without validating it doesn't contain `../` sequences. A crafted request could traverse out of `BACKUP_DIR`.
**Fix:** Validate `name` matches `/^[\w\-.]+\.db$/` before filesystem access.

### M-6: Synchronous filesystem operations in hot paths
**Locations:**
- `src/domains/backup/routes.js:22,36` — `fs.createReadStream` is fine, but `backup/repository.js` uses `fs.writeFileSync`, `fs.copyFileSync`, `fs.unlinkSync` for validation and restore.
- `src/domains/backup/service.js:65-68` — `scheduledBackup` uses synchronous `fs` calls.

**Issue:** Synchronous `fs` operations block the event loop. For backup endpoints with 50MB payloads, this freezes the server.
**Fix:** Use `fs.promises` API (`writeFile`, `copyFile`, `unlink`) with `await`.

### M-7: Unbounded `loginAttempts` Map
**Location:** `src/infrastructure/middleware/security.middleware.js:27,45`
**Issue:** `loginAttempts` Map grows without bound until the hourly cleanup runs. Under sustained attack, memory grows linearly.
**Fix:** Use a TTL-based cache library (e.g., `lru-cache`) or reduce cleanup interval to 5-15 minutes.

### M-8: 14 sequential queries in AI statistics
**Location:** `src/domains/ai/repository.js:3-53` (getPersonnelCount through getMissionRegions)
**Issue:** `answerStats()` calls 14 separate `dbGet`/`dbAll` queries sequentially. These are all independent COUNT queries and could be parallelized or combined.
**Fix:** Use `Promise.all` for parallel execution, or consolidate into a single query with conditional aggregation.

### M-9: Personnel import does full-table duplicate scan
**Location:** `src/domains/personnel/service.js:57`
**Issue:** `findExistingNationalIdsAndEmpNums()` SELECTs ALL `national_id, emp_num` from Personnel on every bulk import. For large tables this is expensive.
**Fix:** Use a temporary table or batch `WHERE ... IN (...)` check for just the incoming rows.

### M-10: Dynamic require inside function body
**Location:** `src/domains/ai/service.js:245`
**Issue:** `const { repository } = require('./repository');` inside `askQuestion()` is a dynamic require. Node.js can still resolve it, but it's unusual, prevents static analysis, and is the root cause of Critical Issue C-1.
**Fix:** Move to static import at top of file.

### M-11: Unused export — `BACKUP_DIR`
**Location:** `src/domains/backup/service.js:81`
**Issue:** `BACKUP_DIR` is exported but never imported by any other module.
**Fix:** Remove export or document internal usage.

---

## LOW ISSUES

### L-1: Thin wrappers in users service
**Location:** `src/domains/users/service.js:6-12`
**Issue:** `getUserById(id)` and `getAllUsers()` are pure passthroughs with no validation, transformation, or error handling.
**Fix:** Import repository functions directly in routes, or add actual service-layer logic.

### L-2: Identical exported constants
**Location:** `src/infrastructure/middleware/auth.middleware.js:39-40`
**Issue:** `requireAdmin` and `requireSuperAdmin` are byte-identical.
**Fix:** Rename to `requireAdminRole` and export once, or merge.

### L-3: Unused root-level file
**Location:** `ai_engine.js` (root directory)
**Issue:** 315-line AI engine file is no longer imported by `server.js` or any active module after Phase 5.7. Only referenced in docs/standards.
**Fix:** Move into `src/domains/ai/` and re-export, or delete if superseded by domain extraction.

### L-4: Inconsistent error handling pattern
**Locations:** Multiple service files
**Issue:** Some services use `e.message.includes('UNIQUE')` for constraint detection, others don't. Error handling is regex-based and fragile.
**Fix:** Use SQLite error codes (`SQLITE_CONSTRAINT`) for reliable detection.

### L-5: Missing `options.json` migration path
**Location:** `src/infrastructure/database/initialize.js:66-81`
**Issue:** `migrateOptions()` looks for `options.json` three directories up from `__dirname`. This path is non-obvious and fragile to refactoring.
**Fix:** Make path configurable via env var or constant.

---

## DEAD CODE

| File | Dead Element | Lines |
|------|-------------|-------|
| `src/infrastructure/middleware/auth.middleware.js` | `requireAdmin` (unused export) | 27-29 |
| `src/infrastructure/middleware/auth.middleware.js` | `requireSuperAdmin` (unused export) | 32-34 |
| `src/infrastructure/security/jwt.service.js` | `verifyJwt` (unused export) | 13-19 |
| `src/infrastructure/security/jwt.service.js` | `JWT_OPTIONS` (unused export) | 4-7 |
| `src/infrastructure/middleware/security.middleware.js` | `loginAttempts` export (internal only) | 51 |
| `src/domains/users/service.js` | `getUserById` passthrough | 6-8 |
| `src/domains/users/service.js` | `getAllUsers` passthrough | 10-12 |
| `ai_engine.js` (root) | Entire file — no active imports | — |

---

## DUPLICATE CODE

| Logic | Locations | Lines |
|-------|-----------|-------|
| `findUserByUsername` | `auth/repository.js`, `users/repository.js` | 4, 8 |
| `updateUserPassword` | `auth/repository.js`, `users/repository.js` | 7, 25 |
| `normalizeDigits` (Persian/Arabic digits) | `ai/service.js`, `personnel/validator.js`, `ai_engine.js` | 6, 1, 6 |
| `toJalaali` (minified) | `missions/service.js`, `ai/service.js`, `ai_engine.js` | 67, 25, 25 |
| AI NLP engine | `ai/service.js`, `ai_engine.js` | 1-255, 1-315 |
| Dashboard count queries | `dashboard/repository.js` overlaps `ai/repository.js` | 3-53 |
| `buildPersonnelQuery` / `buildMissionQuery` | `ai/service.js` | 105-202 |
| `buildConditions` | `reports/service.js` vs AI equivalent | 3-21 |

---

## ARCHITECTURAL VIOLATIONS

| Rule | Violation | Location |
|------|-----------|----------|
| Repository = SQL only | `missions/repository.js` builds dynamic SET clauses | `missions/repository.js:16-19` |
| Service = no raw SQL | `reports/service.js` builds WHERE clauses | `reports/service.js:3-22` |
| Service = no DB connection | `personnel/service.js` calls `dbRun()` directly for transactions | `personnel/service.js:62,96,99` |
| Routes = no SQL | PASS — no domain routes contain raw SQL | — |
| No cross-domain imports | PASS — zero domain-to-domain imports | — |
| Infrastructure ≠ domains | PASS — no infrastructure file imports from `src/domains/` | — |

---

## SECURITY FINDINGS

| Finding | Severity | Location | Details |
|---------|----------|----------|---------|
| Path traversal risk in backup download | High | `backup/routes.js:30-36,44-46` | `req.params.name` not sanitized before `path.join()` |
| JSON.parse without try-catch | High | `options/repository.js:7` | Corrupted `SystemOptions.options` crashes endpoints |
| Synchronous 50MB file ops | Medium | `backup/repository.js:44-58` | Blocking event loop during validation |
| Legacy SHA-256 passwords | Medium | `auth/service.js:21-24` | `legacyHash` accepts weak passwords; migration path needed |
| No CSRF protection | Medium | `server.js` | State-changing endpoints lack CSRF tokens |
| JWT secret validation | PASS | `server.js:27-30` | Refuses to start without `JWT_SECRET` |
| Parameterized queries | PASS | All repositories | No string-concatenated SQL found |
| Password hashing | PASS | `password.service.js` | bcrypt with 10 rounds |

---

## PERFORMANCE FINDINGS

| Finding | Severity | Location | Details |
|---------|----------|----------|---------|
| 14 sequential COUNT queries | Medium | `ai/repository.js:3-53` | `answerStats` could be parallelized with `Promise.all` |
| N+1 in personnel_mission AI | Medium | `ai/service.js:217-226` | For each personnel (max 3), runs separate mission search |
| Full-table duplicate scan | Medium | `personnel/service.js:57` | `findExistingNationalIdsAndEmpNums()` scans entire Personnel table |
| Unbounded login attempts Map | Medium | `security.middleware.js:27` | Grows until hourly cleanup; memory leak under attack |
| Sequential dashboard aggregation | Low | `dashboard/service.js:19-34` | 7 parallel + 6 sequential; remaining 6 could be parallelized |
| Synchronous fs list + stat | Low | `backup/repository.js:13-28` | `readdirSync` + `statSync` for backup listing |

---

## CLEANUP RECOMMENDATIONS

### Immediate (before next deployment)
1. Fix **C-1**: Replace dynamic `require('./repository')` in `ai/service.js:245` with static named imports.
2. Fix **H-1**: Consolidate AI engine into a single module to eliminate ~400 lines of duplication.
3. Deduplicate **H-2** through **H-4**: Extract shared utilities (`findUserByUsername`, `normalizeDigits`, `toJalaali`) into `src/infrastructure/utils/`.
4. Fix **M-4**: Add try-catch around `JSON.parse(row.options)` in `options/repository.js`.
5. Fix **M-5**: Validate backup filename against path traversal in `backup/routes.js`.

### Short-term
6. Move transaction logic from `personnel/service.js` into `personnel/repository.js`.
7. Remove dead exports: `requireAdmin`, `requireSuperAdmin`, `verifyJwt`, `JWT_OPTIONS`, `loginAttempts`.
8. Delete or relocate root-level `ai_engine.js` (315 lines unused).
9. Parallelize `answerStats()` queries in AI domain.
10. Replace synchronous `fs` calls in backup domain with `fs.promises`.

### Long-term
11. Extract shared query-builder utility for dynamic WHERE clauses (reports + AI).
12. Consolidate overlapping dashboard/AI repository count queries.
13. Replace `loginAttempts` Map with TTL cache.
14. Add refresh-token flow to justify `verifyJwt` export, or remove it.
15. Move `MISSION_FIELDS` array construction to a schema-aware utility.
