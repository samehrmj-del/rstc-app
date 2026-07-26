const { dbRun } = require('../database/connection');

async function logAudit(userId, username, action, entity, entityId, detail, ip) {
    try {
        await dbRun(
            'INSERT INTO AuditLog (user_id, username, action, entity, entity_id, detail, ip) VALUES (?,?,?,?,?,?,?)',
            [userId, username, action, entity, entityId || null, detail || null, ip || null]
        );
    } catch (e) {
        console.error('Audit log error:', e.message);
    }
}

module.exports = {
    logAudit,
};
