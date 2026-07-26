const express = require('express');
const { auditSearch } = require('./service');
const { createAuthenticateToken } = require('../../infrastructure/middleware/auth.middleware');
const { dbGet } = require('../../infrastructure/database/connection');
const { requirePermission } = require('../../infrastructure/security/permission.service');
const { PERMISSIONS } = require('../../infrastructure/config/constants');
const authenticateToken = createAuthenticateToken(dbGet);

const router = express.Router();

router.get('/', authenticateToken, requirePermission(PERMISSIONS.AUDIT_VIEW), async (req, res) => {
    const result = await auditSearch(req.query || {});
    res.status(result.status).json(result.body);
});

module.exports = router;
