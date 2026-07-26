# TASKS.md — Engineering Backlog

## 1. Current Sprint
High-priority items planned for immediate execution.

| ID | Priority | Status | Description | Dependencies |
|-----|----------|--------|-------------|--------------|
| T-002 | High | Todo | Define coding standards in `standards/` so all future agents follow consistent patterns. | None |
| T-003 | High | Todo | Write automated tests for login, permission enforcement, and decree number generation (highest ROI). | T-002 |
| T-004 | High | Todo | Document API contracts in `docs/api/README.md` for client-server consistency. | None |
| T-005 | High | Todo | Remove hardcoded default admin password fallback; enforce explicit `INIT_ADMIN_PASSWORD`. | None |
| T-006 | Medium | Todo | Add CSRF token protection on state-changing POST/PUT/DELETE endpoints. | None |

## 2. Backlog
Planned work beyond the current sprint.

| ID | Priority | Status | Description | Dependencies |
|-----|----------|--------|-------------|--------------|
| T-007 | Medium | Todo | Clean up root directory: relocate `pdf_template.js`, `patch_script.js`, `apply_patch.js`, and dump/backup directories into `tools/` or `scripts/`. | None |
| T-008 | Medium | Todo | Fix PDF endpoint mismatch: align server-side `/api/missions/:id/pdf` behavior with client-side PDF logic. | T-007 |
| T-009 | Low | Todo | Gradually separate `server.js` concerns into `routes/`, `middleware/`, `services/`, `repositories/`, and `utils/`. | T-004, T-002 |
| T-010 | Low | Todo | Modularize frontend `public/script.js` and `public/style.css` into maintainable units. | T-009 |
| T-011 | Low | Todo | Introduce centralized request validation layer (e.g., Zod) to replace ad-hoc backend validation. | T-009 |
| T-012 | Medium | Todo | Refactor inline event handlers and eval-like patterns to remove `unsafe-inline` from CSP. | None |
| T-013 | Low | Todo | Set up CI/CD pipeline for lint, test, and deployment validation. | T-003, T-014 |
| T-014 | Low | Todo | Migrate secrets to Railway environment variables or secrets manager; remove hardcoded fallbacks. | T-005 |

## 3. In Progress
No active tasks tracked.

| ID | Priority | Status | Description | Dependencies |
|-----|----------|--------|-------------|--------------|

## 4. Completed
Finished work.

| ID | Priority | Status | Description | Dependencies |
|-----|----------|--------|-------------|--------------|
| T-001 | High | Done | Repository AI-first preparation: created `.ai/`, `docs/`, `prompts/`, `standards/` folders and stub markdown files. Generated `REPORT.md`. | None |

## 5. Technical Debt
Items from PROJECT_CONTEXT.md §10.

| ID | Priority | Status | Description | Dependencies |
|-----|----------|--------|-------------|--------------|
| T-007 | Medium | Todo | Debug/patch scripts and dump directories in project root rather than dedicated folders. | None |
| T-009 | Low | Todo | Monolithic backend: `server.js` mixes routing, business logic, DB init, and utilities. | T-004, T-002 |
| T-010 | Low | Todo | Monolithic frontend: `script.js` (~2000+ lines) and `style.css` (~3358 lines) lack modularity. | T-009 |
| T-011 | Low | Todo | No centralized validation layer for request payloads. | T-009 |
| T-012 | Medium | Todo | CSP requires `unsafe-inline` due to inline event handlers and eval-like patterns. | None |

## 6. Security Tasks
Items from PROJECT_CONTEXT.md §11 and §15.

| ID | Priority | Status | Description | Dependencies |
|-----|----------|--------|-------------|--------------|
| T-005 | High | Todo | Hardcoded default password: eliminate `admin1234` fallback when `INIT_ADMIN_PASSWORD` is not set. | None |
| T-006 | Medium | Todo | No CSRF protection on state-changing endpoints. | None |
| T-012 | Medium | Todo | `unsafe-inline` CSP reduces XSS protection for current client code. | None |
| T-014 | Low | Todo | Seats management: rely exclusively on environment variables or secrets manager. | T-005 |

## 7. Documentation Tasks
Items from PROJECT_CONTEXT.md §15 and general documentation gaps.

| ID | Priority | Status | Description | Dependencies |
|-----|----------|--------|-------------|--------------|
| T-002 | High | Todo | Populate `standards/coding.md`, `standards/git.md`, `standards/testing.md`, and `standards/naming.md`. | None |
| T-004 | High | Todo | Document all API routes, schemas, and error codes in `docs/api/README.md`. | None |

## 8. Future Improvements
Items from PROJECT_CONTEXT.md §12.

| ID | Priority | Status | Description | Dependencies |
|-----|----------|--------|-------------|--------------|
| T-009 | Low | Todo | Backend architecture: gradual separation into `routes/`, `middleware/`, `services/`, `repositories/`, `utils/`. | T-004, T-002 |
| T-010 | Low | Todo | Frontend: adopt a lightweight module pattern to split monolithic JS/CSS. | T-009 |
| T-011 | Low | Todo | Validation: centralized Zod or similar layer for request payloads. | T-009 |
| T-013 | Low | Todo | CI/CD: GitHub Actions or Azure DevOps pipeline for lint, test, and deployment validation. | T-003, T-014 |
| T-014 | Low | Todo | Secrets: use Railway environment variables or secrets manager exclusively. | T-005 |
