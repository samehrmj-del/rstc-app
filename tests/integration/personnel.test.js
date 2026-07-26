const request = require('supertest');
const { app, initializeDatabase } = require('../setup/testServer');
const { loginAsAdmin } = require('../setup/login');
const { expectSuccess, expectUnauthorized } = require('../setup/assertions');
const { dbGet, dbRun } = require('../../src/infrastructure/database/connection');
const { validPersonnel, updatePayload, bulkImportRow } = require('../fixtures/personnel.fixture');

describe('Personnel API', () => {
    let adminToken;
    let testId;

    beforeAll(async () => {
        await initializeDatabase();
        adminToken = await loginAsAdmin(app);
    });

    afterAll(async () => {
        if (testId) {
            try {
 await dbRun("DELETE FROM Personnel WHERE id = ?", [testId]); 
} catch (e) {}
        }
    });

    it('GET /api/personnel requires auth', async () => {
        const res = await request(app).get('/api/personnel');
        expectUnauthorized(res);
    });

    it('POST /api/personnel creates personnel', async () => {
        const res = await request(app).post('/api/personnel')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(validPersonnel);
        expectSuccess(res);
        const row = await dbGet("SELECT * FROM Personnel WHERE national_id = ?", [validPersonnel.national_id]);
        expect(row).toBeDefined();
        testId = row.id;
    });

    it('POST /api/personnel rejects duplicate national_id', async () => {
        const duplicate = { ...validPersonnel, lname: 'Dup', emp_num: 'EMP_DUP' };
        const res = await request(app).post('/api/personnel')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(duplicate);
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('قبلاً ثبت شده است');
    });

    it('POST /api/personnel validation failure', async () => {
        const res = await request(app).post('/api/personnel')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: '', lname: '' });
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('نام الزامی است');
        expect(res.body.error).toContain('نام خانوادگی الزامی است');
    });

    it('GET /api/personnel returns array', async () => {
        const res = await request(app).get('/api/personnel')
            .set('Authorization', `Bearer ${adminToken}`);
        expectSuccess(res);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('PUT /api/personnel/:id updates personnel', async () => {
        const res = await request(app).put(`/api/personnel/${testId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(updatePayload);
        expectSuccess(res);
        const row = await dbGet("SELECT * FROM Personnel WHERE id = ?", [testId]);
        expect(row.name).toBe('UpdatedName');
    });

    it('PUT /api/personnel/:id duplicate update', async () => {
        const dup = { ...updatePayload, national_id: '9999999999', emp_num: 'EMP_DUP2' };
        await dbRun("INSERT INTO Personnel (name,lname,national_id,emp_num) VALUES (?,?,?,?)", ['Tmp','Tmp','9999999999','EMP_DUP2']);
        const res = await request(app).put(`/api/personnel/${testId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(dup);
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('تکراری است');
    });

    it('DELETE /api/personnel/:id deletes', async () => {
        const res = await request(app).delete(`/api/personnel/${testId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expectSuccess(res);
        const row = await dbGet("SELECT * FROM Personnel WHERE id = ?", [testId]);
        expect(row).toBeUndefined();
        testId = null;
    });

    it('POST /api/personnel/bulk imports rows', async () => {
        const res = await request(app).post('/api/personnel/bulk')
            .set('Authorization', `Bearer ${adminToken}`)
            .send([bulkImportRow]);
        expectSuccess(res);
        expect(res.body.success).toBe(true);
        expect(res.body.imported).toBeGreaterThanOrEqual(0);
    });

    it('POST /api/personnel/bulk rejects empty', async () => {
        const res = await request(app).post('/api/personnel/bulk')
            .set('Authorization', `Bearer ${adminToken}`)
            .send([]);
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('فایل خالی است');
    });

    it('POST /api/personnel/bulk rejects >1000', async () => {
        const rows = Array.from({ length: 1001 }, (_, i) => ({ name: `N${i}`, lname: `L${i}` }));
        const res = await request(app).post('/api/personnel/bulk')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(rows);
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('حداکثر ۱۰۰۰ ردیف مجاز است.');
    });
});
