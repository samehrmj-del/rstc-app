const path = require('path');
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;
const DB_PATH = process.env.DB_PATH || './rstc_database.db';
const BACKUP_DIR =
    process.env.BACKUP_DIR || path.join(path.dirname(path.resolve(DB_PATH)), 'backups');
const CORS_ORIGIN = process.env.CORS_ORIGIN || false;
const INIT_ADMIN_PASSWORD = process.env.INIT_ADMIN_PASSWORD;

module.exports = {
    PORT,
    JWT_SECRET,
    DB_PATH,
    BACKUP_DIR,
    CORS_ORIGIN,
    INIT_ADMIN_PASSWORD,
};
