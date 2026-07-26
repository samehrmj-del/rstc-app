const express = require('express');
const { searchMissionsService } = require('./service');
const { createAuthenticateToken } = require('../../infrastructure/middleware/auth.middleware');
const { dbGet } = require('../../infrastructure/database/connection');
const authenticateToken = createAuthenticateToken(dbGet);

const router = express.Router();

router.post('/missions', authenticateToken, async (req, res) => {
    const result = await searchMissionsService(req.body || {});
    res.status(result.status).json(result.body);
});

module.exports = router;
