const request = require('supertest');
const express = require('express');
const fs = require('fs');
const {
    backupDownload,
    backupList,
    backupDownloadFile,
    backupValidate,
    backupDelete,
    backupRestore,
} = require('../../../src/domains/backup/service');

jest.mock('better-sqlite3', () => jest.fn(() => ({
    prepare: jest.fn(() => ({
        all: jest.fn().mockReturnValue([]),
        get: jest.fn().mockReturnValue({})
    })),
    close: jest.fn(),
    pragma: jest.fn()
})));

jest.mock('../../../src/domains/backup/service', () => ({
    backupDownload: jest.fn(),
    backupList: jest.fn(),
    backupDownloadFile: jest.fn(),
    backupValidate: jest.fn(),
    backupDelete: jest.fn(),
    backupRestore: jest.fn()
}));

jest.mock('../../../src/infrastructure/middleware/auth.middleware', () => ({
    createAuthenticateToken: () => (req, res, next) => {
 req.user = { permissions: ['*'] }; next(); 
}
}));

jest.mock('../../../src/infrastructure/security/permission.service', () => ({
    requirePermission: () => (req, res, next) => next()
}));

jest.mock('../../../src/infrastructure/config/constants', () => ({
    PERMISSIONS: {
        BACKUP_CREATE: 'backup:create',
        BACKUP_VIEW: 'backup:view',
        BACKUP_RESTORE: 'backup:restore'
    }
}));

jest.mock('fs', () => ({
    createReadStream: jest.fn(() => ({
        pipe: jest.fn((dest) => {
            dest.end();
        }),
        on: jest.fn(),
        destroy: jest.fn()
    }))
}));

const router = require('../../../src/domains/backup/routes');
const app = express();
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));
app.use('/api', router);

afterEach(() => {
    jest.clearAllMocks();
});

describe('GET /api/backup', () => {
    test('returns 404 when backup not found', async () => {
        backupDownload.mockResolvedValue({ status: 404, body: { error: 'فایل دیتابیس یافت نشد' } });

        const res = await request(app).get('/api/backup');
        expect(res.status).toBe(404);
        expect(res.body.error).toBe('فایل دیتابیس یافت نشد');
    });

    test('streams file on success', async () => {
        backupDownload.mockResolvedValue({
            status: 200,
            body: { streamInfo: { dbPath: '/path/to/db.db', filename: 'backup.db' } }
        });

        const res = await request(app).get('/api/backup');
        expect(res.status).toBe(200);
        expect(fs.createReadStream).toHaveBeenCalledWith('/path/to/db.db');
    });
});

describe('GET /api/backups', () => {
    test('returns backup list', async () => {
        backupList.mockResolvedValue({ status: 200, body: { backups: [], settings: { maxBackups: 30, scheduleHour: 2 } } });

        const res = await request(app).get('/api/backups');
        expect(res.status).toBe(200);
        expect(res.body.backups).toEqual([]);
    });
});

describe('GET /api/backups/:name', () => {
    test('returns 404 when file not found', async () => {
        backupDownloadFile.mockResolvedValue({ status: 404, body: { error: 'فایل پشتیبان یافت نشد' } });

        const res = await request(app).get('/api/backups/missing.db');
        expect(res.status).toBe(404);
    });

    test('streams file on success', async () => {
        backupDownloadFile.mockResolvedValue({
            status: 200,
            body: { filePath: '/path/to/backup.db', filename: 'backup.db' }
        });

        const res = await request(app).get('/api/backups/backup.db');
        expect(res.status).toBe(200);
        expect(fs.createReadStream).toHaveBeenCalledWith('/path/to/backup.db');
    });
});

describe('POST /api/backups/validate', () => {
    test('returns validation result', async () => {
        backupValidate.mockResolvedValue({ status: 200, body: { valid: true } });

        const res = await request(app).post('/api/backups/validate').send(Buffer.from('data'));
        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(true);
    });
});

describe('DELETE /api/backups/:name', () => {
    test('returns result from service', async () => {
        backupDelete.mockResolvedValue({ status: 200, body: { success: true } });

        const res = await request(app).delete('/api/backups/old.db');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

describe('POST /api/restore', () => {
    test('returns restore result', async () => {
        backupRestore.mockResolvedValue({ status: 200, body: { success: true } });

        const res = await request(app).post('/api/restore').send(Buffer.from('data'));
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
