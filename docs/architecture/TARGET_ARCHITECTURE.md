# TARGET_ARCHITECTURE.md — RSTC_App

## 1. Executive Summary

RSTC_App currently runs as a monolithic `server.js` (~988 lines) mixing infrastructure, business logic, and domain logic in one file. This document defines the **target domain-driven architecture** organized by business capability, not by file type. The design scales from the current ~1,000 LOC to 50,000+ LOC without requiring architectural redesign.

**Key principle:** Every business domain is a self-contained vertical slice. Infrastructure is isolated and shared. Domains communicate through services, not through direct imports of each other's internals.

---

## 2. Architecture Overview

### 2.1 Current vs Target

```
CURRENT (Monolithic)               TARGET (Domain-Driven)
─────────────────────             ─────────────────────
server.js                          src/
  ├─ config                         ├─ infrastructure/
  ├─ middleware                       ├─ config/
  ├─ auth                             ├─ database/
  ├─ routes                           ├─ middleware/
  ├─ services                         ├─ security/
  └─ utils                            └─ utils/
                                     └─ domains/
                                     ├─ personnel/
                                     ├─ missions/
                                     ├─ users/
                                     └─ ...
```

### 2.2 Architectural Layers

```
┌─────────────────────────────────────────────────────┐
│                    src/domains/                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │personnel │  │missions  │  │  users   │  ...     │
│  │ routes   │  │ routes   │  │ routes   │          │
│  │ service  │  │ service  │  │ service  │          │
│  │ repo     │  │ repo     │  │ repo     │          │
│  │ validator│  │ validator│  │ validator│          │
│  │ constants│  │ constants│  │ constants│          │
│  │ dto      │  │ dto      │  │ dto      │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│         ↓              ↓               ↓             │
│  ┌──────────────────────────────────────────┐       │
│  │         src/infrastructure/                │       │
│  │  config    database   middleware          │       │
│  │  security  utils                            │       │
│  └──────────────────────────────────────────┘       │
│         ↓              ↓               ↓             │
│  ┌──────────────────────────────────────────┐       │
│  │               src/app/                     │       │
│  │          app.js  server.js                 │       │
│  └──────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────┘
```

### 2.3 Layer Responsibilities

| Layer | Responsibility | Ownership |
|-------|---------------|-----------|
| **Domain** | Business rules, validation, data access for one capability | Domain team |
| **Infrastructure** | Technical cross-cutting concerns shared by all domains | Platform team |
| **App** | Bootstrap, middleware mounting, route aggregation | Platform team |

---

## 3. Directory Structure

### 3.1 Full ASCII Tree

