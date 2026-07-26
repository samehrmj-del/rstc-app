# IMPLEMENTATION_WORKFLOW.md — RSTC_App

## 1. Purpose

This document defines **HOW** every implementation task is executed in RSTC_App. It is not a coding standard, architecture document, or coding guide. It is the execution contract between the human maintainer, AI coding agents, and the repository.

Every code change, regardless of size or author, **must** follow this workflow.

---

## 2. When to Use This Workflow

| Scenario | Must Follow This Workflow? |
|----------|---------------------------|
| AI agent implements a task from `.ai/TASKS.md` | Yes |
| Human developer adds a feature | Yes |
| Bug fix on any branch | Yes |
| Security patch | Yes |
| Documentation update | Yes, Phases 1-4 and 6 only |
| Refactoring without feature change | Yes |
| Moving files or renaming symbols | Yes |
| Database schema migration | Yes, plus `standards/security.md` §7 |

**The only exception:** Emergency hotfixes where reverting `main` is faster than workflow compliance. Even then, follow-up must complete the workflow in a separate commit.

---

## 3. Preconditions (Definition of Ready)

A task is **not ready** for implementation until all of the following are true:

- [ ] Task exists in `.ai/TASKS.md` with `Todo` status (if AI-driven) or is explicitly requested by the human.
- [ ] Task has a clear, singular objective. If it contains multiple unrelated goals, split it first.
- [ ] Relevant standards are loaded:
  - `.ai/AI_MASTER_PROMPT.md`
  - `.ai/PROJECT_CONTEXT.md`
  - `standards/coding.md`
  - `standards/naming.md`
  - `standards/security.md`
  - `standards/git.md`
- [ ] Current branch is up to date with `develop` (or `main` for hotfixes).
- [ ] No other agent or human is actively working on the same task ID.
- [ ] Required environment variables are documented in `.env.example`.

If any precondition is missing, **stop and resolve it before proceeding.**

---

## 4. Implementation Phases

### Phase 1 — Understand

**Goal:** Build a complete mental model of the task before writing any code.

**Actions:**
1. Read the task description in `.ai/TASKS.md`.
2. Read `.ai/PROJECT_CONTEXT.md` for business context.
3. Identify all files that must be touched.
4. Read the relevant sections of `server.js` (or other affected files) **in full**.
5. Identify existing patterns, helper functions, and middleware already in use.
6. Identify dependencies: which modules, routes, database tables, and frontend components are affected.
7. Identify the existing architecture boundary: does this task cross module boundaries?
8. Define the problem in one sentence.

**Deliverable: Implementation Analysis**

Format:
```markdown
## Implementation Analysis

### Task
{Task ID and title}

### Problem
{One sentence describing what is broken or missing}

### Affected Files
- {file path}: {why it is affected}

### Affected Modules
- {module}: {how it is affected}

### Dependencies
- Internal: {other routes, services, or DB tables}
- External: {npm packages, if any}

### Existing Patterns to Follow
- {pattern name}: {where it exists and how to apply it}

### Constraints
- {API compatibility, DB compatibility, UI compatibility, security constraints}
```

**Rules:**
- Do not skip this phase even for "trivial" tasks.
- If the analysis reveals the task touches security-critical code (`authenticateToken`, JWT, password hashing, audit logging), flag it explicitly.
- If the task requires architectural change, stop and request human approval per `AI_MASTER_PROMPT.md` §Analysis Before Implementation.

---

### Phase 2 — Planning

**Goal:** Define the exact changes, risks, and validation strategy before writing code.

**Actions:**
1. Define the objective: what will be true after this task is complete?
2. List every file to be modified.
3. For each file, list the exact functions, routes, or lines to change.
4. Identify risks: what could break, regress, or create security exposure?
5. Define rollback plan: how to revert if the change fails.
6. Define validation plan: exact commands, curl tests, or manual steps.
7. Estimate implementation size in lines changed or logical units.

**Deliverable: Implementation Plan**

