const fs = require('fs');

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    promises: {
        mkdir: jest.fn().mockResolvedValue(undefined),
        readdir: jest.fn().mockResolvedValue([]),
        stat: jest.fn().mockResolvedValue({ size: 100, mtime: new Date() }),
        unlink: jest.fn().mockResolvedValue(undefined),
        copyFile: jest.fn().mockResolvedValue(undefined),
        writeFile: jest.fn().mockResolvedValue(undefined)
    }
}));

jest.mock('better-sqlite3', () => jest.fn(() => ({
    prepare: jest.fn(() => ({
        all: jest.fn().mockReturnValue([]),
        get: jest.fn().mockReturnValue({ count: 0, integrity_check: 'ok', page_count: 1, page_size: 4096, c: 5 })
    })),
    close: jest.fn()
})));

jest.mock('../../../src/infrastructure/database/connection', () => ({
    db: {},
    reconnectDatabase: jest.fn()
}));

jest.mock('../../../src/infrastructure/config/env', () => ({
    DB_PATH: './rstc_database.db'
}));

afterEach(() => {
    jest.clearAllMocks();
});

const {
    isValidBackupName,
    ensureBackupDir,
    validateBackupFile,
    listBackupFiles,
    getBackupStream,
    getBackupFileStream,
    deleteBackupFile,
    restoreBackupFile,
    createBackupFile,
    cleanupOldBackups
} = require('../../../src/domains/backup/repository');

describe('isValidBackupName', () => {
    test('valid name -> true', () => {
        expect(isValidBackupName('backup.db')).toBe(true);
    });

    test('path traversal -> false', () => {
        expect(isValidBackupName('../etc/passwd.db')).toBe(false);
    });

    test('absolute path -> false', () => {
        expect(isValidBackupName('/etc/backup.db')).toBe(false);
    });

    test('wrong extension -> false', () => {
        expect(isValidBackupName('backup.txt')).toBe(false);
    });

    test('empty string -> false', () => {
        expect(isValidBackupName('')).toBe(false);
    });

    test('non-string -> false', () => {
        expect(isValidBackupName(123)).toBe(false);
    });

    test('contains backslash -> false', () => {
        expect(isValidBackupName('..\\backup.db')).toBe(false);
    });

    test('contains forward slash -> false', () => {
        expect(isValidBackupName('subdir/backup.db')).toBe(false);
    });
});