```
rstc-app/
├── .ai/
│   ├── AI_MASTER_PROMPT.md
│   ├── PROJECT_CONTEXT.md
│   ├── TASKS.md
│   ├── DECISIONS.md
│   ├── CHANGELOG_AI.md
│   └── IMPLEMENTATION_WORKFLOW.md
├── docs/
│   ├── architecture/
│   │   ├── README.md
│   │   ├── MODULARIZATION_PLAN.md
│   │   └── TARGET_ARCHITECTURE.md
│   ├── database/
│   ├── api/
│   ├── security/
│   ├── ui/
│   └── deployment/
├── standards/
│   ├── coding.md
│   ├── naming.md
│   ├── security.md
│   ├── git.md
│   ├── testing.md
│   └── review.md
├── prompts/
│   ├── create-component.md
│   ├── create-page.md
│   ├── fix-bug.md
│   ├── review-code.md
│   └── optimize.md
├── src/
│   ├── infrastructure/
│   │   ├── config/
│   │   │   ├── env.js                 # Environment variables with validation
│   │   │   ├── constants.js           # App-wide constants
│   │   │   └── feature-flags.js       # Feature toggles
│   │   ├── database/
│   │   │   ├── connection.js          # SQLite connection, wrapper functions
│   │   │   ├── schema.js              # Table DDL, index definitions
│   │   │   └── migrations.js          # Migration runner
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js     # authenticateToken, requirePermission
│   │   │   ├── security.middleware.js # helmet, cors, rateLimitLogin
│   │   │   └── audit.middleware.js    # audit logging wrapper
│   │   ├── security/
│   │   │   ├── jwt.service.js         # JWT sign/verify
│   │   │   ├── password.service.js    # bcrypt, legacy SHA256
│   │   │   └── permission.service.js  # hasPermission, requirePermission
│   │   └── utils/
│   │       ├── dates.js               # toJalaali, formatJalali, toGregorian
│   │       ├── digits.js              # normalizeDigits
│   │       ├── strings.js             # escaping, Persian normalization
│   │       └── http.js                # response helpers, error classes
│   ├── domains/
│   │   ├── personnel/
│   │   │   ├── routes.js              # /api/personnel routes
│   │   │   ├── service.js             # Personnel business logic
│   │   │   ├── repository.js          # Personnel data access
│   │   │   ├── validator.js           # Personnel input validation
│   │   │   ├── constants.js           # Personnel field labels, status values
│   │   │   └── dto.js                 # Personnel request/response DTOs
│   │   ├── missions/
│   │   │   ├── routes.js
│   │   │   ├── service.js
│   │   │   ├── repository.js
│   │   │   ├── validator.js
│   │   │   ├── constants.js
│   │   │   └── dto.js
│   │   ├── users/
│   │   │   ├── routes.js
│   │   │   ├── service.js
│   │   │   ├── repository.js
│   │   │   ├── validator.js
│   │   │   ├── constants.js
│   │   │   └── dto.js
│   │   ├── reports/
│   │   │   ├── routes.js
│   │   │   ├── service.js
│   │   │   ├── repository.js
│   │   │   ├── validator.js
│   │   │   ├── constants.js
│   │   │   └── dto.js
│   │   ├── backup/
│   │   │   ├── routes.js
│   │   │   ├── service.js
│   │   │   ├── repository.js
│   │   │   ├── validator.js
│   │   │   ├── constants.js
│   │   │   └── dto.js
│   │   ├── options/
│   │   │   ├── routes.js
│   │   │   ├── service.js
│   │   │   ├── repository.js
│   │   │   ├── validator.js
│   │   │   ├── constants.js
│   │   │   └── dto.js
│   │   ├── audit/
│   │   │   ├── routes.js
│   │   │   ├── service.js
│   │   │   ├── repository.js
│   │   │   ├── validator.js
│   │   │   ├── constants.js
│   │   │   └── dto.js
│   │   ├── ai/
│   │   │   ├── routes.js
│   │   │   ├── service.js
│   │   │   ├── repository.js
│   │   │   ├── validator.js
│   │   │   ├── constants.js
│   │   │   └── dto.js
│   │   └── dashboard/
│   │       ├── routes.js
│   │       ├── service.js
│   │       ├── repository.js
│   │       ├── validator.js
│   │       ├── constants.js
│   │       └── dto.js
│   └── app/
│       ├── app.js                    # Express app, middleware mounting
│       ├── server.js                 # Entry point
│       └── routes.js                 # Domain router aggregator
├── public/                            # Static assets (unchanged)
├── package.json
├── .env.example
├── README.md
└── ...
```

### 3.2 Why Every Folder Exists

| Folder | Why It Exists |
|--------|---------------|
| `src/infrastructure/config/` | Centralizes environment variables and app-wide constants. Without this, config is scattered across domains, causing duplication and inconsistency. |
| `src/infrastructure/database/` | Isolates SQLite connection, schema, and migrations. Domains never touch raw `better-sqlite3` directly; they go through repositories. |
| `src/infrastructure/middleware/` | Houses reusable Express middleware. Keeping middleware out of domains prevents infrastructure leakage into business logic. |
| `src/infrastructure/security/` | Contains JWT, password hashing, and permission primitives. These are cross-cutting concerns used by all domains but owned by none. |
| `src/infrastructure/utils/` | Pure utility functions (dates, digits, strings). Shared across domains without creating domain coupling. |
| `src/domains/` | Groups code by business capability. Each domain is a vertical slice that can be understood, tested, and deployed independently. |
| `src/domains/{name}/` | One folder per bounded context. All code for that capability lives here, reducing cross-domain imports. |
| `src/app/` | Thin bootstrap layer that wires infrastructure to domains. Contains zero business logic. |

