const { logAudit } = require('../security/audit.service');

function auditMiddleware(entityName) {
    return function (req, res, next) {
        res.on('finish', () => {
            try {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const user = req.user || {};
                    const entityId =
                        (req.params && req.params.id) || (req.body && req.body.id) || null;

                    let action = 'UNKNOWN';
                    switch (req.method) {
                        case 'POST':
                            action = 'CREATE';
                            break;
                        case 'PUT':
                        case 'PATCH':
                            action = 'UPDATE';
                            break;
                        case 'DELETE':
                            action = 'DELETE';
                            break;
                        default:
                            action = req.method;
                    }

                    const detail = JSON.stringify({
                        path: req.originalUrl,
                        method: req.method,
                    });

                    logAudit(
                        user.id || null,
                        user.username || null,
                        action,
                        entityName,
                        entityId,
                        detail,
                        req.ip || null
                    ).catch((err) => console.error('Audit middleware error:', err.message));
                }
            } catch (err) {
                console.error('Audit middleware error:', err.message);
            }
        });
        next();
    };
}

module.exports = { auditMiddleware };
