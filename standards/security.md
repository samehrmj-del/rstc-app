# Security Standard — RSTC_App

## 1. Purpose & Scope

This document is the **single source of truth** for all security rules in RSTC_App. It supersedes any security rules duplicated in `AI_MASTER_PROMPT.md`, `standards/coding.md`, and `PROJECT_CONTEXT.md`.

**Scope:** All backend routes, database access, client-side security, AI endpoints, backup/restore operations, and AI agent workflows that touch this repository.

**Authority:** Every agent, human contributor, and CI pipeline must conform to this document. Deviations require written approval from the repository owner.

---

## 2. Security Principles

| Principle | Rule |
|-----------|------|
| **Fail closed** | Deny access by default. Explicitly grant after authentication and authorization checks. |
| **Least privilege** | Users, agents, and services receive the minimum permissions required for their role. |
| **Defense in depth** | No single control is sufficient. Layer auth, input validation, parameterized queries, and audit logging. |
| **No secrets in output** | Never log, echo, commit, or expose JWT secrets, database paths, passwords, or API keys. |
| **Preserve existing guarantees** | Do not weaken existing security controls without documented, approved justification. |
| **Audit everything sensitive** | All write operations, authentication events, and administrative actions must be auditable. |

---

## 3. Authentication

### 3.1 Current Mechanism
- JWT bearer tokens delivered over HTTPS.
- Tokens expire after 8 hours.
- Tokens are stored client-side in `localStorage` under key `rstc_token`.
- Login is protected by an in-memory IP-based rate limiter: 10 attempts per 15 minutes.

### 3.2 Required Rules
- All protected routes **must** use `authenticateToken` middleware.
- Unauthenticated requests must return HTTP 401 with JSON `{ error: 'احراز هویت الزامی است' }`.
- Authentication state must be verified on the server for every request. Client-side checks are not sufficient.
- Tokens must include: `id`, `username`, `role`, `permissions`. No other PII.

### 3.3 Known Weaknesses
- **localStorage is XSS-prone.** There is no HttpOnly cookie alternative currently implemented.
- No token refresh mechanism. Users must re-authenticate after 8 hours.
- No explicit logout endpoint to invalidate server-side token state.
- No multi-factor authentication (MFA).

---

## 4. Authorization

### 4.1 Current Mechanism
- Permission strings: `module:action` format (e.g., `personnel:create`, `missions:edit`).
- Roles: `admin`, `editor`, `operator`, `viewer`, `custom`.
- `admin` bypasses all permission checks.
- Permission matrix UI allows granular per-user assignment.
- Protected routes use `requirePermission(PERMISSIONS.X)`.

### 4.2 Required Rules
- Every state-changing route (`POST`, `PUT`, `DELETE`) **must** enforce `authenticateToken` + `requirePermission`.
- Permission checks **must** occur before business logic executes.
- Admin bypass is acceptable for now but must be explicitly flagged when any future separation-of-concerns refactor occurs.
- Permission strings are stored as JSON arrays in the `Users.permissions` column. Always serialize/deserialize through `serializePermissions` / `deserializePermissions`.

### 4.3 Known Weaknesses
- **Permission semantic mismatch:** `BACKUP_RESTORE` maps to runtime string `'backup:delete'`. This is confusing and error-prone. A dedicated `backup:restore` value should be introduced via migration.
- No ownership-based access control (e.g., a user can edit any personnel record, not just their own).

---

## 5. JWT

### 5.1 Current Mechanism
- Library: `jsonwebtoken`.
- Secret: `JWT_SECRET` environment variable.
- Expiry: 8 hours (`expiresIn: '8h'`).
- Algorithm: Not explicitly specified; defaults to HS256.

### 5.2 Required Rules
- **Always specify the algorithm explicitly:** `jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '8h' })`.
- `JWT_SECRET` must be at least 32 random bytes (256 bits). Use a cryptographically secure generator.
- Tokens must be transmitted over HTTPS only. The application must reject or refuse to run on HTTP in production.
- Do not embed PII in JWT payloads beyond `id`, `username`, `role`, `permissions`.

