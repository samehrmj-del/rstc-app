# Contributing

Thank you for your interest in contributing to RSTC!

---

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Respect the project's coding standards

---

## Coding Style

### JavaScript
- Use 4 spaces for indentation
- Semicolons required
- Single quotes for strings
- camelCase for variables and functions
- PascalCase for classes
- Descriptive names, avoid abbreviations
- Maximum line length: 120 characters

### Structure
```
src/
  domains/
    {domain}/
      routes.js      # Express routes
      service.js     # Business logic
      repository.js  # Data access
  infrastructure/
    config/          # Environment and constants
    database/        # Connection and initialization
    middleware/      # Express middleware
    security/        # Auth, JWT, permissions
    utils/           # Shared utilities
```

### Error Handling
- Use try/catch for async operations
- Return structured error responses `{ status, body }`
- Log errors with descriptive messages
- Never expose stack traces to clients in production

---

## Commit Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting changes (no code change)
- `refactor`: Code restructuring (no feature change)
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples
```
feat(backup): add restore endpoint
fix(auth): handle expired JWT tokens
docs: update deployment guide
test(missions): add decree number validation tests
```

---

## Testing Requirements

### Before Submitting
- All existing tests must pass: `npm test`
- New features must include tests
- Bug fixes must include regression tests
- Aim for 90%+ coverage on changed files

### Test Structure
- Unit tests in `tests/unit/`
- Mock external dependencies
- Use descriptive test names: `should return 404 when backup not found`
- Reuse fixtures via shared setup files

---

## Pull Request Rules

1. **Branch from `develop`**
2. **One feature per PR**
3. **Include tests**
4. **Update documentation**
5. **Pass CI checks**
6. **No force pushes to shared branches**
7. **Request review from at least one maintainer**

### PR Description Template
```markdown
## Summary
Brief description of changes

## Motivation
Why is this change needed?

## Testing
How was this tested?

## Checklist
- [ ] Tests pass
- [ ] Coverage maintained
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production releases only |
| `develop` | Integration branch for next release |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `docs/*` | Documentation changes |
| `refactor/*` | Code refactoring |

### Workflow
1. Create feature branch from `develop`
2. Implement changes with tests
3. Open PR to `develop`
4. After review and CI pass, merge to `develop`
5. Release from `develop` to `main` with version tag

---

## Development Setup

```bash
git clone <repository-url>
cd rstc-app
cp .env.example .env
npm ci
npm start
```

Run tests:
```bash
npm test
npm run coverage
```