---

## 4. Domain Design

### 4.1 Domain Inventory

| Domain | Business Capability | Current Location | Tables |
|--------|---------------------|------------------|--------|
| `personnel` | Employee record management | `server.js` lines 540-665 | `Personnel` |
| `missions` | Mission decree issuance | `server.js` lines 667-727 | `Missions` |
| `users` | User management and permissions | `server.js` lines 454-538 | `Users` |
| `reports` | Mission filtering and export | `server.js` lines 729-754 | `Missions` (read) |
| `backup` | Database backup/restore | `server.js` lines 756-851 | File system |
| `options` | Dynamic dropdown management | `server.js` lines 853-927 | `SystemOptions` |
| `audit` | Audit log querying | `server.js` lines 929-940 | `AuditLog` |
| `ai` | AI chat assistant | `server.js` lines 974-983, `ai_engine.js` | Read-only queries |
| `dashboard` | Statistics and charts | `server.js` lines 425-452 | `Personnel`, `Missions`, `Users` |

### 4.2 Domain Internal Structure

Every domain follows the same internal layout:

```
domains/{domain}/
  routes.js      # Express route definitions, middleware composition
  service.js     # Business logic orchestration
  repository.js  # Data access (SQL queries for this domain's tables)
  validator.js   # Input validation and normalization
  constants.js   # Domain-specific constants (labels, statuses, limits)
  dto.js         # Request/response data shapes
```

**Rules:**
- A domain owns its routes, but they are defined as Express routers, not mounted directly.
- A domain owns its business logic; no other domain may modify its data directly.
- A domain owns its data access; repositories are private to the domain.
- A domain owns its validation; no other domain may validate its input.

---

## 5. Infrastructure Design

### 5.1 Infrastructure Modules

| Module | Responsibility | Example Contents |
|--------|---------------|------------------|
| `config` | Raw configuration data and environment parsing | `env.js`, `constants.js`, `feature-flags.js` |
| `database` | Connection, schema, migrations, wrapper functions | `connection.js`, `schema.js`, `migrations.js` |
| `middleware` | Reusable Express middleware | `auth.middleware.js`, `security.middleware.js`, `audit.middleware.js` |
| `security` | Security primitives (JWT, passwords, permissions) | `jwt.service.js`, `password.service.js`, `permission.service.js` |
| `utils` | Pure utility functions | `dates.js`, `digits.js`, `strings.js`, `http.js` |

### 5.2 What Infrastructure Must NOT Contain

- Business rules (e.g., "missions must have start_date before end_date")
- Domain-specific validation logic
- Domain-specific constants or labels
- Routing logic

Infrastructure provides **capabilities**, not **policies**.

---

## 6. Dependency Rules

### 6.1 Allowed Dependency Flow

```
Domain
  ↓ imports
Infrastructure (config, database, security, middleware, utils)
  ↓ uses
External libraries (express, better-sqlite3, jsonwebtoken, bcrypt)
```

### 6.2 Cross-Domain Rules

| Scenario | Allowed? | Rule |
|----------|----------|------|
| Domain A imports Domain B's `service.js` | Conditional | Allowed only if Domain B exposes a public service API. Prefer read-only queries. |
| Domain A imports Domain B's `repository.js` | **Forbidden** | Direct data access bypasses Domain B's business rules. |
| Domain A imports Domain B's `routes.js` | **Forbidden** | Creates circular dependency. Routes are mounted by `app/routes.js`. |
| Domain A imports Domain B's `validator.js` | **Forbidden** | Each domain validates its own input. |
| Domain A imports Domain B's `dto.js` | **Forbidden** | DTOs are domain-internal contracts. |
| Domain A imports Domain B's `constants.js` | **Forbidden** | Domain constants are domain-internal. Shared constants live in `infrastructure/config/`. |
| Infrastructure imports any Domain | **Forbidden** | Infrastructure must not know about domains. |

### 6.3 Dependency Graph

