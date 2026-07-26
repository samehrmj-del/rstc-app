const { logAudit } = require('../../../src/infrastructure/security/audit.service');
const { dbRun } = require('../../../src/infrastructure/database/connection');

jest.mock('../../../src/infrastructure/database/connection');

describe('logAudit', () => {
    beforeEach(() => {
        dbRun.mockResolvedValue({ lastInsertRowid: 1, changes: 1 });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('calls dbRun with correct SQL and params for full arguments', async () => {
        await logAudit(1, 'admin', 'login', 'auth', 'sess123', 'User logged in', '127.0.0.1');

        expect(dbRun).toHaveBeenCalledWith(
            "INSERT INTO AuditLog (user_id, username, action, entity, entity_id, detail, ip) VALUES (?,?,?,?,?,?,?)",
            [1, 'admin', 'login', 'auth', 'sess123', 'User logged in', '127.0.0.1']
        );
    });

    it('passes null for entityId when not provided', async () => {
        await logAudit(2, 'user1', 'view', 'reports', undefined, 'Viewed report', '10.0.0.1');

        expect(dbRun).toHaveBeenCalledWith(
            expect.any(String),
            [2, 'user1', 'view', 'reports', null, 'Viewed report', '10.0.0.1']
        );
    });

    it('passes null for detail when not provided', async () => {
        await logAudit(3, 'user2', 'delete', 'personnel', 'p456', undefined, '192.168.1.1');

        expect(dbRun).toHaveBeenCalledWith(
            expect.any(String),
            [3, 'user2', 'delete', 'personnel', 'p456', null, '192.168.1.1']
        );
    });

    it('passes null for ip when not provided', async () => {
        await logAudit(4, 'user3', 'edit', 'missions', 'm789', 'Updated mission', undefined);

        expect(dbRun).toHaveBeenCalledWith(
            expect.any(String),
            [4, 'user3', 'edit', 'missions', 'm789', 'Updated mission', null]
        );
    });

    it('passes null for all optional fields when not provided', async () => {
        await logAudit(5, 'user4', 'create', 'users', undefined, undefined, undefined);

        expect(dbRun).toHaveBeenCalledWith(
            expect.any(String),
            [5, 'user4', 'create', 'users', null, null, null]
        );
    });

    it('catches errors silently and does not throw', async () => {
        dbRun.mockRejectedValue(new Error('Database error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await expect(logAudit(1, 'user', 'action', 'entity', 'e1', 'detail', 'ip')).resolves.toBeUndefined();

        expect(consoleSpy).toHaveBeenCalledWith('Audit log error:', 'Database error');

        consoleSpy.mockRestore();
    });

    it('does not throw when dbRun throws a string error', async () => {
        dbRun.mockRejectedValue('Connection failed');
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await expect(logAudit(1, 'user', 'action', 'entity', 'e1', 'detail', 'ip')).resolves.toBeUndefined();

        consoleSpy.mockRestore();
    });

    it('calls dbRun exactly once per invocation', async () => {
        await logAudit(1, 'user', 'action', 'entity', 'e1', 'detail', 'ip');

        expect(dbRun).toHaveBeenCalledTimes(1);
    });
});