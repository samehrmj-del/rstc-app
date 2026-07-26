const {
    createPersonnelRecord,
    updatePersonnelRecord,
    deletePersonnelRecord,
    bulkImportPersonnel
} = require('../../../src/domains/personnel/service');
const personnelRepository = require('../../../src/domains/personnel/repository');

jest.mock('../../../src/domains/personnel/repository', () => ({
    findAllPersonnel: jest.fn(),
    findPersonnelById: jest.fn(),
    createPersonnel: jest.fn(),
    updatePersonnel: jest.fn(),
    deletePersonnel: jest.fn(),
    bulkImport: jest.fn()
}));

jest.mock('../../../src/infrastructure/utils/string', () => ({
    normalizeDigits: jest.fn((str) => str == null ? str : String(str))
}));

describe('createPersonnelRecord', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('validation errors -> 400', async () => {
        const result = await createPersonnelRecord({});
        expect(result.status).toBe(400);
        expect(result.body.error).toContain('نام الزامی است.');
        expect(personnelRepository.createPersonnel).not.toHaveBeenCalled();
    });

    test('duplicate UNIQUE -> 400 with Persian message', async () => {
        const err = new Error('UNIQUE constraint failed');
        personnelRepository.createPersonnel.mockRejectedValue(err);

        const result = await createPersonnelRecord({ name: 'A', lname: 'B', national_id: '1234567890' });
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('کد ملی یا شماره پرسنلی قبلاً ثبت شده است!');
    });

    test('success -> 200', async () => {
        personnelRepository.createPersonnel.mockResolvedValue({});

        const result = await createPersonnelRecord({ name: 'A', lname: 'B', national_id: '1234567890' });
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
    });

    test('other DB error -> 400', async () => {
        const err = new Error('Some other DB error');
        personnelRepository.createPersonnel.mockRejectedValue(err);

        const result = await createPersonnelRecord({ name: 'A', lname: 'B', national_id: '1234567890' });
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('Some other DB error');
    });
});

describe('updatePersonnelRecord', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('validation errors -> 400', async () => {
        const result = await updatePersonnelRecord(1, {});
        expect(result.status).toBe(400);
        expect(result.body.error).toContain('نام الزامی است.');
        expect(personnelRepository.updatePersonnel).not.toHaveBeenCalled();
    });

    test('duplicate UNIQUE -> 400 with Persian message', async () => {
        const err = new Error('UNIQUE constraint failed');
        personnelRepository.updatePersonnel.mockRejectedValue(err);

        const result = await updatePersonnelRecord(1, { name: 'A', lname: 'B', national_id: '1234567890' });
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('کد ملی یا شماره پرسنلی تکراری است!');
    });

    test('success -> 200', async () => {
        personnelRepository.updatePersonnel.mockResolvedValue({});

        const result = await updatePersonnelRecord(1, { name: 'A', lname: 'B', national_id: '1234567890' });
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
    });
});

describe('deletePersonnelRecord', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('success -> 200', async () => {
        personnelRepository.deletePersonnel.mockResolvedValue({});

        const result = await deletePersonnelRecord(1);
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(personnelRepository.deletePersonnel).toHaveBeenCalledWith(1);
    });

    test('DB error -> 500', async () => {
        const err = new Error('DB error');
        personnelRepository.deletePersonnel.mockRejectedValue(err);

        const result = await deletePersonnelRecord(1);
        expect(result.status).toBe(500);
        expect(result.body.error).toBe('DB error');
    });
});

describe('bulkImportPersonnel', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('empty array -> 400', async () => {
        const result = await bulkImportPersonnel([]);
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('فایل خالی است');
        expect(personnelRepository.bulkImport).not.toHaveBeenCalled();
    });

    test('>1000 rows -> 400', async () => {
        const rows = new Array(1001).fill({ name: 'A', lname: 'B' });
        const result = await bulkImportPersonnel(rows);
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('حداکثر ۱۰۰۰ ردیف مجاز است.');
        expect(personnelRepository.bulkImport).not.toHaveBeenCalled();
    });

    test('success -> 200 with imported/failed/errors', async () => {
        personnelRepository.bulkImport.mockResolvedValue({
            imported: 5,
            failed: 2,
            errors: ['error1', 'error2']
        });

        const result = await bulkImportPersonnel([{ name: 'A', lname: 'B' }]);
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(result.body.imported).toBe(5);
        expect(result.body.failed).toBe(2);
        expect(result.body.errors).toEqual(['error1', 'error2']);
    });

    test('DB error -> 500', async () => {
        personnelRepository.bulkImport.mockRejectedValue(new Error('DB error'));

        const result = await bulkImportPersonnel([{ name: 'A', lname: 'B' }]);
        expect(result.status).toBe(500);
        expect(result.body.error).toBe('خطا در ثبت');
    });
});
