# REGRESSION_CHECKLIST.md

Date: 2025-07-26
Purpose: Baseline API contract verification before final refactoring phases.
Scope: All routes currently registered in `server.js` (via domain routers) plus remaining inline routes.

---

## How to Use This Checklist

Before any final refactoring (AI / Health / middleware consolidation), verify every row below against the running application. After refactoring, re-run the same checks and diff the results. Any deviation indicates a regression.

---

## 1. AUTH DOMAIN

### Routes
| Method | Path | Access | Middleware |
|--------|------|--------|------------|
| POST | `/api/login` | Public | `rateLimitLogin` |

### Request
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `username` | string | yes | |
| `password` | string | yes | |

### Responses
| Status | Condition | JSON Body |
|--------|-----------|-----------|
| 400 | missing username/password | `{ success: false, message: "نام کاربری و رمز عبور الزامی است." }` |
| 401 | user not found | `{ success: false, message: "نام کاربری یا رمز عبور اشتباه است" }` |
| 403 | account disabled | `{ success: false, message: "حساب کاربری غیرفعال شده است. با مدیر سیستم تماس بگیرید." }` |
| 401 | wrong password | `{ success: false, message: "نام کاربری یا رمز عبور اشتباه است" }` |
| 200 | success | `{ success: true, token: "...", role: "...", username: "...", permissions: [...] }` |
| 500 | server error | `{ error: "..." }` |

### Persian Messages
- `نام کاربری و رمز عبور الزامی است.`
- `نام کاربری یا رمز عبور اشتباه است`
- `حساب کاربری غیرفعال شده است. با مدیر سیستم تماس بگیرید.`

---

## 2. USERS DOMAIN

### Routes
| Method | Path | Access | Middleware |
|--------|------|--------|------------|
| PUT | `/api/users/self/self-password` | Protected | `authenticateToken` |
| GET | `/api/users` | Protected | `authenticateToken`, `requirePermission(USERS_VIEW)` |
| POST | `/api/users` | Protected | `authenticateToken`, `requirePermission(USERS_CREATE)`, `auditMiddleware('User')` |
| PUT | `/api/users/:id` | Protected | `authenticateToken`, `requirePermission(USERS_EDIT)`, `auditMiddleware('User')` |
| PUT | `/api/users/:id/password` | Protected | `authenticateToken`, `requirePermission(USERS_EDIT)` |
| DELETE | `/api/users/:id` | Protected | `authenticateToken`, `requirePermission(USERS_DELETE)`, `auditMiddleware('User')` |

### Responses
| Status | Condition | JSON Body |
|--------|-----------|-----------|
| 400 | missing current/new password | `{ error: "رمز عبور فعلی و جدید الزامی است!" }` |
| 400 | new password < 4 chars | `{ error: "رمز عبور جدید باید حداقل ۴ کاراکتر باشد." }` |
| 404 | user not found (self) | `{ error: "کاربر یافت نشد!" }` |
| 401 | wrong current password | `{ error: "رمز عبور فعلی اشتباه است!" }` |
| 200 | password changed | `{ success: true }` |
| 400 | missing username/password (create) | `{ error: "نام کاربری و رمز عبور الزامی است!" }` |
| 400 | username < 3 chars | `{ error: "نام کاربری باید حداقل ۳ کاراکتر باشد." }` |
| 400 | invalid username chars | `{ error: "نام کاربری فقط شامل حروف، اعداد و زیرخط باشد." }` |
| 400 | password < 4 chars | `{ error: "رمز عبور باید حداقل ۴ کاراکتر باشد." }` |
| 400 | duplicate username | `{ error: "این نام کاربری قبلاً ثبت شده است!" }` |
| 200 | user created | `{ success: true }` |
| 400 | disable primary user | `{ error: "کاربر اصلی قابل غیرفعال کردن نیست!" }` |
| 400 | change primary user role | `{ error: "نقش کاربر اصلی قابل تغییر نیست!" }` |
| 404 | user not found (update) | `{ error: "کاربر یافت نشد!" }` |
| 400 | change admin role | `{ error: "نقش ادمین قابل تغییر نیست!" }` |
| 400 | no changes provided | `{ error: "تغییری اعمال نشد!" }` |
| 400 | duplicate username on update | `{ error: "این نام کاربری قبلاً ثبت شده است!" }` |
| 200 | user updated | `{ success: true }` |
| 400 | missing new password | `{ error: "رمز عبور جدید الزامی است!" }` |
| 400 | new password < 4 chars | `{ error: "رمز عبور باید حداقل ۴ کاراکتر باشد." }` |
| 200 | password updated | `{ success: true }` |
| 400 | delete primary user | `{ error: "کاربر اصلی قابل حذف نیست!" }` |
| 200 | user deleted | `{ success: true }` |
| 500 | server error | `{ error: "..." }` |

