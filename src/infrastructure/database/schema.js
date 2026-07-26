const TABLE_USERS = `CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'user', permissions TEXT DEFAULT '[]', status TEXT DEFAULT 'active', last_login TEXT, login_count INTEGER DEFAULT 0, created_at TEXT
)`;

const TABLE_PERSONNEL = `CREATE TABLE IF NOT EXISTS Personnel (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, lname TEXT NOT NULL,
    father_name TEXT, national_id TEXT UNIQUE, emp_num TEXT UNIQUE, hire_date TEXT,
    emp_type TEXT, org_post TEXT, job_title TEXT, last_degree TEXT, phone TEXT,
    address TEXT, status TEXT DEFAULT 'فعال', notes TEXT
)`;

const TABLE_MISSIONS = `CREATE TABLE IF NOT EXISTS Missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    decree_num TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    lname TEXT,
    emp_num TEXT,
    job_title TEXT,
    mission_type TEXT,
    device_type TEXT,
    repair_type TEXT,
    region TEXT,
    location TEXT,
    subject TEXT,
    device_serial TEXT,
    duration TEXT,
    overtime_hours TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    issue_date TEXT NOT NULL,
    is_single INTEGER DEFAULT 0,
    is_group INTEGER DEFAULT 0,
    is_supplied INTEGER DEFAULT 0,
    is_unsupplied INTEGER DEFAULT 0,
    is_issued INTEGER DEFAULT 0,
    is_extended INTEGER DEFAULT 0,
    is_gov INTEGER DEFAULT 0,
    is_plane INTEGER DEFAULT 0,
    is_train INTEGER DEFAULT 0,
    is_agency INTEGER DEFAULT 0,
    is_bus INTEGER DEFAULT 0,
    is_personal INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

const TABLE_AUDIT_LOG = `CREATE TABLE IF NOT EXISTS AuditLog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT NOT NULL,
    entity TEXT,
    entity_id INTEGER,
    detail TEXT,
    ip TEXT,
    created_at TEXT DEFAULT (datetime('now'))
)`;

const TABLE_SYSTEM_OPTIONS = `CREATE TABLE IF NOT EXISTS SystemOptions (
    field TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    options TEXT NOT NULL DEFAULT '[]'
)`;

const INDEX_NATIONAL_ID = 'CREATE INDEX IF NOT EXISTS idx_national_id ON Personnel(national_id)';
const INDEX_EMP_NUM = 'CREATE INDEX IF NOT EXISTS idx_emp_num ON Personnel(emp_num)';
const INDEX_NAME_LNAME = 'CREATE INDEX IF NOT EXISTS idx_name_lname ON Personnel(name, lname)';
const INDEX_DECREE_NUM = 'CREATE INDEX IF NOT EXISTS idx_decree_num ON Missions(decree_num)';
const INDEX_AUDIT_CREATED = 'CREATE INDEX IF NOT EXISTS idx_audit_created ON AuditLog(created_at)';

const CREATE_TABLES = [
    TABLE_USERS,
    TABLE_PERSONNEL,
    TABLE_MISSIONS,
    TABLE_AUDIT_LOG,
    TABLE_SYSTEM_OPTIONS,
];

const CREATE_INDEXES = [
    INDEX_NATIONAL_ID,
    INDEX_EMP_NUM,
    INDEX_NAME_LNAME,
    INDEX_DECREE_NUM,
    INDEX_AUDIT_CREATED,
];

module.exports = {
    CREATE_TABLES,
    CREATE_INDEXES,
    TABLE_USERS,
    TABLE_PERSONNEL,
    TABLE_MISSIONS,
    TABLE_AUDIT_LOG,
    TABLE_SYSTEM_OPTIONS,
    INDEX_NATIONAL_ID,
    INDEX_EMP_NUM,
    INDEX_NAME_LNAME,
    INDEX_DECREE_NUM,
    INDEX_AUDIT_CREATED,
};
