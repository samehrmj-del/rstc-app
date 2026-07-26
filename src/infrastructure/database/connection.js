const Database = require('better-sqlite3');
const { DB_PATH } = require('../config/env');

let db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

async function dbRun(sql, params = []) {
    const info = db.prepare(sql).run(params);

    return { lastID: info.lastInsertRowid, changes: info.changes };
}

async function dbGet(sql, params = []) {
    return db.prepare(sql).get(params);
}

async function dbAll(sql, params = []) {
    return db.prepare(sql).all(params);
}

async function reconnectDatabase(newPath) {
    try {
        db.close();
    } catch (e) {
        console.error('DB close warning:', e.message);
    }

    db = new Database(newPath);
    db.pragma('journal_mode = WAL');
}

module.exports = {
    db,
    dbRun,
    dbGet,
    dbAll,
    reconnectDatabase,
};