### Persian Messages
- `رمز عبور فعلی و جدید الزامی است!`
- `رمز عبور جدید باید حداقل ۴ کاراکتر باشد.`
- `کاربر یافت نشد!`
- `رمز عبور فعلی اشتباه است!`
- `نام کاربری و رمز عبور الزامی است!`
- `نام کاربری باید حداقل ۳ کاراکتر باشد.`
- `نام کاربری فقط شامل حروف، اعداد و زیرخط باشد.`
- `رمز عبور باید حداقل ۴ کاراکتر باشد.`
- `این نام کاربری قبلاً ثبت شده است!`
- `کاربر اصلی قابل غیرفعال کردن نیست!`
- `نقش کاربر اصلی قابل تغییر نیست!`
- `نقش ادمین قابل تغییر نیست!`
- `تغییری اعمال نشد!`
- `رمز عبور جدید الزامی است!`
- `کاربر اصلی قابل حذف نیست!`

---

## 3. PERSONNEL DOMAIN

### Routes
| Method | Path | Access | Middleware |
|--------|------|--------|------------|
| POST | `/api/personnel` | Protected | `authenticateToken`, `requirePermission(PERSONNEL_CREATE)`, `auditMiddleware('Personnel')` |
| GET | `/api/personnel` | Protected | `authenticateToken`, `requirePermission(PERSONNEL_VIEW)` |
| PUT | `/api/personnel/:id` | Protected | `authenticateToken`, `requirePermission(PERSONNEL_EDIT)`, `auditMiddleware('Personnel')` |
| DELETE | `/api/personnel/:id` | Protected | `authenticateToken`, `requirePermission(PERSONNEL_DELETE)`, `auditMiddleware('Personnel')` |
| POST | `/api/personnel/bulk` | Protected | `authenticateToken` |

### Responses
| Status | Condition | JSON Body |
|--------|-----------|-----------|
| 400 | validation errors | `{ error: "نام الزامی است. | نام خانوادگی الزامی است." }` (joined with ` | `) |
| 400 | duplicate national_id/emp_num | `{ error: "کد ملی یا شماره پرسنلی قبلاً ثبت شده است!" }` |
| 200 | created | `{ success: true }` |
| 400 | duplicate on update | `{ error: "کد ملی یا شماره پرسنلی تکراری است!" }` |
| 200 | updated | `{ success: true }` |
| 200 | deleted | `{ success: true }` |
| 400 | empty import file | `{ error: "فایل خالی است" }` |
| 400 | import > 1000 rows | `{ error: "حداکثر ۱۰۰۰ ردیف مجاز است." }` |
| 200 | import success | `{ success: true, imported: N, failed: M, errors: [...] }` |
| 500 | import server error | `{ error: "خطا در ثبت" }` |
| 500 | server error | `{ error: "..." }` |

### Persian Messages
- `نام الزامی است.`
- `نام خانوادگی الزامی است.`
- `کد ملی باید ۱۰ رقم باشد.`
- `شماره تماس نامعتبر است.`
- `کد ملی یا شماره پرسنلی قبلاً ثبت شده است!`
- `کد ملی یا شماره پرسنلی تکراری است!`
- `فایل خالی است`
- `حداکثر ۱۰۰۰ ردیف مجاز است.`
- `خطا در ثبت`
- `ردیف N: نام خالی`
- `ردیف N: کد ملی "..." تکراری`
- `ردیف N: شماره پرسنلی "..." تکراری`
- `ردیف N: خطا`

---

## 4. MISSIONS DOMAIN

