const express = require('express');
const {
    createUserRecord,
    updateUserRecord,
    updateUserPasswordRecord,
    updateSelfPassword,
    deleteUserRecord,
} = require('./service');
const { findAllUsers } = require('./repository');
const { createAuthenticateToken } = require('../../infrastructure/middleware/auth.middleware');
const { requirePermission } = require('../../infrastructure/security/permission.service');
const { dbGet } = require('../../infrastructure/database/connection');
const { auditMiddleware } = require('../../infrastructure/middleware/audit.middleware');
const { PERMISSIONS } = require('../../infrastructure/config/constants');
const authenticateToken = createAuthenticateToken(dbGet);

const router = express.Router();

router.put('/self/self-password', authenticateToken, async (req, res) => {
    const result = await updateSelfPassword(
        req.user.id,
        req.body.currentPassword,
        req.body.newPassword
    );
    res.status(result.status).json(result.body);
});

router.get('/', authenticateToken, requirePermission(PERMISSIONS.USERS_VIEW), async (req, res) => {
    try {
        const users = await findAllUsers();
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post(
    '/',
    authenticateToken,
    requirePermission(PERMISSIONS.USERS_CREATE),
    auditMiddleware('User'),
    async (req, res) => {
        const result = await createUserRecord(req.body);
        res.status(result.status).json(result.body);
    }
);

router.put(
    '/:id',
    authenticateToken,
    requirePermission(PERMISSIONS.USERS_EDIT),
    auditMiddleware('User'),
    async (req, res) => {
        const result = await updateUserRecord(req.params.id, req.body);
        res.status(result.status).json(result.body);
    }
);

router.put(
    '/:id/password',
    authenticateToken,
    requirePermission(PERMISSIONS.USERS_EDIT),
    async (req, res) => {
        const result = await updateUserPasswordRecord(req.params.id, req.body.password);
        res.status(result.status).json(result.body);
    }
);

router.delete(
    '/:id',
    authenticateToken,
    requirePermission(PERMISSIONS.USERS_DELETE),
    auditMiddleware('User'),
    async (req, res) => {
        const result = await deleteUserRecord(req.params.id);
        res.status(result.status).json(result.body);
    }
);

module.exports = router;
