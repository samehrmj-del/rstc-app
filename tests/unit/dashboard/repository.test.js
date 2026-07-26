const { dbAll, dbGet } = require('../../../src/infrastructure/database/connection');

jest.mock('../../../src/infrastructure/database/connection', () => ({
    dbGet: jest.fn(),
    dbAll: jest.fn()
}));

afterEach(() => {
    jest.clearAllMocks();
});

const {
    getTotalPersonnel,
    getActivePersonnel,
    getInactivePersonnel,
    getTotalMissions,
    getTotalUsers,
    getRecentPersonnel,
    getRecentMissions,
    getPersonnelByType,
    getPersonnelByDegree,
    getMissionsByRegion,
    getMissionsByType,
    getSingleVsGroup,
    getSuppliedVsUnsupplied
} = require('../../../src/domains/dashboard/repository');

describe('dashboard repository queries', () => {
    test('getTotalPersonnel calls correct SQL', async () => {
        dbGet.mockResolvedValue({ count: 10 });
        await getTotalPersonnel();
        expect(dbGet).toHaveBeenCalledWith("SELECT COUNT(*) as count FROM Personnel");
    });

    test('getActivePersonnel calls correct SQL', async () => {
        dbGet.mockResolvedValue({ count: 8 });
        await getActivePersonnel();
        expect(dbGet).toHaveBeenCalledWith("SELECT COUNT(*) as count FROM Personnel WHERE status='فعال'");
    });

    test('getInactivePersonnel calls correct SQL', async () => {
        dbGet.mockResolvedValue({ count: 2 });
        await getInactivePersonnel();
        expect(dbGet).toHaveBeenCalledWith("SELECT COUNT(*) as count FROM Personnel WHERE status='غیرفعال'");
    });

    test('getTotalMissions calls correct SQL', async () => {
        dbGet.mockResolvedValue({ count: 50 });
        await getTotalMissions();
        expect(dbGet).toHaveBeenCalledWith("SELECT COUNT(*) as count FROM Missions");
    });

    test('getTotalUsers calls correct SQL', async () => {
        dbGet.mockResolvedValue({ count: 10 });
        await getTotalUsers();
        expect(dbGet).toHaveBeenCalledWith("SELECT COUNT(*) as count FROM Users");
    });

    test('getRecentPersonnel with default limit', async () => {
        dbAll.mockResolvedValue([]);
        await getRecentPersonnel();
        expect(dbAll).toHaveBeenCalledWith(
            "SELECT id, name, lname, national_id, emp_num, job_title, status FROM Personnel ORDER BY id DESC LIMIT ?",
            [6]
        );
    });

    test('getRecentPersonnel with custom limit', async () => {
        dbAll.mockResolvedValue([]);
        await getRecentPersonnel(10);
        expect(dbAll).toHaveBeenCalledWith(
            "SELECT id, name, lname, national_id, emp_num, job_title, status FROM Personnel ORDER BY id DESC LIMIT ?",
            [10]
        );
    });

    test('getRecentMissions with default limit', async () => {
        dbAll.mockResolvedValue([]);
        await getRecentMissions();
        expect(dbAll).toHaveBeenCalledWith(
            "SELECT id, decree_num, name, lname, mission_type, location, start_date, end_date FROM Missions ORDER BY id DESC LIMIT ?",
            [6]
        );
    });

    test('getMissionsByRegion with default limit', async () => {
        dbAll.mockResolvedValue([]);
        await getMissionsByRegion();
        expect(dbAll).toHaveBeenCalledWith(
            "SELECT region, COUNT(*) as count FROM Missions WHERE region != '' GROUP BY region ORDER BY count DESC LIMIT ?",
            [10]
        );
    });

    test('getMissionsByRegion with custom limit', async () => {
        dbAll.mockResolvedValue([]);
        await getMissionsByRegion(5);
        expect(dbAll).toHaveBeenCalledWith(
            "SELECT region, COUNT(*) as count FROM Missions WHERE region != '' GROUP BY region ORDER BY count DESC LIMIT ?",
            [5]
        );
    });

    test('getPersonnelByType calls correct SQL', async () => {
        dbAll.mockResolvedValue([]);
        await getPersonnelByType();
        expect(dbAll).toHaveBeenCalledWith(
            "SELECT emp_type, COUNT(*) as count FROM Personnel WHERE emp_type != '' GROUP BY emp_type ORDER BY count DESC"
        );
    });

    test('getPersonnelByDegree calls correct SQL', async () => {
        dbAll.mockResolvedValue([]);
        await getPersonnelByDegree();
        expect(dbAll).toHaveBeenCalledWith(
            "SELECT last_degree, COUNT(*) as count FROM Personnel WHERE last_degree != '' GROUP BY last_degree ORDER BY count DESC"
        );
    });

    test('getMissionsByType calls correct SQL', async () => {
        dbAll.mockResolvedValue([]);
        await getMissionsByType();
        expect(dbAll).toHaveBeenCalledWith(
            "SELECT mission_type, COUNT(*) as count FROM Missions WHERE mission_type != '' GROUP BY mission_type ORDER BY count DESC"
        );
    });

    test('getSingleVsGroup calls correct SQL', async () => {
        dbGet.mockResolvedValue({ singleCount: 10, groupCount: 5 });
        await getSingleVsGroup();
        expect(dbGet).toHaveBeenCalledWith(
            "SELECT SUM(is_single) as singleCount, SUM(is_group) as groupCount FROM Missions"
        );
    });

    test('getSuppliedVsUnsupplied calls correct SQL', async () => {
        dbGet.mockResolvedValue({ supplied: 20, unsupplied: 10 });
        await getSuppliedVsUnsupplied();
        expect(dbGet).toHaveBeenCalledWith(
            "SELECT SUM(is_supplied) as supplied, SUM(is_unsupplied) as unsupplied FROM Missions"
        );
    });
});