### Routes
| Method | Path | Access | Middleware |
|--------|------|--------|------------|
| POST | `/api/missions` | Protected | `authenticateToken`, `requirePermission(MISSIONS_CREATE)`, `auditMiddleware('Mission')` |
| GET | `/api/missions` | Protected | `authenticateToken`, `requirePermission(MISSIONS_VIEW)` |
| PUT | `/api/missions/:id` | Protected | `authenticateToken`, `requirePermission(MISSIONS_EDIT)`, `auditMiddleware('Mission')` |
| DELETE | `/api/missions/:id` | Protected | `authenticateToken`, `requirePermission(MISSIONS_DELETE)`, `auditMiddleware('Mission')` |
| GET | `/api/missions/:id/pdf` | Public | none |

### Responses
| Status | Condition | JSON Body |
|--------|-----------|-----------|
| 400 | missing name/dates | `{ error: 'فیلدهای الزامی: نام و تاریخ‌ها' }` |
| 400 | duplicate decree_num | `{ error: 'خطا در شماره حکم!' }` |
| 200 | created | `{ success: true, decree_num: "RSTC-..." }` |
| 200 | list | `[ ...missions ]` |
| 400 | missing name/dates (update) | `{ error: 'فیلدهای الزامی: نام و تاریخ‌ها' }` |
| 400 | duplicate decree_num (update) | `{ error: 'این شماره حکم قبلاً ثبت شده است!' }` |
| 200 | updated | `{ success: true }` |
| 200 | deleted | `{ success: true }` |
| 404 | PDF endpoint | `{ error: 'PDF export is now client-side only. Use jsPDF for PDF generation.' }` |
| 500 | server error | `{ error: "..." }` |

### Persian Messages
- `فیلدهای الزامی: نام و تاریخ‌ها`
- `خطا در شماره حکم!`
- `این شماره حکم قبلاً ثبت شده است!`

---

## 5. REPORTS DOMAIN

### Routes
| Method | Path | Access | Middleware |
|--------|------|--------|------------|
| POST | `/api/reports/missions` | Protected | `authenticateToken` |

### Request Fields
`name`, `lname`, `emp_num`, `decree_num`, `device_type`, `device_serial`, `region`, `mission_type`, `location`, `start_date_from`, `start_date_to`, `end_date_from`, `end_date_to`, `issue_date_from`, `issue_date_to`

### Responses
| Status | Condition | JSON Body |
|--------|-----------|-----------|
| 200 | success | `{ results: [...], total: N }` |
| 500 | server error | `{ error: "..." }` |

### Persian Messages
- None (only generic error).

---

## 6. DASHBOARD DOMAIN

### Routes
| Method | Path | Access | Middleware |
|--------|------|--------|------------|
| GET | `/api/dashboard` | Protected | `authenticateToken` |

### Responses
| Status | Condition | JSON Body |
|--------|-----------|-----------|
| 200 | success | `{ total, active, inactive, missionCount, userCount, byType, byDegree, byRegion, byMissionType, singleVsGroup, suppliedVsUn, recentPersonnel, recentMissions }` |
| 500 | server error | `{ error: "..." }` |

### Response Shape Details
- `total`, `active`, `inactive`, `missionCount`, `userCount`: number
- `byType`: `[{ emp_type, count }]`
- `byDegree`: `[{ last_degree, count }]`
- `byRegion`: `[{ region, count }]`
- `byMissionType`: `[{ mission_type, count }]`
- `singleVsGroup`: `{ singleCount, groupCount }` (fallback `{ singleCount: 0, groupCount: 0 }`)
- `suppliedVsUn`: `{ supplied, unsupplied }` (fallback `{ supplied: 0, unsupplied: 0 }`)
- `recentPersonnel`: `[{ id, name, lname, national_id, emp_num, job_title, status }]` (limit 6)
- `recentMissions`: `[{ id, decree_num, name, lname, mission_type, location, start_date, end_date }]` (limit 6)

### Persian Messages
- None (only generic error).

---

## 7. BACKUP DOMAIN

