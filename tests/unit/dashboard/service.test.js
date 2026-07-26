const { getDashboardData } = require('../../../src/domains/dashboard/service');

jest.mock('../../../src/domains/dashboard/repository', () => ({
    getTotalPersonnel: jest.fn(),
    getActivePersonnel: jest.fn(),
    getInactivePersonnel: jest.fn(),
    getTotalMissions: jest.fn(),
    getTotalUsers: jest.fn(),
    getRecentPersonnel: jest.fn(),
    getRecentMissions: jest.fn(),
    getPersonnelByType: jest.fn(),
    getPersonnelByDegree: jest.fn(),
    getMissionsByRegion: jest.fn(),
    getMissionsByType: jest.fn(),
    getSingleVsGroup: jest.fn(),
    getSuppliedVsUnsupplied: jest.fn()
}));

const repository = require('../../../src/domains/dashboard/repository');

afterEach(() => {
    jest.clearAllMocks();
});

describe('getDashboardData', () => {
    test('success -> 200 + all shape fields', async () => {
        repository.getTotalPersonnel.mockResolvedValue({ count: 100 });
        repository.getActivePersonnel.mockResolvedValue({ count: 80 });
        repository.getInactivePersonnel.mockResolvedValue({ count: 20 });
        repository.getTotalMissions.mockResolvedValue({ count: 50 });
        repository.getTotalUsers.mockResolvedValue({ count: 10 });
        repository.getRecentPersonnel.mockResolvedValue([{ id: 1, name: 'A' }]);
        repository.getRecentMissions.mockResolvedValue([{ id: 1, decree_num: 'D1' }]);
        repository.getPersonnelByType.mockResolvedValue([{ emp_type: 'full', count: 60 }]);
        repository.getPersonnelByDegree.mockResolvedValue([{ last_degree: 'bs', count: 40 }]);
        repository.getMissionsByRegion.mockResolvedValue([{ region: 'Tehran', count: 20 }]);
        repository.getMissionsByType.mockResolvedValue([{ mission_type: 'field', count: 30 }]);
        repository.getSingleVsGroup.mockResolvedValue({ singleCount: 30, groupCount: 20 });
        repository.getSuppliedVsUnsupplied.mockResolvedValue({ supplied: 25, unsupplied: 25 });

        const result = await getDashboardData();

        expect(result.status).toBe(200);
        expect(result.body.total).toBe(100);
        expect(result.body.active).toBe(80);
        expect(result.body.inactive).toBe(20);
        expect(result.body.missionCount).toBe(50);
        expect(result.body.userCount).toBe(10);
        expect(result.body.byType).toEqual([{ emp_type: 'full', count: 60 }]);
        expect(result.body.byDegree).toEqual([{ last_degree: 'bs', count: 40 }]);
        expect(result.body.byRegion).toEqual([{ region: 'Tehran', count: 20 }]);
        expect(result.body.byMissionType).toEqual([{ mission_type: 'field', count: 30 }]);
        expect(result.body.singleVsGroup).toEqual({ singleCount: 30, groupCount: 20 });
        expect(result.body.suppliedVsUn).toEqual({ supplied: 25, unsupplied: 25 });
        expect(result.body.recentPersonnel).toEqual([{ id: 1, name: 'A' }]);
        expect(result.body.recentMissions).toEqual([{ id: 1, decree_num: 'D1' }]);
    });

    test('DB error -> 500', async () => {
        repository.getTotalPersonnel.mockRejectedValue(new Error('DB error'));

        const result = await getDashboardData();

        expect(result.status).toBe(500);
        expect(result.body.error).toBe('DB error');
    });

    test('handles null singleVsGroup with fallback', async () => {
        repository.getTotalPersonnel.mockResolvedValue({ count: 0 });
        repository.getActivePersonnel.mockResolvedValue({ count: 0 });
        repository.getInactivePersonnel.mockResolvedValue({ count: 0 });
        repository.getTotalMissions.mockResolvedValue({ count: 0 });
        repository.getTotalUsers.mockResolvedValue({ count: 0 });
        repository.getRecentPersonnel.mockResolvedValue([]);
        repository.getRecentMissions.mockResolvedValue([]);
        repository.getPersonnelByType.mockResolvedValue([]);
        repository.getPersonnelByDegree.mockResolvedValue([]);
        repository.getMissionsByRegion.mockResolvedValue([]);
        repository.getMissionsByType.mockResolvedValue([]);
        repository.getSingleVsGroup.mockResolvedValue(null);
        repository.getSuppliedVsUnsupplied.mockResolvedValue({ supplied: 0, unsupplied: 0 });

        const result = await getDashboardData();

        expect(result.body.singleVsGroup).toEqual({ singleCount: 0, groupCount: 0 });
    });

    test('handles null suppliedVsUn with fallback', async () => {
        repository.getTotalPersonnel.mockResolvedValue({ count: 0 });
        repository.getActivePersonnel.mockResolvedValue({ count: 0 });
        repository.getInactivePersonnel.mockResolvedValue({ count: 0 });
        repository.getTotalMissions.mockResolvedValue({ count: 0 });
        repository.getTotalUsers.mockResolvedValue({ count: 0 });
        repository.getRecentPersonnel.mockResolvedValue([]);
        repository.getRecentMissions.mockResolvedValue([]);
        repository.getPersonnelByType.mockResolvedValue([]);
        repository.getPersonnelByDegree.mockResolvedValue([]);
        repository.getMissionsByRegion.mockResolvedValue([]);
        repository.getMissionsByType.mockResolvedValue([]);
        repository.getSingleVsGroup.mockResolvedValue({ singleCount: 0, groupCount: 0 });
        repository.getSuppliedVsUnsupplied.mockResolvedValue(null);

        const result = await getDashboardData();

        expect(result.body.suppliedVsUn).toEqual({ supplied: 0, unsupplied: 0 });
    });
});