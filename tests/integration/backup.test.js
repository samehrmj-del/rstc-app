const request = require('supertest');
const { app, initializeDatabase } = require('../setup/testServer');
const { loginAsAdmin } = require('../setup/login');
const { expectSuccess, expectUnauthorized } = require('../setup/assertions');
const fs = require('fs');
const path = require('path');

describe('Backup API', () => {
    let adminToken;
    const testBackupName = 'test_backup.db';

    beforeAll(async () => {
        await initializeDatabase();
        adminToken = await loginAsAdmin(app);
    });

    afterAll(async () => {
        const backupDir = path.resolve(__dirname, '..', 'tmp');
        const fp = path.join(backupDir, testBackupName);
        if (fs.existsSync(fp)) {
fs.unlinkSync(fp);
}
    });

    it('GET /api/backup requires permission', async () => {
        await loginAsAdmin(app);
        const res = await request(app).get('/api/backup');
        expectUnauthorized(res);
    });

    it('GET /api/backups returns list', async () => {
        const res = await request(app).get('/api/backups')
            .set('Authorization', `Bearer ${adminToken}`);
        expectSuccess(res);
        expect(Array.isArray(res.body.backups)).toBe(true);
        expect(res.body.settings.maxBackups).toBe(30);
    });

    it('GET /api/backups/:name returns 404 for missing file', async () => {
        const res = await request(app).get('/api/backups/nonexistent.db')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(404);
    });
});