### Routes
| Method | Path | Access | Middleware |
|--------|------|--------|------------|
| GET | `/api/backup` | Protected | `authenticateToken`, `requirePermission(BACKUP_CREATE)` |
| GET | `/api/backups` | Protected | `authenticateToken`, `requirePermission(BACKUP_VIEW)` |
| GET | `/api/backups/:name` | Protected | `authenticateToken`, `requirePermission(BACKUP_VIEW)` |
| POST | `/api/backups/validate` | Protected | `authenticateToken`, `express.raw(...)`, `requirePermission(BACKUP_VIEW)` |
| DELETE | `/api/backups/:name` | Protected | `authenticateToken`, `requirePermission(BACKUP_VIEW)` |
| POST | `/api/restore` | Protected | `authenticateToken`, `express.raw(...)`, `requirePermission(BACKUP_RESTORE)` |

### Responses
| Status | Condition | JSON Body / Headers |
|--------|-----------|---------------------|
| 404 | DB file missing | `{ error: 'فایل دیتابیس یافت نشد' }` |
| 200 | backup download | `Content-Disposition: attachment; filename=RSTC_Backup_YYYY-MM-DD.db` |
| 200 | list backups | `{ backups: [...], settings: { maxBackups: 30, scheduleHour: 2 } }` |
| 404 | backup file missing | `{ error: 'فایل پشتیبان یافت نشد' }` |
| 200 | backup file download | `Content-Disposition: attachment; filename=...` |
| 200 | validation success | `{ valid: true, sizeMB, tables, counts, integrity, pageCount, pageSize, estimatedSizeMB }` |
| 400 | validation failure | `{ valid: false, error: "..." }` |
| 200 | deleted | `{ success: true, message: 'فایل پشتیبان حذف شد.' }` |
| 200 | restore success | `{ success: true, message: 'بازیابی با موفقیت انجام شد و اطلاعات جدید فعال شدند.' }` |
| 500 | restore error | `{ error: 'خطا در بازیابی: ...' }` |
| 500 | server error | `{ error: "..." }` |

### Backup File Metadata Shape
```json
{
  "name": "rstc_backup_2025-07-26T...db",
  "size": 12345,
  "sizeMB": "0.01",
  "modified": "2025-07-26T...",
  "modifiedJalali": "..."
}
```

### Persian Messages
- `فایل دیتابیس یافت نشد`
- `فایل پشتیبان یافت نشد`
- `فایل پشتیبان حذف شد.`
- `بازیابی با موفقیت انجام شد و اطلاعات جدید فعال شدند.`
- `خطا در بازیابی: ...`

---

## 8. OPTIONS DOMAIN

### Routes
| Method | Path | Access | Middleware |
|--------|------|--------|------------|
| GET | `/api/options` | Protected | `authenticateToken` |
| GET | `/api/options/:field` | Protected | `authenticateToken` |
| POST | `/api/options/:field` | Protected | `authenticateToken`, `auditMiddleware('Option')`, `requirePermission(OPTIONS_EDIT)` |
| PUT | `/api/options/:field` | Protected | `authenticateToken`, `auditMiddleware('Option')`, `requirePermission(OPTIONS_EDIT)` |
| DELETE | `/api/options/:field/:index` | Protected | `authenticateToken`, `auditMiddleware('Option')`, `requirePermission(OPTIONS_EDIT)` |

### Responses
| Status | Condition | JSON Body |
|--------|-----------|-----------|
| 200 | list all | `{ field: { label, options: [...] }, ... }` |
| 404 | field not found | `{ error: 'فیلد یافت نشد' }` |
| 400 | empty value (POST) | `{ error: 'مقدار گزینه الزامی است' }` |
| 400 | duplicate value (POST) | `{ error: 'این گزینه قبلاً وجود دارد' }` |
| 200 | value created | `{ success: true, options: [...] }` |
| 400 | empty newValue (PUT) | `{ error: 'مقدار جدید الزامی است' }` |
| 404 | field not found (PUT) | `{ error: 'فیلد یافت نشد' }` |
| 404 | oldValue not found | `{ error: 'گزینه یافت نشد' }` |
| 400 | duplicate newValue | `{ error: 'این نام قبلاً استفاده شده' }` |
| 200 | value updated | `{ success: true, options: [...] }` |
| 400 | invalid index | `{ error: 'ایندکس نامعتبر' }` |
| 200 | value deleted | `{ success: true, options: [...] }` |
| 500 | server error | `{ error: "..." }` |