Format:
```markdown
## Implementation Plan

### Objective
{Measurable outcome}

### Files to Change
| File | Change Type | Reason |
|------|-------------|--------|
| {path} | {add/modify/delete} | {why} |

### Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| {risk} | {high/medium/low} | {high/medium/low} | {how to mitigate} |

### Rollback Plan
1. {step to revert}
2. {step to verify rollback}

### Validation Plan
1. `node server.js` starts without error
2. `curl -X POST http://localhost:4000/api/login ...` returns expected shape
3. {manual test}: {expected result}
4. {regression test}: {expected result}

### Implementation Size
- {x} files changed
- ~{y} lines added/modified
- {z} logical units (functions, routes, queries)
```

**Rules:**
- The plan must be reviewed by the human before implementation begins (unless the task is from `.ai/TASKS.md` Current Sprint and the human has already assigned it).
- If the plan introduces new dependencies, architectural changes, or security modifications, it **must** be explicitly approved by the human.

---

### Phase 3 — Implementation

**Goal:** Execute the plan with surgical precision.

**Rules:**

1. **Small incremental changes.** Make one logical change at a time. Do not batch unrelated changes into one commit.
2. **Preserve backward compatibility.** API routes, response shapes, HTTP status codes, and Persian error messages must remain unchanged unless the task explicitly requests modification.
3. **Do not introduce unrelated refactoring.** If you see a problem that is not part of the task, record it in `.ai/TASKS.md` and ignore it.
4. **Keep commits focused.** Each commit must map to one item in the Implementation Plan.
5. **Never change more than one logical concern at once.** Do not mix a bug fix with a feature addition in the same commit.
6. **Follow the standards.** `standards/coding.md`, `standards/naming.md`, `standards/security.md`.
7. **Preserve secrets.** Never log, echo, or expose JWT secrets, `.env` values, or database paths.
8. **Use parameterized queries.** Never concatenate user input into SQL.
9. **Preserve Persian strings.** Do not translate or modify error messages unless localization is explicitly requested.

**Deliverable: Implemented Changes**

- A series of focused commits on the task branch.
- Each commit message follows `standards/git.md` §6.
- AI agents include `🤖 Generated with` and `Co-Authored-By` trailers.

**Commit Granularity:**
| Change Size | Recommended Commits |
|-------------|---------------------|
| Route addition | 1 commit (route + controller logic) |
| Bug fix in existing route | 1 commit |
| Validation logic update | 1 commit per endpoint family |
| Permission change | 1 commit |
| DB query refactor | 1 commit per query group |
| Frontend JS change | 1 commit per page/function |

---

### Phase 4 — Self Review

**Goal:** Catch errors, regressions, and standard violations before asking for human review.

**Actions:**

1. **Coding Standard Review**
   - Read the changed files and verify indentation, quoting, and semicolons match `standards/coding.md` §2.
   - Verify no `var` was introduced.
   - Verify no commented-out code blocks exist.

2. **Naming Standard Review**
   - Verify all new variables use `camelCase`.
   - Verify all new constants use `UPPER_SNAKE_CASE`.
   - Verify all new functions use `camelCase`.
   - Verify all new files use `camelCase.js`.
   - Verify all new routes use `lowercase kebab-case`.

3. **Security Standard Review**
   - Verify all new routes enforce `authenticateToken` where required.
   - Verify all new routes enforce `requirePermission` where required.
   - Verify all SQL queries use parameterized bindings.
   - Verify no secrets are logged.
   - Verify no new `eval()`, `Function()`, or dynamic script injection.
   - Verify `auditMiddleware` wraps new write operations.
   - Verify no new dependencies were introduced without approval.

4. **API Compatibility Review**
   - Verify all existing route paths are unchanged.
   - Verify all existing response JSON shapes are unchanged.
   - Verify all existing HTTP status codes are unchanged.
   - Verify Persian error messages are unchanged.

5. **Database Compatibility Review**
   - Verify no schema changes were made unless explicitly part of the task.
   - Verify all queries still use `dbRun`, `dbGet`, `dbAll` wrappers.
   - Verify no raw `db.prepare()` calls were introduced outside wrappers.

6. **UI Compatibility Review**
   - Verify no changes to `public/index.html` IDs or CSS classes unless explicitly requested.
   - Verify no changes to `public/script.js` function signatures unless explicitly requested.
   - Verify no changes to `public/style.css` selectors unless explicitly requested.

7. **Code Quality Scan**
   - Search for dead code: `grep -r "function.*{"` and verify every function is called.
   - Search for duplicate code: `grep -r "JSON.stringify"` or similar patterns.
   - Search for unused imports: verify every `require()` is used.
   - Search for hidden side effects: verify no function modifies global state unexpectedly.

8. **Diff Review**
   - Run `git diff` and read every changed line.
   - Verify no unrelated changes crept in.
   - Verify no backup files, `.bak` files, or debug code were added.

**Deliverable: Self Review Report**

Format:
```markdown
## Self Review Report