```
src/app/server.js
  ├── src/infrastructure/config/env.js
  ├── src/infrastructure/config/constants.js
  ├── src/infrastructure/database/connection.js
  ├── src/infrastructure/middleware/auth.middleware.js
  │     └── src/infrastructure/security/jwt.service.js
  │     └── src/infrastructure/security/permission.service.js
  ├── src/infrastructure/middleware/security.middleware.js
  └── src/app/routes.js
        ├── src/domains/personnel/routes.js
        │     └── src/domains/personnel/service.js
        │     └── src/domains/personnel/repository.js
        │     └── src/infrastructure/database/connection.js
        ├── src/domains/missions/routes.js
        │     └── src/domains/missions/service.js
        │     └── src/domains/missions/repository.js
        │     └── src/infrastructure/database/connection.js
        └── ... (other domains)
```

---

## 7. Import Rules

### 7.1 Path Aliases

Use `@/` as the root alias for `src/`:

```javascript
// Allowed
import { db } from '@/infrastructure/database/connection'
import { hashPassword } from '@/infrastructure/security/password.service'
import { normalizeDigits } from '@/infrastructure/utils/digits'
import { PersonnelService } from '@/domains/personnel/service'

// Forbidden
import { PersonnelRepository } from '@/domains/personnel/repository'  // from another domain
import { validatePersonnel } from '@/domains/personnel/validator'      // from another domain
import { PERMISSIONS } from '@/domains/personnel/constants'            // from another domain
```

### 7.2 Import Order

Within any file, imports must follow this order:
1. Node.js built-ins (`fs`, `path`, `crypto`)
2. External dependencies (`express`, `better-sqlite3`, `jsonwebtoken`)
3. Infrastructure modules (`@/infrastructure/...`)
4. Domain modules (`@/domains/...`)
5. Relative imports (if any)

### 7.3 Circular Import Prevention

- Domains may not import each other's internals.
- If two domains need to share data, extract the shared query into the consuming domain's repository or use a read model.
- Never use circular `require()` to resolve import order issues.

---

## 8. Naming Rules

### 8.1 Folders

| Element | Allowed | Forbidden | Example |
|---------|---------|-----------|---------|
| Root | `lowercase` | PascalCase, camelCase, snake_case | `src/`, `infrastructure/`, `domains/` |
| Domain | `lowercase` | PascalCase, camelCase, snake_case | `personnel/`, `missions/`, `backup/` |
| Concern | `lowercase` | PascalCase, camelCase, snake_case | `routes/`, `services/`, `repositories/` |

### 8.2 Files

| Element | Allowed | Forbidden | Example |
|---------|---------|-----------|---------|
| Infrastructure JS | `camelCase.js` | PascalCase, snake_case | `connection.js`, `auth.middleware.js` |
| Domain JS | `camelCase.js` or `index.js` | PascalCase, snake_case | `routes.js`, `service.js`, `repository.js` |
| Config | `camelCase.js` or `kebab-case.js` | PascalCase, snake_case | `env.js`, `feature-flags.js` |

### 8.3 Services

| Element | Allowed | Forbidden | Example |
|---------|---------|-----------|---------|
| Service file | `service.js` or `{domain}.service.js` | `service/index.js` (prefer flat) | `personnel.service.js` |
| Service class | `PascalCase` if class, otherwise module of functions | Generic names | `PersonnelService` or `createPersonnel()` |
| Service methods | `camelCase` | PascalCase, snake_case | `createPersonnel()`, `findMissionsByRegion()` |

### 8.4 Repositories

| Element | Allowed | Forbidden | Example |
|---------|---------|-----------|---------|
| Repository file | `repository.js` or `{domain}.repository.js` | `repo.js` | `personnel.repository.js` |
| Methods | `camelCase` | PascalCase, snake_case | `findById()`, `findByNationalId()`, `create()` |
| Return types | Plain objects or DTOs | Mixed | `Promise<PersonnelDTO>` |

### 8.5 Validators

| Element | Allowed | Forbidden | Example |
|---------|---------|-----------|---------|
| Validator file | `validator.js` or `{domain}.validator.js` | `validation.js` | `personnel.validator.js` |
| Methods | `camelCase` | PascalCase, snake_case | `validatePersonnel()`, `normalizeDigits()` |
| Return | Array of error strings or `null` | Throwing exceptions | `['نام الزامی است.']` |

