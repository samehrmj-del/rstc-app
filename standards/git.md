# Git Workflow — RSTC_App

## 1. Why This Repository Needs a Git Workflow

RSTC_App is maintained by **one human** and **multiple AI coding agents** working on the same codebase. Without a defined Git workflow, concurrent AI agents will overwrite each other's changes, security-sensitive modifications will go unreviewed, and rollback will become guesswork. Git provides the coordination layer between human intent and AI execution.

## 2. Risks Without a Workflow

| Risk | Impact |
|------|--------|
| AI agents overwrite each other's work in `server.js` | Data loss, broken authentication |
| No attribution of changes to agent or human | Impossible to diagnose regressions |
| Unreviewed AI changes deployed to production | Security incidents, data corruption |
| Conflicts between AI-generated migrations | Database schema corruption |
| No rollback path for bad agent prompts | Extended downtime |
| `.env` or `.db` files committed by uninformed agents | Credential leakage |

## 3. Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| **No workflow** | Chaos with concurrent agents; no safety net |
| **GitFlow** | Too heavy for a single-service internal app with one human maintainer |
| **Trunk-based only** | No isolation for risky AI experiments; main branch becomes fragile |
| **Fork-per-agent** | Overhead for a single human to reconcile multiple forks |
| **Linear history, feature branches + PRs** | Best fit: human review gates, works with AI agents, low ceremony |

## 4. Why This Workflow Fits RSTC_App

- **Single human + multiple agents:** The human acts as the integrator. Agents work in short-lived branches and request human review via PR.
- **Single service, single deployment:** No need for multi-environment release trains. Tags mark deployable snapshots.
- **Monolithic `server.js`:** High-contention file. Branch-per-task prevents merge storms.
- **AI-specific rules:** Agents must never force-push and must document AI involvement in commits.
- **SQLite migrations:** Every schema change is tracked in Git, allowing rollback to a known-good database state.

---

## 5. Branching Strategy

### 5.1 Branch Naming

| Branch | Purpose | Created By |
|--------|---------|-------------|
| `main` | Production-ready code. Protected. | Human only |
| `develop` | Integration branch. Protected. | Human only |
| `task/t-{id}-{slug}` | Single task work (e.g., `task/t-005-remove-default-password`) | AI or Human |
| `fix/{slug}` | Hotfix on `main` (e.g., `fix/login-rate-limit`) | Human |
| `chore/{slug}` | Non-functional changes (docs, standards) | AI or Human |

### 5.2 Branch Rules

- **Never** commit directly to `main` or `develop`.
- **Never** force-push to `main`, `develop`, or any branch with open PRs.
- Task branches **must** be created from `develop` and merged back to `develop`.
- Hotfix branches **must** be created from `main` and merged to both `main` and `develop`.
- Branch lifetime **must** be short: one task per branch. If a branch lives more than 48 hours without a PR, the agent/human must reassess scope.
- Before creating a new branch, agents **must** fetch and check for existing branches with the same task ID to avoid duplication.

### 5.3 AI Agent Branching Protocol

1. Read `.ai/TASKS.md` to find the next `Todo` task.
2. Create branch: `task/t-{id}-{description-slug}`.
3. Work only on files relevant to that task.
4. Commit with the required AI metadata (see §6).
5. Push and open a PR (or flag the human to review).
6. **Do not** merge your own PR. Wait for human approval.

---

## 6. Commit Convention

### 6.1 Format

```
{type}({scope}): {description}

{body}

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 6.2 Types

| Type | Meaning |
|------|---------|
| `feat` | New feature or endpoint |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `docs` | Documentation only |
| `chore` | Build, tooling, standards |
| `test` | Adding or updating tests |
| `security` | Security hardening |
| `perf` | Performance improvement |
| `db` | Database schema or migration |

### 6.3 Scopes

| Scope | Applies To |
|-------|------------|
| `backend` | `server.js`, routes, middleware |
| `frontend` | `public/script.js`, `public/index.html`, `public/style.css` |
| `db` | Schema, migrations, `initializeDatabase()` |
| `auth` | Login, JWT, permissions |
| `missions` | Mission CRUD, decree numbering |
| `personnel` | Personnel CRUD, bulk import |
| `reports` | Reporting endpoints, filters |
| `options` | System options management |
| `audit` | Audit logging |
| `backup` | Backup/restore endpoints |
| `ai` | `ai_engine.js`, AI chat endpoint |
| `security` | Headers, rate limiting, input validation |
| `docs` | Documentation files |
| `standards` | Standards files in `standards/` |
| `chore` | Tooling, scripts, git hygiene |

### 6.4 AI-Generated Commit Rules

- **Every commit made by an AI agent must include:**
  - The `🤖 Generated with` trailer.
  - A `Co-Authored-By` trailer identifying the agent/model.
- If a human amends an AI commit, the human **must** add a `Reviewed-by` or `Signed-off-by` trailer.
- Commit messages **must not** claim human authorship unless a human actually reviewed and approved the change.
- If multiple agents collaborate on one branch, each agent appends its own trailer to its own commits.

### 6.5 Examples

```bash
# AI agent adding a task
git commit -m "feat(backend): add rate limit for AI endpoint

