const { dbGet, dbAll } = require('../../infrastructure/database/connection');

async function searchAuditLog(conditions, params, limit) {
    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
    const rows = await dbAll(`SELECT * FROM AuditLog${where} ORDER BY id DESC LIMIT ?`, [
        ...params,
        limit,
    ]);
    const total = await dbGet(`SELECT COUNT(*) as count FROM AuditLog${where}`, params);

    return { rows, total };
}

module.exports = {
    searchAuditLog,
};