### Task
{Task ID and title}

### Files Reviewed
- {file path}: {lines changed, key changes}

### Standards Compliance
- [ ] Coding standard: {pass/fail/notes}
- [ ] Naming standard: {pass/fail/notes}
- [ ] Security standard: {pass/fail/notes}

### Compatibility Check
- [ ] API compatibility: {pass/fail/notes}
- [ ] Database compatibility: {pass/fail/notes}
- [ ] UI compatibility: {pass/fail/notes}

### Issues Found
| # | Severity | File | Issue | Action |
|---|----------|------|-------|--------|
| 1 | {high/medium/low} | {path} | {description} | {fixed/deferred/flagged} |

### Unintended Changes
{List any files changed that were not in the Implementation Plan, or note "None"}

### Ready for Human Review?
{Yes / No — with reason}
```

**Rules:**
- If the Self Review finds a high-severity issue, fix it before proceeding.
- If the Self Review finds a medium-severity issue, either fix it or flag it explicitly to the human.
- Low-severity issues may be deferred but must be recorded.

---

### Phase 5 — Validation

**Goal:** Prove the implementation works and nothing else broke.

**Actions:**

1. **Startup Validation**
   - Run `node server.js`.
   - Verify startup completes without config errors.
   - Verify `/api/health` returns `{ "ok": true }`.

2. **Feature Validation**
   - Test the specific feature or fix added in this task.
   - Use `curl` or the browser to exercise the new or changed endpoint.
   - Verify the response shape, status code, and data match expectations.

3. **Regression Validation**
   - Test adjacent features that share code or database tables.
   - If the task touched `server.js` auth middleware, test login, logout, and a protected route.
   - If the task touched a route, test all routes in the same module.

4. **Security Regression Check**
   - Verify `JWT_SECRET` enforcement is intact.
   - Verify rate limiting is intact.
   - Verify audit logging is intact for affected write operations.
   - Verify no new SQL injection vectors were introduced.
   - Verify no new XSS vectors were introduced.

5. **Frontend Validation (if backend changed)**
   - Open the application in a browser.
   - Navigate to the affected page.
   - Verify the page loads and the feature works end-to-end.

**Deliverable: Validation Report**

Format:
```markdown
## Validation Report

### Task
{Task ID and title}

### Environment
- Node version: {output of `node -v`}
- npm version: {output of `npm -v`}
- Platform: {win32/darwin/linux}

### Startup
- `node server.js`: {success / failure}
- `/api/health`: {response}

### Feature Tests
| Test | Command | Expected | Actual | Result |
|------|---------|----------|--------|--------|
| {test name} | `curl ...` | {expected} | {actual} | {pass/fail} |

### Regression Tests
| Test | Command | Expected | Actual | Result |
|------|---------|----------|--------|--------|
| {test name} | `curl ...` | {expected} | {actual} | {pass/fail} |

### Security Checks
- [ ] JWT_SECRET enforced
- [ ] Rate limiting intact
- [ ] Audit logging intact
- [ ] No SQL injection vectors
- [ ] No XSS vectors

### Issues Encountered
{Describe any failures, errors, or unexpected behavior}

