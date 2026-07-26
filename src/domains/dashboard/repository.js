const { dbGet, dbAll } = require('../../infrastructure/database/connection');

async function getTotalPersonnel() {
    return dbGet('SELECT COUNT(*) as count FROM Personnel');
}

async function getActivePersonnel() {
    return dbGet("SELECT COUNT(*) as count FROM Personnel WHERE status='فعال'");
}

async function getInactivePersonnel() {
    return dbGet("SELECT COUNT(*) as count FROM Personnel WHERE status='غیرفعال'");
}

async function getTotalMissions() {
    return dbGet('SELECT COUNT(*) as count FROM Missions');
}

async function getTotalUsers() {
    return dbGet('SELECT COUNT(*) as count FROM Users');
}

async function getRecentPersonnel(limit = 6) {
    return dbAll(
        'SELECT id, name, lname, national_id, emp_num, job_title, status FROM Personnel ORDER BY id DESC LIMIT ?',
        [limit]
    );
}

async function getRecentMissions(limit = 6) {
    return dbAll(
        'SELECT id, decree_num, name, lname, mission_type, location, start_date, end_date FROM Missions ORDER BY id DESC LIMIT ?',
        [limit]
    );
}

async function getPersonnelByType() {
    return dbAll(
        "SELECT emp_type, COUNT(*) as count FROM Personnel WHERE emp_type != '' GROUP BY emp_type ORDER BY count DESC"
    );
}

async function getPersonnelByDegree() {
    return dbAll(
        "SELECT last_degree, COUNT(*) as count FROM Personnel WHERE last_degree != '' GROUP BY last_degree ORDER BY count DESC"
    );
}

async function getMissionsByRegion(limit = 10) {
    return dbAll(
        "SELECT region, COUNT(*) as count FROM Missions WHERE region != '' GROUP BY region ORDER BY count DESC LIMIT ?",
        [limit]
    );
}

async function getMissionsByType() {
    return dbAll(
        "SELECT mission_type, COUNT(*) as count FROM Missions WHERE mission_type != '' GROUP BY mission_type ORDER BY count DESC"
    );
}

async function getSingleVsGroup() {
    return dbGet('SELECT SUM(is_single) as singleCount, SUM(is_group) as groupCount FROM Missions');
}

async function getSuppliedVsUnsupplied() {
    return dbGet(
        'SELECT SUM(is_supplied) as supplied, SUM(is_unsupplied) as unsupplied FROM Missions'
    );
}

module.exports = {
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
};
