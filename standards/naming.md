# Naming Conventions — RSTC_App

## 1. Files

**Allowed**
- Node.js entry points and modules: `camelCase.js`
- Config files: exact standard names (`package.json`, `.env.example`, `tsconfig.json`)
- HTML assets: `kebab-case.html`
- CSS assets: `kebab-case.css`
- Fonts: exact file names as provided by vendor (e.g., `Vazirmatn-Regular.woff2`)

**Forbidden**
- PascalCase, snake_case, or mixed-case JS files
- Spaces or special characters in filenames
- Renaming existing files without migration plan

**Examples**
```
server.js        # allowed - backend entry
ai_engine.js     # allowed - AI module
pdf_template.js  # allowed - PDF helper
patch_script.js  # allowed (legacy utility)
index.html       # allowed - SPA shell
style.css        # allowed - stylesheet
```

## 2. Folders

**Allowed**
- `lowercase` for all directories
- Hidden directories for tooling/config: `.kilo/`, `.ai/`

**Forbidden**
- PascalCase, camelCase, snake_case folders
- Spaces in folder names

**Examples**
```
public/          # allowed
standards/       # allowed
docs/            # allowed
tools/           # allowed (future)
scripts/         # allowed (future)
src/             # allowed (future)
```

## 3. Variables

**Allowed**
- `camelCase` for all variables
- Underscore prefix (`_`) for module-level state or private/internal variables

**Forbidden**
- PascalCase, snake_case, UPPER_SNAKE_CASE for variables
- Single-letter names except loop counters (`i`, `j`, `k`)

**Examples**
```javascript
// server.js
const loginAttempts = new Map();
const maxAttempts = 10;
const existingAdmin = await dbGet("SELECT id FROM Users WHERE username = ?", [username]);

// public/script.js
let currentUserRole = 'user';
let allPersonnel = [];
let _allUsers = [];        // private/internal state
let _editingUserId = null;
```

## 4. Constants

**Allowed**
- `UPPER_SNAKE_CASE` for configuration objects, permission maps, lookup tables
- `camelCase` only for client-side arrays that are iterated over (e.g., month names) — existing pattern, not recommended for new code

**Forbidden**
- camelCase or PascalCase for logical constants

**Examples**
```javascript
// server.js
const JWT_SECRET = process.env.JWT_SECRET;
const DB_PATH = process.env.DB_PATH || './rstc_database.db';
const MODULES = { DASHBOARD: 'dashboard', PERSONNEL: 'personnel' };
const ACTIONS = { VIEW: 'view', CREATE: 'create', EDIT: 'edit', DELETE: 'delete' };
const PERMISSIONS = { PERSONNEL_VIEW: 'personnel:view', ... };
const ROLE_PERMISSIONS = { admin: [...], editor: [...], ... };

// ai_engine.js
const NORMALIZE_MAP = { '۰':'0', '۱':'1', ... };
const PERSIAN_STOP_WORDS = new Set([...]);
```

## 5. Functions

**Allowed**
- `camelCase` for all functions
- Underscore prefix (`_`) for private/internal functions
- Descriptive verb-noun patterns: `getUserById`, `hasPermission`, `logAudit`, `normalizeDigits`, `validatePersonnel`

**Forbidden**
- PascalCase, snake_case, or abbreviated names (`fn`, `proc`, `calc`)
- Generic names (`doIt`, `handle`, `process`)

**Examples**
```javascript
// server.js
function hasPermission(user, permission) { ... }
function requirePermission(permission) { ... }
function logAudit(userId, username, action, entity, entityId, detail, ip) { ... }
function normalizeDigits(str) { ... }
function validatePersonnel(body) { ... }
async function generateDecreeNum() { ... }

// public/script.js
function toggleTheme() { ... }
async function loadDashboard() { ... }
function renderUsers(list) { ... }
function _esc(s) { ... }           // private helper
function _renderDonutChart(...) { ... }
```

## 6. Classes

**Allowed**
- `PascalCase` for class names
- Used only when object-oriented patterns are appropriate

**Forbidden**
- PascalCase for non-class entities (variables, functions, files)

**Examples**
```javascript
// public/script.js
class Particle { ... }
class FloatingLine { ... }
```

## 7. Database Tables

**Current convention (existing)**
- `PascalCase`, singular nouns: `Users`, `Personnel`, `Missions`, `AuditLog`, `SystemOptions`

