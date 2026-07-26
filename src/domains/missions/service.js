const { MISSION_FIELDS } = require('./constants');
const {
    createMission,
    getAllMissions,
    updateMission,
    deleteMission,
    getLastDecreeNumber,
} = require('./repository');
const { toJalaali } = require('../../infrastructure/utils/date');

async function createMissionRecord(body) {
    const { name, start_date, end_date, issue_date } = body;
    if (!name || !start_date || !end_date || !issue_date) {
        return { status: 400, body: { error: 'فیلدهای الزامی: نام و تاریخ‌ها' } };
    }

    const decree_num = await generateDecreeNum();
    const missionBody = { ...body, decree_num };
    const values = MISSION_FIELDS.map((f) =>
        missionBody[f] === undefined ? null : missionBody[f]
    );
    try {
        await createMission(values);

        return { status: 200, body: { success: true, decree_num } };
    } catch (e) {
        if (e.message.includes('UNIQUE')) {
            return { status: 400, body: { error: 'خطا در شماره حکم!' } };
        }

        return { status: 500, body: { error: e.message } };
    }
}

async function getAllMissionsRecords() {
    try {
        const missions = await getAllMissions();

        return { status: 200, body: missions };
    } catch (e) {
        return { status: 500, body: { error: e.message } };
    }
}

async function updateMissionRecord(id, body) {
    const { name, start_date, end_date, issue_date } = body;
    if (!name || !start_date || !end_date || !issue_date) {
        return { status: 400, body: { error: 'فیلدهای الزامی: نام و تاریخ‌ها' } };
    }

    const UPDATE_FIELDS = MISSION_FIELDS.filter((f) => f !== 'decree_num');
    const values = UPDATE_FIELDS.map((f) => (body[f] === undefined ? null : body[f]));
    try {
        await updateMission(id, UPDATE_FIELDS, values);

        return { status: 200, body: { success: true } };
    } catch (e) {
        if (e.message.includes('UNIQUE')) {
            return { status: 400, body: { error: 'این شماره حکم قبلاً ثبت شده است!' } };
        }

        return { status: 500, body: { error: e.message } };
    }
}

async function deleteMissionRecord(id) {
    try {
        await deleteMission(id);

        return { status: 200, body: { success: true } };
    } catch (e) {
        return { status: 500, body: { error: e.message } };
    }
}

async function generateDecreeNum() {
    const now = new Date();
    const j = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const datePart = `${j.jy}${String(j.jm).padStart(2, '0')}${String(j.jd).padStart(2, '0')}`;
    const prefix = `RSTC-${datePart}-`;
    const last = await getLastDecreeNumber(prefix);
    let seq = 1;
    if (last && last.decree_num) {
        const parts = last.decree_num.split('-');
        seq = parseInt(parts[2] || '0') + 1;
    }

    return prefix + String(seq).padStart(4, '0');
}

module.exports = {
    createMissionRecord,
    getAllMissionsRecords,
    updateMissionRecord,
    deleteMissionRecord,
    generateDecreeNum,
};
