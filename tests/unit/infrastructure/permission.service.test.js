const permissionService = require('../../../src/infrastructure/security/permission.service');
const { ROLE_PERMISSIONS } = require('../../../src/infrastructure/config/constants');

jest.mock('../../../src/infrastructure/config/constants', () => ({
    ROLE_PERMISSIONS: {
        admin: ['dashboard:view', 'personnel:create', 'missions:delete', 'users:edit'],
        viewer: ['dashboard:view', 'missions:view']
    }
}));

describe('getDefaultPermissions', () => {
    it('returns admin permissions for admin role', () => {
        const perms = permissionService.getDefaultPermissions('admin');
        expect(perms).toEqual(ROLE_PERMISSIONS.admin);
    });

    it('returns viewer permissions for viewer role', () => {
        const perms = permissionService.getDefaultPermissions('viewer');
        expect(perms).toEqual(ROLE_PERMISSIONS.viewer);
    });

    it('falls back to viewer permissions for unknown role', () => {
        const perms = permissionService.getDefaultPermissions('unknown');
        expect(perms).toEqual(ROLE_PERMISSIONS.viewer);
    });

    it('falls back to viewer permissions when role is undefined', () => {
        const perms = permissionService.getDefaultPermissions(undefined);
        expect(perms).toEqual(ROLE_PERMISSIONS.viewer);
    });

    it('falls back to viewer permissions when role is null', () => {
        const perms = permissionService.getDefaultPermissions(null);
        expect(perms).toEqual(ROLE_PERMISSIONS.viewer);
    });
});

describe('hasPermission', () => {
    it('returns true for admin regardless of permission', () => {
        const user = { role: 'admin', permissions: [] };
        expect(permissionService.hasPermission(user, 'any:permission')).toBe(true);
    });

    it('returns true when user has the permission', () => {
        const user = { permissions: ['dashboard:view', 'personnel:create'] };
        expect(permissionService.hasPermission(user, 'dashboard:view')).toBe(true);
    });

    it('returns false when user lacks the permission', () => {
        const user = { permissions: ['dashboard:view'] };
        expect(permissionService.hasPermission(user, 'missions:delete')).toBe(false);
    });

    it('returns false for null user', () => {
        expect(permissionService.hasPermission(null, 'dashboard:view')).toBe(false);
    });

    it('returns false for undefined user', () => {
        expect(permissionService.hasPermission(undefined, 'dashboard:view')).toBe(false);
    });

    it('returns false for user without permissions property', () => {
        const user = { role: 'editor' };
        expect(permissionService.hasPermission(user, 'dashboard:view')).toBe(false);
    });

    it('returns false when permissions is a string (not array)', () => {
        const user = { permissions: 'dashboard:view' };
        expect(permissionService.hasPermission(user, 'missions:delete')).toBe(false);
    });
});

describe('requirePermission', () => {
    it('returns 401 when req.user is missing', () => {
        const middleware = permissionService.requirePermission('dashboard:view');
        const req = {};
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'احراز هویت الزامی است' });
        expect(next).not.toHaveBeenCalled();
    });

    it('calls next when user has the permission', () => {
        const middleware = permissionService.requirePermission('dashboard:view');
        const req = { user: { permissions: ['dashboard:view'] } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 403 when user lacks the permission', () => {
        const middleware = permissionService.requirePermission('missions:delete');
        const req = { user: { permissions: ['dashboard:view'] } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'دسترسی غیرمجاز' });
        expect(next).not.toHaveBeenCalled();
    });

    it('calls next for admin user (bypass)', () => {
        const middleware = permissionService.requirePermission('missions:delete');
        const req = { user: { role: 'admin', permissions: [] } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        const next = jest.fn();

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});

describe('getPermissionsForModule', () => {
    it('returns permissions for a given module', () => {
        const perms = permissionService.getPermissionsForModule('users');
        expect(Array.isArray(perms)).toBe(true);
    });

    it('returns empty array for unknown module', () => {
        const perms = permissionService.getPermissionsForModule('unknown_module');
        expect(perms).toEqual([]);
    });
});

describe('serializePermissions', () => {
    it('stringifies a permissions array', () => {
        const perms = ['dashboard:view', 'personnel:create'];
        expect(permissionService.serializePermissions(perms)).toBe(JSON.stringify(perms));
    });

    it('returns empty array JSON for null input', () => {
        expect(permissionService.serializePermissions(null)).toBe('[]');
    });

    it('returns empty array JSON for undefined input', () => {
        expect(permissionService.serializePermissions(undefined)).toBe('[]');
    });
});

describe('deserializePermissions', () => {
    it('parses valid JSON array string', () => {
        const result = permissionService.deserializePermissions('["dashboard:view"]');
        expect(result).toEqual(['dashboard:view']);
    });

    it('returns empty array for invalid JSON', () => {
        expect(permissionService.deserializePermissions('not json')).toEqual([]);
    });

    it('returns empty array for null input', () => {
        expect(permissionService.deserializePermissions(null)).toEqual([]);
    });

    it('returns empty array for undefined input', () => {
        expect(permissionService.deserializePermissions(undefined)).toEqual([]);
    });

    it('returns empty array for non-array JSON', () => {
        expect(permissionService.deserializePermissions('{"key": "value"}')).toEqual([]);
    });

    it('returns empty array for empty string', () => {
        expect(permissionService.deserializePermissions('')).toEqual([]);
    });
});