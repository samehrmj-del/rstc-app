const { dbGet, dbAll } = require('../../../src/infrastructure/database/connection');

jest.mock('../../../src/infrastructure/database/connection', () => ({
    dbGet: jest.fn(),
    dbAll: jest.fn()
}));

afterEach(() => {
    jest.clearAllMocks();
});

const { searchAuditLog } = require('../../../src/domains/audit/repository');

describe('searchAuditLog', () => {
    test('no conditions -> no WHERE clause', async () => {
        dbAll.mockResolvedValue([]);
        dbGet.mockResolvedValue({ count: 0 });

        await searchAuditLog([], [], 100);

        expect(dbAll).toHaveBeenCalledWith(
            'SELECT * FROM AuditLog ORDER BY id DESC LIMIT ?',
            [100]
        );
        expect(dbGet).toHaveBeenCalledWith(
            'SELECT COUNT(*) as count FROM AuditLog',
            []
        );
    });

    test('with conditions -> WHERE + LIMIT', async () => {
        dbAll.mockResolvedValue([]);
        dbGet.mockResolvedValue({ count: 0 });

        await searchAuditLog(['entity = ?', 'username LIKE ?'], ['personnel', '%admin%'], 50);

        expect(dbAll).toHaveBeenCalledWith(
            'SELECT * FROM AuditLog WHERE entity = ? AND username LIKE ? ORDER BY id DESC LIMIT ?',
            ['personnel', '%admin%', 50]
        );
        expect(dbGet).toHaveBeenCalledWith(
            'SELECT COUNT(*) as count FROM AuditLog WHERE entity = ? AND username LIKE ?',
            ['personnel', '%admin%']
        );
    });

    test('calls both dbAll and dbGet', async () => {
        dbAll.mockResolvedValue([{ id: 1, entity: 'personnel' }]);
        dbGet.mockResolvedValue({ count: 1 });

        const result = await searchAuditLog(['entity = ?'], ['personnel'], 10);

        expect(dbAll).toHaveBeenCalled();
        expect(dbGet).toHaveBeenCalled();
        expect(result.rows).toEqual([{ id: 1, entity: 'personnel' }]);
        expect(result.total.count).toBe(1);
    });
});