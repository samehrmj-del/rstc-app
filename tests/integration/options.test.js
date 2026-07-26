const request = require('supertest');
const { app, initializeDatabase } = require('../setup/testServer');
const { loginAsAdmin } = require('../setup/login');
const { expectSuccess, expectUnauthorized } = require('../setup/assertions');
const { dbRun } = require('../../src/infrastructure/database/connection');

describe('Options API', () => {
    let adminToken;
    const testField = 'test_field';
    let originalOptions = [];

    beforeAll(async () => {
        await initializeDatabase();
        adminToken = await loginAsAdmin(app);
    });

    afterAll(async () => {
        if (originalOptions.length) {
            try {
 await dbRun("DELETE FROM SystemOptions WHERE field = ?", [testField]); 
} catch (e) {}
        }
    });

    it('GET /api/options requires auth', async () => {
        const res = await request(app).get('/api/options');
        expectUnauthorized(res);
    });

    it('GET /api/options returns all options', async () => {
        const res = await request(app).get('/api/options')
            .set('Authorization', `Bearer ${adminToken}`);
        expectSuccess(res);
        expect(typeof res.body).toBe('object');
    });

    it('POST /api/options/:field creates option value', async () => {
        const res = await request(app).post(`/api/options/${testField}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ label: 'Test Field', value: 'opt1' });
        expectSuccess(res);
        expect(res.body.success).toBe(true);
        expect(res.body.options).toContain('opt1');
        originalOptions = res.body.options;
    });

    it('POST /api/options/:field rejects empty value', async () => {
        const res = await request(app).post(`/api/options/${testField}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ label: 'Test', value: '' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('مقدار گزینه الزامی است');
    });

    it('PUT /api/options/:field updates option value', async () => {
        const res = await request(app).put(`/api/options/${testField}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ oldValue: 'opt1', newValue: 'opt2', label: 'Test Field' });
        expectSuccess(res);
        expect(res.body.options).toContain('opt2');
    });

    it('PUT /api/options/:field rejects empty newValue', async () => {
        const res = await request(app).put(`/api/options/${testField}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ oldValue: 'opt2', newValue: '' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('مقدار جدید الزامی است');
    });

    it('DELETE /api/options/:field/:index removes value', async () => {
        const res = await request(app).delete(`/api/options/${testField}/0`)
            .set('Authorization', `Bearer ${adminToken}`);
        expectSuccess(res);
        expect(res.body.options).not.toContain('opt2');
    });

    it('DELETE /api/options/:field/:index rejects invalid index', async () => {
        const res = await request(app).delete(`/api/options/${testField}/999`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('ایندکس نامعتبر');
    });
});