- Apply rateLimitLogin middleware to /api/ai/ask
- Return 429 with Persian message on exhaustion

🤖 Generated with [Claude Code](https://claude.ai/code)
Co-Authored-By: Claude <noreply@anthropic.com>"

# Human reviewing and amending
git commit -m "docs(api): update README with AI rate limit

🤖 Generated with [Claude Code](https://claude.ai/code)
Co-Authored-By: Claude <noreply@anthropic.com>
Reviewed-by: Human <human@example.com>"
```

---

## 7. Pull Request Policy

### 7.1 When to Open a PR

| Scenario | Requirement |
|----------|-------------|
| AI agent finishes a task | Open PR to `develop`. Do not merge. |
| Human finishes a task | PR preferred, but direct merge to `develop` is acceptable for trivial changes |
| Hotfix | Open PR to `main`. Require human review. |
| Security-related change | Always PR. Always require human review. |
| Documentation change | PR optional for minor typo fixes; required for structural changes |

### 7.2 PR Requirements

- **Title:** Must follow commit convention: `feat(backend): description`.
- **Description:** Must include:
  - Reference to task ID (e.g., `Closes T-005`).
  - Summary of what changed.
  - Validation performed (commands run, manual tests).
  - Screenshot or curl output if UI or API behavior changed.
  - List of files modified.
- **Reviewers:** Human must review all PRs from AI agents.
- **CI Checks (when available):** Lint and tests must pass before merge.
- **Merge Strategy:** Squash-and-merge for feature branches. This keeps `develop` history linear and clean.

### 7.3 AI Agent PR Rules

- After pushing a branch, the agent **must** notify the human with the PR URL.
- The agent **must not** close or update the PR after submission without human instruction.
- If the human requests changes, the agent **must** push new commits to the same branch. Do not force-push.
- If the PR becomes stale (target branch diverged), the agent **must** rebase onto the latest `develop` and resolve conflicts before requesting review again.

---

## 8. Merge Conflict Handling

### 8.1 Rules

- **Never** force-push to shared branches (`main`, `develop`).
- When conflicts occur during rebase:
  1. Identify conflicting files.
  2. Read both sides.
  3. Prefer the human-authored logic when in doubt; ask the human if ambiguous.
  4. For `server.js` conflicts, prioritize logic that preserves existing API contracts.
  5. Never resolve conflicts by deleting code you do not understand.
- After resolving, run `node server.js` to verify the application starts.
- Document conflict resolutions in the PR description.

### 8.2 AI Agent Conflict Protocol

1. Detect conflict during push or rebase.
2. **Stop.** Do not attempt autonomous resolution for conflicts in security-critical files (`server.js` auth middleware, `standards/security.md`).
3. Notify the human with:
   - Conflicting files.
   - Branch names.
   - Suggested resolution (read-only).
4. Wait for human decision.

---

## 9. Rollback Strategy

### 9.1 Application Rollback

| Scenario | Method |
|----------|--------|
| Bad deploy to production | `git revert` the merge commit on `main`. Tag new rollback release. |
| Bug in `develop` before next release | `git revert` the offending commit(s) on `develop`. |
| AI agent broke `server.js` | `git revert` the agent's merge commit. If multiple commits, revert the range. |

**Rules:**
- **Never** `git reset --hard` on shared branches.
- Rollback commits **must** include a description of what is being undone and why.
- After rollback, verify `node server.js` starts and `/api/health` returns `ok: true`.

### 9.2 Database Rollback

- SQLite has no built-in versioning. Rollback is manual.
- Before any schema migration, the application **must** create a backup copy of the database.
- Rollback procedure:
  1. Stop the application.
  2. Restore the pre-migration `.db` backup.
  3. Restart and verify.
- If a migration is lost in Git history, reconstruction must be done from the nearest tagged release that includes a known-good schema dump.

---

## 10. Release Tagging

### 10.1 Semver

This project uses **Semantic Versioning 2.0.0**: `MAJOR.MINOR.PATCH`.

| Increment | When |
|-----------|------|
| MAJOR | Breaking API change, database schema migration that loses data, permission model overhaul |
| MINOR | New feature, new endpoint, new module, AI capability |
| PATCH | Bug fix, security patch, typo fix |

### 10.2 Tag Format

```
v{version} - {date} - {description}
```

Example:
```
v1.2.0 - 2026-07-25 - Add mission bulk import and AI rate limit
```

### 10.3 Tag Rules

- Tags **must** be created on `main` only.
- Every tag **must** point to a commit that passes manual smoke tests (`node server.js` starts, `/api/health` is `ok: true`).
- Tags **must** include the deployment date in Jalali format in the tag message.
- Pre-release tags (alpha, beta) use suffix: `v1.3.0-alpha.1`.

---

## 11. AI Collaboration Workflow

### 11.1 Agent Onboarding

Before touching code, an AI agent **must**:
1. Read `.ai/AI_MASTER_PROMPT.md`.
2. Read `.ai/PROJECT_CONTEXT.md`.
3. Read `standards/git.md` (this file).
4. Run `git status` and `git log --oneline -10` to understand current branch and recent history.
5. Check `.ai/TASKS.md` for assigned tasks. If none, ask the human.

### 11.2 Agent Task Execution

1. Pull the latest `develop`.
2. Create task branch: `task/t-{id}-{slug}`.
3. Make incremental commits per logical unit (max 300 lines changed per commit).
4. Include AI trailers in every commit message.
5. Push to remote.
6. Open PR to `develop` (or notify human if PR creation is not possible).
7. **Do not** merge. **Do not** delete the branch.
8. Wait for human review.

### 11.3 Agent Conflict Avoidance

- Agents **must** check for existing branches before creating a new one: `git branch -r | grep t-{id}`.
- If two agents are assigned the same task ID, the first agent to push owns it. The second agent **must** stop and ask the human.
- Agents **must not** push to branches they did not create without explicit human instruction.

### 11.4 Agent Cleanup

- After a PR is merged or closed, the human or agent **must** delete the branch.
- Stale branches (no commits in 7 days) **must** be flagged to the human for archival or deletion.

### 11.5 Human-AI Handoff

When the human assigns a task to an agent:
1. The human updates `.ai/TASKS.md` with the task in `Todo` status.
2. The agent picks it up, moves it to `In Progress`, and begins.
3. The human reviews the PR and moves the task to `Completed` in `.ai/TASKS.md` after merge.

---

## 12. Repository Hygiene

### 12.1 .gitignore Requirements

The following **must** never be committed:
- `.env`, `.env.*.bak`, `.env.local`
- `*.db`, `*.db-shm`, `*.db-wal`
- `backups/` contents at runtime (historical backups in repo root are acceptable if tracked, but new runtime backups must be gitignored)
- `node_modules/`
- `dump_*/`, `_backup_*`, `_secure_fix_backup_*`
- `*.patch`, `*.bak` files generated by tooling

### 12.2 Large Files

- Database files (`*.db`) **must not** be tracked by Git LFS. They belong in `.gitignore`.
- If a schema dump is needed for documentation, store it in `docs/database/` as SQL text, not as a binary file.

---

## 13. Emergency Procedures

| Situation | Action |
|-----------|--------|
| Production down after deploy | `git revert` the bad merge on `main`. Tag rollback. Fix on new branch. |
| Agent pushes sensitive data | Rotate affected secrets immediately. `git filter-repo` or `git rm --cached` to expunge. Force-push with human approval. |
| Merge conflict in auth code | Stop. Human resolves. Do not auto-resolve. |
| Accidental force-push to `develop` | Notify human immediately. Reconstruct from nearest tag if needed. |

---

## 14. Checklist for AI Agents

Before pushing any commit:

- [ ] Branch name follows `task/t-{id}-{slug}` pattern.
- [ ] Commit message follows type(scope): description format.
- [ ] AI trailers (`🤖 Generated with`, `Co-Authored-By`) are present.
- [ ] No secrets, passwords, or `.env` contents are in the diff.
- [ ] `node server.js` starts without errors.
- [ ] No unrelated files were modified.

Before opening a PR:

- [ ] Task ID is referenced in PR description.
- [ ] Validation steps and results are documented.
- [ ] Breaking changes are flagged explicitly.
- [ ] Human is notified.
