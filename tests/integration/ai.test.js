const request = require('supertest');
const { app, initializeDatabase } = require('../setup/testServer');
const { loginAsAdmin } = require('../setup/login');
const { expectSuccess, expectUnauthorized } = require('../setup/assertions');

describe('AI API', () => {
    let adminToken;

    beforeAll(async () => {
        await initializeDatabase();
        adminToken = await loginAsAdmin(app);
    });

    it('POST /api/ai/ask requires auth', async () => {
        const res = await request(app).post('/api/ai/ask').send({ question: 'test' });
        expectUnauthorized(res);
    });

    it('POST /api/ai/ask rejects empty question', async () => {
        const res = await request(app).post('/api/ai/ask')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ question: '' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('سوال الزامی است.');
    });

    it('POST /api/ai/ask returns answer for valid question', async () => {
        const res = await request(app).post('/api/ai/ask')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ question: 'چند پرسنل داریم؟' });
        expectSuccess(res);
        expect(res.body.success).toBe(true);
        expect(typeof res.body.answer).toBe('string');
        expect(res.body.answer.length).toBeGreaterThan(0);
    });
});