describe('ensureBackupDir', () => {
    test('creates directory if not exists', async () => {
        fs.existsSync.mockReturnValue(false);

        await ensureBackupDir();

        expect(fs.existsSync).toHaveBeenCalled();
        expect(fs.promises.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });
});

describe('validateBackupFile', () => {
    test('creates temp file, reads tables/integrity, cleans up', async () => {
        const mockData = Buffer.from('fake backup data');
        const mockDbInstance = {
            prepare: jest.fn(() => ({
                all: jest.fn().mockReturnValue([{ name: 'Missions' }, { name: 'Personnel' }]),
                get: jest.fn().mockReturnValue({ integrity_check: 'ok', page_count: 10, page_size: 4096, c: 5 })
            })),
            close: jest.fn()
        };
        const Database = require('better-sqlite3');
        Database.mockImplementation(() => mockDbInstance);

        const result = await validateBackupFile(mockData);

        expect(fs.promises.writeFile).toHaveBeenCalled();
        expect(Database).toHaveBeenCalled();
        expect(mockDbInstance.close).toHaveBeenCalled();
        expect(fs.promises.unlink).toHaveBeenCalled();
        expect(result.valid).toBe(true);
        expect(result.tables).toContain('Missions');
        expect(result.tables).toContain('Personnel');
    });

    test('cleans up temp file even if validation throws', async () => {
        const Database = require('better-sqlite3');
        Database.mockImplementation(() => {
            throw new Error('DB open failed');
        });

        const mockData = Buffer.from('bad data');

        await expect(validateBackupFile(mockData)).rejects.toThrow('DB open failed');
        expect(fs.promises.unlink).toHaveBeenCalled();
    });
});

describe('listBackupFiles', () => {
    test('returns file list with metadata', async () => {
        fs.existsSync.mockReturnValue(true);
        fs.promises.readdir.mockResolvedValue(['a.db', 'b.txt', 'c.db']);
        fs.promises.stat
            .mockResolvedValueOnce({ size: 1024, mtime: new Date('2024-01-01') })
            .mockResolvedValueOnce({ size: 2048, mtime: new Date('2024-01-02') });

        const result = await listBackupFiles();

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('c.db');
        expect(result[1].name).toBe('a.db');
    });
});

describe('getBackupStream', () => {
    test('returns null when DB file missing', () => {
        fs.existsSync.mockReturnValue(false);
        expect(getBackupStream()).toBeNull();
    });

    test('returns stream info when DB exists', () => {
        fs.existsSync.mockReturnValue(true);
        const result = getBackupStream();
        expect(result).toBeDefined();
        expect(result.filename).toMatch(/^RSTC_Backup_/);
    });
});

describe('getBackupFileStream', () => {
    test('returns null for invalid name', async () => {
        const result = await getBackupFileStream('../etc/passwd.db');
        expect(result).toBeNull();
    });

    test('returns null when file missing', async () => {
        fs.existsSync.mockReturnValue(false);
        const result = await getBackupFileStream('backup.db');
        expect(result).toBeNull();
    });

    test('returns file path for valid existing file', async () => {
        fs.existsSync.mockReturnValue(true);
        const result = await getBackupFileStream('backup.db');
        expect(result).toBeDefined();
        expect(result).toContain('backup.db');
    });
});

describe('deleteBackupFile', () => {
    test('returns false for invalid name', async () => {
        const result = await deleteBackupFile('../evil.db');
        expect(result).toBe(false);
    });

    test('returns false when file missing', async () => {
        fs.existsSync.mockReturnValue(false);
        const result = await deleteBackupFile('backup.db');
        expect(result).toBe(false);
    });

    test('deletes file and returns true', async () => {
        fs.existsSync.mockReturnValue(true);
        const result = await deleteBackupFile('backup.db');
        expect(result).toBe(true);
        expect(fs.promises.unlink).toHaveBeenCalled();
    });
});

describe('restoreBackupFile', () => {
    test('copies current DB to .bak, writes new DB, reconnects', async () => {
        fs.existsSync.mockReturnValue(true);
        const conn = require('../../../src/infrastructure/database/connection');
        conn.db.close = jest.fn();
        conn.reconnectDatabase.mockResolvedValue(undefined);

        const result = await restoreBackupFile(Buffer.from('new db data'));

        expect(fs.promises.copyFile).toHaveBeenCalled();
        expect(fs.promises.writeFile).toHaveBeenCalled();
        expect(conn.reconnectDatabase).toHaveBeenCalled();
        expect(result).toBeDefined();
    });

    test('rolls back from .bak on failure', async () => {
        fs.existsSync.mockReturnValue(true);
        const conn = require('../../../src/infrastructure/database/connection');
        conn.db.close = jest.fn();
        conn.reconnectDatabase.mockResolvedValue(undefined);
        fs.promises.writeFile.mockRejectedValue(new Error('write failed'));

        await expect(restoreBackupFile(Buffer.from('bad data'))).rejects.toThrow('write failed');
        expect(fs.promises.copyFile).toHaveBeenCalledTimes(2);
    });
});

describe('createBackupFile', () => {
    test('copies DB to backup destination', async () => {
        fs.existsSync.mockReturnValue(false);
        const result = await createBackupFile();
        expect(fs.promises.copyFile).toHaveBeenCalled();
        expect(result).toContain('.db');
    });
});

describe('cleanupOldBackups', () => {
    test('deletes files beyond 30', async () => {
        fs.existsSync.mockReturnValue(false);
        const oldFiles = Array.from({ length: 35 }, (_, i) => `backup_${i}.db`);
        fs.promises.readdir.mockResolvedValue(oldFiles);

        await cleanupOldBackups();

        expect(fs.promises.unlink).toHaveBeenCalledTimes(5);
    });

    test('does nothing when 30 or fewer files', async () => {
        fs.existsSync.mockReturnValue(false);
        const files = Array.from({ length: 5 }, (_, i) => `backup_${i}.db`);
        fs.promises.readdir.mockResolvedValue(files);

        await cleanupOldBackups();

        expect(fs.promises.unlink).not.toHaveBeenCalled();
    });
});
