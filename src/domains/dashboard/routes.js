const express = require('express');
const { getDashboardData } = require('./service');
const { createAuthenticateToken } = require('../../infrastructure/middleware/auth.middleware');
const { dbGet } = require('../../infrastructure/database/connection');
const authenticateToken = createAuthenticateToken(dbGet);

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
    const result = await getDashboardData();
    res.status(result.status).json(result.body);
});

module.exports = router;
