const request = require('supertest');
const { app, initializeDatabase } = require('../setup/testServer');
const { loginAsAdmin } = require('../setup/login');
const { expectSuccess, expectUnauthorized } = require('../setup/assertions');
const { dbGet, dbRun } = require('../../src/infrastructure/database/connection');
const { validMission, updatePayload } = require('../fixtures/mission.fixture');

describe('Missions API', () => {
    let adminToken;
    let testId;

    beforeAll(async () => {
        await initializeDatabase();
        adminToken = await loginAsAdmin(app);
    });

    afterAll(async () => {
        if (testId) {
            try {
 await dbRun("DELETE FROM Missions WHERE id = ?", [testId]); 
} catch (e) {}
        }
    });

    it('GET /api/missions requires auth', async () => {
        const res = await request(app).get('/api/missions');
        expectUnauthorized(res);
    });

    it('POST /api/missions creates mission with decree_num', async () => {
        const res = await request(app).post('/api/missions')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(validMission);
        expectSuccess(res);
        expect(res.body.success).toBe(true);
        expect(res.body.decree_num).toBeDefined();
        expect(res.body.decree_num).toMatch(/^RSTC-\d{8}-\d{4}$/);
        testId = (await dbGet("SELECT id FROM Missions WHERE decree_num = ?", [res.body.decree_num])).id;
    });

    it('POST /api/missions rejects missing fields', async () => {
        const res = await request(app).post('/api/missions')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Test' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('فیلدهای الزامی: نام و تاریخ‌ها');
    });

    it('GET /api/missions returns list', async () => {
        const res = await request(app).get('/api/missions')
            .set('Authorization', `Bearer ${adminToken}`);
        expectSuccess(res);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('PUT /api/missions/:id updates mission', async () => {
        const res = await request(app).put(`/api/missions/${testId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(updatePayload);
        expectSuccess(res);
    });

    it('DELETE /api/missions/:id deletes mission', async () => {
        const res = await request(app).delete(`/api/missions/${testId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expectSuccess(res);
        const row = await dbGet("SELECT * FROM Missions WHERE id = ?", [testId]);
        expect(row).toBeUndefined();
        testId = null;
    });

    it('GET /api/missions/:id/pdf returns 404', async () => {
        const res = await request(app).get('/api/missions/999999/pdf');
        expect(res.status).toBe(404);
        expect(res.body.error).toContain('PDF export is now client-side only');
    });
});