### 5.3 Known Weaknesses
- No token revocation list or blacklist. A stolen token remains valid until expiry.
- No `jti` (JWT ID) claim, making revocation impossible.
- Client-side storage in `localStorage` is vulnerable to XSS exfiltration.
- No token refresh or sliding session mechanism.

---

## 6. Passwords

### 6.1 Current Mechanism
- Bcrypt with cost 10 (`bcrypt.hash(p, 10)`).
- Legacy migration: SHA256 hashes are detected by 64-character hex pattern and upgraded to bcrypt transparently on login.
- Minimum length: 4 characters (enforced in some endpoints, not all).

### 6.2 Required Rules
- All passwords **must** be hashed with bcrypt cost 10 or higher.
- Legacy hash migration **must** be preserved during auth refactors.
- Passwords **must** be normalized before hashing: trim whitespace, normalize Persian/Arabic digits to ASCII.
- Password comparison **must** use timing-safe methods (`bcrypt.compare`).
- Minimum password length **must** be enforced server-side for every mutation endpoint (`/api/users`, `/api/users/:id/password`, `/api/users/self/self-password`).
- Passwords **must not** be returned in API responses or logs.

### 6.3 Known Weaknesses
- **Hardcoded default password:** When `INIT_ADMIN_PASSWORD` is not set, `admin1234` is used as the default. This is a critical vulnerability if the environment variable is missed in production.
- Minimum length of 4 characters is insufficient for modern standards. Recommend minimum 8.

---

## 7. SQLite Security

### 7.1 Current Mechanism
- Database: `better-sqlite3` with WAL journal mode.
- All queries use parameterized bindings (`?` placeholders).
- Database file path from `DB_PATH` env var, defaulting to `./rstc_database.db`.

### 7.2 Required Rules
- **Every query must use parameterized bindings.** Never concatenate user input into SQL strings.
- Do not expose raw SQL errors to clients in production. Log internally, return generic messages.
- Database file permissions **must** be restrictive (`0o600` owner-only) on POSIX systems.
- `DB_PATH` **must** be validated to prevent path traversal if it ever derives from user input.
- Indexes **must** be created on columns used in `WHERE`, `ORDER BY`, and `JOIN` clauses (already done for `national_id`, `emp_num`, `decree_num`).

### 7.3 Known Weaknesses
- SQLite is a single-writer database. Under high concurrency, write operations will queue.
- No database-level user authentication. Anyone with filesystem access can open the `.db` file.

---

## 8. Backup Security

### 8.1 Current Mechanism
- Database export via `fs.createReadStream(dbPath).pipe(res)`.
- Backup validation: uploaded file is saved to temp path, opened with `better-sqlite3`, and `PRAGMA integrity_check` is run.
- Restore: existing DB is backed up to `.bak`, then overwritten with uploaded content.
- Scheduled backups create copies in `backups/` directory, retaining last 30.

### 8.2 Required Rules
- Backup downloads **must** require `backup:view` permission.
- Restore operations **must** require `backup:restore` permission (currently mapped to `backup:delete` — see §4.3).
- All backup and restore operations **must** be logged via `logAudit`.
- Backup files **must** be stored outside the web root to prevent direct HTTP access.
- Restore **must** validate the uploaded file is a valid SQLite database before writing.
- Temporary validation files **must** be deleted on success and on failure.
- Backup file naming **must not** include sensitive metadata beyond timestamp.

### 8.3 Known Weaknesses
- **No encryption at rest.** Backup `.db` files contain all PII in plaintext.
- No integrity signing (HMAC) to detect tampering.
- `CORS_ORIGIN` is not validated; if set to a wildcard in production, backups are exposed.

---

## 9. Audit Logging

