const { dbGet, dbAll } = require('../../infrastructure/database/connection');

function buildConditions(filters) {
    const conditions = [];
    const params = [];
    if (filters.name) {
        conditions.push('name LIKE ?');
        params.push(`%${filters.name}%`);
    }

    if (filters.lname) {
        conditions.push('lname LIKE ?');
        params.push(`%${filters.lname}%`);
    }

    if (filters.emp_num) {
        conditions.push('emp_num LIKE ?');
        params.push(`%${filters.emp_num}%`);
    }

    if (filters.decree_num) {
        conditions.push('decree_num LIKE ?');
        params.push(`%${filters.decree_num}%`);
    }

    if (filters.device_type) {
        conditions.push('device_type LIKE ?');
        params.push(`%${filters.device_type}%`);
    }

    if (filters.device_serial) {
        conditions.push('device_serial LIKE ?');
        params.push(`%${filters.device_serial}%`);
    }

    if (filters.region) {
        conditions.push('region = ?');
        params.push(filters.region);
    }

    if (filters.mission_type) {
        conditions.push('mission_type LIKE ?');
        params.push(`%${filters.mission_type}%`);
    }

    if (filters.location) {
        conditions.push('location LIKE ?');
        params.push(`%${filters.location}%`);
    }

    if (filters.start_date_from) {
        conditions.push('start_date >= ?');
        params.push(filters.start_date_from);
    }

    if (filters.start_date_to) {
        conditions.push('start_date <= ?');
        params.push(filters.start_date_to);
    }

    if (filters.end_date_from) {
        conditions.push('end_date >= ?');
        params.push(filters.end_date_from);
    }

    if (filters.end_date_to) {
        conditions.push('end_date <= ?');
        params.push(filters.end_date_to);
    }

    if (filters.issue_date_from) {
        conditions.push('issue_date >= ?');
        params.push(filters.issue_date_from);
    }

    if (filters.issue_date_to) {
        conditions.push('issue_date <= ?');
        params.push(filters.issue_date_to);
    }

    return { conditions, params };
}

async function searchReports(filters) {
    const { conditions, params } = buildConditions(filters);
    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
    const rows = await dbAll(`SELECT * FROM Missions${where} ORDER BY id DESC`, params);
    const total = await dbGet(`SELECT COUNT(*) as count FROM Missions${where}`, params);

    return { rows, total };
}

module.exports = { buildConditions, searchReports };
