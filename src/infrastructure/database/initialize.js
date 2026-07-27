const fs = require('fs');
const path = require('path');
const { dbRun, dbGet, dbAll } = require('./connection');
const {
    CREATE_INDEXES,
    TABLE_USERS,
    TABLE_PERSONNEL,
    TABLE_MISSIONS,
    INDEX_DECREE_NUM,
    TABLE_AUDIT_LOG,
    INDEX_AUDIT_CREATED,
    TABLE_SYSTEM_OPTIONS,
} = require('./schema');
const { hashPassword } = require('../security/password.service');
const { getDefaultPermissions, serializePermissions } = require('../security/permission.service');
const { INIT_ADMIN_PASSWORD, DB_PATH } = require('../config/env');

async function createTables() {
    await dbRun(TABLE_USERS);
    await dbRun("ALTER TABLE Users ADD COLUMN role TEXT DEFAULT 'user'").catch(() => {});
    await dbRun("ALTER TABLE Users ADD COLUMN permissions TEXT DEFAULT '[]'").catch(() => {});
    await dbRun('ALTER TABLE Users ADD COLUMN last_login TEXT').catch(() => {});
    await dbRun('ALTER TABLE Users ADD COLUMN login_count INTEGER DEFAULT 0').catch(() => {});
    await dbRun("ALTER TABLE Users ADD COLUMN status TEXT DEFAULT 'active'").catch(() => {});
    await dbRun('ALTER TABLE Users ADD COLUMN created_at TEXT').catch(() => {});
    await dbRun(
        "UPDATE Users SET created_at = '2026-01-01T00:00:00.000Z' WHERE created_at IS NULL"
    ).catch(() => {});
    const usersWithoutPerms = await dbAll(
        "SELECT id, role, permissions FROM Users WHERE permissions IS NULL OR permissions = '' OR permissions = '[]'"
    ).catch(() => []);
    for (const u of usersWithoutPerms) {
        const defaultPerms = getDefaultPermissions(u.role);
        await dbRun('UPDATE Users SET permissions = ? WHERE id = ?', [
            serializePermissions(defaultPerms),
            u.id,
        ]).catch(() => {});
    }

    await dbRun(TABLE_PERSONNEL);
    for (const sql of CREATE_INDEXES.slice(0, 3)) {
        await dbRun(sql);
    }

    await dbRun(TABLE_MISSIONS);
    await dbRun(INDEX_DECREE_NUM);

    await dbRun(TABLE_AUDIT_LOG);
    await dbRun(INDEX_AUDIT_CREATED);

    await dbRun(TABLE_SYSTEM_OPTIONS);
}

async function runMigrations() {
    const missionsCols = await dbAll('PRAGMA table_info(Missions)').catch(() => []);
    const hasDecreeNum = missionsCols.some((c) => c.name === 'decree_num');
    if (missionsCols.length > 0 && !hasDecreeNum) {
        await dbRun('ALTER TABLE Missions RENAME TO Missions_old');
    }
}

async function seedAdmin() {
    const existingAdmin = await dbGet("SELECT id FROM Users WHERE username = 'admin'");
    const hashed = await hashPassword(INIT_ADMIN_PASSWORD);
    if (existingAdmin) {
        await dbRun(
            "UPDATE Users SET password = ?, role = 'admin', status = 'active' WHERE username = 'admin'",
            [hashed]
        );
    } else {
        await dbRun(
            `INSERT INTO Users (username, password, role, status, created_at) VALUES (?, ?, ?, ?, ?)`,
            ['admin', hashed, 'admin', 'active', new Date().toISOString()]
        );
    }
}

async function migrateOptions() {
    const optionsPath = path.join(__dirname, '..', '..', '..', 'options.json');
    if (fs.existsSync(optionsPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(optionsPath, 'utf8'));
            for (const [field, info] of Object.entries(data)) {
                await dbRun(
                    'INSERT OR IGNORE INTO SystemOptions (field, label, options) VALUES (?, ?, ?)',
                    [field, info.label || field, JSON.stringify(info.options || [])]
                );
            }

            fs.renameSync(optionsPath, `${optionsPath}.migrated`);
        } catch (e) {
            console.error('Options migration error:', e.message);
        }
    }
}

async function initializeDatabase() {
    if (!INIT_ADMIN_PASSWORD || INIT_ADMIN_PASSWORD.trim() === '') {
        throw new Error(
            'INIT_ADMIN_PASSWORD environment variable is required. ' +
                'Application startup aborted. Please set INIT_ADMIN_PASSWORD in your .env file.'
        );
    }

    try {
        const fs = require('fs');
        const path = require('path');
        const dbDir = path.dirname(DB_PATH || process.env.DB_PATH || './rstc_database.db');
        if (!fs.existsSync(dbDir)) {
            throw new Error(`Database directory does not exist: ${dbDir}. Create the directory and ensure it is writable.`);
        }
        try {
            fs.accessSync(dbDir, fs.constants.W_OK);
        } catch (e) {
            throw new Error(`Database directory is not writable: ${dbDir}. Ensure the volume mount has write permissions for the current user.`);
        }

        await createTables();
        await runMigrations();
        await seedAdmin();
        await migrateOptions();
    } catch (err) {
        console.error('DB init error:', err);
        throw err;
    }
}

module.exports = {
    initializeDatabase,
};