### 8.6 DTOs

| Element | Allowed | Forbidden | Example |
|---------|---------|-----------|---------|
| DTO file | `dto.js` or `{domain}.dto.js` | `model.js`, `entity.js` | `personnel.dto.js` |
| Factory functions | `toDTO()`, `fromDTO()` | Generic names | `toPersonnelDTO(user)` |
| Shape | Plain objects with explicit keys | Classes (unless complex) | `{ id, name, lname, emp_num }` |

### 8.7 Middleware

| Element | Allowed | Forbidden | Example |
|---------|---------|-----------|---------|
| File | `{purpose}.middleware.js` | `middleware.js` | `auth.middleware.js` |
| Functions | `camelCase` | PascalCase | `authenticateToken`, `requirePermission` |
| Export | Named exports | Default export | `export function authenticateToken(req, res, next) { ... }` |

### 8.8 Config

| Element | Allowed | Forbidden | Example |
|---------|---------|-----------|---------|
| File names | `camelCase.js` or `kebab-case.js` | PascalCase, snake_case | `env.js`, `feature-flags.js` |
| Constants | `UPPER_SNAKE_CASE` | camelCase, PascalCase | `JWT_SECRET`, `DB_PATH`, `MAX_LOGIN_ATTEMPTS` |
| Exports | Named exports | Default export | `export const PORT = ...` |

---

## 9. Future Scalability Strategy

### 9.1 Adding a New Domain

To add a new module (e.g., `vehicles`):

```
1. Create src/domains/vehicles/
   ├── routes.js
   ├── service.js
   ├── repository.js
   ├── validator.js
   ├── constants.js
   └── dto.js

2. Add vehicle table DDL to src/infrastructure/database/schema.js
   (no existing domain changes)

3. Register routes in src/app/routes.js
   const vehicleRoutes = require('@/domains/vehicles/routes')
   app.use('/api/vehicles', vehicleRoutes)

4. Done.
```

**No changes to existing domains. No changes to infrastructure.**

### 9.2 Scaling Patterns

| Scale | Pattern | When to Apply |
|-------|---------|---------------|
| 1,000 LOC | Single-file `service.js`, `repository.js` per domain | Current state |
| 10,000 LOC | Split domain files by aggregate (e.g., `personnel/import.service.js`, `personnel/crud.service.js`) | When one service exceeds 500 lines |
| 50,000 LOC | Introduce domain-level `{aggregate}/` subfolders | When one domain exceeds 3,000 lines |
| 100,000 LOC | Consider read models / CQRS for high-traffic reads | When dashboard/reports become bottleneck |

### 9.3 Cross-Domain Data Access at Scale

When `missions` needs personnel data:

**Phase 1 (current scale):** Missions service imports Personnel service API.
```javascript
import { getPersonnelById } from '@/domains/personnel/service'
```

**Phase 2 (medium scale):** Missions domain maintains its own read-optimized view.
```javascript
// missions/repository.js
const missionWithPersonnel = db.prepare(`
  SELECT m.*, p.name as personnel_name, p.lname as personnel_lname
  FROM Missions m
  LEFT JOIN Personnel p ON m.emp_num = p.emp_num
  WHERE m.id = ?
`)
```

**Phase 3 (large scale):** Introduce event-driven sync or dedicated read database.
```javascript
// missions/read-model.js
// Syncs denormalized data from Personnel domain events
```

---

## 10. Responsibility Matrix

### 10.1 Who Owns What

| Concern | Owner | Example |
|---------|-------|---------|
| HTTP routes for personnel | `domains/personnel/` | `POST /api/personnel` |
| Personnel validation rules | `domains/personnel/` | National ID length, phone format |
| Personnel business logic | `domains/personnel/` | Bulk import conflict resolution |
| Personnel SQL queries | `domains/personnel/` | INSERT/UPDATE/SELECT on `Personnel` |
| Personnel constants | `domains/personnel/` | Status values, field labels |
| JWT sign/verify | `infrastructure/security/` | `jwt.service.js` |
| Password hashing | `infrastructure/security/` | `password.service.js` |
| Permission checking | `infrastructure/security/` | `hasPermission()`, `requirePermission()` |
| Database connection | `infrastructure/database/` | `connection.js` |
| Auth middleware | `infrastructure/middleware/` | `authenticateToken` |
| Rate limiting | `infrastructure/middleware/` | `rateLimitLogin` |
| CSP headers | `infrastructure/middleware/` | `helmet` config |
| Date conversion | `infrastructure/utils/` | `toJalaali()`, `formatJalali()` |
| Digit normalization | `infrastructure/utils/` | `normalizeDigits()` |
| App startup | `src/app/` | `server.js` |
| Route mounting | `src/app/` | `routes.js` |

