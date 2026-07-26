# Coding Standards — RSTC_App

## 1. General Coding Principles

- Preserve existing behavior unless explicitly asked to change it.
- Match indentation and quoting style of the file you edit.
- Do not introduce new dependencies without explicit approval.
- Write code for the next developer: prefer clarity over cleverness.
- Apply the smallest correct change; avoid proactive rewrites.

## 2. JavaScript Conventions

**Style**
- Use 4-space indentation.
- Use double quotes for strings, matching existing code in `server.js`.
- Use semicolons.
- Prefer `const` by default; use `let` only for reassignment.
- Do not use `var`.

**Examples**
```javascript
require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const app = express();
```

## 3. Express Backend Conventions

- Place all routes in `server.js` unless explicitly instructed to split.
- Use async wrappers for all database operations: `dbRun`, `dbGet`, `dbAll`.
- Pass errors to the client via `res.status(...).json({ error: e.message })`.
- Use `authenticateToken` before `requirePermission` in route middleware chains.
- Wrap write operations with `auditMiddleware(entity)`.

**Example**
```javascript
app.post('/api/personnel', authenticateToken, requirePermission(PERMISSIONS.PERSONNEL_CREATE), auditMiddleware('Personnel'), async (req, res) => {
    try {
        // logic
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
```

## 4. SQLite Conventions

- Always use parameterized queries with `?` placeholders.
- Never concatenate user input into SQL strings.
- Use uppercase SQL keywords: `SELECT`, `INSERT`, `CREATE TABLE`, etc.
- Name migrations inside `initializeDatabase()` using `ALTER TABLE ... ADD COLUMN` followed by `.catch(() => {})` fallbacks.
- For breaking schema changes, rename the old table, create the new one, then migrate.

**Example**
```javascript
await dbRun("SELECT * FROM Users WHERE username = ?", [username]);
await dbRun(`UPDATE Personnel SET name=? WHERE id=?`, [name.trim(), req.params.id]);
```

## 5. Error Handling

- Always use `try/catch` in `async` route handlers.
- Send user-facing errors as JSON: `res.status(code).json({ error: message })`.
- Preserve Persian error messages for existing endpoints unless localization is explicitly requested.
- Do not expose stack traces or internal details in production responses.
- Do not silently swallow errors; if `.catch(() => {})` is used, document why.

**Example**
```javascript
} catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'duplicate national ID' });
    res.status(500).json({ error: e.message });
}
```

## 6. Logging

- Use `console.error` for operational problems.
- Use `console.log` for startup and important milestones.
- Do not log secrets, JWT payloads, or database contents.
- Audit logging must flow through `logAudit()`, not direct console calls.

## 7. Folder Organization

- Currently single-file architecture. If splitting is requested:
  - Group backend code by concern: routes, middleware, services, repositories, utils.
  - Keep `public/` for client assets. Do not move it without explicit instruction.
  - Place one-off scripts in `tools/` or `scripts/`, not in the project root.

## 8. Function Design

- Keep functions small and single-purpose.
- Use arrow functions for short callbacks: `next => { ... }`.
- Keep database wrapper signatures stable: `async function dbRun(sql, params = [])`.
- Pure helpers (validation, formatting) should be pure and testable.
- Side-effectful helpers should be clearly named and isolated.

**Example**
```javascript
function normalizeDigits(str) {
    if (str === null || str === undefined) return str;
    // ...
}

function validatePersonnel(body) {
    if (body.national_id) body.national_id = normalizeDigits(body.national_id).trim();
    // ...
}
```

## 9. Naming Rules

- Use `camelCase` for variables, functions, and local identifiers.
- Use `UPPER_SNAKE_CASE` for constants and config objects.
- Route parameters use `:id` or descriptive names: `:index` for array operations.
- Database columns match existing schema names; do not rename columns without migration.
- Permission strings use `module:action` format: `personnel:create`.

**Examples**
```javascript
const JWT_SECRET = process.env.JWT_SECRET;
const MODULES = { PERSONNEL: 'personnel' };
function hasPermission(user, permission) { ... }
app.get('/api/users/:id', ...);
```

## 10. Comments

- Use section headers sparingly: `// ===== SECTION NAME =====`.
- Comments must explain *why*, not *what* the code already shows.
- Do not leave commented-out code blocks.
- Delete obsolete patch scripts and `.bak` files; do not comment them out.

## 11. Performance

- Use `Promise.all()` for independent DB reads, as seen in dashboard routes.
- Do not load entire tables into JavaScript unless necessary for search/autocomplete.
- Avoid N+1 queries: fetch required collections with targeted SQL.
- Schedule cheap in-memory operations with `setInterval` only when necessary; acknowledge that state resets on restart.

**Example**
```javascript
const [total, active, inactive] = await Promise.all([
    dbGet("SELECT COUNT(*) as count FROM Personnel"),
    dbGet("SELECT COUNT(*) as count FROM Personnel WHERE status='فعال'"),
    dbGet("SELECT COUNT(*) as count FROM Personnel WHERE status='غیرفعال'")
]);
```

## 12. Security

- Never disable `JWT_SECRET` enforcement.
- Never weaken Helmet CSP directives without documented justification.
- Never add `eval()`, `Function()`, or dynamic script injection.
- Use `bcrypt` with cost 10 for passwords.
- Use `serializePermissions` / `deserializePermissions` for storing permission arrays as JSON strings.
- Validate and normalize user input before database writes.
- Rate limit brute-force risk surface (e.g., `/api/login`).

## 13. AI-Generated Code Rules

- Every agent must read `.ai/AI_MASTER_PROMPT.md` before editing code.
- Match the conventions defined in `standards/coding.md`.
- Update `standards/` when introducing new patterns.
- Record breaking or architectural changes in `.ai/DECISIONS.md`.
- Do not leave large TODO comments; either implement, record in `REPORT.md`, or create a ticket in `.ai/TASKS.md`.

## 14. Refactoring Rules

- Refactor only when preparing for a concrete requirement or when safety demands it.
- Each refactoring step must preserve passing behavior and security checks.
- If splitting `server.js`, do it incrementally and verify each step.
- Do not change error messages or API contract shapes during refactoring unless requested.

## 15. Code Review Checklist

- [ ] Database queries are parameterized.
- [ ] Authentication and authorization are enforced on protected routes.
- [ ] Persian strings for errors and UI labels are preserved or intentionally updated.
- [ ] No secrets, tokens, or passwords are logged.
- [ ] Audit middleware is applied to write operations.
- [ ] No new dependencies were introduced without approval.
- [ ] Error responses include JSON `{ error: ... }`.
- [ ] Existing tests or manual flows are not broken.
- [ ] Relevant `docs/`, `standards/`, and `.ai/` files are updated.