**Migration recommendation**
- New tables: switch to `snake_case` plural to match column naming style
  - Recommended: `users` → keep existing, new tables use `snake_case` plural
  - Or standardize all tables to `snake_case` plural via migration

**Forbidden**
- snake_case mixed with PascalCase in the same schema
- Plural/singular mixing without documented rationale

**Examples**
```sql
-- Current (existing)
CREATE TABLE IF NOT EXISTS Users (...)
CREATE TABLE IF NOT EXISTS Personnel (...)
CREATE TABLE IF NOT EXISTS Missions (...)
CREATE TABLE IF NOT EXISTS AuditLog (...)
CREATE TABLE IF NOT EXISTS SystemOptions (...)

-- Migration path (new tables)
CREATE TABLE IF NOT EXISTS audit_log (...)
CREATE TABLE IF NOT EXISTS system_options (...)
```

## 8. Database Columns

**Allowed**
- `snake_case` for all column names
- Boolean flags: `is_` prefix (e.g., `is_single`, `is_group`, `is_supplied`)
- Foreign keys: `entity_id` pattern

**Forbidden**
- camelCase or PascalCase columns
- Abbreviated names without justification

**Examples**
```sql
-- Users
id, username, password, role, permissions, status, last_login, login_count, created_at

-- Personnel
id, name, lname, father_name, national_id, emp_num, hire_date, emp_type, org_post, job_title, last_degree, phone, address, status, notes

-- Missions
id, decree_num, name, lname, emp_num, job_title, mission_type, device_type, repair_type, region, location, subject, device_serial, duration, overtime_hours, start_date, end_date, issue_date, is_single, is_group, is_supplied, is_unsupplied, is_issued, is_extended, is_gov, is_plane, is_train, is_agency, is_bus, is_personal, created_at
```

## 9. API Routes

**Allowed**
- `lowercase kebab-case` under `/api/` prefix
- RESTful resource names: `/api/personnel`, `/api/missions`, `/api/users`
- Nested actions: `/api/users/:id/password`, `/api/users/self/self-password`
- Sub-resources: `/api/reports/missions`, `/api/ai/ask`

**Forbidden**
- PascalCase, camelCase, or snake_case in URL paths
- Verbs in URLs (use HTTP methods instead)

**Examples**
```javascript
// Authentication
app.post('/api/login', ...);

// Personnel
app.get('/api/personnel', ...);
app.post('/api/personnel', ...);
app.put('/api/personnel/:id', ...);
app.delete('/api/personnel/:id', ...);
app.post('/api/personnel/bulk', ...);

// Missions
app.get('/api/missions', ...);
app.post('/api/missions', ...);
app.put('/api/missions/:id', ...);
app.delete('/api/missions/:id', ...);
app.get('/api/missions/:id/pdf', ...);

// Users
app.get('/api/users', ...);
app.post('/api/users', ...);
app.put('/api/users/:id', ...);
app.delete('/api/users/:id', ...);
app.put('/api/users/:id/password', ...);
app.put('/api/users/self/self-password', ...);

// Others
app.get('/api/dashboard', ...);
app.post('/api/reports/missions', ...);
app.get('/api/backup', ...);
app.post('/api/restore', ...);
app.get('/api/audit', ...);
app.post('/api/ai/ask', ...);
app.get('/api/health', ...);
```

## 10. Environment Variables

**Allowed**
- `UPPER_SNAKE_CASE`
- Prefix with project acronym when relevant: `RSTC_` (optional)

**Forbidden**
- camelCase, snake_case, or lowercase

**Examples**
```bash
PORT=4000
JWT_SECRET=...
INIT_ADMIN_PASSWORD=...
CORS_ORIGIN=false
DB_PATH=./rstc_database.db
```

## 11. Permissions

**Allowed**
- Constant keys: `UPPER_SNAKE_CASE`
  - `PERMISSIONS.PERSONNEL_CREATE`
  - `PERMISSIONS.MISSIONS_EDIT`
  - `PERMISSIONS.BACKUP_RESTORE`
- Runtime values (stored in DB / sent to client): `lowercase` with colon separator
  - `personnel:create`
  - `missions:edit`
  - `backup:delete` (note: semantically confusing — consider renaming to `backup:restore`)

**Forbidden**
- Mixed casing in permission strings
- Abbreviations

