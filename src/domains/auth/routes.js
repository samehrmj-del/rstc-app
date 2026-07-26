const express = require('express');
const { login } = require('./service');
const {
    rateLimitLogin,
    loginAttempts,
} = require('../../infrastructure/middleware/security.middleware');

const router = express.Router();

router.post('/', rateLimitLogin, async (req, res) => {
    try {
        const result = await login(
            req.body.username,
            req.body.password,
            req.ip || req.connection.remoteAddress,
            loginAttempts
        );
        res.status(result.status).json(result.body);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
