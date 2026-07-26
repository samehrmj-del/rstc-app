const request = require('supertest');
const { app, initializeDatabase } = require('../setup/testServer');
const { loginAsAdmin } = require('../setup/login');
const { expectSuccess } = require('../setup/assertions');

describe('Reports API', () => {
    let adminToken;

    beforeAll(async () => {
        await initializeDatabase();
        adminToken = await loginAsAdmin(app);
    });

    it('POST /api/reports/missions requires auth', async () => {
        const res = await request(app).post('/api/reports/missions').send({});
        expect(res.status).toBe(401);
    });

    it('POST /api/reports/missions returns empty results with no filters', async () => {
        const res = await request(app).post('/api/reports/missions')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        expectSuccess(res);
        expect(res.body.results).toEqual([]);
        expect(typeof res.body.total).toBe('number');
    });

    it('POST /api/reports/missions filters by name', async () => {
        const res = await request(app).post('/api/reports/missions')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'zzzzznonexistent' });
        expectSuccess(res);
        expect(res.body.results).toEqual([]);
    });

    it('POST /api/reports/missions filters by date range', async () => {
        const res = await request(app).post('/api/reports/missions')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ start_date_from: '2020-01-01', end_date_to: '2099-12-30' });
        expectSuccess(res);
        expect(Array.isArray(res.body.results)).toBe(true);
    });

    it('POST /api/reports/missions filters by region', async () => {
        const res = await request(app).post('/api/reports/missions')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ region: 'North' });
        expectSuccess(res);
        expect(Array.isArray(res.body.results)).toBe(true);
    });

    it('POST /api/reports/missions filters by mission_type', async () => {
        const res = await request(app).post('/api/reports/missions')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ mission_type: 'Internal' });
        expectSuccess(res);
        expect(Array.isArray(res.body.results)).toBe(true);
    });
});
