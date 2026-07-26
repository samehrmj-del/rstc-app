# MODULARIZATION_PLAN.md — RSTC_App Migration Roadmap

## 1. Current Architecture Analysis

### 1.1 Current Architecture Diagram (Text)

```
┌─────────────────────────────────────────────┐
│                  server.js                   │
│  (single file, ~988 lines)                  │
├─────────────────────────────────────────────┤
│  • Middleware: helmet, cors, rate limiter    │
│  • Auth: authenticateToken, requirePermission│
│  • DB: initializeDatabase(), dbRun/dbGet     │
│  • Modules: Personnel, Missions, Users,      │
│    Reports, Backup, Options, Audit, AI,      │
│    Dashboard                                  │
│  • Utilities: normalizeDigits, validatePerson │
│    nel, generateDecreeNum, toJalaali          │
│  • Constants: MODULES, ACTIONS, PERMISSIONS   │
│    ROLE_PERMISSIONS, MISSION_FIELDS           │
└─────────────────────────────────────────────┘
            ↓                ↓
     ┌───────────┐   ┌──────────────┐
     │ ai_engine │   │ pdf_template  │
     │   .js     │   │    .js        │
     └───────────┘   └──────────────┘
            ↓
     ┌──────────────┐
     │  public/     │
     │  (SPA)       │
     └──────────────┘
            ↓
     ┌──────────────┐
     │ SQLite .db   │
     └──────────────┘
```

### 1.2 Architectural Bottlenecks

| Bottleneck | Impact | Evidence |
|------------|--------|----------|
| **Monolithic `server.js`** | Every change requires reading 988 lines. AI agents overwrite each other. | All routes, middleware, DB init, and utilities in one file |
| **Tight auth coupling** | Adding a new route requires copy-pasting middleware chain. | `authenticateToken`, `requirePermission`, `auditMiddleware` mixed with routes |
| **No service layer** | Business logic is embedded in route handlers. Cannot reuse or test independently. | `generateDecreeNum`, `validatePersonnel` called inline in routes |
| **Direct DB access in routes** | Every route knows SQL. Changing DB strategy requires touching all routes. | `dbRun`, `dbGet`, `dbAll` called directly in every handler |
| **Scattered validation** | Validation logic is duplicated and inconsistent. | `validatePersonnel` exists but missions/reports/users have inline checks |
| **No input sanitization layer** | XSS/SQL injection risk depends on developer discipline. | Ad-hoc `normalizeDigits` calls; no centralized sanitizer |
| **`ai_engine.js` receives raw DB functions** | Tight coupling makes testing and replacement hard. | `parseAndAnswer(question, dbGet, dbAll)` signature |
| **`initializeDatabase()` has business logic** | DB init creates admin users and migrates `options.json`. | Lines 333-385 in `server.js` |

### 1.3 Coupling Between Modules

```
Personnel  ←→ normalizeDigits, validatePersonnel, dbRun, dbGet, dbAll
Missions   ←→ generateDecreeNum, toJalaali, MISSION_FIELDS, dbRun, dbGet
Users      ←→ hashPassword, serializePermissions, dbRun, dbGet
Reports    ←→ dbAll, dbGet, MISSION_FIELDS (implicit)
Backup     ←→ fs, path, db, BACKUP_DIR, dbRun, dbAll
Options    ←→ readOptions, writeOptionsField, dbAll, dbRun
Audit      ←→ logAudit, dbRun, authenticateToken
AI Chat    ←→ parseAndAnswer, dbGet, dbAll, authenticateToken
Dashboard  ←→ dbGet, dbAll, Promise.all, all modules' data
```

**Key coupling points:**
1. All modules share the same `db` instance and wrapper functions
2. All modules depend on `authenticateToken` and `requirePermission`
3. All modules depend on `req.user` shape (id, username, role, permissions)
4. Permission constants and role definitions are global
5. `ai_engine.js` receives raw DB functions, creating a hidden dependency on SQLite

### 1.4 Migration Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **API contract breakage** | High | Preserve exact route paths, HTTP methods, request/response shapes during extraction |
| **Frontend breakage** | High | Client-side `script.js` calls `/api/*` endpoints. Any path or response shape change breaks the SPA |
| **Database schema drift** | Medium | Keep all migrations in `initializeDatabase()` until Phase 4; do not change schema during extraction |
| **Import cycles** | Medium | Follow strict layering: routes → controllers → services → repositories → db |
| **AI agent conflicts** | High | Assign one phase per agent; lock `server.js` after Phase 0 |
| **Forgetting to migrate a route** | Medium | Maintain a route registry and checklist per phase |
| **Performance regression** | Low | Measure response times before/after each phase; avoid unnecessary abstraction |
| **Rollback complexity** | Medium | Keep old `server.js` in Git history; use feature flags if needed |

