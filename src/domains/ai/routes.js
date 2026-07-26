const express = require('express');
const { askQuestion } = require('./service');
const { createAuthenticateToken } = require('../../infrastructure/middleware/auth.middleware');
const { dbGet } = require('../../infrastructure/database/connection');
const authenticateToken = createAuthenticateToken(dbGet);

const router = express.Router();

router.post('/ask', authenticateToken, async (req, res) => {
    try {
        const { question } = req.body || {};
        if (!question || !question.trim()) {
            return res.status(400).json({ error: 'سوال الزامی است.' });
        }

        const result = await askQuestion(question.trim());
        res.status(result.status).json(result.body);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
