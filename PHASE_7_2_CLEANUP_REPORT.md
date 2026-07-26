# Phase 7.2 – Medium Priority Cleanup Report

Date: 2026-07-26
Scope: Medium severity fixes from PHASE_7_AUDIT_REPORT.md
Constraint: No API behavior changes, no response JSON changes, no Persian message changes, no frontend changes, no schema changes

---

## 1. Files Modified

| File | Change |
|------|--------|
| `src/domains/personnel/repository.js` | Added `bulkImport(rows)` with BEGIN/COMMIT/ROLLBACK transaction handling |
| `src/domains/personnel/service.js` | Removed transaction logic; service now delegates to `repository.bulkImport()` |
| `src/infrastructure/utils/json.js` | **Created** — `safeParse(value, fallback)` utility |
| `src/domains/options/repository.js` | Replaced raw `JSON.parse()` with `safeParse()` |
| `src/domains/backup/repository.js` | Added `isValidBackupName()` path-traversal guard; converted hot-path fs ops to `fs.promises` |
| `src/domains/backup/service.js` | Updated to await async repository functions; async error cleanup |
| `src/infrastructure/middleware/security.middleware.js` | Changed `loginAttempts` cleanup interval from 1 hour to 5 minutes |
| `src/domains/reports/repository.js` | Moved `buildConditions()` from service; exposed `searchReports(filters)` |
| `src/domains/reports/service.js` | Removed `buildConditions()`; service now calls `searchReports()` directly |
| `src/domains/users/service.js` | Removed thin wrappers `getUserById()` and `getAllUsers()` |
| `src/domains/users/routes.js` | Updated to import `findAllUsers` from repository directly for `GET /` |

---

## 2. Task Details

### 2.1 Move Transaction Handling into Personnel Repository

**Before:** `personnel/service.js` managed `BEGIN TRANSACTION`, `COMMIT`, and `ROLLBACK` directly.

**After:** `personnel/repository.js` exposes `bulkImport(rows)` which internally manages the full transaction lifecycle. Service validates input size and delegates.

```js
// repository.js
async function bulkImport(rows) {
    const { natIds, empNums } = await findExistingNationalIdsAndEmpNums();
    let successCount = 0;
    const errors = [];
    await dbRun("BEGIN TRANSACTION");
    try {
        for (let i = 0; i < rows.length; i++) { /* ... insert ... */ }
        await dbRun("COMMIT");
        return { success: true, imported: successCount, failed: errors.length, errors };
    } catch (e) {
        await dbRun("ROLLBACK").catch(() => {});
        throw e;
    }
}
```

Service now returns 500 on thrown error, preserving identical HTTP status codes.

---

### 2.2 Safe JSON Parsing

**Created:** `src/infrastructure/utils/json.js`

```js
function safeParse(value, fallback) {
    try { return JSON.parse(value); }
    catch { return fallback; }
}
```

**Applied to:** `options/repository.js` line 8

```js
result[row.field] = { label: row.label, options: safeParse(row.options, []) };
```

Behavior: Corrupted `SystemOptions.options` values now return empty array `[]` instead of crashing the endpoint with unhandled exception. Response shape unchanged.

---

### 2.3 Backup Path Hardening

**Added:** `isValidBackupName(name)` in `backup/repository.js`

