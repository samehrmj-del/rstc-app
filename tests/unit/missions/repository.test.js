const {
    createMission,
    getAllMissions,
    getMissionById,
    updateMission,
    deleteMission,
    getLastDecreeNumber
} = require('../../../src/domains/missions/repository');

const { dbGet, dbAll, dbRun } = require('../../../src/infrastructure/database/connection');
const { MISSION_FIELDS } = require('../../../src/domains/missions/constants');

jest.mock('../../../src/infrastructure/database/connection', () => ({
    dbGet: jest.fn(),
    dbAll: jest.fn(),
    dbRun: jest.fn()
}));

jest.mock('../../../src/domains/missions/constants', () => ({
    MISSION_FIELDS: ['decree_num','name','lname','emp_num','job_title','mission_type','device_type','repair_type','region','location','subject','device_serial','duration','overtime_hours','start_date','end_date','issue_date','is_single','is_group','is_supplied','is_unsupplied','is_issued','is_extended','is_gov','is_plane','is_train','is_agency','is_bus','is_personal']
}));

describe('createMission', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('calls dbRun with correct SQL using MISSION_FIELDS', async () => {
        dbRun.mockResolvedValue({});
        const values = new Array(MISSION_FIELDS.length).fill('val');
        await createMission(values);
        const [sql, params] = dbRun.mock.calls[0];
        const expectedFields = MISSION_FIELDS.join(',');
        const expectedPlaceholders = MISSION_FIELDS.map(() => '?').join(',');
        expect(sql).toBe(`INSERT INTO Missions (${expectedFields}) VALUES (${expectedPlaceholders})`);
        expect(params).toEqual(values);
        expect(params).toHaveLength(MISSION_FIELDS.length);
    });
});

describe('getAllMissions', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('calls dbAll with correct SQL', async () => {
        dbAll.mockResolvedValue([{ id: 1, name: 'A' }]);
        const result = await getAllMissions();
        expect(dbAll).toHaveBeenCalledWith('SELECT * FROM Missions ORDER BY id DESC');
        expect(result).toEqual([{ id: 1, name: 'A' }]);
    });
});

describe('getMissionById', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('calls dbGet with correct SQL and param', async () => {
        dbGet.mockResolvedValue({ id: 1, name: 'A' });
        const result = await getMissionById(1);
        expect(dbGet).toHaveBeenCalledWith('SELECT * FROM Missions WHERE id = ?', [1]);
        expect(result).toEqual({ id: 1, name: 'A' });
    });
});

describe('updateMission', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('builds SET clause from fields, calls dbRun', async () => {
        dbRun.mockResolvedValue({});
        const fields = ['name', 'start_date'];
        const values = ['A', '2024-01-01'];
        await updateMission(1, fields, values);
        const [sql, params] = dbRun.mock.calls[0];
        expect(sql).toBe('UPDATE Missions SET name=?,start_date=? WHERE id=?');
        expect(params).toEqual(['A', '2024-01-01', 1]);
    });

    test('builds SET clause with all MISSION_FIELDS except decree_num', async () => {
        dbRun.mockResolvedValue({});
        const fields = MISSION_FIELDS.filter(f => f !== 'decree_num');
        const values = new Array(fields.length).fill('val');
        await updateMission(1, fields, values);
        const [sql, params] = dbRun.mock.calls[0];
        const expectedSetClause = fields.map(f => `${f}=?`).join(',');
        expect(sql).toBe(`UPDATE Missions SET ${expectedSetClause} WHERE id=?`);
        expect(params).toEqual([...values, 1]);
    });
});

describe('deleteMission', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('calls dbRun with correct SQL and param', async () => {
        dbRun.mockResolvedValue({});
        await deleteMission(1);
        expect(dbRun).toHaveBeenCalledWith('DELETE FROM Missions WHERE id = ?', [1]);
    });
});

describe('getLastDecreeNumber', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('calls dbGet with LIKE pattern and limit', async () => {
        dbGet.mockResolvedValue({ decree_num: 'RSTC-20240115-0001' });
        const result = await getLastDecreeNumber('RSTC-20240115-');
        expect(dbGet).toHaveBeenCalledWith('SELECT decree_num FROM Missions WHERE decree_num LIKE ? ORDER BY id DESC LIMIT 1', ['RSTC-20240115-%']);
        expect(result).toBe('RSTC-20240115-0001');
    });

    test('returns null when no result', async () => {
        dbGet.mockResolvedValue(null);
        const result = await getLastDecreeNumber('RSTC-20240115-');
        expect(dbGet).toHaveBeenCalledWith('SELECT decree_num FROM Missions WHERE decree_num LIKE ? ORDER BY id DESC LIMIT 1', ['RSTC-20240115-%']);
        expect(result).toBeNull();
    });
});
