const express = require('express');
const {
    createMissionRecord,
    getAllMissionsRecords,
    updateMissionRecord,
    deleteMissionRecord,
} = require('./service');
const { createAuthenticateToken } = require('../../infrastructure/middleware/auth.middleware');
const { requirePermission } = require('../../infrastructure/security/permission.service');
const { dbGet } = require('../../infrastructure/database/connection');
const { auditMiddleware } = require('../../infrastructure/middleware/audit.middleware');
const { PERMISSIONS } = require('../../infrastructure/config/constants');
const authenticateToken = createAuthenticateToken(dbGet);

const router = express.Router();

router.post(
    '/',
    authenticateToken,
    requirePermission(PERMISSIONS.MISSIONS_CREATE),
    auditMiddleware('Mission'),
    async (req, res) => {
        const result = await createMissionRecord(req.body);
        res.status(result.status).json(result.body);
    }
);

router.get(
    '/',
    authenticateToken,
    requirePermission(PERMISSIONS.MISSIONS_VIEW),
    async (req, res) => {
        const result = await getAllMissionsRecords();
        res.status(result.status).json(result.body);
    }
);

router.put(
    '/:id',
    authenticateToken,
    requirePermission(PERMISSIONS.MISSIONS_EDIT),
    auditMiddleware('Mission'),
    async (req, res) => {
        const result = await updateMissionRecord(req.params.id, req.body);
        res.status(result.status).json(result.body);
    }
);

router.delete(
    '/:id',
    authenticateToken,
    requirePermission(PERMISSIONS.MISSIONS_DELETE),
    auditMiddleware('Mission'),
    async (req, res) => {
        const result = await deleteMissionRecord(req.params.id);
        res.status(result.status).json(result.body);
    }
);

router.get('/:id/pdf', (req, res) => {
    res.status(404).json({
        error: 'PDF export is now client-side only. Use jsPDF for PDF generation.',
    });
});

module.exports = router;
