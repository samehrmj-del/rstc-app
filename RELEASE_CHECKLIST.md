# Release Checklist – RSTC v1.0.1

## Pre-Release Verification

- [x] Code audit complete (no temp files, debug code, TODO/FIXME, or console.log debug statements)
- [x] No `*.bak` files in source tree
- [x] No dead or duplicate source files
- [x] All required documentation files present
- [x] Version updated to 1.0.1 in `VERSION` and `package.json`
- [x] ESLint passes with zero warnings/errors on `src/`, `tests/`, `server.js`
- [x] Prettier format check passes for `src/`, `tests/`, `server.js`, configs, and docs
- [x] Jest test suite passes (415/415 tests, 39 suites)
- [x] Code coverage meets threshold (>96% statements, >92% branches)
- [x] Production startup verified (`node server.js` starts successfully)
- [x] Dockerfile and docker-compose.yml validated
- [x] OpenAPI spec present and syntactically valid
- [x] No secrets committed to repository
- [x] `INIT_ADMIN_PASSWORD` enforced as mandatory (fail-fast startup)
- [x] Login rate limiter mounted and tested
- [x] Backup restore await bug fixed

## Branch & Tag Strategy

- [ ] **Confirm target branch**: Currently on `ai-foundation`. Release instructions reference `main`. Ensure release is cut from the intended branch.
- [ ] **Stage files**: `git add .`
- [ ] **Commit**: `git commit -m "release: v1.0.1 Stable"`
- [ ] **Tag**: `git tag -a v1.0.1 -m "RSTC v1.0.1 Stable"`
- [ ] **Push**: `git push origin <target-branch>`
- [ ] **Push tag**: `git push origin v1.0.1`

## Post-Release

- [ ] Verify GitHub release page renders correctly
- [ ] Verify Docker image builds and runs
- [ ] Verify health check endpoint responds
- [ ] Update any deployment environments with new image/tag