### Overall Result
{Pass / Fail — with summary}
```

**Rules:**
- If validation fails, return to Phase 3. Do not proceed to Phase 6.
- If validation passes but reveals an adjacent regression not in scope, record it in `.ai/TASKS.md` and proceed.

---

### Phase 6 — Completion

**Goal:** Finalize the task, document outcomes, and prepare for merge.

**Actions:**

1. Update `.ai/TASKS.md`: move the task from `In Progress` to `Completed`.
2. Write the completion report in the format specified by `.ai/AI_MASTER_PROMPT.md` §Output Format.
3. Ensure all modified files are committed and pushed.
4. Notify the human (for AI agents) or create a PR (if not already done).

**Deliverable: Completion Report**

Format per `AI_MASTER_PROMPT.md`:
```markdown
1. **Summary:** One sentence describing what was changed.
2. **Files Modified:** Bullet list of file paths.
3. **Validation:** Commands run and results.
4. **Caveats / Follow-ups:** Any risks, TODOs, or decisions left for the user.
5. **Next Step Recommendation:** One concrete action, or "None — task complete."
```

**Additional completion items:**
- [ ] `.ai/TASKS.md` updated.
- [ ] All commits pushed.
- [ ] PR opened (if applicable).
- [ ] Human notified (if AI agent).

---

## 5. Global Rules

Every implementation must:

| Rule | Explanation |
|------|-------------|
| **Follow `standards/*`** | Coding, naming, security, and git standards are non-negotiable. |
| **Follow `AI_MASTER_PROMPT`** | Working principles, analysis rules, and output formats apply to every task. |
| **Preserve compatibility** | API, database, and UI compatibility must be maintained unless explicitly waived. |
| **Be reversible** | Every change must be revertible via Git. Do not make changes that cannot be undone. |
| **Be incremental** | One logical concern per commit. No giant rewrites. |
| **Be explainable** | Every change must be justifiable in the Implementation Analysis or commit message. |
| **Avoid unnecessary complexity** | If a simple `if/else` solves the problem, do not introduce a strategy pattern. |

### Never:
| Prohibition | Rationale |
|-------------|-----------|
| **Rewrite large files in one step** | High risk of breaking hidden behavior in a 988-line `server.js`. |
| **Change architecture without approval** | The monolithic structure is intentional until the human approves `MODULARIZATION_PLAN.md`. |
| **Introduce new dependencies without approval** | Every dependency is a security and maintenance burden. |
| **Mix refactoring with feature implementation** | Refactoring must be a separate, reviewable task. |
| **Modify unrelated files** | A task about missions must not touch personnel code. |
| **Force-push to shared branches** | Destroys other agents' work and audit history. |
| **Commit secrets or `.env` contents** | Immediate security incident. |

---

## 6. Definition of Ready

A task is **ready** when:

- [ ] Task ID exists in `.ai/TASKS.md` (for AI-driven work) or is a direct human request.
- [ ] Implementation Analysis is written and reviewed.
- [ ] Implementation Plan is written and approved.
- [ ] All preconditions in §3 are met.
- [ ] Branch is created from the correct base (`develop` for tasks, `main` for hotfixes).
- [ ] No merge conflicts with the base branch.

If any item is unchecked, **do not start implementation.**

---

## 7. Definition of Done

A task is **done** when:

- [ ] Implementation Analysis is complete.
- [ ] Implementation Plan is complete and followed.
- [ ] All phases 1–6 are completed with passing deliverables.
- [ ] Code compiles/runs and startup completes without config errors.
- [ ] Feature works as specified.
- [ ] No existing tests or manual flows are broken.
- [ ] Security-sensitive changes are reviewed against `standards/security.md`.
- [ ] Relevant `docs/`, `standards/`, and `.ai/` files are updated.
- [ ] `.ai/TASKS.md` is updated to `Completed`.
- [ ] All commits are pushed.
- [ ] PR is opened (if applicable) and human is notified.
- [ ] `git status` shows only intended files changed.

If any item is unchecked, the task is **not done.**

---

## 8. Implementation Quality Checklist

Use this checklist during Phase 4 (Self Review) and before merging:

- [ ] **Correctness:** The change does exactly what the task requires. No more, no less.
- [ ] **Completeness:** All edge cases identified in the plan are handled.
- [ ] **Consistency:** The change follows existing patterns in the file and across the codebase.
- [ ] **Maintainability:** The change is simple enough for the next developer or agent to understand.
- [ ] **Reversibility:** The change can be reverted with a single `git revert` if needed.
- [ ] **Performance:** The change does not introduce N+1 queries, unnecessary DB reads, or blocking operations.
- [ ] **Security:** The change does not weaken auth, expose secrets, or introduce injection vectors.
- [ ] **Observability:** The change is auditable via `logAudit()` or console output where appropriate.
- [ ] **Compatibility:** API, DB, and UI contracts are preserved.
- [ ] **Documentation:** All changed behavior is reflected in `docs/` or `standards/` if needed.

---

## 9. AI Self Review Checklist

AI agents must complete this checklist before requesting human review:

- [ ] I read `.ai/AI_MASTER_PROMPT.md` before starting.
- [ ] I read `standards/coding.md`, `standards/naming.md`, and `standards/security.md`.
- [ ] I checked `.ai/TASKS.md` and confirmed no other agent owns this task ID.
- [ ] I created a branch named `task/t-{id}-{slug}` from `develop`.
- [ ] I wrote an Implementation Analysis.
- [ ] I wrote an Implementation Plan.
- [ ] I made incremental commits, one logical concern each.
- [ ] Each commit message follows `type(scope): description` format.
- [ ] Each commit includes `🤖 Generated with` and `Co-Authored-By` trailers.
- [ ] I preserved all Persian error messages.
- [ ] I used parameterized queries for all SQL.
- [ ] I did not introduce new dependencies.
- [ ] I did not modify files outside the task scope.
- [ ] `node server.js` starts without errors.
- [ ] I tested the affected route(s) with `curl` or browser.
- [ ] I verified no secrets or `.env` contents are in the diff.
- [ ] I updated `.ai/TASKS.md` status.
- [ ] I wrote a Validation Report.
- [ ] I wrote the completion report in the format specified by `AI_MASTER_PROMPT.md`.
- [ ] I opened a PR or notified the human. I did not merge.

If any item is unchecked, **do not request human review.**

---

## 10. Human Review Checklist

The human maintainer must verify these items before merging any PR:

- [ ] **Intent:** The change matches the task described in `.ai/TASKS.md`.
- [ ] **Scope:** Only intended files were modified.
- [ ] **Security:** Changes conform to `standards/security.md`. No new vulnerabilities introduced.
- [ ] **API Compatibility:** Existing frontend and any external consumers are not broken.
- [ ] **Database Compatibility:** No unintended schema changes. Migrations are safe.
- [ ] **Rollback Path:** The change can be reverted with `git revert` if needed.
- [ ] **Documentation:** Relevant docs and standards are updated.
- [ ] **AI Attribution:** AI-generated commits include proper trailers. No false human authorship claims.
- [ ] **Validation:** The agent's Validation Report is credible and tests pass.
- [ ] **Side Effects:** No hidden side effects (cron jobs, timers, global state mutations) were introduced without approval.

---

## 11. Decision Tree: When Must an AI Stop and Ask for Human Approval?

Use this decision tree before every implementation decision:

```
START
  │
  ├─ Is the task explicitly in .ai/TASKS.md with Todo status?
  │     ├─ NO → Ask human for task assignment. STOP.
  │     └─ YES → Continue.
  │
  ├─ Does the change touch security-critical code?
  │     (auth, JWT, password hashing, audit logging, Helmet, CORS, rate limiting)
  │     ├─ YES → Ask human before implementing. STOP.
  │     └─ NO → Continue.
  │
  ├─ Does the change modify the database schema?
  │     ├─ YES → Ask human before implementing. STOP.
  │     └─ NO → Continue.
  │
  ├─ Does the change modify API routes or response shapes?
  │     ├─ YES → Ask human before implementing. STOP.
  │     └─ NO → Continue.
  │
  ├─ Does the change introduce a new npm dependency?
  │     ├─ YES → Ask human before implementing. STOP.
  │     └─ NO → Continue.
  │
  ├─ Does the change restructure modules or split files?
  │     ├─ YES → Ask human before implementing. STOP.
  │     └─ NO → Continue.
  │
  ├─ Is the change purely within the task scope?
  │     ├─ YES → Proceed with implementation.
  │     └─ NO → Record the out-of-scope finding in .ai/TASKS.md and ask human.
  │
END
```

### Examples

**Example A: Bug fix in existing route**
- Task: Fix off-by-one in personnel pagination.
- Touches: `public/script.js` pagination logic.
- Security-critical? No.
- Schema change? No.
- API change? No.
- New dependency? No.
- Restructure? No.
- **Decision: Proceed.**

**Example B: Add CSRF token to all POST/PUT/DELETE**
- Task: Add CSRF tokens.
- Touches: Middleware, all state-changing routes, frontend forms.
- Security-critical? Yes.
- **Decision: STOP. Ask human before implementing.**

**Example C: Extract middleware into `src/middleware/`**
- Task: Refactor middleware.
- Touches: New files, `server.js` restructuring.
- Restructure? Yes.
- **Decision: STOP. Ask human before implementing.**

**Example D: Add `zod` for validation**
- Task: Centralize validation.
- Touches: New dependency, new validation layer.
- New dependency? Yes.
- **Decision: STOP. Ask human before implementing.**

---

## 12. Workflow Summary Diagram

```
Task Assigned / Picked Up
          │
          ▼
┌─────────────────┐
│ Phase 1:        │
│ Understand      │
│ • Read context  │
│ • Identify risk │
│ • Define problem│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Phase 2:        │
│ Planning        │
│ • Plan files    │
│ • Plan risks    │
│ • Plan validation│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Decision Tree: Stop and ask human?      │
│ • Security-critical? → YES → STOP       │
│ • Schema change? → YES → STOP           │
│ • API change? → YES → STOP              │
│ • New dependency? → YES → STOP          │
│ • Restructure? → YES → STOP             │
│ • Otherwise → Proceed                   │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Phase 3:        │
│ Implementation  │
│ • Small steps   │
│ • Focused commits│
│ • Preserve compat│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Phase 4:        │
│ Self Review     │
│ • Coding check  │
│ • Naming check  │
│ • Security check│
│ • Compat check  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Phase 5:        │
│ Validation      │
│ • Startup       │
│ • Feature tests │
│ • Regression    │
│ • Security      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Phase 6:        │
│ Completion      │
│ • Report        │
│ • Update tasks  │
│ • Notify human  │
└────────┬────────┘
         │
         ▼
     Merge via PR
```

---

## 13. Exceptions and Overrides

| Exception | Who Can Authorize | Conditions |
|-----------|-------------------|------------|
| Skip Phase 1-2 for trivial hotfix | Human | Fix is < 10 lines, no schema change, no new dependency |
| Modify `server.js` structure | Human | Must be paired with a task in `.ai/TASKS.md` and approved plan |
| Add new npm dependency | Human | Must update `package.json`, `.env.example`, and `docs/dependencies.md` |
| Change database schema | Human | Must include migration logic, rollback plan, and `.bak` creation |
| Bypass security standard | Human + Security review | Must be documented in `.ai/DECISIONS.md` with rationale |
| Force-push to shared branch | Human only | Never authorized for AI agents |

---

## 14. Appendix: Quick Reference

| Phase | Deliverable | Time-box |
|-------|-------------|----------|
| 1 — Understand | Implementation Analysis | 15-30 min |
| 2 — Planning | Implementation Plan | 15-30 min |
| 3 — Implementation | Implemented Changes | Task-dependent |
| 4 — Self Review | Self Review Report | 10-20 min |
| 5 — Validation | Validation Report | 10-30 min |
| 6 — Completion | Completion Report | 5-10 min |

| Document | Purpose |
|----------|---------|
| `.ai/AI_MASTER_PROMPT.md` | Agent rules and output formats |
| `.ai/PROJECT_CONTEXT.md` | Business and technical context |
| `.ai/TASKS.md` | Task backlog and status |
| `standards/coding.md` | Code style and quality rules |
| `standards/naming.md` | Naming conventions |
| `standards/security.md` | Security rules |
| `standards/git.md` | Git workflow and commit rules |
| `docs/architecture/MODULARIZATION_PLAN.md` | Architecture migration roadmap |
