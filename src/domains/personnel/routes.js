const express = require('express');
const {
    createPersonnelRecord,
    updatePersonnelRecord,
    deletePersonnelRecord,
    bulkImportPersonnel,
} = require('./service');
const { createAuthenticateToken } = require('../../infrastructure/middleware/auth.middleware');
const { dbGet } = require('../../infrastructure/database/connection');
const { requirePermission } = require('../../infrastructure/security/permission.service');
const { auditMiddleware } = require('../../infrastructure/middleware/audit.middleware');
const { PERMISSIONS } = require('../../infrastructure/config/constants');
const authenticateToken = createAuthenticateToken(dbGet);
const { findAllPersonnel } = require('./repository');

const router = express.Router();

router.post(
    '/',
    authenticateToken,
    requirePermission(PERMISSIONS.PERSONNEL_CREATE),
    auditMiddleware('Personnel'),
    async (req, res) => {
        const result = await createPersonnelRecord(req.body);
        res.status(result.status).json(result.body);
    }
);

router.get(
    '/',
    authenticateToken,
    requirePermission(PERMISSIONS.PERSONNEL_VIEW),
    async (req, res) => {
        try {
            const personnel = await findAllPersonnel();
            res.json(personnel);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
);

router.put(
    '/:id',
    authenticateToken,
    requirePermission(PERMISSIONS.PERSONNEL_EDIT),
    auditMiddleware('Personnel'),
    async (req, res) => {
        const result = await updatePersonnelRecord(req.params.id, req.body);
        res.status(result.status).json(result.body);
    }
);

router.delete(
    '/:id',
    authenticateToken,
    requirePermission(PERMISSIONS.PERSONNEL_DELETE),
    auditMiddleware('Personnel'),
    async (req, res) => {
        const result = await deletePersonnelRecord(req.params.id);
        res.status(result.status).json(result.body);
    }
);

router.post('/bulk', authenticateToken, async (req, res) => {
    const result = await bulkImportPersonnel(req.body);
    res.status(result.status).json(result.body);
});

module.exports = router;
