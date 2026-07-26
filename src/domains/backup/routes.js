const express = require('express');
const fs = require('fs');
const {
    backupDownload,
    backupList,
    backupDownloadFile,
    backupValidate,
    backupDelete,
    backupRestore,
} = require('./service');
const { createAuthenticateToken } = require('../../infrastructure/middleware/auth.middleware');
const { dbGet } = require('../../infrastructure/database/connection');
const { requirePermission } = require('../../infrastructure/security/permission.service');
const { PERMISSIONS } = require('../../infrastructure/config/constants');
const authenticateToken = createAuthenticateToken(dbGet);

const router = express.Router();

router.get(
    '/backup',
    authenticateToken,
    requirePermission(PERMISSIONS.BACKUP_CREATE),
    async (req, res) => {
        try {
            const result = await backupDownload();
            if (result.status === 404) {
                return res.status(404).json(result.body);
            }

            const { dbPath, filename } = result.body.streamInfo;
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.setHeader('Content-Type', 'application/octet-stream');
            const stream = fs.createReadStream(dbPath);
            stream.on('error', (err) => {
                console.error('Backup stream error:', err.message);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'خطا در ارسال فایل پشتیبان' });
                }
            });
            stream.pipe(res);
        } catch (e) {
            console.error('Backup download error:', e.message);
            res.status(500).json({ error: 'خطا در دانلود پشتیبان' });
        }
    }
);

router.get(
    '/backups',
    authenticateToken,
    requirePermission(PERMISSIONS.BACKUP_VIEW),
    async (req, res) => {
        const result = await backupList();
        res.status(result.status).json(result.body);
    }
);

router.get(
    '/backups/:name',
    authenticateToken,
    requirePermission(PERMISSIONS.BACKUP_VIEW),
    async (req, res) => {
        try {
            const result = await backupDownloadFile(req.params.name);
            if (result.status === 404) {
                return res.status(404).json(result.body);
            }

            const { filePath, filename } = result.body;
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.setHeader('Content-Type', 'application/octet-stream');
            const stream = fs.createReadStream(filePath);
            stream.on('error', (err) => {
                console.error('Backup file stream error:', err.message);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'خطا در ارسال فایل پشتیبان' });
                }
            });
            stream.pipe(res);
        } catch (e) {
            console.error('Backup file download error:', e.message);
            res.status(500).json({ error: 'خطا در دانلود فایل پشتیبان' });
        }
    }
);

router.post(
    '/backups/validate',
    authenticateToken,
    express.raw({ type: 'application/octet-stream', limit: '50mb' }),
    requirePermission(PERMISSIONS.BACKUP_VIEW),
    async (req, res) => {
        const result = await backupValidate(req.body);
        res.status(result.status).json(result.body);
    }
);

router.delete(
    '/backups/:name',
    authenticateToken,
    requirePermission(PERMISSIONS.BACKUP_VIEW),
    async (req, res) => {
        const result = await backupDelete(req.params.name);
        res.status(result.status).json(result.body);
    }
);

router.post(
    '/restore',
    authenticateToken,
    express.raw({ type: 'application/octet-stream', limit: '50mb' }),
    requirePermission(PERMISSIONS.BACKUP_RESTORE),
    async (req, res) => {
        const result = await backupRestore(req.body);
        res.status(result.status).json(result.body);
    }
);

module.exports = router;
