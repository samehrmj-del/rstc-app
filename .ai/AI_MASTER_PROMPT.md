# AI Agent Guide — RSTC_App

## Project Mission
RSTC_App is an enterprise personnel and mission management system built with Node.js, Express, and SQLite. It enforces role-based access control, audit logging, and Persian-language workflows. Your role is to extend, refactor, and maintain this codebase without breaking existing behavior or security guarantees.

## Working Principles
1. **Do no harm:** Preserve existing API contracts, database schemas, and authentication flows unless explicitly asked to change them.
2. **Minimal change:** Prefer the smallest correct edit. Do not rewrite working code proactively.
3. **Ask before guessing:** If requirements, domain rules, or legacy behavior are unclear, stop and ask the user.
4. **Tool agnostic:** This guide is designed for any AI coding agent (Kilo, Claude Code, Cursor, Cline, Roo Code, GitHub Copilot, and future tools). Follow the rules regardless of the interface.
5. **No secrets in output:** Never log, commit, or expose JWT secrets, database paths, or credentials.

## Analysis Before Implementation
Before writing any code, complete the following:
1. **Read the relevant files.** Understand the existing implementation, module boundaries, and data flows.
2. **Identify risks.** List what could break, regress, or introduce security issues.
3. **Propose alternatives.** When a better architectural pattern exists, describe it and get approval before changing existing structure.
4. **Justify architectural changes.** Do not restructure modules, split files, or replace core patterns without explicit user approval.

## Required Reading Order
1. `server.js` — Read the full file before proposing route, auth, or database changes.
2. `package.json` — Understand dependencies and Node engine constraints (`>=18`).
3. `.env.example` / existing `.env` — Determine required environment variables without revealing secrets.
4. `docs/api/README.md` — If present, read before touching endpoints.
5. `standards/*.md` — Follow all active standards files if they exist.

## Code Quality Rules
- Match existing style indentation and quoting patterns in the file you edit.
- Do not introduce new dependencies without explicit approval.
- Use existing abstraction layers for database access and authentication.
- Preserve Persian error messages and UI labels unless localization is explicitly requested.

## Architecture Rules
- Follow existing architectural boundaries unless the user approves restructuring.
- New middleware and services should integrate with, not replace, established flows.
- Database schema changes require careful migration alongside existing schema definitions.
- Static assets and frontend structure should not be moved without explicit instruction.

## Security Rules
- Enforce `JWT_SECRET` presence; refuse to start or run without it.
- Preserve login rate limiting and legacy password migration logic.
- Maintain Helmet and CORS configurations; do not weaken CSP directives.
- Always use parameterized queries. Never concatenate user input into SQL.
- Audit middleware must wrap write operations (POST/PUT/DELETE).

## Documentation Rules
- Update relevant docs when changing APIs, schemas, or permissions.
- If a standards file covers the change, update it before updating application code.
- Leave `REPORT.md` for post-task summaries; do not edit it during implementation.

## Definition of Done
- [ ] Code compiles/runs and startup completes without config errors.
- [ ] No existing tests or manual flows are broken.
- [ ] Security-sensitive changes are reviewed against the Security Rules above.
- [ ] Relevant docs/standards are updated.
- [ ] `git status` shows only intended files changed.

## Phase Reporting Requirement
At the end of every Phase, additionally report:
1. **Lines remaining in `server.js`** — count of lines currently in the file.
2. **Routes remaining in `server.js`** — count of inline route handlers still defined in `server.js`.
3. **Domains extracted** — count of completed vertical-slice domains under `src/domains/`.

## Output Format After Each Completed Task
Report completion in this exact structure:
1. **Summary:** One sentence describing what was changed.
2. **Files Modified:** Bullet list of file paths.
3. **Validation:** Commands run and results (e.g., application started successfully, manual request verified).
4. **Caveats / Follow-ups:** Any risks, TODOs, or decisions left for the user.
5. **Phase Metrics (if applicable):** Lines in server.js / Routes in server.js / Domains extracted.
6. **Next Step Recommendation:** One concrete action, or "None — task complete."
