# Phase 15.1 – Fix P0 Backup Restore Await

Date: 2026-07-27  
Objective: Resolve the missing `await` in the backup restore service path without changing API behavior, response JSON, or Persian messages.

---

## File Modified

| File | Change |
|------|--------|
| `src/domains/backup/service.js` | Added `await` before `restoreBackupFile(body)` in `backupRestore()` |

---

## Code Diff Summary

**Before** (`src/domains/backup/service.js:72-86`)
```javascript
async function backupRestore(body) {
    try {
        restoreBackupFile(body);

        return {
            status: 200,
            body: {
                success: true,
                message: 'بازیابی با موفقیت انجام شد و اطلاعات جدید فعال شدند.',
            },
        };
    } catch (e) {
        return { status: 500, body: { error: `خطا در بازیابی: ${e.message}` } };
    }
}
```

**After** (`src/domains/backup/service.js:72-86`)
```javascript
async function backupRestore(body) {
    try {
        await restoreBackupFile(body);

        return {
            status: 200,
            body: {
                success: true,
                message: 'بازیابی با موفقیت انجام شد و اطلاعات جدید فعال شدند.',
            },
        };
    } catch (e) {
        return { status: 500, body: { error: `خطا در بازیابی: ${e.message}` } };
    }
}
```

**What changed:** The call to `restoreBackupFile(body)` is now properly awaited. This ensures:
- Success path waits for the restore + DB reconnection to complete before returning the 200 response.
- Failure path correctly catches rejections inside the existing `try/catch`, returning the same 500 JSON envelope.
- No change to status codes, Persian messages, rollback behavior, or response JSON structure.

---

## Test Results

**Command:** `cmd /c npm test`  
**Result:** 38 test suites passed, **409 tests passed**, 0 failures.  
**Coverage:** 96.59% statements, 92.95% branches, 96.68% functions, 96.65% lines.

---

## API Behavior Confirmation

| Aspect | Status |
|--------|--------|
| Response JSON schema | Unchanged (`{ status, body }` envelope) |
| Persian success message | Unchanged (`'بازیابی با موفقیت انجام شد و اطلاعات جدید فعال شدند.'`) |
| Persian error message | Unchanged (`'خطا در بازیابی: ...'`) |
| Rollback / `.bak` safety | Unchanged (still handled inside `restoreBackupFile`) |
| HTTP status codes | Unchanged (200 on success, 500 on failure) |
| Route signature | Unchanged (`POST /api/restore` still accepts raw binary body) |

---

## Conclusion

The P0 missing-`await` defect in `src/domains/backup/service.js` has been resolved. The fix is behavior-preserving, all 409 tests remain green, and no API contract was modified.