### 10.2 Decision Authority

| Decision | Authority | Must Consult |
|----------|-----------|--------------|
| New domain | Human | Architects |
| New infrastructure module | Human | Architects |
| Schema change | Human + Domain owner | Security, DB admin |
| Route addition | Domain owner | Security (if auth-related) |
| Validation rule change | Domain owner | None |
| Permission change | Human + Security | Domain owner |
| Dependency addition | Human | Architects |
| Config change | Domain/Infra owner | None (unless env var) |

---

## 11. Migration Phases

### Phase 0: Preparation

**Goal:** Establish the `src/` structure and route registry. No code movement.

**Activities:**
- Create `src/infrastructure/` and `src/domains/` directories
- Create `src/app/` directory
- Document all existing routes in `docs/architecture/ROUTE_REGISTRY.md`
- Add `@/` path alias to `package.json` if using a bundler (optional for now)

**Risk:** Very Low  
**Rollback:** Delete empty directories

---

### Phase 1: Extract Infrastructure

**Goal:** Move all cross-cutting technical concerns into `src/infrastructure/`.

**Order:**
1. `config/` — Extract env vars, constants, feature flags
2. `database/` — Extract connection, schema, migrations
3. `utils/` — Extract date, digit, string utilities
4. `security/` — Extract JWT, password, permission services
5. `middleware/` — Extract auth, security, audit middleware

**Risk:** Low. Infrastructure has no domain logic.

**Rollback:** Keep `server.js` as fallback. Infrastructure files are additive.

**Validation:**
- [ ] `node server.js` starts
- [ ] All routes respond identically
- [ ] `npm test` passes (when tests exist)

---

### Phase 2: Extract First Domain (Personnel)

**Goal:** Prove the domain pattern works with the simplest domain.

**Activities:**
- Create `src/domains/personnel/`
- Extract personnel routes, service, repository, validator, constants, dto
- Wire into `src/app/routes.js`
- Run full validation

**Risk:** Medium. First extraction sets the pattern for all others.

**Rollback:** Delete `src/domains/personnel/`. Keep infrastructure.

---

### Phase 3: Extract Core Domains

**Goal:** Extract the remaining high-traffic domains.

**Order:**
1. `missions` — highest business value
2. `users` — security-critical
3. `reports` — read-heavy, good for testing read models

**Risk:** Medium. Multiple domains active.

---

### Phase 4: Extract Remaining Domains

**Goal:** Extract all remaining domains.

**Order:**
1. `backup` — file-system-heavy, low risk
2. `options` — simple CRUD
3. `audit` — read-only
4. `ai` — depends on infrastructure only
5. `dashboard` — aggregation, may need cross-domain queries

**Risk:** Low. Each domain is smaller and pattern is proven.

---

### Phase 5: Assemble and Cleanup

**Goal:** Replace `server.js` with thin `src/app/server.js`.

**Activities:**
- Create `src/app/app.js` — Express app setup
- Create `src/app/server.js` — Entry point (replaces root `server.js`)
- Migrate any remaining logic from old `server.js`
- Delete or archive old `server.js` after validation
- Update `package.json` `main` field if needed

**Risk:** Low. All logic already extracted.

**Validation:**
- [ ] `node src/app/server.js` starts
- [ ] All routes functional
- [ ] Frontend unchanged
- [ ] Database unchanged

---