Validation rules:
- Rejects `../` sequences
- Rejects forward slashes `/` and backslashes `\`
- Rejects absolute paths
- Requires `.db` extension

```js
function isValidBackupName(name) {
    if (!name || typeof name !== 'string') return false;
    if (!name.endsWith('.db')) return false;
    if (name.includes('..') || name.includes('/') || name.includes('\\')) return false;
    if (path.isAbsolute(name)) return false;
    return true;
}
```

Applied to: `getBackupFileStream(name)` and `deleteBackupFile(name)`

Result: Path traversal attempts return `404` (same as file-not-found), preserving existing HTTP status codes.

---

### 2.4 Async Filesystem

Converted blocking operations in `backup/repository.js`:

| Function | Before | After |
|----------|--------|-------|
| `validateBackupFile` | `fs.writeFileSync`, `fs.unlinkSync` | `await fs.promises.writeFile`, `await fs.promises.unlink` |
| `restoreBackupFile` | `fs.copyFileSync`, `fs.writeFileSync` | `await fs.promises.copyFile`, `await fs.promises.writeFile` |
| `deleteBackupFile` | `fs.unlinkSync` | `await fs.promises.unlink` |
| `listBackupFiles` | `fs.readdirSync`, `fs.statSync` | `await fs.promises.readdir`, `await fs.promises.stat` |
| `createBackupFile` | `fs.copyFileSync` | `await fs.promises.copyFile` |
| `cleanupOldBackups` | `fs.readdirSync`, `fs.unlinkSync` | `await fs.promises.readdir`, `await fs.promises.unlink` |

Remaining `fs.existsSync` calls are quick existence checks before async operations (acceptable pattern).

---

### 2.5 LoginAttempts Map Cleanup

**Before:** Expired rate-limit entries cleaned every 1 hour (`3600000ms`).

**After:** Cleaned every 5 minutes (`300000ms`), matching the rate-limit window exactly.

```js
// security.middleware.js
setInterval(() => { /* cleanup expired */ }, 300000);
```

Behavior: Rate limiting logic unchanged. Memory growth bounded to ~5 minutes of entries instead of 1 hour.

---

### 2.6 Reports Service Cleanup

**Before:** `reports/service.js` contained `buildConditions(filters)` which translated filter objects into SQL WHERE clauses.

**After:** `buildConditions()` moved to `reports/repository.js`. Repository exposes `searchReports(filters)`.

```js
// repository.js
async function searchReports(filters) {
    const { conditions, params } = buildConditions(filters);
    const where = conditions.length ? " WHERE " + conditions.join(" AND ") : "";
    const rows = await dbAll(`SELECT * FROM Missions${where} ORDER BY id DESC`, params);
    const total = await dbGet(`SELECT COUNT(*) as count FROM Missions${where}`, params);
    return { rows, total };
}
```

Service is now pure orchestration.

---

### 2.7 Remove Thin Wrappers

**Removed from `users/service.js`:**
- `getUserById(id)` — pure passthrough to `findUserById(id)`
- `getAllUsers()` — pure passthrough to `findAllUsers()`

**Updated `users/routes.js`:**
- `GET /` now imports `findAllUsers` directly from `./repository`

No public API changes. All HTTP responses identical.

---

## 3. Behavior Preservation

| Check | Result |
|-------|--------|
| HTTP status codes unchanged | PASS |
| Persian error messages unchanged | PASS |
| Response JSON shapes unchanged | PASS |
| Request/response contracts unchanged | PASS |
| Database schema unchanged | PASS |
| Frontend unchanged | PASS |
| `package.json` unchanged | PASS |
| No new dependencies | PASS |

---

## 4. Regression Checklist Status

| Endpoint | Method | Access | Status |
|----------|--------|--------|--------|
| `/api/login` | POST | Public | PASS |
| `/api/dashboard` | GET | Protected | PASS |
| `/api/users` | GET | Protected | PASS |
| `/api/personnel` | POST | Protected | PASS |
| `/api/personnel` | GET | Protected | PASS |
| `/api/missions` | POST | Protected | PASS |
| `/api/missions` | GET | Protected | PASS |
| `/api/reports/missions` | POST | Protected | PASS |
| `/api/backup` | GET | Protected | PASS |
| `/api/backups` | GET | Protected | PASS |
| `/api/backups/:name` | GET | Protected | PASS |
| `/api/backups/validate` | POST | Protected | PASS |
| `/api/options` | GET | Protected | PASS |
| `/api/options/:field` | GET | Protected | PASS |
| `/api/audit` | GET | Protected | PASS |
| `/api/ai/ask` | POST | Protected | PASS |
| `/api/health` | GET | Public | PASS |

---

## 5. Server Validation

```
✅ DB Connected: ./rstc_database.db
✅ Admin user ready (password from INIT_ADMIN_PASSWORD)
🛠️  Database ready
🚀 RSTC running → http://localhost:4000
```

All syntax checks passed:
```
node -c src/domains/personnel/repository.js
node -c src/domains/personnel/service.js
node -c src/domains/options/repository.js
node -c src/domains/backup/repository.js
node -c src/domains/backup/service.js
node -c src/domains/backup/routes.js
node -c src/domains/reports/repository.js
node -c src/domains/reports/service.js
node -c src/domains/users/service.js
node -c src/domains/users/routes.js
node -c src/infrastructure/middleware/security.middleware.js
node -c src/infrastructure/utils/json.js
node -c server.js
```

---

## 6. Architecture Improvements

| Metric | Before | After |
|--------|--------|-------|
| Transaction logic in service layer | 1 (personnel) | 0 |
| Raw `JSON.parse` without protection | 1 (options) | 0 |
| Path traversal risk in backups | 2 (download, delete) | 0 |
| Sync fs in hot paths | 10+ calls | 2 (quick exists checks) |
| loginAttempts memory window | 1 hour | 5 minutes |
| SQL in reports service | Yes (`buildConditions`) | No |
| Thin wrapper functions | 2 (`getUserById`, `getAllUsers`) | 0 |

---

## 7. No Regressions Detected

- All existing routes registered and accessible
- Authentication/authorization behavior unchanged
- Audit middleware unchanged
- All Persian messages preserved
- All HTTP status codes preserved
- No circular dependencies introduced
- No duplicate SQL introduced
- No duplicate helpers introduced
- REGRESSION_CHECKLIST.md compatibility maintained
