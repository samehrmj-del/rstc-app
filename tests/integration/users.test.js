const request = require('supertest');
const { app, initializeDatabase } = require('../setup/testServer');
const { loginAsAdmin } = require('../setup/login');
const { expectSuccess, expectUnauthorized } = require('../setup/assertions');
const { dbGet, dbRun } = require('../../src/infrastructure/database/connection');

describe('Users API', () => {
    let adminToken;
    let testUserId;

    beforeAll(async () => {
        await initializeDatabase();
        adminToken = await loginAsAdmin(app);
    });

    afterAll(async () => {
        if (testUserId) {
            try {
 await dbRun("DELETE FROM Users WHERE id = ?", [testUserId]); 
} catch (e) {}
        }
    });

    it('GET /api/users should require auth', async () => {
        const res = await request(app).get('/api/users');
        expectUnauthorized(res);
    });

    it('GET /api/users with admin token', async () => {
        const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
        expectSuccess(res);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/users creates a new user', async () => {
        const res = await request(app).post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ username: 'testuser_integration', password: 'pass1234', role: 'user' });
        expectSuccess(res);
        const user = await dbGet("SELECT * FROM Users WHERE username = 'testuser_integration'");
        expect(user).toBeDefined();
        expect(user.username).toBe('testuser_integration');
        testUserId = user.id;
    });

    it('POST /api/users rejects duplicate username', async () => {
        const res = await request(app).post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ username: 'testuser_integration', password: 'pass1234', role: 'user' });
        expect(res.status).toBe(400);
        expect(res.body).toEqual(expect.objectContaining({ error: 'این نام کاربری قبلاً ثبت شده است!' }));
    });

    it('PUT /api/users/:id updates user', async () => {
        const res = await request(app).put(`/api/users/${testUserId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ username: 'testuser_updated', role: 'editor', status: 'active' });
        expectSuccess(res);
        const user = await dbGet("SELECT * FROM Users WHERE id = ?", [testUserId]);
        expect(user.username).toBe('testuser_updated');
    });

    it('PUT /api/users/:id/password changes password', async () => {
        const res = await request(app).put(`/api/users/${testUserId}/password`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ password: 'newpass1234' });
        expectSuccess(res);
    });

    it('DELETE /api/users/:id deletes user', async () => {
        const res = await request(app).delete(`/api/users/${testUserId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expectSuccess(res);
        const user = await dbGet("SELECT * FROM Users WHERE id = ?", [testUserId]);
        expect(user).toBeUndefined();
        testUserId = null;
    });

    it('PUT /api/users/self/self-password changes own password', async () => {
        const res = await request(app).put('/api/users/self/self-password')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ currentPassword: 'test-admin-password', newPassword: 'newadminpass' });
        expectSuccess(res);
    });

    it('protects admin user from role change', async () => {
        const res = await request(app).put('/api/users/1')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ role: 'user', status: 'active' });
        expect(res.status).toBe(400);
        expect(res.body).toEqual(expect.objectContaining({ error: 'نقش کاربر اصلی قابل تغییر نیست!' }));
    });

    it('protects admin user from deletion', async () => {
        const res = await request(app).delete('/api/users/1')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(400);
        expect(res.body).toEqual(expect.objectContaining({ error: 'کاربر اصلی قابل حذف نیست!' }));
    });
});