**Migration recommendation**
- Rename `BACKUP_RESTORE` runtime value from `'backup:delete'` to `'backup:restore'` in a future migration
- Update `ROLE_PERMISSIONS` and client-side permission matrix accordingly

## 12. Git Branches

**Allowed**
- `feature/`

- `fix/`
- `hotfix/`
- `refactor/`
- `docs/`
- `chore/`

**Forbidden**
- PascalCase, spaces, or special characters

**Examples**
```
feature/mission-bulk-import
fix/login-rate-limit
refactor/permission-middleware
docs/api-contract
chore/cleanup-root-directory
```

## 13. Commit Messages

**Allowed**
- Conventional Commits format: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `security`, `perf`
- Scope: `backend`, `frontend`, `db`, `auth`, `missions`, `personnel`, `api`, `security`

**Forbidden**
- Vague messages (`update`, `changes`, `fix stuff`)
- All-lowercase descriptions without type prefix

**Examples**
```
feat(backend): add mission bulk import endpoint
fix(auth): enforce JWT_SECRET on startup
refactor(db): migrate Options to SystemOptions table
docs(api): document permission middleware contract
chore(security): remove hardcoded default password fallback
test(personnel): add validation tests for national_id normalization
```

## 14. AI Documents

**Allowed**
- `.ai/` folder: `UPPER_SNAKE_CASE.md`
- `prompts/`: `kebab-case.md`
- `standards/`: `camelCase.md` for code standards, `kebab-case.md` for domain standards

**Forbidden**
- Spaces, camelCase, or PascalCase in `.ai/` filenames
- Overwriting existing AI documents without merge

**Examples**
```
.ai/AI_MASTER_PROMPT.md
.ai/PROJECT_CONTEXT.md
.ai/TASKS.md
.ai/DECISIONS.md
.ai/CHANGELOG_AI.md
prompts/create-component.md
prompts/fix-bug.md
prompts/review-code.md
standards/coding.md
standards/naming.md
```

## 15. Future Modules

**Allowed patterns for new backend modules**
- Files: `camelCase.js` or `index.js` in a `kebab-case/` directory
- Directories: `lowercase/kebab-case/`
- Exports: named exports preferred over default exports

**Allowed patterns for new frontend modules**
- Components: `kebab-case` or `camelCase` matching existing convention
- States/pages: `page-kebab-case` or `pageCamelCase` aligned with existing `page-dashboard`, `page-personnel` IDs

**Migration recommendations**
1. **HTTP methods remain lowercase.** Do not rename existing routes.
2. **Database schema migrations** must preserve backward compatibility for at least one release cycle.
3. **Environment variables** should be added in `UPPER_SNAKE_CASE` and documented in `.env.example`.
4. **New constants** must use `UPPER_SNAKE_CASE` and be declared near the top of the file with section comments.
5. **New functions** must use `camelCase` and be placed in logically grouped sections.
6. **Private helpers** should be prefixed with `_` and placed after public functions within the same section.

---

## Summary Table

| Element | Allowed | Forbidden |
|---------|---------|-----------|
| JS Files | `camelCase.js` | PascalCase, snake_case |
| Folders | `lowercase` | PascalCase, camelCase, snake_case |
| Variables | `camelCase`, `_camelCase` | PascalCase, UPPER_SNAKE_CASE |
| Constants | `UPPER_SNAKE_CASE` | camelCase, PascalCase |
| Functions | `camelCase`, `_camelCase` | PascalCase, snake_case |
| Classes | `PascalCase` | camelCase, snake_case |
| DB Tables | `PascalCase` (existing) / `snake_case` (new) | camelCase, mixed |
| DB Columns | `snake_case` | camelCase, PascalCase |
| API Routes | `lowercase kebab-case` | PascalCase, camelCase, snake_case |
| Env Vars | `UPPER_SNAKE_CASE` | camelCase, snake_case |
| Permissions (keys) | `UPPER_SNAKE_CASE` | lowercase |
| Permissions (values) | `lowercase` with `:` separator | PascalCase, snake_case |
| Git Branches | `type/slug` | free-form |
| Commits | `type(scope): description` | vague, no type |
| AI Docs | `UPPER_SNAKE_CASE.md` / `kebab-case.md` | camelCase, spaces |
| Future Modules | `camelCase.js` / `lowercase/` | mixed conventions |
