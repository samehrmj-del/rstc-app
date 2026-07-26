const request = require('supertest');
const { app, initializeDatabase } = require('../setup/testServer');
const { loginAsAdmin } = require('../setup/login');
const { expectSuccess, expectUnauthorized } = require('../setup/assertions');

describe('Dashboard API', () => {
    let adminToken;

    beforeAll(async () => {
        await initializeDatabase();
        adminToken = await loginAsAdmin(app);
    });

    it('GET /api/dashboard requires auth', async () => {
        const res = await request(app).get('/api/dashboard');
        expectUnauthorized(res);
    });

    it('GET /api/dashboard returns statistics', async () => {
        const res = await request(app).get('/api/dashboard')
            .set('Authorization', `Bearer ${adminToken}`);
        expectSuccess(res);
        expect(typeof res.body.total).toBe('number');
        expect(typeof res.body.active).toBe('number');
        expect(typeof res.body.inactive).toBe('number');
        expect(typeof res.body.missionCount).toBe('number');
        expect(typeof res.body.userCount).toBe('number');
        expect(Array.isArray(res.body.byType)).toBe(true);
        expect(Array.isArray(res.body.byDegree)).toBe(true);
        expect(Array.isArray(res.body.byRegion)).toBe(true);
        expect(Array.isArray(res.body.byMissionType)).toBe(true);
        expect(typeof res.body.singleVsGroup).toBe('object');
        expect(typeof res.body.suppliedVsUn).toBe('object');
        expect(Array.isArray(res.body.recentPersonnel)).toBe(true);
        expect(Array.isArray(res.body.recentMissions)).toBe(true);
    });

    it('GET /api/dashboard singleVsGroup has fallback', async () => {
        const res = await request(app).get('/api/dashboard')
            .set('Authorization', `Bearer ${adminToken}`);
        expectSuccess(res);
        expect(res.body.singleVsGroup.singleCount).toBeDefined();
        expect(res.body.singleVsGroup.groupCount).toBeDefined();
    });
});
