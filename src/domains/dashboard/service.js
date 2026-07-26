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
    getSuppliedVsUnsupplied,
} = require('./repository');

async function getDashboardData() {
    try {
        const [total, active, inactive, missionCount, userCount, recentPersonnel, recentMissions] =
            await Promise.all([
                getTotalPersonnel(),
                getActivePersonnel(),
                getInactivePersonnel(),
                getTotalMissions(),
                getTotalUsers(),
                getRecentPersonnel(),
                getRecentMissions(),
            ]);
        const [byType, byDegree, byRegion, byMissionType, singleVsGroup, suppliedVsUn] =
            await Promise.all([
                getPersonnelByType(),
                getPersonnelByDegree(),
                getMissionsByRegion(),
                getMissionsByType(),
                getSingleVsGroup(),
                getSuppliedVsUnsupplied(),
            ]);

        return {
            status: 200,
            body: {
                total: total.count,
                active: active.count,
                inactive: inactive.count,
                missionCount: missionCount.count,
                userCount: userCount.count,
                byType,
                byDegree,
                byRegion,
                byMissionType,
                singleVsGroup: singleVsGroup || { singleCount: 0, groupCount: 0 },
                suppliedVsUn: suppliedVsUn || { supplied: 0, unsupplied: 0 },
                recentPersonnel,
                recentMissions,
            },
        };
    } catch (e) {
        return { status: 500, body: { error: e.message } };
    }
}

module.exports = { getDashboardData };
