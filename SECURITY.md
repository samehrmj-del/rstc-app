# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email security concerns to the maintainers (replace with actual contact)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a detailed response within 7 days.

---

## Supported Versions

| Version | Supported | Security Updates |
|---------|-----------|------------------|
| 1.0.x   | Yes       | Yes              |
| < 1.0   | No        | No               |

---

## Security Practices

### Authentication
- JWT tokens signed with `JWT_SECRET`
- Tokens must be transmitted over HTTPS in production
- Token expiry should be configured (currently application-defined)
- Never expose `JWT_SECRET` in client-side code or logs

### Authorization
- Permission-based route protection (`requirePermission` middleware)
- Role-based defaults with granular permissions
- Admin bypass for elevated operations

### Data Protection
- SQLite database with WAL mode for crash consistency
- Parameterized queries to prevent SQL injection
- Password hashing with bcrypt
- No sensitive data logged to console in production

### Input Validation
- JSON body size limited to 10mb
- File uploads validated for type and size
- Path traversal prevention in backup operations
- Permission checks on all mutating endpoints

### Infrastructure
- Docker images run as non-root user (`nodejs`)
- Minimal attack surface (bookworm-slim base)
- Health checks for early failure detection
- Database persisted via Docker volumes

---

## JWT Security

- Store `JWT_SECRET` securely (use secrets management in production)
- Rotate `JWT_SECRET` periodically
- Use strong, random secrets (minimum 32 characters)
- Consider token revocation strategies for high-security deployments

---

## SQLite Security

- Database file should have restricted filesystem permissions
- Avoid exposing database file path via error messages
- Regular backups stored separately from application server
- WAL files are crash-consistent but should be included in backups

---

## Backup Recommendations

1. **Encryption**: Encrypt backup files in transit and at rest
2. **Off-site Storage**: Store backups in a separate physical location
3. **Access Control**: Restrict backup directory permissions
4. **Verification**: Validate backup integrity before relying on it
5. **Retention**: Follow the 3-2-1 backup rule (3 copies, 2 media, 1 off-site)

---

## Dependencies

- Keep `npm audit` up to date
- Review dependency updates before merging
- Use `npm ci` with lockfile for reproducible builds
- Monitor GitHub security advisories for dependencies
