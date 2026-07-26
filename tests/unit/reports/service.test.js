const { searchMissionsService } = require('../../../src/domains/reports/service');

jest.mock('../../../src/domains/reports/repository', () => ({
    searchReports: jest.fn()
}));

const { searchReports } = require('../../../src/domains/reports/repository');

afterEach(() => {
    jest.clearAllMocks();
});

describe('searchMissionsService', () => {
    test('success -> 200 + results + total', async () => {
        const mockRows = [{ id: 1, name: 'Mission A' }];
        const mockTotal = { count: 1 };
        searchReports.mockResolvedValue({ rows: mockRows, total: mockTotal });

        const result = await searchMissionsService({});

        expect(result.status).toBe(200);
        expect(result.body.results).toEqual(mockRows);
        expect(result.body.total).toBe(1);
        expect(searchReports).toHaveBeenCalledWith({});
    });

    test('DB error -> 500', async () => {
        const mockError = new Error('Database connection failed');
        searchReports.mockRejectedValue(mockError);

        const result = await searchMissionsService({ name: 'test' });

        expect(result.status).toBe(500);
        expect(result.body.error).toBe('Database connection failed');
    });
});