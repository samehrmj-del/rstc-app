# PROJECT_CONTEXT.md — RSTC_App

## 1. Project Overview
RSTC_App is an internal enterprise web application for **Railway Service and Technical Construction Company (RSTC)** — شرکت خدمات خط و ابنیه فنی راه آهن. It manages human resources (personnel) and mission decree issuance (صدور حکم ماموریت). The application is currently a single-service Node.js backend with a vanilla JavaScript frontend served as static files.

## 2. Business Purpose
- Register and manage personnel records (name, national ID, employment number, job title, contact, status).
- Issue mission decrees (حکم ماموریت) with auto-generated decree numbers in `RSTC-YYYYMMDD-XXXX` format.
- Generate reports and analytics filtered by region, device type, dates, and personnel attributes.
- Enforce role-based access control for operators, editors, viewers, and administrators.
- Maintain audit logs of all critical write operations.
- Provide backup/restore capabilities and system-wide option management (dropdowns/enums).

## 3. Current Tech Stack
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (>=18) |
| Backend Framework | Express 5 |
| Database | SQLite via `better-sqlite3` |
| Authentication | JWT (`jsonwebtoken`) + bcrypt + legacy SHA256 migration |
| Security | `helmet`, `cors`, custom rate limiter |
| Frontend | Plain HTML/CSS/JS (no framework), RTL Persian layout |
| Font | Vazirmatn (local woff2/ttf + CDN fallback) |
| Client PDF | jsPDF, html2canvas (CDN) |
| AI Engine | Custom `ai_engine.js` (question-answering over database) |

## 4. Repository Structure
```
RSTC_App/
├── server.js                 # Main backend (routes, auth, DB init)
├── ai_engine.js              # AI chat helper — parse Persian questions, query DB
├── pdf_template.js           # HTML template builder for mission decree PDFs
├── patch_script.js           # Utility: patch script.js PDF behavior
├── apply_patch.js            # Utility: patch server.js PDF block
├── package.json              # Node dependencies and scripts
├── .env                      # Local environment (secrets — DO NOT commit)
├── .env.example              # Environment template
├── options.json.migrated     # Migrated options file
├── rstc_database.db          # SQLite database (local)
├── public/
│   ├── index.html            # SPA shell (login + dashboard + pages)
│   ├── style.css             # Full application styles (~3358 lines)
│   ├── script.js             # Client-side logic (~2000+ lines)
│   └── fonts/                # Vazirmatn font files
├── backups/                  # Runtime backup directory
├── _backup_20260628_214620/  # Historical backup directory
├── _secure_fix_backup_20260628_221321/  # Historical backup directory
├── dump_20260629_022954/     # Database dump directory
├── .kilo/                    # Kilo IDE config
└── .vscode/                  # VS Code workspace config
```

## 5. Current Architecture
The application follows a **monolithic single-file backend** architecture:
- `server.js` contains all route definitions, middleware, database initialization, and business logic.
- `ai_engine.js` is the only external module, providing `parseAndAnswer` for the AI chat endpoint.
- The frontend is a single `index.html` SPA with page sections toggled via CSS classes.
- There is **no build step, no framework, no routing library** on the client.
- Database access uses custom async wrappers (`dbRun`, `dbGet`, `dbAll`) over `better-sqlite3`.
- State is stored server-side in SQLite and client-side in `localStorage` (JWT token, theme preference).
- PDF generation was moved to client-side via jsPDF; server-side PDF endpoint returns 404.

## 6. Main Modules
| Module | Routes / Files | Description |
|--------|---------------|-------------|
| Authentication | `/api/login` | JWT login with bcrypt + legacy SHA256 migration |
| Personnel | `/api/personnel*` | CRUD + bulk Excel import |
| Missions | `/api/missions*` | CRUD + auto decree numbering + Jalaali date conversion |
| Reports | `/api/reports/missions` | Advanced filter + Excel export |
| Users | `/api/users*` | Admin user management + permission matrix + self-password change |
| Backup | `/api/backup*`, `/api/restore` | DB export/validate/restore + scheduled hourly backups |
| Options | `/api/options*` | Dynamic dropdown/option management stored in DB |
| Audit | `/api/audit` | Read audit log |
| AI Chat | `/api/ai/ask` | Persian natural-language queries against personnel/mission data |
| Dashboard | `/api/dashboard` | Aggregated stats, charts data, recent items |
| Health | `/api/health` | Liveness check |

## 7. Database Overview
**Tables:**
- `Users` — id, username, password (bcrypt or legacy SHA64), role, permissions (JSON), status, last_login, login_count, created_at
- `Personnel` — id, name, lname, father_name, national_id (unique), emp_num (unique), hire_date, emp_type, org_post, job_title, last_degree, phone, address, status, notes
- `Missions` — id, decree_num (unique), name, lname, emp_num, job_title, mission_type, device_type, repair_type, region, location, subject, device_serial, duration, overtime_hours, start_date, end_date, issue_date, boolean flags (is_single, is_group, is_supplied, is_unsupplied, is_issued, is_extended, is_gov, is_plane, is_train, is_agency, is_bus, is_personal), created_at
- `AuditLog` — id, user_id, username, action, entity, entity_id, detail, ip, created_at
- `SystemOptions` — field (PK), label, options (JSON array)

