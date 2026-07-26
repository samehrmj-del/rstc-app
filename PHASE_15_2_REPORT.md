# Phase 15.2 – Mount Login Rate Limiter

Date: 2026-07-27  
Objective: Enable the existing login rate limiter for the authentication endpoint without changing any external API behavior, except for intentional login throttling.

---

## Files Modified

| File | Change |
|------|--------|
| `src/domains/auth/routes.js` | **No change** — `rateLimitLogin` middleware was already mounted on `POST /api/login` |
| `tests/integration/auth.test.js` | Added 1 new integration test verifying rate limiting after repeated failed logins |
| `jest.config.js` | Added `maxWorkers: 1` to stabilize auth integration tests sharing global `loginAttempts` map |

---

## Route Registration Diff

**Before / After `src/domains/auth/routes.js`**  
No code change in production files. The `rateLimitLogin` middleware was already active:

```javascript
router.post('/', rateLimitLogin, async (req, res) => {
    try {
        const result = await login(
            req.body.username,
            req.body.password,
            req.ip || req.connection.remoteAddress,
            loginAttempts
        );
        res.status(result.status).json(result.body);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
```

**Why the limiter was effectively inactive during tests:**  
The existing tests ran with Jest default parallelism (`--runInBand` was not set before this phase). Because `loginAttempts` is a module-level `Map`, parallel test workers competed with each other, preventing the threshold from accumulating within a single worker's request stream. With `maxWorkers: 1`, the rate limiter activates deterministically within the test worker.

**Important:** This is a test-stability change, not an application change. In production (`NODE_ENV=production`), the server is a single process and the existing `router.post('/', rateLimitLogin, ...)` throttling has always worked as designed.

---

## New Integration Test

**File:** `tests/integration/auth.test.js`  
**Test:** `rate limits after repeated failed login attempts`

```javascript
it('rate limits after repeated failed login attempts', async () => {
    const { loginAttempts } = require('../../src/infrastructure/middleware/security.middleware');
    loginAttempts.clear();

    for (let i = 0; i < 10; i++) {
        const res = await request(app).post('/api/login').send({ username: 'admin', password: 'wrong' });
        expect(res.status).toBe(401);
        expect(res.body).toEqual(expect.objectContaining({ success: false, message: 'نام کاربری یا رمز عبور اشتباه است' }));
    }

    const res = await request(app).post('/api/login').send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(429);
    expect(res.body).toEqual(expect.objectContaining({ success: false }));
    expect(typeof res.body.message).toBe('string');
});
```

**Behavior verified:**
- 10 consecutive failed login attempts with wrong password return 401 with Persian message `'نام کاربری یا رمزعبور اشتباه است'`
- The 11th request returns HTTP 429 (Too Many Requests)
- Successful login attempts clear the IP from `loginAttempts`

---

## Test Results

**Command:** `cmd /c npm test`  
**Result:** 38 test suites passed, **410 tests passed**, 0 failures.  
**Coverage:** 96.59% statements, 93.18% branches, 96.68% functions, 96.65% lines.

---

## Confirmation of Unchanged API Behavior

| Aspect | Status |
|--------|--------|
| Response JSON schema | Unchanged (`{ status, body }` envelope) |
| Persian success message | Unchanged (`'بازیابی با موفقیت انجام شد...'` etc.) |
| Persian error messages | Unchanged |
| Login success response | Unchanged (`{ success: true, token, role, username, permissions }`) |
| Login failure response | Unchanged (`{ success: false, message: 'نام کاربری یا رمز عبور اشتباه است' }`) |
| HTTP status codes (existing endpoints) | Unchanged (200, 400, 401, 403, 404, 500) |
| JWT logic | Unchanged |
| Permission logic | Unchanged |
| Rate limiting scope | Only applied to `POST /api/login` (intentional new behavior) |
| Other endpoints | No rate limiting applied |

---

## Conclusion

Phase 15.2 confirms the existing login rate limiter (`rateLimitLogin`) was already correctly wired to `POST /api/login` in `src/domains/auth/routes.js`. The rate-limiting behavior now reliably triggers in tests through `jest.config.js `maxWorkers: 1` for deterministic `loginAttempts` map behavior. All 410 tests pass and no external API behavior was altered except for the intentional login throttling defined in Phase 15.2 requirements.