### 9.1 Current Mechanism
- `logAudit()` inserts into `AuditLog` table with `user_id`, `username`, `action`, `entity`, `entity_id`, `detail`, `ip`, `created_at`.
- `auditMiddleware(entity)` wraps `res.json` to auto-log successful write operations.
- `/api/audit` allows filtering by entity and username.

### 9.2 Required Rules
- All `POST`, `PUT`, `DELETE` endpoints **must** apply `auditMiddleware(entity)`.
- Login attempts (success and failure) **must** be logged with IP and user agent.
- Backup/restore operations **must** be logged.
- Permission changes **must** be logged.
- `AuditLog.detail` **must not** contain raw passwords, credit card numbers, or unredacted PII beyond what is operationally necessary.

### 9.3 Known Weaknesses
- No login failure audit logging.
- No audit log for token refresh (no refresh exists).
- No retention policy. `AuditLog` grows indefinitely.
- No tamper-evident design (e.g., append-only, chained hashes).

---

## 10. HTTP Security Headers

### 10.1 Current Mechanism
- `helmet` middleware with custom CSP.
- `app.disable('x-powered-by')` to hide Express signature.
- CSP directives limit sources but require `unsafe-inline` for scripts and styles.

### 10.2 Required Rules
- `X-Powered-By` must remain disabled.
- `frameAncestors: "'none'"` must remain in CSP to prevent clickjacking.
- CSP must not be weakened without documented justification and approval.
- `scriptSrc` and `styleSrc` must not allow `unsafe-inline` in the long term; this is a tracked technical debt item.
- External CDN domains (`cdn.jsdelivr.net`, `cdn.sheetjs.com`) **must** be reviewed annually for supply-chain risk.

### 10.3 Known Weaknesses
- `unsafe-inline` is required due to inline event handlers in `public/script.js` and `public/index.html`.
- No `Referrer-Policy` or `Permissions-Policy` configured.
- No `Strict-Transport-Security` header.

---

## 11. Helmet Configuration

### 11.1 Required Rules
- Helmet **must** be initialized with explicit directives; do not rely on Helmet defaults.
- CSP directives must be reviewed whenever new external resources (CDNs, fonts, images) are added.
- Changing Helmet settings **must** be accompanied by a manual or automated test verifying intended browser behavior.

### 11.2 Current Configuration (Reference)
```javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.sheetjs.com", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net", "data:"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"]
        }
    }
}));
```

---

## 12. CORS

### 12.1 Required Rules
- In production, `CORS_ORIGIN` **must** be set to the exact frontend origin (e.g., `https://rstc.example.com`). It must never be `*` or omitted in production environments.
- `CORS_ORIGIN=false` disables CORS, which is acceptable for same-origin deployments.
- If CORS is enabled, only trusted origins may be passed to `cors({ origin: ... })`.
- Changing `CORS_ORIGIN` **must** be treated as a configuration change requiring verification.

### 12.2 Known Weaknesses
- No validation that `CORS_ORIGIN` is a specific origin in production.
- `CORS_ORIGIN` could be set to `true` (allow all origins) by mistake.

---

## 13. Rate Limiting

### 13.1 Current Mechanism
- Custom in-memory `Map` keyed by IP address.
- Applied only to `/api/login`.
- Window: 15 minutes, max 10 attempts.
- Cleanup interval: every 3600000 ms (1 hour).

### 13.2 Required Rules
- Rate limiting **must** be applied to authentication endpoints (`/api/login`).
- Rate limiting state **must** be acknowledged as in-memory and ephemeral; it resets on restart.
- If additional sensitive endpoints are added (e.g., `/api/ai/ask` under abuse risk), rate limiting **must** be evaluated.

### 13.3 Known Weaknesses
- Only login is rate-limited. Other sensitive endpoints (AI chat, bulk import) are unprotected against brute-force or resource exhaustion.
- IP-based rate limiting can be bypassed via proxy forwarding headers (`X-Forwarded-For`) if not normalized by a reverse proxy.
- State resets on process restart.

