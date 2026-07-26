const express = require('express');
const {
    getAllOptions,
    getOptionByField,
    createOptionValue,
    updateOptionValue,
    deleteOptionValue,
} = require('./service');
const { createAuthenticateToken } = require('../../infrastructure/middleware/auth.middleware');
const { dbGet } = require('../../infrastructure/database/connection');
const { auditMiddleware } = require('../../infrastructure/middleware/audit.middleware');
const { requirePermission } = require('../../infrastructure/security/permission.service');
const { PERMISSIONS } = require('../../infrastructure/config/constants');
const authenticateToken = createAuthenticateToken(dbGet);

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
    const result = await getAllOptions();
    res.status(result.status).json(result.body);
});

router.get('/:field', authenticateToken, async (req, res) => {
    const result = await getOptionByField(req.params.field);
    res.status(result.status).json(result.body);
});

router.post(
    '/:field',
    authenticateToken,
    auditMiddleware('Option'),
    requirePermission(PERMISSIONS.OPTIONS_EDIT),
    async (req, res) => {
        const { label, value } = req.body;
        const result = await createOptionValue(req.params.field, label, value);
        res.status(result.status).json(result.body);
    }
);

router.put(
    '/:field',
    authenticateToken,
    auditMiddleware('Option'),
    requirePermission(PERMISSIONS.OPTIONS_EDIT),
    async (req, res) => {
        const { oldValue, newValue, label } = req.body;
        const result = await updateOptionValue(req.params.field, oldValue, newValue, label);
        res.status(result.status).json(result.body);
    }
);

router.delete(
    '/:field/:index',
    authenticateToken,
    auditMiddleware('Option'),
    requirePermission(PERMISSIONS.OPTIONS_EDIT),
    async (req, res) => {
        const result = await deleteOptionValue(req.params.field, req.params.index);
        res.status(result.status).json(result.body);
    }
);

module.exports = router;
