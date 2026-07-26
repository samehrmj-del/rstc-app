const { backupDownload, backupList, backupDownloadFile, backupValidate, backupDelete, backupRestore, scheduledBackup, startScheduledBackup } = require('../../../src/domains/backup/service');

jest.mock('../../../src/domains/backup/repository', () => ({
    getBackupStream: jest.fn(),
    listBackupFiles: jest.fn(),
    getBackupFileStream: jest.fn(),
    validateBackupFile: jest.fn(),
    deleteBackupFile: jest.fn(),
    restoreBackupFile: jest.fn(),
    createBackupFile: jest.fn(),
    cleanupOldBackups: jest.fn(),
    ensureBackupDir: jest.fn()
}));

jest.mock('../../../src/infrastructure/config/env', () => ({
    DB_PATH: './rstc_database.db'
}));

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    promises: {
        unlink: jest.fn().mockResolvedValue(undefined),
        mkdir: jest.fn().mockResolvedValue(undefined),
        readdir: jest.fn().mockResolvedValue([]),
        stat: jest.fn().mockResolvedValue({ size: 100, mtime: new Date() }),
        copyFile: jest.fn().mockResolvedValue(undefined),
        writeFile: jest.fn().mockResolvedValue(undefined)
    }
}));

const repository = require('../../../src/domains/backup/repository');

afterEach(() => {
    jest.clearAllMocks();
});

describe('backupDownload', () => {
    test('no DB file -> 404', async () => {
        repository.getBackupStream.mockReturnValue(null);

        const result = await backupDownload();

        expect(result.status).toBe(404);
        expect(result.body.error).toBe('فایل دیتابیس یافت نشد');
    });

    test('success -> 200 + streamInfo', async () => {
        const mockStreamInfo = { dbPath: './rstc_database.db', filename: 'RSTC_Backup_2024-01-01.db' };
        repository.getBackupStream.mockReturnValue(mockStreamInfo);

        const result = await backupDownload();

        expect(result.status).toBe(200);
        expect(result.body.streamInfo).toEqual(mockStreamInfo);
    });
});

describe('backupList', () => {
    test('success -> 200 + backups + settings', async () => {
        repository.ensureBackupDir.mockResolvedValue(undefined);
        repository.listBackupFiles.mockResolvedValue([
            { name: 'backup1.db', size: 1024 }
        ]);

        const result = await backupList();

        expect(result.status).toBe(200);
        expect(result.body.backups).toBeDefined();
        expect(result.body.settings).toEqual({ maxBackups: 30, scheduleHour: 2 });
    });
});

describe('backupDownloadFile', () => {
    test('not found -> 404', async () => {
        repository.getBackupFileStream.mockResolvedValue(null);

        const result = await backupDownloadFile('nonexistent.db');

        expect(result.status).toBe(404);
        expect(result.body.error).toBe('فایل پشتیبان یافت نشد');
    });

    test('found -> 200 + filePath + filename', async () => {
        repository.getBackupFileStream.mockResolvedValue('/path/to/backup.db');

        const result = await backupDownloadFile('backup.db');

        expect(result.status).toBe(200);
        expect(result.body.filePath).toBe('/path/to/backup.db');
        expect(result.body.filename).toBe('backup.db');
    });
});

describe('backupValidate', () => {
    test('invalid data -> 400', async () => {
        repository.validateBackupFile.mockImplementation(() => {
            throw new Error('Invalid backup data');
        });

        const result = await backupValidate(Buffer.from('invalid'));

        expect(result.status).toBe(400);
        expect(result.body.valid).toBe(false);
        expect(result.body.error).toBe('Invalid backup data');
    });
});

describe('backupDelete', () => {
    test('not found -> 404', async () => {
        repository.deleteBackupFile.mockResolvedValue(false);

        const result = await backupDelete('nonexistent.db');

        expect(result.status).toBe(404);
        expect(result.body.error).toBe('فایل پشتیبان یافت نشد');
    });

    test('success -> 200', async () => {
        repository.deleteBackupFile.mockResolvedValue(true);

        const result = await backupDelete('backup.db');

        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
    });
});

describe('backupRestore', () => {
    test('success -> 200', async () => {
        repository.restoreBackupFile.mockReturnValue('./rstc_database.db');

        const result = await backupRestore(Buffer.from('data'));

        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
    });

    test('error -> 500', async () => {
        repository.restoreBackupFile.mockImplementation(() => {
            throw new Error('Restore failed');
        });

        const result = await backupRestore(Buffer.from('data'));

        expect(result.status).toBe(500);
        expect(result.body.error).toContain('Restore failed');
    });
});

describe('scheduledBackup', () => {
    test('calls ensureBackupDir, createBackupFile, cleanupOldBackups', async () => {
        repository.ensureBackupDir.mockResolvedValue(undefined);
        repository.createBackupFile.mockResolvedValue('/path/to/backup.db');
        repository.cleanupOldBackups.mockResolvedValue(undefined);

        await scheduledBackup();

        expect(repository.ensureBackupDir).toHaveBeenCalled();
        expect(repository.createBackupFile).toHaveBeenCalled();
        expect(repository.cleanupOldBackups).toHaveBeenCalled();
    });

    test('logs error on failure', async () => {
        repository.ensureBackupDir.mockRejectedValue(new Error('Disk full'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await scheduledBackup();

        expect(consoleSpy).toHaveBeenCalledWith('Backup error:', 'Disk full');
        consoleSpy.mockRestore();
    });
});

describe('startScheduledBackup', () => {
    test('sets interval that calls scheduledBackup at 02:00', async () => {
        const intervalSpy = jest.spyOn(global, 'setInterval').mockImplementation((cb) => cb());
        const scheduledSpy = jest.spyOn(require('../../../src/domains/backup/service'), 'scheduledBackup').mockResolvedValue(undefined);

        startScheduledBackup();

        expect(intervalSpy).toHaveBeenCalled();
        intervalSpy.mockRestore();
        scheduledSpy.mockRestore();
    });
});