---

## 14. Environment Variables & Secrets

### 14.1 Required Rules
- `JWT_SECRET` **must** be set in production. The application refuses to start without it.
- `INIT_ADMIN_PASSWORD` **must** be set in production. The hardcoded fallback (`admin1234`) **must** be removed before any production deployment.
- `DB_PATH` **must** point to a persistent, backed-up location.
- `.env` **must** be listed in `.gitignore` and **must never** be committed.
- `.env.example` **must** document every required variable without real values.

### 14.2 Known Weaknesses
- The fallback `admin1234` password exists in code and is logged on startup: `console.log('✅ Admin user created with default password: admin1234')`.
- Secrets management relies exclusively on environment variables. No secrets manager integration exists.

---

## 15. Input Validation

### 15.1 Required Rules
- All user input passed to SQL **must** use parameterized queries.
- All user input rendered in responses **must** be escaped for the appropriate context (HTML, JSON, SQL).
- String lengths **must** be bounded server-side before processing.
- Enum fields (e.g., `mission_type`, `region`) **must** be validated against known option lists where feasible.
- National IDs, phone numbers, and employee numbers **must** be digit-normalized before validation and storage.

### 15.2 Known Weaknesses
- No centralized validation layer. Validation is ad-hoc and scattered across route handlers.
- No XSS prevention beyond implicit JSON escaping in `res.json()`.
- No protection against JSON-based injection or mass assignment.

---

## 16. Output Encoding

### 16.1 Required Rules
- JSON responses are auto-escaped by Express, but **must not** be assumed safe if `res.send()` with `text/html` is ever used.
- Audit log details **must not** include raw user-submitted HTML or unescaped script content.
- Error messages **must** not expose stack traces, SQL fragments, or internal paths in production.

### 16.2 Known Weaknesses
- Frontend uses `textContent` assignment in some places but also uses `innerHTML` for templating (e.g., chart legends, table rows) with `_esc()` escaping. Any bypass of `_esc()` is an XSS vector.

---

## 17. File Uploads

### 17.1 Current Mechanism
- Backup validation accepts `application/octet-stream` up to 50 MB.
- File is written to a temporary path, validated as SQLite, then deleted.
- No other file upload endpoints exist.

### 17.2 Required Rules
- Uploaded files **must** be validated for type, size, and integrity before processing.
- Temporary files **must** be deleted on both success and failure paths.
- File names **must** be sanitized to prevent path traversal.
- Upload endpoints **must** enforce size limits.

---

## 18. AI Endpoints

### 18.1 Current Mechanism
- `/api/ai/ask` accepts a `question` string.
- Passes it to `parseAndAnswer(question, dbGet, dbAll)` from `ai_engine.js`.
- Returns `{ success: true, question, answer }`.

### 18.2 Required Rules
- AI endpoints **must** enforce `authenticateToken`.
- AI endpoints **must** apply rate limiting if usage indicates abuse risk.
- AI-generated answers returned to the client **must** be sanitized to prevent injection in the frontend.
- AI endpoints **must** not expose raw SQL queries or database schema details in error messages.
- AI query patterns **must** be logged for anomaly detection.

### 18.3 Known Weaknesses
- No rate limiting on `/api/ai/ask`.
- No input length limit on `question` beyond implicit body limits.
- AI engine directly receives `dbGet` / `dbAll` references, creating a tight coupling that could be exploited if the engine is modified carelessly.

---

## 19. Logging

### 19.1 Required Rules
- Use `console.error` for operational errors and `console.log` for startup milestones.
- **Never** log secrets, JWT payloads, full request bodies containing passwords, or database contents.
- Audit logging **must** flow through `logAudit()`.
- Log messages **must** be in Persian or English as appropriate for the operator; never mix within a single structured event.

### 19.2 Known Weaknesses
- No centralized logging service. Logs are ephemeral and lost on restart.
- No log correlation IDs for tracing requests across frontend and backend.