---

## 2. Target Architecture

### 2.1 Target Architecture Diagram (Text)

```
┌──────────────────────────────────────────────────────────────────┐
│                        src/                                      │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐             │
│  │ routes/    │  │controllers/ │  │ middleware/   │             │
│  │ • auth     │→ │ • auth.ctrl │  │ • authenticate│             │
│  │ • personnel│  │ • personnel │  │ • requirePerm │             │
│  │ • missions │  │ • missions  │  │ • audit       │             │
│  │ • users    │  │ • users     │  │ • rateLimit   │             │
│  │ • reports  │  │ • reports   │  │ • cors        │             │
│  │ • backup   │  │ • backup    │  │ • helmet      │             │
│  │ • options  │  │ • options   │  │               │             │
│  │ • audit    │  │ • audit     │  │               │             │
│  │ • ai       │  │ • ai        │  │               │             │
│  └────────────┘  └─────────────┘  └──────────────┘             │
│        ↓                ↓                                       │
│  ┌─────────────────────────────────────────────┐               │
│  │               services/                      │               │
│  │  • auth.service.js    • personnel.service.js │               │
│  │  • missions.service.js • users.service.js    │               │
│  │  • reports.service.js • backup.service.js    │               │
│  │  • options.service.js • audit.service.js     │               │
│  │  • ai.service.js                             │               │
│  └─────────────────────────────────────────────┘               │
│        ↓                ↓                ↓                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │repositories/│  │  validation/ │  │    config/    │          │
│  │• user.repo   │  │ • personnel  │  │ • constants   │          │
│  │• mission.repo│  │ • missions   │  │ • env         │          │
│  │• audit.repo  │  │ • users      │  │ • swagger     │          │
│  │• option.repo │  │ • reports    │  │               │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│        ↓                                                       │
│  ┌─────────────────────────────────────────────┐               │
│  │              database/                        │               │
│  │  • connection.js   • migrations/              │               │
│  │  • schema.js       • seeders/                 │               │
│  └─────────────────────────────────────────────┘               │
│        ↓                                                       │
│  ┌─────────────────────────────────────────────┐               │
│  │               utils/                          │               │
│  │  • normalizeDigits  • toJalaali             │               │
│  │  • formatJalali     • generateDecreeNum      │               │
│  │  • serializePerm    • deserializePerm        │               │
│  └─────────────────────────────────────────────┘               │
│        ↓                                                       │
│  ┌─────────────────────────────────────────────┐               │
│  │               auth/                           │               │
│  │  • jwt.service.js  • password.service.js     │               │
│  │  • permission.service.js                     │               │
│  └─────────────────────────────────────────────┘               │
└──────────────────────────────────────────────────────────────────┘
            ↓
     ┌──────────────┐
     │  server.js   │  (thin entry point: imports, middleware mount, start)
     └──────────────┘
```

### 2.2 Module Responsibilities

| Module | Responsibility | Replaces |
|--------|---------------|----------|
| `config/` | Environment variables, constants, app initialization | Top of `server.js` |
| `database/` | Connection, schema, migrations, seeders | `initializeDatabase()`, DB wrappers |
| `middleware/` | Helmet, CORS, rate limiting, auth, audit, error handling | Middleware blocks in `server.js` |
| `repositories/` | Pure SQL queries, no business logic | `dbGet`/`dbAll`/`dbRun` calls in routes |
| `services/` | Business logic, validation, orchestration | `generateDecreeNum`, `validatePersonnel`, route logic |
| `controllers/` | HTTP handling, request/response mapping | Route handler bodies |
| `routes/` | Route definitions, middleware chains | `app.get/post/put/delete(...)` blocks |
| `validation/` | Input validation, sanitization | `validatePersonnel`, inline checks |
| `utils/` | Pure helpers, date conversion, normalization | `normalizeDigits`, `toJalaali`, `serializePermissions` |
| `auth/` | JWT, password hashing, permission checks | `authenticateToken`, `requirePermission`, `hashPassword` |

---

## 3. Migration Phases

### Phase 0 — Preparation

**Goal:** Establish the `src/` structure, add build/import support, and create a route registry. No functional changes. Lock `server.js` for human-only edits during migration.

