const { ROLE_PERMISSIONS } = require('../config/constants');

function getDefaultPermissions(role) {
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer;
}

function hasPermission(user, permission) {
    if (!user || !user.permissions) {
        return false;
    }

    if (user.role === 'admin') {
        return true;
    }

    return user.permissions.includes(permission);
}

function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'احراز هویت الزامی است' });
        }

        if (hasPermission(req.user, permission)) {
            return next();
        }

        return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    };
}

function getPermissionsForModule(user, module) {
    if (!user || !user.permissions) {
        return [];
    }

    const prefix = `${module}:`;

    return user.permissions.filter((p) => p.startsWith(prefix));
}

function serializePermissions(permsArray) {
    return JSON.stringify(permsArray || []);
}

function deserializePermissions(str) {
    try {
        const arr = JSON.parse(str || '[]');

        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

module.exports = {
    getDefaultPermissions,
    hasPermission,
    requirePermission,
    getPermissionsForModule,
    serializePermissions,
    deserializePermissions,
};