---

## 20. Incident Response

### 20.1 Required Rules
- If a security vulnerability is discovered:
  1. Isolate the affected component if possible (e.g., disable a route).
  2. Preserve logs and evidence (`AuditLog`, console output, `.env` state).
  3. Do not delete or modify audit entries during investigation.
  4. Document the incident in `.ai/DECISIONS.md` after resolution.
  5. Rotate `JWT_SECRET` and all user passwords if token or credential leakage is confirmed.

### 20.2 Known Weaknesses
- No documented incident response procedure exists.
- No automated alerting for anomalous patterns (e.g., bulk data export, repeated 401/403 spikes).

---

## 21. Future Security Roadmap

| Priority | Item | Rationale |
|----------|------|-----------|
| High | Remove `admin1234` fallback | Eliminates weak default credential risk |
| High | Add CSRF tokens | State-changing endpoints rely solely on JWT |
| High | Remove `unsafe-inline` from CSP | Reduces XSS attack surface |
| Medium | Implement token refresh mechanism | Reduces session timeout friction without long-lived tokens |
| Medium | Add backup encryption at rest | Backups contain full PII dataset |
| Medium | Set SQLite file permissions to `0o600` | Prevents local filesystem data leakage |
| Medium | Enforce HTTPS in production | JWT and session confidentiality depend on transport security |
| Medium | Add login failure audit logging | Detects brute-force and credential stuffing |
| Low | Add MFA support | Strengthens authentication for admin accounts |
| Low | Implement token revocation / jti | Limits damage from stolen tokens |
| Low | Add centralized logging / SIEM integration | Enables detection and forensics |
| Low | Add output encoding standard for frontend | Prevents XSS via `innerHTML` and template injection |

---

## 22. Migration Plan

This section describes how duplicated security rules will be removed from other documents after this standard is accepted.

### Phase 1: Establish Authority
1. Publish `standards/security.md` as the authoritative security reference.
2. Announce that all security decisions reference this file.

### Phase 2: Deduplicate
| Source File | Action | Target |
|-------------|--------|--------|
| `.ai/AI_MASTER_PROMPT.md` lines 39-44 (Security Rules) | Replace the entire Security Rules section with a single reference: "Follow `standards/security.md` for all security constraints." | `AI_MASTER_PROMPT.md` |
| `standards/coding.md` lines 151-159 (Security section) | Remove the entire Security section. | `standards/coding.md` |
| `standards/coding.md` lines 178-185 (Code Review Checklist) | Remove security-related checklist items that duplicate this standard. Keep coding-specific items (naming, structure). | `standards/coding.md` |

### Phase 3: Update Cross-References
1. `AI_MASTER_PROMPT.md` line 49 (Documentation Rules): Add "Update `standards/security.md` when changing security controls."
2. `PROJECT_CONTEXT.md` line 97 (Current Strengths): Replace "Strong security defaults" with a reference to `standards/security.md` for the current posture.
3. `PROJECT_CONTEXT.md` line 115 (Known Risks): Move the security risks table into `standards/security.md` §Known Weaknesses, and replace with a summary reference in `PROJECT_CONTEXT.md`.

### Phase 4: Enforce
1. Add a CI check or pre-commit hook that flags direct security rule duplications in other markdown files.
2. Update `.ai/TASKS.md` with a task (T-016) to execute this migration plan after team sign-off.

### Checklist for Other Files
- [ ] `AI_MASTER_PROMPT.md` — Security Rules section reduced to one reference line.
- [ ] `standards/coding.md` — Security section removed.
- [ ] `standards/coding.md` — Code Review Checklist security items reduced to "Verify changes conform to `standards/security.md`."
- [ ] `PROJECT_CONTEXT.md` — Known Risks security rows replaced with summary reference.
- [ ] `docs/security/README.md` — Populated as a human-readable summary of this standard.
