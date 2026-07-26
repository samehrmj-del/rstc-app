# AI-First Repository Preparation Report

**Generated:** 2026-07-25T20:38:36+03:30  
**Agent:** Kilo  
**Repository:** RSTC_App

## 1. Repository Analysis

| Attribute | Value |
|-----------|-------|
| Type | Node.js / Express 5 |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcrypt + legacy SHA256 migration |
| UI | Static frontend served from `public/` |
| Language | Persian/Farsi labels, mixed English identifiers |
| Current structure | Single `server.js` with all routes/server logic |

### Key Modules Identified

- **Personnel Management:** CRUD for employee records (`Personnel` table)
- **Mission Management:** CRUD for missions (`Missions` table) with decree numbering
- **Reporting:** Filter missions by device, region, dates
- **User Management:** Admin/editor/operator/viewer roles with permission system
- **Audit Logging:** Automatic write-action logging
- **Backup/Restore:** Database export, validation, and restore endpoints
- **System Options:** Dropdown/options stored in database (`SystemOptions`)
- **AI Chat:** Permission-gated module (`ai_chat`)

### Security Observations

- Helmet and CORS enabled
- Hardcoded default password fallback present (`admin1234`)
- Environment-based JWT secret enforcement
- Custom rate limiter for login
- No CSRF protection on stateful routes

## 2. Folders Created

The following folders were created to support AI-first project maintenance:

- `.ai/` — AI system prompt and project context files
- `docs/` — Documentation root
- `docs/architecture/` — Architecture docs
- `docs/database/` — Database schema/migration docs
- `docs/api/` — API contract docs
- `docs/security/` — Security policies and findings
- `docs/ui/` — Frontend/UI docs
- `docs/deployment/` — Deployment and ops docs
- `prompts/` — Reusable AI prompt templates
- `standards/` — Code standards and conventions

## 3. Empty Markdown Files Created

All files were created without overwriting existing content.

### AI System Files

| File | Purpose |
|------|---------|
| `.ai/AI_MASTER_PROMPT.md` | Master instructions for AI agents |
| `.ai/PROJECT_CONTEXT.md` | High-level project context |
| `.ai/TASKS.md` | Active/backlog task tracking |
| `.ai/DECISIONS.md` | Architectural decision logs (ADRs) |
| `.ai/CHANGELOG_AI.md` | AI-driven change log |

### Documentation Stubs

| File | Purpose |
|------|---------|
| `docs/architecture/README.md` | Architecture overview |
| `docs/database/README.md` | Schema and migrations |
| `docs/api/README.md` | API reference |
| `docs/security/README.md` | Security policy |
| `docs/ui/README.md` | Frontend notes |
| `docs/deployment/README.md` | Deployment guide |

### Standards Files

| File | Purpose |
|------|---------|
| `standards/coding.md` | Coding conventions |
| `standards/git.md` | Git workflow |
| `standards/testing.md` | Test standards |
| `standards/naming.md` | Naming conventions |

### Prompt Templates

| File | Purpose |
|------|---------|
| `prompts/create-component.md` | Scaffold new UI/backend components |
| `prompts/create-page.md` | Scaffold new pages/routes |
| `prompts/fix-bug.md` | Standardize bug fix workflow |
| `prompts/review-code.md` | Standardize code review prompts |
| `prompts/optimize.md` | Standardize optimization prompts |

## 4. Source Code Changes

**None.** No application code was modified.

## 5. Next Steps for Human/AI Teams

1. Populate `.ai/PROJECT_CONTEXT.md` with domain-specific details.
2. Document database schema in `docs/database/README.md`.
3. Extract API routes into `docs/api/` for contract testing.
4. Move frontend code out of `public/` into a structured `src/` tree if applicable.
5. Review `standards/naming.md` against actual convention in `server.js`.

## 6. Validation

- All folders verified to exist post-creation.
- All files verified to be empty and newly created.
- No pre-existing files were overwritten.