**Migrations:** Schema changes are handled inline in `initializeDatabase()` via `ALTER TABLE ... ADD COLUMN` with `.catch(() => {})` fallbacks and table rename patterns for breaking changes.

## 8. Authentication & Authorization
- **Auth:** JWT bearer tokens stored in `localStorage`. Tokens expire in 8 hours.
- **Password:** Bcrypt cost 10. Legacy SHA256 hashes are detected by 64-char hex pattern and migrated transparently on login.
- **Authorization:** Module:Action permission strings (e.g., `personnel:create`). Roles include `admin`, `editor`, `operator`, `viewer`, and `custom`. Admin bypasses permission checks. Permission matrix UI allows granular assignment.
- **Rate Limiting:** Custom in-memory IP-based rate limiter on `/api/login` (10 attempts per 15 minutes).
- **Session:** Client-side session timer warns 10 minutes before expiry and logs out on expiry.

## 9. Current Strengths
- Single-file backend is easy to deploy and understand for its scale.
- Strong security defaults for an internal tool: Helmet CSP, CORS control, rate limiting, JWT enforcement, parameterized SQL.
- Audit logging is built into write operations automatically.
- Legacy password migration reduces friction for existing users.
- Persian-first UX with RTL, Vazirmatn font, Jalaali calendar, and digit normalization.
- Dynamic system options allow admin-configurable dropdowns without code changes.
- Auto-generated decree numbering ensures uniqueness and traceability.

## 10. Current Technical Debt
- **Monolithic backend:** `server.js` mixes routing, business logic, DB init, and utilities in one file (~988 lines).
- **Monolithic frontend:** `script.js` (~2000+ lines) and `style.css` (~3358 lines) in single files without modularity.
- **No tests:** No unit, integration, or E2E tests found.
- **No build pipeline:** No bundler, linter, or type checker configured.
- **CSP requires `unsafe-inline`** for scripts due to inline event handlers and eval-like patterns in client code.
- **In-memory session state:** Rate limiter and scheduled backup use in-memory maps/intervals; they reset on restart.
- **Hardcoded default password fallback:** If `INIT_ADMIN_PASSWORD` is not set, `admin1234` is used in code.
- **Debug/patch scripts in root:** `apply_patch.js`, `patch_script.js`, multiple `.bak` files, and dump directories are present in the project root rather than a dedicated `scripts/` or `tools/` folder.
- **PDF endpoint mismatch:** Server returns 404 for PDF; client PDF logic may be inconsistent.

## 11. Known Risks
| Risk | Severity | Notes |
|------|----------|-------|
| Hardcoded default password | High | Creates weak default if env var is missed |
| `unsafe-inline` CSP | Medium | Required by current client code; reduces XSS protection |
| No CSRF protection | Medium | State-changing endpoints rely solely on JWT |
| No input sanitization layer | Medium | Backend validates some fields; frontend has limited XSS prevention beyond basic escaping |
| SQLite single-writer | Low | Acceptable for internal single-user/small-team scale |
| No automated tests | High | Changes carry manual regression risk |
| Backup scripts in root | Low | Clutters repo; may confuse agents |

## 12. Future Architecture Vision
- **Backend:** Gradual separation of concerns into `routes/`, `middleware/`, `services/`, `repositories/`, and `utils/` while keeping Express and SQLite unless the team decides to migrate.
- **Frontend:** Consider introducing a lightweight framework or module pattern to split `script.js` and `style.css` into maintainable units.
- **Validation:** Centralized Zod or similar validation layer for request payloads.
- **Testing:** Jest or Vitest for unit/integration tests, especially around auth, permissions, and mission number generation.
- **CSP:** Remove `unsafe-inline` by refactoring inline handlers and extracting scripts.
- **Secrets:** Use a secrets manager or Railway environment variables exclusively; remove hardcoded fallbacks.
- **CI/CD:** GitHub Actions or Azure DevOps pipeline for lint, test, and deployment validation.

## 13. AI Collaboration Rules
- All AI agents must read `.ai/AI_MASTER_PROMPT.md` before making changes.
- Agents must read `.ai/PROJECT_CONTEXT.md` before proposing architectural changes.
- Agents must update `.ai/DECISIONS.md` when introducing new patterns or breaking changes.
- Agents must leave `REPORT.md` for post-task summaries only; do not edit it during implementation.
- No source code ownership: any agent may propose refactors, but must justify them and obtain approval before restructuring architecture.

## 14. Current Development Status
- **Stable feature set:** Personnel, Missions, Reports, Users, Options, Audit, Backup, AI Chat, and Dashboard are implemented and functional.
- **Active refinements:** PDF export behavior, security hardening, and UI polish are iterative.
- **No active branches or PR metadata found** in the working directory analysis.
- **Deployment target:** Presumed Railway or similar Node host based on volume paths and `.env` comments.

## 15. Immediate Priorities
1. **Populate `.ai/TASKS.md`** with the next 3–5 concrete tasks.
2. **Document API contracts** in `docs/api/README.md` for client-server consistency.
3. **Write tests** for login, permission enforcement, and decree number generation (highest ROI).
4. **Clean up root directory** by moving `pdf_template.js`, `patch_script.js`, `apply_patch.js`, and dump/backup directories into dedicated `tools/` or `scripts/` folders.
5. **Harden security:** Remove hardcoded default password path, tighten CSP, and add CSRF tokens.
6. **Define coding standards** in `standards/` so all future agents follow consistent conventions.
