# Restore Guide

## Restore Procedure

### Prerequisites
- Access to a valid `.db` backup file
- Application stopped or maintenance mode enabled

### Steps

1. Upload the backup file via API:
   ```
   POST /api/restore
   ```
   Requires `backup:restore` permission.

   Send the raw database file bytes in the request body.

2. The system will:
   - Close current database connection
   - Backup current database to `.bak`
   - Write the restored database file
   - Remove WAL and SHM files
   - Reconnect to the restored database

3. Verify health:
   ```
   GET /api/health
   ```
   Expected: `{"ok": true, "time": "..."}`

4. Verify data integrity:
   ```
   POST /api/backups/validate
   ```
   Send the restored database bytes to confirm tables and counts.

---

## Rollback

If the restore fails, the system automatically rolls back from the `.bak` file.

Manual rollback:
1. Stop the application
2. Copy `rstc_database.db.bak` to `rstc_database.db`
3. Remove `rstc_database.db-wal` and `rstc_database.db-shm` if present
4. Start the application

---

## Post-Restore Checklist

- [ ] Health endpoint returns 200
- [ ] Login works with existing users
- [ ] Personnel records are present
- [ ] Mission records are present
- [ ] Backup verification passes
- [ ] Scheduled backup continues to run

---

## Notes

- Restore operation is atomic: the current database is preserved as `.bak` until the new database is fully written and verified.
- Write transactions during restore may fail; retry after the operation completes.
- WAL mode ensures crash consistency.
