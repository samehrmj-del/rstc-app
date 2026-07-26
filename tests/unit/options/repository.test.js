const { dbAll, dbRun } = require('../../../src/infrastructure/database/connection');

jest.mock('../../../src/infrastructure/database/connection', () => ({
    dbAll: jest.fn(),
    dbRun: jest.fn()
}));

jest.mock('../../../src/infrastructure/utils/json', () => ({
    safeParse: jest.fn((value, fallback) => {
        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    })
}));

afterEach(() => {
    jest.clearAllMocks();
});

const { readOptions, writeOptionsField } = require('../../../src/domains/options/repository');

describe('readOptions', () => {
    test('returns parsed options with labels', async () => {
        const mockRows = [
            { field: 'mission_type', label: 'Mission Type', options: JSON.stringify(['field', 'office']) }
        ];
        dbAll.mockResolvedValue(mockRows);

        const result = await readOptions();

        expect(result.mission_type).toEqual({ label: 'Mission Type', options: ['field', 'office'] });
        expect(dbAll).toHaveBeenCalledWith("SELECT field, label, options FROM SystemOptions");
    });

    test('safeParse for corrupted JSON -> fallback []', async () => {
        const mockRows = [
            { field: 'bad_field', label: 'Bad', options: 'not valid json' }
        ];
        dbAll.mockResolvedValue(mockRows);

        const result = await readOptions();

        expect(result.bad_field).toEqual({ label: 'Bad', options: [] });
    });
});

describe('writeOptionsField', () => {
    test('calls dbRun with INSERT OR REPLACE', async () => {
        await writeOptionsField('mission_type', 'Mission Type', ['field', 'office']);

        expect(dbRun).toHaveBeenCalledWith(
            "INSERT OR REPLACE INTO SystemOptions (field, label, options) VALUES (?, ?, ?)",
            ['mission_type', 'Mission Type', JSON.stringify(['field', 'office'])]
        );
    });
});