const { dbAll, dbGet } = require('../../../src/infrastructure/database/connection');

jest.mock('../../../src/infrastructure/database/connection', () => ({
    dbAll: jest.fn(),
    dbGet: jest.fn()
}));

afterEach(() => {
    jest.clearAllMocks();
});

const { buildConditions, searchReports } = require('../../../src/domains/reports/repository');

describe('buildConditions', () => {
    test('no filters -> empty conditions/params', () => {
        const result = buildConditions({});
        expect(result.conditions).toEqual([]);
        expect(result.params).toEqual([]);
    });

    test('name filter adds LIKE condition with % wildcard', () => {
        const result = buildConditions({ name: 'search' });
        expect(result.conditions).toEqual(['name LIKE ?']);
        expect(result.params).toEqual(['%search%']);
    });

    test('lname filter adds LIKE condition with % wildcard', () => {
        const result = buildConditions({ lname: 'test' });
        expect(result.conditions).toEqual(['lname LIKE ?']);
        expect(result.params).toEqual(['%test%']);
    });

    test('emp_num filter adds LIKE condition with % wildcard', () => {
        const result = buildConditions({ emp_num: 'E123' });
        expect(result.conditions).toEqual(['emp_num LIKE ?']);
        expect(result.params).toEqual(['%E123%']);
    });

    test('decree_num filter adds LIKE condition with % wildcard', () => {
        const result = buildConditions({ decree_num: 'D456' });
        expect(result.conditions).toEqual(['decree_num LIKE ?']);
        expect(result.params).toEqual(['%D456%']);
    });

    test('device_type filter adds LIKE condition with % wildcard', () => {
        const result = buildConditions({ device_type: 'laptop' });
        expect(result.conditions).toEqual(['device_type LIKE ?']);
        expect(result.params).toEqual(['%laptop%']);
    });

    test('device_serial filter adds LIKE condition with % wildcard', () => {
        const result = buildConditions({ device_serial: 'SN123' });
        expect(result.conditions).toEqual(['device_serial LIKE ?']);
        expect(result.params).toEqual(['%SN123%']);
    });

    test('region filter adds exact match condition', () => {
        const result = buildConditions({ region: 'Tehran' });
        expect(result.conditions).toEqual(['region = ?']);
        expect(result.params).toEqual(['Tehran']);
    });

    test('mission_type filter adds LIKE condition with % wildcard', () => {
        const result = buildConditions({ mission_type: 'field' });
        expect(result.conditions).toEqual(['mission_type LIKE ?']);
        expect(result.params).toEqual(['%field%']);
    });

    test('location filter adds LIKE condition with % wildcard', () => {
        const result = buildConditions({ location: 'office' });
        expect(result.conditions).toEqual(['location LIKE ?']);
        expect(result.params).toEqual(['%office%']);
    });

    test('start_date_from adds >= condition', () => {
        const result = buildConditions({ start_date_from: '2024-01-01' });
        expect(result.conditions).toEqual(['start_date >= ?']);
        expect(result.params).toEqual(['2024-01-01']);
    });

    test('start_date_to adds <= condition', () => {
        const result = buildConditions({ start_date_to: '2024-12-31' });
        expect(result.conditions).toEqual(['start_date <= ?']);
        expect(result.params).toEqual(['2024-12-31']);
    });

    test('end_date_from adds >= condition', () => {
        const result = buildConditions({ end_date_from: '2024-01-01' });
        expect(result.conditions).toEqual(['end_date >= ?']);
        expect(result.params).toEqual(['2024-01-01']);
    });

    test('end_date_to adds <= condition', () => {
        const result = buildConditions({ end_date_to: '2024-12-31' });
        expect(result.conditions).toEqual(['end_date <= ?']);
        expect(result.params).toEqual(['2024-12-31']);
    });

    test('issue_date_from adds >= condition', () => {
        const result = buildConditions({ issue_date_from: '2024-01-01' });
        expect(result.conditions).toEqual(['issue_date >= ?']);
        expect(result.params).toEqual(['2024-01-01']);
    });

    test('issue_date_to adds <= condition', () => {
        const result = buildConditions({ issue_date_to: '2024-12-31' });
        expect(result.conditions).toEqual(['issue_date <= ?']);
        expect(result.params).toEqual(['2024-12-31']);
    });

    test('combined filters produce multiple conditions', () => {
        const result = buildConditions({ name: 'John', region: 'Tehran', start_date_from: '2024-01-01' });
        expect(result.conditions).toEqual(['name LIKE ?', 'region = ?', 'start_date >= ?']);
        expect(result.params).toEqual(['%John%', 'Tehran', '2024-01-01']);
    });

    test('all LIKE params have % wildcards', () => {
        const result = buildConditions({ name: 'a', lname: 'b', emp_num: 'c', decree_num: 'd', device_type: 'e', device_serial: 'f', mission_type: 'g', location: 'h' });
        for (const param of result.params) {
            expect(param).toMatch(/^%.*%$/);
        }
    });
});

describe('searchReports', () => {
    test('calls dbAll and dbGet with correct SQL', async () => {
        dbAll.mockResolvedValue([]);
        dbGet.mockResolvedValue({ count: 0 });

        await searchReports({});

        expect(dbAll).toHaveBeenCalledWith('SELECT * FROM Missions ORDER BY id DESC', []);
        expect(dbGet).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM Missions', []);
    });

    test('calls dbAll and dbGet with WHERE clause when filters present', async () => {
        dbAll.mockResolvedValue([]);
        dbGet.mockResolvedValue({ count: 0 });

        await searchReports({ name: 'test' });

        expect(dbAll).toHaveBeenCalledWith('SELECT * FROM Missions WHERE name LIKE ? ORDER BY id DESC', ['%test%']);
        expect(dbGet).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM Missions WHERE name LIKE ?', ['%test%']);
    });

    test('returns rows and total', async () => {
        const mockRows = [{ id: 1, name: 'Mission A' }];
        dbAll.mockResolvedValue(mockRows);
        dbGet.mockResolvedValue({ count: 5 });

        const result = await searchReports({});

        expect(result.rows).toEqual(mockRows);
        expect(result.total.count).toBe(5);
    });
});