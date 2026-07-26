const request = require('supertest');
const { app, initializeDatabase } = require('../setup/testServer');
const { expectSuccess } = require('../setup/assertions');
const { dbRun } = require('../../src/infrastructure/database/connection');

describe('POST /api/login', () => {
    beforeAll(async () => {
        await initializeDatabase();
        const { loginAttempts } = require('../../src/infrastructure/middleware/security.middleware');
        loginAttempts.clear();
    });

    it('missing username', async () => {
        const res = await request(app).post('/api/login').send({ password: 'x' });
        expect(res.status).toBe(400);
        expect(res.body).toEqual(expect.objectContaining({ success: false, message: 'نام کاربری و رمز عبور الزامی است.' }));
    });

    it('missing password', async () => {
        const res = await request(app).post('/api/login').send({ username: 'x' });
        expect(res.status).toBe(400);
        expect(res.body).toEqual(expect.objectContaining({ success: false, message: 'نام کاربری و رمز عبور الزامی است.' }));
    });

    it('wrong password', async () => {
        const res = await request(app).post('/api/login').send({ username: 'admin', password: 'wrong' });
        expect(res.status).toBe(401);
        expect(res.body).toEqual(expect.objectContaining({ success: false, message: 'نام کاربری یا رمز عبور اشتباه است' }));
    });

    it('unknown user', async () => {
        const res = await request(app).post('/api/login').send({ username: 'unknown', password: 'wrong' });
        expect(res.status).toBe(401);
        expect(res.body).toEqual(expect.objectContaining({ success: false, message: 'نام کاربری یا رمز عبور اشتباه است' }));
    });

    it('disabled user', async () => {
        await dbRun("UPDATE Users SET status = 'disabled' WHERE username = 'admin'");
        const res = await request(app).post('/api/login').send({ username: 'admin', password: 'test-admin-password' });
        expect(res.status).toBe(403);
        expect(res.body).toEqual(expect.objectContaining({ success: false, message: 'حساب کاربری غیرفعال شده است. با مدیر سیستم تماس بگیرید.' }));
        await dbRun("UPDATE Users SET status = 'active' WHERE username = 'admin'");
    });

    it('successful login', async () => {
        const res = await request(app).post('/api/login').send({ username: 'admin', password: 'test-admin-password' });
        expectSuccess(res, { success: true });
        expect(typeof res.body.token).toBe('string');
    });

    it('returned role', async () => {
        const res = await request(app).post('/api/login').send({ username: 'admin', password: 'test-admin-password' });
        expectSuccess(res);
        expect(res.body.role).toBe('admin');
    });

    it('returned permissions array', async () => {
        const res = await request(app).post('/api/login').send({ username: 'admin', password: 'test-admin-password' });
        expectSuccess(res);
        expect(Array.isArray(res.body.permissions)).toBe(true);
    });

    it('Authorization header accepted afterwards', async () => {
        const loginRes = await request(app).post('/api/login').send({ username: 'admin', password: 'test-admin-password' });
        expectSuccess(loginRes);
        const token = loginRes.body.token;
        const protectedRes = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
        expect(protectedRes.status).toBe(200);
    });

    it('rate limits after repeated failed login attempts', async () => {
        const { loginAttempts } = require('../../src/infrastructure/middleware/security.middleware');
        loginAttempts.clear();

        for (let i = 0; i < 10; i++) {
            const res = await request(app).post('/api/login').send({ username: 'admin', password: 'wrong' });
            expect(res.status).toBe(401);
            expect(res.body).toEqual(expect.objectContaining({ success: false, message: 'نام کاربری یا رمز عبور اشتباه است' }));
        }

        const res = await request(app).post('/api/login').send({ username: 'admin', password: 'wrong' });
        expect(res.status).toBe(429);
        expect(res.body).toEqual(expect.objectContaining({ success: false }));
        expect(typeof res.body.message).toBe('string');
    });
});
