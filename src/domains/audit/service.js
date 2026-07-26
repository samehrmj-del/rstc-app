const { searchAuditLog } = require('./repository');

async function auditSearch(filters) {
    try {
        const conditions = [];
        const params = [];
        if (filters.entity) {
            conditions.push('entity = ?');
            params.push(filters.entity);
        }

        if (filters.username) {
            conditions.push('username LIKE ?');
            params.push(`%${filters.username}%`);
        }

        const limit = parseInt(filters.limit) || 100;
        const { rows, total } = await searchAuditLog(conditions, params, limit);

        return { status: 200, body: { results: rows, total: total.count } };
    } catch (e) {
        return { status: 500, body: { error: e.message } };
    }
}

module.exports = {
    auditSearch,
};
