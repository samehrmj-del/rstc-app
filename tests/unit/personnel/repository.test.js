const {
    findAllPersonnel,
    findPersonnelById,
    createPersonnel,
    updatePersonnel,
    deletePersonnel,
    findExistingNationalIdsAndEmpNums,
    bulkImport
} = require('../../../src/domains/personnel/repository');

const { dbGet, dbAll, dbRun } = require('../../../src/infrastructure/database/connection');

jest.mock('../../../src/infrastructure/database/connection', () => ({
    dbGet: jest.fn(),
    dbAll: jest.fn(),
    dbRun: jest.fn()
}));

jest.mock('../../../src/infrastructure/utils/string', () => ({
    normalizeDigits: jest.fn((str) => str == null ? str : String(str))
}));

describe('findAllPersonnel', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('calls dbAll with correct SQL', async () => {
        dbAll.mockResolvedValue([{ id: 1, name: 'A' }]);
        const result = await findAllPersonnel();
        expect(dbAll).toHaveBeenCalledWith('SELECT * FROM Personnel ORDER BY id DESC');
        expect(result).toEqual([{ id: 1, name: 'A' }]);
    });
});

describe('findPersonnelById', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('calls dbGet with correct SQL and param', async () => {
        dbGet.mockResolvedValue({ id: 1, name: 'A' });
        const result = await findPersonnelById(1);
        expect(dbGet).toHaveBeenCalledWith('SELECT * FROM Personnel WHERE id = ?', [1]);
        expect(result).toEqual({ id: 1, name: 'A' });
    });
});

describe('createPersonnel', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('calls dbRun with correct SQL and 14 params', async () => {
        dbRun.mockResolvedValue({});
        const data = {
            name: 'A', lname: 'B', father_name: 'C', national_id: 'D',
            emp_num: 'E', hire_date: 'F', emp_type: 'G', org_post: 'H',
            job_title: 'I', last_degree: 'J', phone: 'K', address: 'L',
            status: 'M', notes: 'N'
        };
        await createPersonnel(data);
        expect(dbRun).toHaveBeenCalledTimes(1);
        const [sql, params] = dbRun.mock.calls[0];
        expect(sql).toBe('INSERT INTO Personnel (name,lname,father_name,national_id,emp_num,hire_date,emp_type,org_post,job_title,last_degree,phone,address,status,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        expect(params).toEqual(['A','B','C','D','E','F','G','H','I','J','K','L','M','N']);
        expect(params).toHaveLength(14);
    });
});

describe('updatePersonnel', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('calls dbRun with correct SQL and 15 params (including id)', async () => {
        dbRun.mockResolvedValue({});
        const data = {
            name: 'A', lname: 'B', father_name: 'C', national_id: 'D',
            emp_num: 'E', hire_date: 'F', emp_type: 'G', org_post: 'H',
            job_title: 'I', last_degree: 'J', phone: 'K', address: 'L',
            status: 'M', notes: 'N'
        };
        await updatePersonnel(99, data);
        expect(dbRun).toHaveBeenCalledTimes(1);
        const [sql, params] = dbRun.mock.calls[0];
        expect(sql).toBe('UPDATE Personnel SET name=?,lname=?,father_name=?,national_id=?,emp_num=?,hire_date=?,emp_type=?,org_post=?,job_title=?,last_degree=?,phone=?,address=?,status=?,notes=? WHERE id=?');
        expect(params).toEqual(['A','B','C','D','E','F','G','H','I','J','K','L','M','N',99]);
        expect(params).toHaveLength(15);
    });
});

describe('deletePersonnel', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('calls dbRun with correct SQL and param', async () => {
        dbRun.mockResolvedValue({});
        await deletePersonnel(1);
        expect(dbRun).toHaveBeenCalledWith('DELETE FROM Personnel WHERE id = ?', [1]);
    });
});

describe('findExistingNationalIdsAndEmpNums', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('calls dbAll, returns sets', async () => {
        dbAll.mockResolvedValue([
            { national_id: '123', emp_num: 'E1' },
            { national_id: null, emp_num: 'E2' },
            { national_id: '456', emp_num: null }
        ]);
        const result = await findExistingNationalIdsAndEmpNums();
        expect(dbAll).toHaveBeenCalledWith('SELECT national_id, emp_num FROM Personnel');
        expect(result.natIds.has('123')).toBe(true);
        expect(result.natIds.has('456')).toBe(true);
        expect(result.natIds.has('789')).toBe(false);
        expect(result.empNums.has('E1')).toBe(true);
        expect(result.empNums.has('E2')).toBe(true);
        expect(result.empNums.has('E3')).toBe(false);
    });
});

describe('bulkImport', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('begins transaction, inserts rows, commits', async () => {
        dbAll.mockResolvedValue([]);
        dbRun.mockResolvedValue({});

        const rows = [
            { name: 'A', lname: 'B', national_id: '123' },
            { name: 'C', lname: 'D', national_id: '456' }
        ];

        const result = await bulkImport(rows);
        expect(dbRun).toHaveBeenCalledWith('BEGIN TRANSACTION');
        expect(dbRun).toHaveBeenCalledWith('COMMIT');
        expect(result.imported).toBe(2);
        expect(result.failed).toBe(0);
    });

    test('skips empty name/lname with error', async () => {
        dbAll.mockResolvedValue([]);
        dbRun.mockResolvedValue({});

        const rows = [
            { name: '', lname: 'B', national_id: '123' },
            { name: 'A', lname: '', national_id: '456' },
            { name: 'C', lname: 'D', national_id: '789' }
        ];

        const result = await bulkImport(rows);
        expect(result.imported).toBe(1);
        expect(result.failed).toBe(2);
        expect(result.errors[0]).toContain('نام خالی');
        expect(result.errors[1]).toContain('نام خالی');
    });

    test('skips duplicate national_id', async () => {
        dbAll.mockResolvedValue([{ national_id: '123', emp_num: null }]);
        dbRun.mockResolvedValue({});

        const rows = [
            { name: 'A', lname: 'B', national_id: '123' },
            { name: 'C', lname: 'D', national_id: '456' }
        ];

        const result = await bulkImport(rows);
        expect(result.imported).toBe(1);
        expect(result.failed).toBe(1);
        expect(result.errors[0]).toContain('کد ملی "123" تکراری');
    });

    test('skips duplicate emp_num', async () => {
        dbAll.mockResolvedValue([{ national_id: null, emp_num: 'E1' }]);
        dbRun.mockResolvedValue({});

        const rows = [
            { name: 'A', lname: 'B', emp_num: 'E1' },
            { name: 'C', lname: 'D', emp_num: 'E2' }
        ];

        const result = await bulkImport(rows);
        expect(result.imported).toBe(1);
        expect(result.failed).toBe(1);
        expect(result.errors[0]).toContain('شماره پرسنلی "E1" تکراری');
    });

    test('rolls back on error', async () => {
        dbAll.mockResolvedValue([]);
        dbRun
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})
            .mockRejectedValueOnce(new Error('COMMIT failed'));

        const rows = [
            { name: 'A', lname: 'B', national_id: '123' },
            { name: 'C', lname: 'D', national_id: '456' }
        ];

        await expect(bulkImport(rows)).rejects.toThrow('COMMIT failed');
        expect(dbRun).toHaveBeenCalledWith('ROLLBACK');
    });
});
