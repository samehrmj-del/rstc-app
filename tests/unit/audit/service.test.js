const { auditSearch } = require('../../../src/domains/audit/service');

jest.mock('../../../src/domains/audit/repository', () => ({
    searchAuditLog: jest.fn()
}));

const { searchAuditLog } = require('../../../src/domains/audit/repository');

afterEach(() => {
    jest.clearAllMocks();
});

describe('auditSearch', () => {
    test('no filters -> returns all with default limit', async () => {
        searchAuditLog.mockResolvedValue({ rows: [], total: { count: 0 } });

        const result = await auditSearch({});

        expect(result.status).toBe(200);
        expect(result.body.results).toEqual([]);
        expect(result.body.total).toBe(0);
        expect(searchAuditLog).toHaveBeenCalledWith([], [], 100);
    });

    test('entity filter -> calls searchAuditLog with entity condition', async () => {
        searchAuditLog.mockResolvedValue({ rows: [], total: { count: 0 } });

        const result = await auditSearch({ entity: 'personnel' });

        expect(result.status).toBe(200);
        expect(searchAuditLog).toHaveBeenCalledWith(
            ['entity = ?'],
            ['personnel'],
            100
        );
    });

    test('username filter -> LIKE pattern', async () => {
        searchAuditLog.mockResolvedValue({ rows: [], total: { count: 0 } });

        const result = await auditSearch({ username: 'admin' });

        expect(result.status).toBe(200);
        expect(searchAuditLog).toHaveBeenCalledWith(
            ['username LIKE ?'],
            ['%admin%'],
            100
        );
    });

    test('custom limit -> parsed as int', async () => {
        searchAuditLog.mockResolvedValue({ rows: [], total: { count: 0 } });

        const result = await auditSearch({ limit: '50' });

        expect(result.status).toBe(200);
        expect(searchAuditLog).toHaveBeenCalledWith([], [], 50);
    });

    test('DB error -> 500', async () => {
        searchAuditLog.mockRejectedValue(new Error('Database error'));

        const result = await auditSearch({});

        expect(result.status).toBe(500);
        expect(result.body.error).toBe('Database error');
    });
});