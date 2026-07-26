const request = require('supertest');
const { app, initializeDatabase } = require('../setup/testServer');
const { loginAsAdmin } = require('../setup/login');
const { expectSuccess, expectUnauthorized } = require('../setup/assertions');
const { dbRun } = require('../../src/infrastructure/database/connection');

describe('Audit API', () => {
    let adminToken;

    beforeAll(async () => {
        await initializeDatabase();
        adminToken = await loginAsAdmin(app);
    });

    it('GET /api/audit requires auth', async () => {
        const res = await request(app).get('/api/audit');
        expectUnauthorized(res);
    });

    it('GET /api/audit returns results with default limit', async () => {
        const res = await request(app).get('/api/audit')
            .set('Authorization', `Bearer ${adminToken}`);
        expectSuccess(res);
        expect(Array.isArray(res.body.results)).toBe(true);
        expect(typeof res.body.total).toBe('number');
    });

    it('GET /api/audit filters by entity', async () => {
        await dbRun("INSERT INTO AuditLog (user_id, username, action, entity, entity_id, detail, ip) VALUES (?,?,?,?,?,?,?)",
            [1, 'admin', 'CREATE', 'Personnel', 1, '{}', '127.0.0.1']);
        const res = await request(app).get('/api/audit?entity=Personnel')
            .set('Authorization', `Bearer ${adminToken}`);
        expectSuccess(res);
        expect(Array.isArray(res.body.results)).toBe(true);
    });

    it('GET /api/audit filters by username', async () => {
        const res = await request(app).get('/api/audit?username=admin')
            .set('Authorization', `Bearer ${adminToken}`);
        expectSuccess(res);
        expect(Array.isArray(res.body.results)).toBe(true);
    });

    it('GET /api/audit respects limit', async () => {
        const res = await request(app).get('/api/audit?limit=5')
            .set('Authorization', `Bearer ${adminToken}`);
        expectSuccess(res);
        expect(res.body.results.length).toBeLessThanOrEqual(5);
    });
});
