# Backup Guide

## Automatic Backups

The application creates automatic daily backups at 02:00 server time.

Backup files are stored in the `BACKUP_DIR` directory (default: `/app/backups`).

Retention policy: Maximum 30 backups. Older backups are automatically deleted.

## Manual Backup

### API Endpoint
```
GET /api/backup
```
Requires `backup:create` permission.

### Response
Returns the database file as a download stream.

### Naming Convention
`RSTC_Backup_YYYY-MM-DD.db`

---

## Backup Verification

```
POST /api/backups/validate
```
Send the raw database file bytes in the request body.

Response includes:
- `valid`: boolean
- `tables`: array of table names
- `counts`: row counts per table
- `integrity`: SQLite integrity check result
- `estimatedSizeMB`: estimated uncompressed size

---

## Listing Backups

```
GET /api/backups
```
Requires `backup:view` permission.

Returns array of backups with:
- `name`
- `size`
- `sizeMB`
- `modified`
- `modifiedJalali`

---

## Best Practices

1. Verify backup integrity after creation
2. Download and store backups off-site
3. Test restore procedure quarterly
4. Monitor backup disk usage
5. Ensure `BACKUP_DIR` is on a persistent volume
