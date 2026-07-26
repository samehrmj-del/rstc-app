const {
    createMissionRecord,
    getAllMissionsRecords,
    updateMissionRecord,
    deleteMissionRecord,
    generateDecreeNum
} = require('../../../src/domains/missions/service');
const missionsRepository = require('../../../src/domains/missions/repository');

jest.mock('../../../src/domains/missions/constants', () => ({
    MISSION_FIELDS: ['decree_num','name','lname','emp_num','job_title','mission_type','device_type','repair_type','region','location','subject','device_serial','duration','overtime_hours','start_date','end_date','issue_date','is_single','is_group','is_supplied','is_unsupplied','is_issued','is_extended','is_gov','is_plane','is_train','is_agency','is_bus','is_personal']
}));

jest.mock('../../../src/domains/missions/repository', () => ({
    createMission: jest.fn(),
    getAllMissions: jest.fn(),
    getMissionById: jest.fn(),
    updateMission: jest.fn(),
    deleteMission: jest.fn(),
    getLastDecreeNumber: jest.fn()
}));

jest.mock('../../../src/infrastructure/utils/date', () => ({
    toJalaali: jest.fn(() => ({ jy: 2024, jm: 1, jd: 15 }))
}));

describe('createMissionRecord', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('missing required fields -> 400', async () => {
        const result = await createMissionRecord({});
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('فیلدهای الزامی: نام و تاریخ‌ها');
        expect(missionsRepository.createMission).not.toHaveBeenCalled();
    });

    test('duplicate decree_num -> 400', async () => {
        missionsRepository.createMission.mockRejectedValue(new Error('UNIQUE constraint failed'));

        const result = await createMissionRecord({ name: 'A', start_date: '2024-01-01', end_date: '2024-01-02', issue_date: '2024-01-03' });
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('خطا در شماره حکم!');
    });

    test('DB error -> 500', async () => {
        missionsRepository.createMission.mockRejectedValue(new Error('DB write failed'));

        const result = await createMissionRecord({ name: 'A', start_date: '2024-01-01', end_date: '2024-01-02', issue_date: '2024-01-03' });
        expect(result.status).toBe(500);
        expect(result.body.error).toBe('DB write failed');
    });

    test('success -> 200 + decree_num in format RSTC-YYYYMMDD-NNNN', async () => {
        missionsRepository.createMission.mockResolvedValue({});

        const result = await createMissionRecord({ name: 'A', start_date: '2024-01-01', end_date: '2024-01-02', issue_date: '2024-01-03' });
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(result.body.decree_num).toMatch(/^RSTC-\d{8}-\d{4}$/);
    });
});

describe('getAllMissionsRecords', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('success -> 200 + array', async () => {
        const missions = [{ id: 1, name: 'A' }];
        missionsRepository.getAllMissions.mockResolvedValue(missions);

        const result = await getAllMissionsRecords();
        expect(result.status).toBe(200);
        expect(result.body).toEqual(missions);
    });

    test('DB error -> 500', async () => {
        missionsRepository.getAllMissions.mockRejectedValue(new Error('DB error'));

        const result = await getAllMissionsRecords();
        expect(result.status).toBe(500);
        expect(result.body.error).toBe('DB error');
    });
});

describe('updateMissionRecord', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('missing required fields -> 400', async () => {
        const result = await updateMissionRecord(1, {});
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('فیلدهای الزامی: نام و تاریخ‌ها');
        expect(missionsRepository.updateMission).not.toHaveBeenCalled();
    });

    test('success -> 200', async () => {
        missionsRepository.updateMission.mockResolvedValue({});

        const result = await updateMissionRecord(1, { name: 'A', start_date: '2024-01-01', end_date: '2024-01-02', issue_date: '2024-01-03' });
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
    });

    test('duplicate decree_num -> 400', async () => {
        missionsRepository.updateMission.mockRejectedValue(new Error('UNIQUE constraint failed'));

        const result = await updateMissionRecord(1, { name: 'A', start_date: '2024-01-01', end_date: '2024-01-02', issue_date: '2024-01-03' });
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('این شماره حکم قبلاً ثبت شده است!');
    });
});

describe('deleteMissionRecord', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('success -> 200', async () => {
        missionsRepository.deleteMission.mockResolvedValue({});

        const result = await deleteMissionRecord(1);
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(missionsRepository.deleteMission).toHaveBeenCalledWith(1);
    });

    test('DB error -> 500', async () => {
        missionsRepository.deleteMission.mockRejectedValue(new Error('DB error'));

        const result = await deleteMissionRecord(1);
        expect(result.status).toBe(500);
        expect(result.body.error).toBe('DB error');
    });
});

describe('generateDecreeNum', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('returns RSTC-YYYYMMDD-NNNN format', async () => {
        missionsRepository.getLastDecreeNumber.mockResolvedValue(null);

        const result = await generateDecreeNum();
        expect(result).toMatch(/^RSTC-\d{8}-\d{4}$/);
    });

    test('increments sequence when previous exists', async () => {
        missionsRepository.getLastDecreeNumber.mockResolvedValue({ decree_num: 'RSTC-20240115-0012' });

        const result = await generateDecreeNum();
        expect(result).toBe('RSTC-20240115-0013');
    });
});