**Files affected:**
- Create `src/` directory tree (empty folders)
- Create initial `src/config/constants.js` by extracting constants from `server.js`
- Create `docs/architecture/ROUTE_REGISTRY.md` documenting all current routes, methods, and response shapes
- Update `package.json` with any needed imports (none yet)

**Risk:** Low. No code execution changes.

**Rollback strategy:** Delete `src/` directory. No production impact.

**Validation checklist:**
- [ ] `node server.js` starts and `/api/health` returns `{ ok: true }`
- [ ] All existing routes respond identically
- [ ] No new dependencies added
- [ ] `src/` directories exist but are empty except for constants

**Estimated difficulty:** Trivial

---

### Phase 1 — Extract Configuration

**Goal:** Extract all configuration and constants from `server.js` into `src/config/`. No behavioral changes.

**Files affected:**
- `src/config/constants.js` — `MODULES`, `ACTIONS`, `PERMISSIONS`, `ROLE_PERMISSIONS`, `MODULE_LABELS`, `ACTION_LABELS`, `MISSION_FIELDS`
- `src/config/env.js` — `PORT`, `JWT_SECRET`, `DB_PATH`, `CORS_ORIGIN`, `BACKUP_DIR` validation
- `server.js` — Replace inline constants with imports from `src/config/`

**Risk:** Low. Pure extraction with `require()` / `import` re-exports.

**Rollback strategy:** Revert `server.js` to previous commit. Constants remain in `src/config/` but unused.

**Validation checklist:**
- [ ] `node server.js` starts
- [ ] Login works
- [ ] Permission checks still function
- [ ] `MISSION_FIELDS` array order is identical
- [ ] No circular dependencies introduced

**Estimated difficulty:** Easy

---

### Phase 2 — Extract Middleware

**Goal:** Move all middleware into `src/middleware/`. Each middleware is extracted independently with full backward compatibility.

**Files affected:**
- `src/middleware/authenticateToken.js`
- `src/middleware/requirePermission.js`
- `src/middleware/requireAdmin.js`
- `src/middleware/audit.js` (current `auditMiddleware`)
- `src/middleware/rateLimiter.js` (current `rateLimitLogin`)
- `src/middleware/helmet.js`
- `src/middleware/cors.js`
- `server.js` — Replace inline middleware with `app.use(require('./src/middleware/...'))`

**Risk:** Medium. Middleware signature changes could break all routes.

**Rollback strategy:** Revert `server.js`. Middleware files remain but unused.

**Validation checklist:**
- [ ] `node server.js` starts
- [ ] Login returns JWT with same payload shape
- [ ] Unauthorized requests return 401
- [ ] Forbidden requests return 403
- [ ] Audit log entries are identical
- [ ] Rate limiter blocks after 10 failed logins
- [ ] All protected routes still enforce permissions

**Estimated difficulty:** Medium

---

### Phase 3 — Extract Authentication

**Goal:** Move JWT, password hashing, and permission logic into `src/auth/`. This creates a clean boundary between auth concerns and route handling.

**Files affected:**
- `src/auth/jwt.service.js` — `jwt.sign`, `jwt.verify`, token payload shape
- `src/auth/password.service.js` — `hashPassword`, `legacyHash`, `bcrypt.compare`
- `src/auth/permission.service.js` — `hasPermission`, `requirePermission`, `serializePermissions`, `deserializePermissions`, `getDefaultPermissions`, `getPermissionsForModule`
- `server.js` — Import auth services, remove inline auth functions

**Risk:** Medium. Auth is security-critical. Any regression blocks all access.

**Rollback strategy:** Revert `server.js`. Auth services remain but unused.

**Validation checklist:**
- [ ] Login works with bcrypt passwords
- [ ] Login migrates legacy SHA256 passwords
- [ ] Token contains correct payload (`id`, `username`, `role`, `permissions`)
- [ ] Token expires in 8 hours
- [ ] `requirePermission` blocks unauthorized users
- [ ] Admin bypass still works
- [ ] Permission matrix in frontend still functions
- [ ] Custom permissions (array) are preserved

**Estimated difficulty:** Medium

---

### Phase 4 — Extract Repositories

**Goal:** Extract all SQL queries into repository classes. Each repository handles one table. No business logic, only SQL.

**Files affected:**
- `src/repositories/user.repository.js` — All `Users` table queries
- `src/repositories/personnel.repository.js` — All `Personnel` table queries
- `src/repositories/mission.repository.js` — All `Missions` table queries
- `src/repositories/audit.repository.js` — All `AuditLog` table queries
- `src/repositories/option.repository.js` — All `SystemOptions` table queries
- `src/database/connection.js` — `db` instance, `dbRun`, `dbGet`, `dbAll` wrappers
- `src/database/migrations.js` — `initializeDatabase()` logic (schema only, no seed data)
- Controllers/services — Updated to use repositories instead of raw `dbRun`/`dbGet`/`dbAll`

