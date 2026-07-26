const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { db, reconnectDatabase } = require('../../infrastructure/database/connection');
const { DB_PATH } = require('../../infrastructure/config/env');

const BACKUP_DIR = path.join(path.dirname(path.resolve(DB_PATH)), 'backups');

function isValidBackupName(name) {
    if (!name || typeof name !== 'string') {
        return false;
    }

    if (!name.endsWith('.db')) {
        return false;
    }

    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
        return false;
    }

    if (path.isAbsolute(name)) {
        return false;
    }

    return true;
}

async function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        await fs.promises.mkdir(BACKUP_DIR, { recursive: true });
    }
}

async function listBackupFiles() {
    await ensureBackupDir();
    const files = await fs.promises.readdir(BACKUP_DIR);
    const filtered = files.filter((f) => f.endsWith('.db'));
    const list = [];
    for (const f of filtered) {
        const fp = path.join(BACKUP_DIR, f);
        const stat = await fs.promises.stat(fp);
        const mtime = stat.mtime;
        list.push({
            name: f,
            size: stat.size,
            sizeMB: (stat.size / 1024 / 1024).toFixed(2),
            modified: mtime.toISOString(),
            modifiedJalali: mtime.toLocaleString('fa-IR'),
        });
    }

    return list.sort((a, b) => b.modified.localeCompare(a.modified));
}

function getBackupStream() {
    const dbPath = path.resolve(DB_PATH);
    if (!fs.existsSync(dbPath)) {
        return null;
    }

    try {
        db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (e) {
        console.error('Checkpoint warning:', e.message);
    }

    const filename = `RSTC_Backup_${new Date().toISOString().slice(0, 10)}.db`;

    return { dbPath, filename };
}

async function getBackupFileStream(name) {
    if (!isValidBackupName(name)) {
        return null;
    }

    const fp = path.join(BACKUP_DIR, name);
    if (!fs.existsSync(fp)) {
        return null;
    }

    return fp;
}

async function validateBackupFile(data) {
    const tmp = path.join(BACKUP_DIR, `tmp_validate_${Date.now()}.db`);
    await fs.promises.writeFile(tmp, data);
    try {
        const testDb = new Database(tmp);
        const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const counts = {};
        for (const t of tables) {
            try {
                counts[t.name] = testDb.prepare(`SELECT COUNT(*) as c FROM [${t.name}]`).get().c;
            } catch (e) {
                counts[t.name] = 'err';
            }
        }

        const integrity = testDb.prepare('PRAGMA integrity_check').get();
        const pageCount = testDb.prepare('PRAGMA page_count').get().page_count;
        const pageSize = testDb.prepare('PRAGMA page_size').get().page_size;
        testDb.close();

        return {
            valid: true,
            sizeMB: (data.length / 1024 / 1024).toFixed(2),
            tables: tables.map((t) => t.name),
            counts,
            integrity: integrity.integrity_check,
            pageCount,
            pageSize,
            estimatedSizeMB: ((pageCount * pageSize) / 1024 / 1024).toFixed(2),
        };
    } finally {
        try {
            await fs.promises.unlink(tmp);
        } catch (e) {
            /* ignore cleanup errors */
        }
    }
}

async function deleteBackupFile(name) {
    if (!isValidBackupName(name)) {
        return false;
    }

    const fp = path.join(BACKUP_DIR, name);
    if (!fs.existsSync(fp)) {
        return false;
    }

    await fs.promises.unlink(fp);

    return true;
}

async function restoreBackupFile(body) {
    const dbPath = path.resolve(DB_PATH);
    const backupPath = `${dbPath}.bak`;
    try {
        try {
            db.close();
        } catch (e) {
            /* ignore */
        }

        if (fs.existsSync(dbPath)) {
            await fs.promises.copyFile(dbPath, backupPath);
        }

        await fs.promises.writeFile(dbPath, body);
        for (const f of [`${dbPath}-wal`, `${dbPath}-shm`]) {
            if (fs.existsSync(f)) {
                await fs.promises.unlink(f);
            }
        }

        reconnectDatabase(dbPath);

        return dbPath;
    } catch (e) {
        try {
            if (fs.existsSync(backupPath)) {
                await fs.promises.copyFile(backupPath, dbPath);
            }
        } catch (restoreErr) {
            /* ignore */
        }

        try {
            await fs.promises.unlink(backupPath);
        } catch (cleanupErr) {
            /* ignore */
        }

        throw e;
    }
}

async function createBackupFile() {
    await ensureBackupDir();
    const dbPath = path.resolve(DB_PATH);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dest = path.join(BACKUP_DIR, `rstc_backup_${ts}.db`);
    await fs.promises.copyFile(dbPath, dest);

    return dest;
}

async function cleanupOldBackups() {
    await ensureBackupDir();
    const files = await fs.promises.readdir(BACKUP_DIR);
    const filtered = files.filter((f) => f.endsWith('.db'));
    filtered.sort().reverse();
    const toDelete = filtered.slice(30);
    for (const f of toDelete) {
        await fs.promises.unlink(path.join(BACKUP_DIR, f));
    }
}

module.exports = {
    isValidBackupName,
    ensureBackupDir,
    listBackupFiles,
    getBackupStream,
    getBackupFileStream,
    validateBackupFile,
    deleteBackupFile,
    restoreBackupFile,
    createBackupFile,
    cleanupOldBackups,
};
