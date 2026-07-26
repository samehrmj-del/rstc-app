const { dbGet, dbAll, dbRun } = require('../../infrastructure/database/connection');
const { MISSION_FIELDS } = require('./constants');

async function createMission(values) {
    return dbRun(
        `INSERT INTO Missions (${MISSION_FIELDS.join(',')}) VALUES (${MISSION_FIELDS.map(() => '?').join(',')})`,
        values
    );
}

async function getAllMissions() {
    return dbAll('SELECT * FROM Missions ORDER BY id DESC');
}

async function getMissionById(id) {
    return dbGet('SELECT * FROM Missions WHERE id = ?', [id]);
}

async function updateMission(id, fields, values) {
    const setClause = fields.map((f) => `${f}=?`).join(',');

    return dbRun(`UPDATE Missions SET ${setClause} WHERE id=?`, [...values, id]);
}

async function deleteMission(id) {
    return dbRun('DELETE FROM Missions WHERE id = ?', [id]);
}

async function getLastDecreeNumber(prefix) {
    const last = await dbGet(
        'SELECT decree_num FROM Missions WHERE decree_num LIKE ? ORDER BY id DESC LIMIT 1',
        [`${prefix}%`]
    );

    return last ? last.decree_num : null;
}

module.exports = {
    createMission,
    getAllMissions,
    getMissionById,
    updateMission,
    deleteMission,
    getLastDecreeNumber,
};