**Risk:** High. Every route touches the database. Incorrect query migration breaks CRUD.

**Rollback strategy:** Revert affected controller/service files. Repositories remain but unused.

**Validation checklist:**
- [ ] All CRUD operations return identical data shapes
- [ ] `national_id` and `emp_num` uniqueness still enforced
- [ ] `AuditLog` inserts still function
- [ ] `SystemOptions` read/write still works
- [ ] Bulk import transaction still commits/rolls back
- [ ] Indexes are created on startup
- [ ] `initializeDatabase()` still runs migrations inline (for now)

**Estimated difficulty:** High

---

### Phase 5 — Extract Services

**Goal:** Extract business logic from routes into service classes. Services orchestrate repositories and contain domain logic.

**Files affected:**
- `src/services/auth.service.js` — Login flow, password verification, token generation, legacy migration
- `src/services/personnel.service.js` — `validatePersonnel`, `normalizeDigits`, bulk import logic
- `src/services/mission.service.js` — `generateDecreeNum`, `toJalaali`, `MISSION_FIELDS`
- `src/services/dashboard.service.js` — Aggregation queries, chart data
- `src/services/report.service.js` — Report filtering, conditional query building
- `src/services/backup.service.js` — Backup creation, validation, restore
- `src/services/option.service.js` — `readOptions`, `writeOptionsField`
- `src/services/audit.service.js` — `logAudit`
- `src/services/ai.service.js` — `parseAndAnswer` wrapper (or keep `ai_engine.js` as-is)
- Controllers — Updated to delegate to services

**Risk:** High. Services contain complex logic (decree numbering, Jalaali dates, bulk import). Regression risk is significant.

**Rollback strategy:** Revert controller files. Services remain but unused.

**Validation checklist:**
- [ ] Login flow produces identical responses
- [ ] Decree numbering format is `RSTC-YYYYMMDD-XXXX`
- [ ] Jalaali date conversion is accurate
- [ ] Bulk import reports identical success/failure counts
- [ ] Dashboard stats match pre-extraction values
- [ ] Report filters produce identical SQL conditions
- [ ] Backup validation returns identical integrity data
- [ ] Options CRUD still works

**Estimated difficulty:** High

---

### Phase 6 — Extract Controllers

**Goal:** Extract HTTP handling logic from route definitions into controller functions. Controllers parse requests, call services, and format responses.

**Files affected:**
- `src/controllers/auth.controller.js`
- `src/controllers/personnel.controller.js`
- `src/controllers/mission.controller.js`
- `src/controllers/user.controller.js`
- `src/controllers/report.controller.js`
- `src/controllers/backup.controller.js`
- `src/controllers/option.controller.js`
- `src/controllers/audit.controller.js`
- `src/controllers/ai.controller.js`
- `src/controllers/dashboard.controller.js`
- `src/routes/auth.routes.js` — Route definitions using controller functions
- `server.js` — Mount routers: `app.use('/api/auth', authRoutes)`

**Risk:** Medium. Controller extraction is mostly mechanical but affects all route handlers.

**Rollback strategy:** Revert `server.js` and route files. Controllers remain but unused.

**Validation checklist:**
- [ ] All routes return identical status codes
- [ ] All routes return identical JSON shapes
- [ ] Error messages are unchanged (Persian strings preserved)
- [ ] `req.user` shape is unchanged
- [ ] `req.params` and `req.body` are passed correctly
- [ ] `auditMiddleware` still wraps write operations
- [ ] Frontend SPA functions without changes

**Estimated difficulty:** Medium

---

### Phase 7 — Extract Routes

**Goal:** Replace inline `app.get/post/put/delete(...)` in `server.js` with modular routers. `server.js` becomes a thin entry point.

**Files affected:**
- `src/routes/index.js` — Main router aggregator
- `server.js` — Replace all route definitions with `app.use('/api', routes)`
- `src/app.js` — Express app initialization, middleware mounting (new entry point)
- `src/server.js` — Thin bootstrap: `require('./src/app.js').listen(PORT)`

**After this phase, `server.js` should be:**