### Persian Messages
- `فیلد یافت نشد`
- `مقدار گزینه الزامی است`
- `این گزینه قبلاً وجود دارد`
- `مقدار جدید الزامی است`
- `گزینه یافت نشد`
- `این نام قبلاً استفاده شده`
- `ایندکس نامعتبر`

---

## 9. AUDIT DOMAIN

### Routes
| Method | Path | Access | Middleware |
|--------|------|--------|------------|
| GET | `/api/audit` | Protected | `authenticateToken`, `requirePermission(AUDIT_VIEW)` |

### Query Params
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `entity` | string | no | exact match |
| `username` | string | no | LIKE `%value%` |
| `limit` | number | no | default 100 |

### Responses
| Status | Condition | JSON Body |
|--------|-----------|-----------|
| 200 | success | `{ results: [...], total: N }` |
| 500 | server error | `{ error: "..." }` |

### Persian Messages
- None (only generic error).

---

## 10. REMAINING INLINE ROUTES (server.js)

### Routes
| Method | Path | Access | Middleware |
|--------|------|--------|------------|
| GET | `/api/health` | Public | none |
| POST | `/api/ai/ask` | Protected | `authenticateToken` |

### HEALTH Responses
| Status | Condition | JSON Body |
|--------|-----------|-----------|
| 200 | always | `{ ok: true, time: "ISO-8601" }` |

### AI Responses
| Status | Condition | JSON Body |
|--------|-----------|-----------|
| 400 | empty question | `{ error: 'سوال الزامی است.' }` |
| 200 | success | `{ success: true, question: "...", answer: "..." }` |
| 500 | server error | `{ error: "..." }` |

### Persian Messages
- `سوال الزامی است.`

---

## 11. CROSS-CUTTING CONCERNS

### Authentication
- All protected routes require valid JWT via `authenticateToken`.
- Token payload: `{ id, username, role, permissions }`.
- Missing/invalid token → `401` or `403` with Persian message.

### Authorization
- Permission strings: `<module>:<action>` (e.g. `users:view`).
- Admin role (`role === 'admin'`) bypasses all permission checks.
- Missing permission → `403` with `{ error: 'دسترسی غیرمجاز' }`.

### Audit Logging
- Write operations (POST/PUT/DELETE) wrapped with `auditMiddleware('EntityName')`.
- On 2xx success, inserts into `AuditLog` table.

### Error Format
- Success: `{ success: true, ... }` or raw data array/object.
- Client error: `{ error: "..." }` or `{ valid: false, error: "..." }`.
- Server error: `{ error: e.message }` (HTTP 500).

### Content Types
- JSON: `application/json` (default).
- Backup streams: `application/octet-stream`.
- Backup validation: `application/octet-stream` (raw body, 50MB limit).

---

## 12. VERIFICATION COMMANDS

```bash
# Syntax check all domain files
node -c src/domains/auth/{repository,service,routes}.js
node -c src/domains/users/{repository,service,routes}.js
node -c src/domains/personnel/{repository,service,routes,validator}.js
node -c src/domains/missions/{repository,service,routes,constants}.js
node -c src/domains/reports/{repository,service,routes}.js
node -c src/domains/dashboard/{repository,service,routes}.js
node -c src/domains/backup/{repository,service,routes}.js
node -c src/domains/options/{repository,service,routes}.js
node -c src/domains/audit/{repository,service,routes}.js
node -c server.js

# Server startup
node -e "require('./server')"

# Count remaining inline routes in server.js
(grep -c "^app\.\(get\|post\|put\|delete\)(" server.js)

# Count lines in server.js
(wc -l < server.js)
```

---

## 13. BASELINE SNAPSHOT

| Metric | Value |
|--------|-------|
| server.js lines | 195 |
| Inline routes in server.js | 2 (`/api/health`, `/api/ai/ask`) |
| Extracted domains | 9 (auth, users, personnel, missions, reports, dashboard, backup, options, audit) |
| Remaining inline route handlers | 2 |
| Total domain route files | 9 |