## 12. Future Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Domain boundaries change** | Medium | High | Keep domains small. Split when they exceed 3,000 LOC. |
| **Cross-domain coupling grows** | Medium | High | Enforce import rules. Use code review to catch violations. |
| **Infrastructure becomes domain-aware** | Low | High | Keep infrastructure pure. No domain imports in `infrastructure/`. |
| **Over-engineering for scale** | Medium | Medium | Start with flat domain structure. Add sub-aggregates only when needed. |
| **Frontend/backend contract drift** | Medium | Medium | Maintain `docs/api/` as source of truth. Version APIs. |
| **Permission sprawl** | Medium | Medium | Centralize permission definitions in `infrastructure/config/permissions.js`. |
| **Database query duplication** | Low | Low | Accept some duplication for domain autonomy. Refactor only when DRY violations cause bugs. |
| **Migration paralysis** | Medium | High | Follow phases one at a time. Each phase is independently deployable. |

---

## 13. Architecture Decision Record (ADR)

### Context

RSTC_App is a monolithic Node.js/Express application. All routes, business logic, database access, and configuration live in a single `server.js` file (~988 lines). As the application grows, this creates:

- Merge conflicts when multiple AI agents or developers touch `server.js`
- Difficulty understanding module boundaries
- Risk of breaking unrelated features when making changes
- Inability to test or deploy modules independently
- High cognitive load for new contributors

A previous modularization proposal used a **file-type-driven** structure (`config/`, `controllers/`, `services/`, `repositories/`, `routes/`). This was **rejected** because it groups code by technical layer rather than business capability, making it harder to understand what a feature does end-to-end, and it risks mixing domain logic with infrastructure concerns.

### Decision

Adopt a **domain-driven modular architecture** with the following principles:

1. **Domains are organized by business capability** (personnel, missions, users, etc.), not by technical layer.
2. **Each domain is a self-contained vertical slice** owning its routes, services, repositories, validators, constants, and DTOs.
3. **Infrastructure is isolated** in `src/infrastructure/` and contains only cross-cutting technical concerns (config, database, middleware, security, utils).
4. **Domains depend on infrastructure, not on each other.** Cross-domain communication happens through public service APIs or read models.
5. **The app layer is thin** — it only bootstraps the server and mounts domain routers.

### Consequences

**Positive:**
- Each domain can be understood, tested, and deployed independently.
- Adding new domains (Vehicles, Contracts, Inventory, Finance, Notifications) requires zero changes to existing domains.
- AI agents can work on separate domains concurrently without merge conflicts.
- Business logic is co-located with its routes and data access, reducing cognitive load.
- Infrastructure changes (e.g., switching from SQLite to PostgreSQL) only affect `infrastructure/`.
- The structure scales from 1,000 LOC to 50,000+ LOC without redesign.

**Negative:**
- More files and directories to navigate compared to a monolith.
- Requires discipline to prevent cross-domain imports.
- Initial extraction is labor-intensive and must be done incrementally.
- Some duplication across domains is expected and accepted (e.g., similar repository patterns).

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| **Keep monolithic `server.js`** | Does not solve merge conflicts, cognitive load, or scaling issues. |
| **File-type-driven structure** (`config/`, `controllers/`, `services/`, etc.) | Groups code by technical layer, not business capability. Harder to understand feature boundaries. Mixes domain and infrastructure concerns. |
| **Microservices** | Overkill for a single-team internal tool. Adds network complexity, deployment overhead, and distributed systems challenges. |
| **Feature-sliced / Feature folders** | Similar to domain-driven but less strict about infrastructure isolation. Could work, but domain-driven better matches the bounded contexts in this project. |
| **Layered architecture** (`presentation/`, `application/`, `domain/`, `infrastructure/`) | Too abstract for a small team. Domain layer becomes a dumping ground. Harder to enforce boundaries. |

---

## 14. Summary

This architecture is **domain-first, infrastructure-second**. It treats each business capability as a first-class citizen while keeping technical concerns isolated and reusable. The design supports concurrent AI agent development, scales to 50,000+ LOC, and can accommodate new domains (Vehicles, Contracts, Inventory, Finance, Notifications) with minimalChanges to existing code.

**Next step:** Execute the migration phases in `docs/architecture/MODULARIZATION_PLAN.md`, starting with Phase 0 (Preparation).