```javascript
require('dotenv').config();
const app = require('./src/app');
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 RSTC running → http://localhost:${PORT}`));
```

**Risk:** Medium. Route ordering matters in Express (e.g., `/api/users/self/self-password` before `/api/users/:id`).

**Rollback strategy:** Keep old `server.js` as `server.js.backup`. Switch back by changing entry point.

**Validation checklist:**
- [ ] Route precedence is identical
- [ ] `/api/users/self/self-password` is not shadowed by `/api/users/:id`
- [ ] Static file serving still works
- [ ] All endpoints respond within acceptable latency
- [ ] `node src/server.js` starts correctly

**Estimated difficulty:** Medium

---

### Phase 8 — Cleanup

**Goal:** Remove legacy code, consolidate utilities, finalize modular structure.

**Files affected:**
- `server.js` — Rename to `server.js.legacy` or delete after confirmation
- Move `ai_engine.js` into `src/services/ai/` or keep at root if preferred
- Move `pdf_template.js` into `src/utils/` or `tools/`
- Move `patch_script.js`, `apply_patch.js` into `tools/`
- Create `src/utils/index.js` exporting all utilities
- Create `src/validation/index.js` exporting all validators
- Update `package.json` `main` field if needed

**Risk:** Low. Cleanup only after all functionality is verified.

**Rollback strategy:** All changes are additive. Old files remain in Git history.

**Validation checklist:**
- [ ] `node src/server.js` starts
- [ ] All routes functional
- [ ] No dead code in `src/`
- [ ] No circular dependencies
- [ ] `npm start` works (update `package.json` scripts if needed)

**Estimated difficulty:** Easy

---

## 4. Cross-Cutting Concerns

### 4.1 API Compatibility
- All route paths (`/api/*`) remain unchanged.
- All request/response JSON shapes remain unchanged.
- All HTTP status codes remain unchanged.
- Persian error messages remain unchanged.

### 4.2 Database Compatibility
- No schema changes during Phases 0-7.
- `initializeDatabase()` remains functional until Phase 4.
- `better-sqlite3` remains the database driver.

### 4.3 Frontend Compatibility
- `public/` directory is untouched until explicitly instructed.
- No changes to HTML IDs, CSS classes, or JS function names.
- Client-side `api()` helper continues to call `/api/*` endpoints.

### 4.4 AI Agent Coordination
- Each phase is a separate task in `.ai/TASKS.md`.
- Only one agent works on a given phase at a time.
- Phases must be completed sequentially; do not skip ahead.
- After each phase, run the full validation checklist before proceeding.

---

## 5. Success Criteria

| Criterion | Measurement |
|-----------|-------------|
| **Zero downtime** | `node server.js` never fails to start during extraction |
| **Zero API changes** | Frontend works without modification |
| **Zero data loss** | Database remains intact; no migrations during extraction |
| **Test coverage** | Each phase adds at least one smoke test for affected routes |
| **AI safety** | No two agents modify the same file in the same phase |
| **Rollback readiness** | Every phase commit can be reverted in < 5 minutes |

---

## 6. Anti-Patterns to Avoid

| Anti-Pattern | Why | Correct Approach |
|--------------|-----|------------------|
| Extract everything at once | High risk of breaking API, hard to debug | One phase at a time, per module |
| Create interfaces for everything | Over-engineering for current scale | Extract concrete classes first; interfaces later if needed |
| Replace `better-sqlite3` during migration | Changes database layer mid-extraction | Keep `better-sqlite3` until all modules are extracted |
| Move `public/` files | Breaks frontend without benefit | Leave `public/` untouched |
| Add new dependencies | Requires approval, adds risk | Use existing `express`, `better-sqlite3`, `jsonwebtoken` |
| Refactor while extracting | Mixes concerns, makes review impossible | Extract first, refactor later in separate tasks |

---

## 7. Checklist for AI Agents

Before starting any phase:
- [ ] Read `.ai/AI_MASTER_PROMPT.md`
- [ ] Read `docs/architecture/MODULARIZATION_PLAN.md`
- [ ] Read `standards/coding.md` and `standards/naming.md`
- [ ] Verify no other agent is working on the same phase (check `.ai/TASKS.md`)
- [ ] Create a branch: `task/t-{id}-modularization-phase-{n}`

During extraction:
- [ ] Do not change route paths or response shapes
- [ ] Do not modify `public/` files
- [ ] Do not change database schema
- [ ] Run `node server.js` after every logical change
- [ ] Test affected routes with `curl` or browser

After completing a phase:
- [ ] All validation checklist items pass
- [ ] Update `.ai/TASKS.md` to mark phase complete
- [ ] Open PR to `develop` with phase results
- [ ] Do not merge; wait for human review
