require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET is not set. Refusing to start.');
    process.exit(1);
}

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.sheetjs.com", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net", "data:"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"]
        }
    }
}));
const corsOrigin = process.env.CORS_ORIGIN === 'false' ? false : (process.env.CORS_ORIGIN || false);
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 0, etag: false }));

// ===== RATE LIMITER =====
const loginAttempts = new Map();
function rateLimitLogin(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const maxAttempts = 10;
    if (!loginAttempts.has(ip)) loginAttempts.set(ip, { count: 0, resetTime: now + windowMs });
    const record = loginAttempts.get(ip);
    if (now > record.resetTime) { record.count = 0; record.resetTime = now + windowMs; }
    if (record.count >= maxAttempts) {
        const remaining = Math.ceil((record.resetTime - now) / 60000);
        return res.status(429).json({ success: false, message: `تعداد تلاش‌های مجاز تمام شد. ${remaining} دقیقه دیگر تلاش کنید.` });
    }
    record.count++;
    next();
}
setInterval(() => { const now = Date.now(); for (const [ip, r] of loginAttempts.entries()) { if (now > r.resetTime) loginAttempts.delete(ip); } }, 3600000);

// ===== DB =====
// در محیط لوکال از فایل کنار پروژه استفاده می‌شود.
// در Railway با متغیر DB_PATH به مسیر Volume دائمی اشاره می‌کنیم تا دیتا با هر ری‌استارت پاک نشود.
const DB_PATH = process.env.DB_PATH || './rstc_database.db';
let db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
console.log('✅ DB Connected:', DB_PATH);

// توابع wrapper با همان امضای قبلی (async/await) تا بقیه کد بدون تغییر کار کند
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

async function hashPassword(p) { return bcrypt.hash(p, 10); }
function legacyHash(p) { return crypto.createHash('sha256').update(p).digest('hex'); }

// ===== AUTH MIDDLEWARE =====
function authenticateToken(req, res, next) {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    if (!token) return res.status(401).json({ error: 'دسترسی غیرمجاز! لطفاً ابتدا وارد شوید.' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'توکن نامعتبر یا منقضی شده است.' });
        req.user = user;
        next();
    });
}
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'این عملیات فقط برای مدیر کل مجاز است.' });
    next();
}

// ===== AUDIT LOG =====
async function logAudit(userId, username, action, entity, entityId, detail, ip) {
    try {
        await dbRun("INSERT INTO AuditLog (user_id, username, action, entity, entity_id, detail, ip) VALUES (?,?,?,?,?,?,?)",
            [userId, username, action, entity, entityId || null, detail || null, ip || null]);
    } catch (e) { console.error('Audit log error:', e.message); }
}

// Auto-audit middleware for write operations
function auditMiddleware(entity) {
    return (req, res, next) => {
        const origJson = res.json.bind(res);
        res.json = function(data) {
            if (res.statusCode < 300 && data && (data.success || data.token)) {
                const action = req.method === 'POST' ? 'ایجاد' : req.method === 'PUT' ? 'ویرایش' : 'حذف';
                const detail = req.method === 'DELETE' ? `حذف ${entity} #${req.params.id}` : JSON.stringify(req.body || {}).substring(0, 500);
                logAudit(req.user?.id, req.user?.username, action, entity, req.params.id, detail, req.ip);
            }
            return origJson(data);
        };
        next();
    };
}

// ===== INIT DB =====
async function initializeDatabase() {
    try {
        await dbRun("CREATE TABLE IF NOT EXISTS Users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'user', status TEXT DEFAULT 'active', last_login TEXT, login_count INTEGER DEFAULT 0, created_at TEXT)");
        await dbRun("ALTER TABLE Users ADD COLUMN role TEXT DEFAULT 'user'").catch(() => {});
        await dbRun("ALTER TABLE Users ADD COLUMN last_login TEXT").catch(() => {});
        await dbRun("ALTER TABLE Users ADD COLUMN login_count INTEGER DEFAULT 0").catch(() => {});
        await dbRun("ALTER TABLE Users ADD COLUMN status TEXT DEFAULT 'active'").catch(() => {});
        await dbRun("ALTER TABLE Users ADD COLUMN created_at TEXT").catch(() => {});
        await dbRun("UPDATE Users SET created_at = '2026-01-01T00:00:00.000Z' WHERE created_at IS NULL").catch(() => {});

        await dbRun(`CREATE TABLE IF NOT EXISTS Personnel (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, lname TEXT NOT NULL,
            father_name TEXT, national_id TEXT UNIQUE, emp_num TEXT UNIQUE, hire_date TEXT,
            emp_type TEXT, org_post TEXT, job_title TEXT, last_degree TEXT, phone TEXT,
            address TEXT, status TEXT DEFAULT 'فعال', notes TEXT
        )`);
        await dbRun("CREATE INDEX IF NOT EXISTS idx_national_id ON Personnel(national_id)");
        await dbRun("CREATE INDEX IF NOT EXISTS idx_emp_num ON Personnel(emp_num)");
        await dbRun("CREATE INDEX IF NOT EXISTS idx_name_lname ON Personnel(name, lname)");

        // ✅ Migration: اگر جدول قدیمی با schema اشتباه وجود دارد، آن را rename کن و جدید بساز
        const missionsCols = await dbAll("PRAGMA table_info(Missions)").catch(() => []);
        const hasDecreeNum = missionsCols.some(c => c.name === 'decree_num');
        if (missionsCols.length > 0 && !hasDecreeNum) {
            console.log('🔄 Migrating Missions table to new schema...');
            await dbRun("ALTER TABLE Missions RENAME TO Missions_old");
        }

        await dbRun(`CREATE TABLE IF NOT EXISTS Missions (
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
        )`);
        await dbRun("CREATE INDEX IF NOT EXISTS idx_decree_num ON Missions(decree_num)");

        if (process.env.INIT_ADMIN_PASSWORD) {
            const hashed = await hashPassword(process.env.INIT_ADMIN_PASSWORD);
            const existingAdmin = await dbGet("SELECT id FROM Users WHERE username = 'admin'");
            if (existingAdmin) {
                await dbRun("UPDATE Users SET password = ?, role = 'admin', status = 'active' WHERE username = 'admin'", [hashed]);
            } else {
                await dbRun(`INSERT INTO Users (username, password, role, status, created_at) VALUES (?, ?, ?, ?, ?)`,
                    ['admin', hashed, 'admin', 'active', new Date().toISOString()]);
            }
            console.log('✅ Admin user ready (password from INIT_ADMIN_PASSWORD)');
        } else {
            const existingAdmin = await dbGet("SELECT id FROM Users WHERE username = 'admin'");
            if (!existingAdmin) {
                const hashed = await hashPassword('admin1234');
                await dbRun(`INSERT INTO Users (username, password, role, status, created_at) VALUES (?, ?, ?, ?, ?)`,
                    ['admin', hashed, 'admin', 'active', new Date().toISOString()]);
                console.log('✅ Admin user created with default password: admin1234');
            }
        }

        await dbRun(`CREATE TABLE IF NOT EXISTS AuditLog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            username TEXT,
            action TEXT NOT NULL,
            entity TEXT,
            entity_id INTEGER,
            detail TEXT,
            ip TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )`);
        await dbRun("CREATE INDEX IF NOT EXISTS idx_audit_created ON AuditLog(created_at)");

        await dbRun(`CREATE TABLE IF NOT EXISTS SystemOptions (
            field TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            options TEXT NOT NULL DEFAULT '[]'
        )`);

        const optionsPath = path.join(__dirname, 'options.json');
        if (fs.existsSync(optionsPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(optionsPath, 'utf8'));
                for (const [field, info] of Object.entries(data)) {
                    await dbRun(
                        "INSERT OR IGNORE INTO SystemOptions (field, label, options) VALUES (?, ?, ?)",
                        [field, info.label || field, JSON.stringify(info.options || [])]
                    );
                }
                fs.renameSync(optionsPath, optionsPath + '.migrated');
                console.log('✅ Options migrated from options.json to database');
            } catch (e) { console.error('Options migration error:', e.message); }
        }

        console.log('🛠️  Database ready');
    } catch (err) {
        console.error('DB init error:', err);
    }
}

// ===== LOGIN =====
app.post('/api/login', rateLimitLogin, async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ success: false, message: 'نام کاربری و رمز عبور الزامی است.' });
        const user = await dbGet("SELECT * FROM Users WHERE username = ?", [username]);
        if (!user) return res.status(401).json({ success: false, message: 'نام کاربری یا رمز عبور اشتباه است' });
        if (user.status === 'disabled') return res.status(403).json({ success: false, message: 'حساب کاربری غیرفعال شده است. با مدیر سیستم تماس بگیرید.' });

        let isMatch = false, needsUpgrade = false;
        if (/^[a-fA-F0-9]{64}$/.test(user.password)) {
            isMatch = user.password === legacyHash(password);
            needsUpgrade = isMatch;
        } else {
            isMatch = await bcrypt.compare(password, user.password);
        }

        if (!isMatch) return res.status(401).json({ success: false, message: 'نام کاربری یا رمز عبور اشتباه است' });

        if (needsUpgrade) {
            await dbRun("UPDATE Users SET password = ? WHERE id = ?", [await hashPassword(password), user.id]);
        }
        const ip = req.ip || req.connection.remoteAddress;
        loginAttempts.delete(ip);
        const now = new Date().toISOString();
        await dbRun("UPDATE Users SET last_login = ?, login_count = login_count + 1 WHERE id = ?", [now, user.id]);
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ success: true, token, role: user.role, username: user.username });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== DASHBOARD =====
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        const [total, active, inactive, missionCount, userCount, recentPersonnel, recentMissions] = await Promise.all([
            dbGet("SELECT COUNT(*) as count FROM Personnel"),
            dbGet("SELECT COUNT(*) as count FROM Personnel WHERE status='فعال'"),
            dbGet("SELECT COUNT(*) as count FROM Personnel WHERE status='غیرفعال'"),
            dbGet("SELECT COUNT(*) as count FROM Missions"),
            dbGet("SELECT COUNT(*) as count FROM Users"),
            dbAll("SELECT id, name, lname, national_id, emp_num, job_title, status FROM Personnel ORDER BY id DESC LIMIT 6"),
            dbAll("SELECT id, decree_num, name, lname, mission_type, location, start_date, end_date FROM Missions ORDER BY id DESC LIMIT 6"),
        ]);
        const byType = await dbAll("SELECT emp_type, COUNT(*) as count FROM Personnel WHERE emp_type != '' GROUP BY emp_type ORDER BY count DESC");
        const byDegree = await dbAll("SELECT last_degree, COUNT(*) as count FROM Personnel WHERE last_degree != '' GROUP BY last_degree ORDER BY count DESC");
        const byRegion = await dbAll("SELECT region, COUNT(*) as count FROM Missions WHERE region != '' GROUP BY region ORDER BY count DESC LIMIT 10");
        const byMissionType = await dbAll("SELECT mission_type, COUNT(*) as count FROM Missions WHERE mission_type != '' GROUP BY mission_type ORDER BY count DESC");
        const singleVsGroup = await dbGet("SELECT SUM(is_single) as singleCount, SUM(is_group) as groupCount FROM Missions");
        const suppliedVsUn = await dbGet("SELECT SUM(is_supplied) as supplied, SUM(is_unsupplied) as unsupplied FROM Missions");
        res.json({
            total: total.count, active: active.count, inactive: inactive.count,
            missionCount: missionCount.count, userCount: userCount.count,
            byType, byDegree, byRegion, byMissionType,
            singleVsGroup: singleVsGroup || { singleCount: 0, groupCount: 0 },
            suppliedVsUn: suppliedVsUn || { supplied: 0, unsupplied: 0 },
            recentPersonnel, recentMissions
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== USERS =====
// self-password باید قبل از :id routes باشد تا Express گیر نکند
app.put('/api/users/self/self-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ error: "رمز عبور فعلی و جدید الزامی است!" });
        if (newPassword.length < 4) return res.status(400).json({ error: "رمز عبور جدید باید حداقل ۴ کاراکتر باشد." });
        const user = await dbGet("SELECT * FROM Users WHERE id = ?", [req.user.id]);
        if (!user) return res.status(404).json({ error: "کاربر یافت نشد!" });
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(401).json({ error: "رمز عبور فعلی اشتباه است!" });
        await dbRun("UPDATE Users SET password = ? WHERE id = ?", [await hashPassword(newPassword), req.user.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    try { res.json(await dbAll("SELECT id, username, role, status, last_login, login_count, created_at FROM Users ORDER BY id")); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/users', authenticateToken, requireAdmin, auditMiddleware('User'), async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password) return res.status(400).json({ error: "نام کاربری و رمز عبور الزامی است!" });
        if (username.length < 3) return res.status(400).json({ error: "نام کاربری باید حداقل ۳ کاراکتر باشد." });
        if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: "نام کاربری فقط شامل حروف، اعداد و زیرخط باشد." });
        if (password.length < 4) return res.status(400).json({ error: "رمز عبور باید حداقل ۴ کاراکتر باشد." });
        await dbRun("INSERT INTO Users (username, password, role, status, created_at) VALUES (?, ?, ?, ?, ?)", [username, await hashPassword(password), role || 'user', 'active', new Date().toISOString()]);
        res.json({ success: true });
    } catch (e) {
        if (e.message.includes('UNIQUE')) return res.status(400).json({ error: "این نام کاربری قبلاً ثبت شده است!" });
        res.status(500).json({ error: e.message });
    }
});
app.put('/api/users/:id', authenticateToken, requireAdmin, auditMiddleware('User'), async (req, res) => {
    try {
        const { username, role, status } = req.body;
        const userId = parseInt(req.params.id);
        if (userId === 1 && status === 'disabled') return res.status(400).json({ error: "کاربر اصلی قابل غیرفعال کردن نیست!" });
        if (userId === 1 && role !== 'admin') return res.status(400).json({ error: "نقش کاربر اصلی قابل تغییر نیست!" });
        if (username) {
            if (username.length < 3) return res.status(400).json({ error: "نام کاربری باید حداقل ۳ کاراکتر باشد." });
            if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: "نام کاربری فقط شامل حروف، اعداد و زیرخط باشد." });
        }
        const updates = [];
        const params = [];
        if (username) { updates.push("username = ?"); params.push(username); }
        if (role) { updates.push("role = ?"); params.push(role); }
        if (status) { updates.push("status = ?"); params.push(status); }
        if (!updates.length) return res.status(400).json({ error: "تغییری اعمال نشد!" });
        params.push(userId);
        await dbRun(`UPDATE Users SET ${updates.join(', ')} WHERE id = ?`, params);
        res.json({ success: true });
    } catch (e) {
        if (e.message.includes('UNIQUE')) return res.status(400).json({ error: "این نام کاربری قبلاً ثبت شده است!" });
        res.status(500).json({ error: e.message });
    }
});
app.put('/api/users/:id/password', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) return res.status(400).json({ error: "رمز عبور جدید الزامی است!" });
        if (password.length < 4) return res.status(400).json({ error: "رمز عبور باید حداقل ۴ کاراکتر باشد." });
        await dbRun("UPDATE Users SET password = ? WHERE id = ?", [await hashPassword(password), req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/users/:id', authenticateToken, requireAdmin, auditMiddleware('User'), async (req, res) => {
    try {
        if (parseInt(req.params.id) === 1) return res.status(400).json({ error: "کاربر اصلی قابل حذف نیست!" });
        await dbRun("DELETE FROM Users WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== PERSONNEL VALIDATION =====
function validatePersonnel(body) {
    const errors = [];
    if (!body.name || !body.name.trim()) errors.push('نام الزامی است.');
    if (!body.lname || !body.lname.trim()) errors.push('نام خانوادگی الزامی است.');
    if (body.national_id != null && body.national_id !== '') {
        const nid = String(body.national_id).trim();
        if (!/^\d{10}$/.test(nid)) errors.push('کد ملی باید ۱۰ رقم باشد.');
    }
    if (body.phone && !/^[0-9+\-\s]{7,15}$/.test(body.phone.trim())) errors.push('شماره تماس نامعتبر است.');
    return errors;
}

// ===== PERSONNEL CRUD =====
app.post('/api/personnel', authenticateToken, auditMiddleware('Personnel'), async (req, res) => {
    try {
        const errs = validatePersonnel(req.body);
        if (errs.length) return res.status(400).json({ error: errs.join(' | ') });
        const { name, lname, father_name, national_id, emp_num, hire_date, emp_type, org_post, job_title, last_degree, phone, address, status, notes } = req.body;
        const nid = national_id != null && national_id !== '' ? String(national_id).trim() : null;
        await dbRun(`INSERT INTO Personnel (name,lname,father_name,national_id,emp_num,hire_date,emp_type,org_post,job_title,last_degree,phone,address,status,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [name.trim(), lname.trim(), father_name, nid, emp_num||null, hire_date, emp_type, org_post, job_title, last_degree, phone, address, status||'فعال', notes]);
        res.json({ success: true });
    } catch (e) {
        if (e.message.includes('UNIQUE')) return res.status(400).json({ error: "کد ملی یا شماره پرسنلی قبلاً ثبت شده است!" });
        res.status(400).json({ error: e.message });
    }
});
app.get('/api/personnel', authenticateToken, async (req, res) => {
    try { res.json(await dbAll("SELECT * FROM Personnel ORDER BY id DESC")); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/personnel/:id', authenticateToken, auditMiddleware('Personnel'), async (req, res) => {
    try {
        const errs = validatePersonnel(req.body);
        if (errs.length) return res.status(400).json({ error: errs.join(' | ') });
        const { name, lname, father_name, national_id, emp_num, hire_date, emp_type, org_post, job_title, last_degree, phone, address, status, notes } = req.body;
        const nid = national_id != null && national_id !== '' ? String(national_id).trim() : null;
        await dbRun(`UPDATE Personnel SET name=?,lname=?,father_name=?,national_id=?,emp_num=?,hire_date=?,emp_type=?,org_post=?,job_title=?,last_degree=?,phone=?,address=?,status=?,notes=? WHERE id=?`,
            [name.trim(), lname.trim(), father_name, nid, emp_num||null, hire_date, emp_type, org_post, job_title, last_degree, phone, address, status, notes, req.params.id]);
        res.json({ success: true });
    } catch (e) {
        if (e.message.includes('UNIQUE')) return res.status(400).json({ error: "کد ملی یا شماره پرسنلی تکراری است!" });
        res.status(400).json({ error: e.message });
    }
});
app.delete('/api/personnel/:id', authenticateToken, requireAdmin, auditMiddleware('Personnel'), async (req, res) => {
    try { await dbRun("DELETE FROM Personnel WHERE id = ?", [req.params.id]); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== PERSONNEL BULK IMPORT =====
app.post('/api/personnel/bulk', authenticateToken, async (req, res) => {
    try {
        const data = req.body;
        if (!Array.isArray(data) || !data.length) return res.status(400).json({ error: "فایل خالی است" });
        if (data.length > 1000) return res.status(400).json({ error: "حداکثر ۱۰۰۰ ردیف مجاز است." });

        const existing = await dbAll("SELECT national_id, emp_num FROM Personnel");
        const natIds = new Set(existing.filter(r => r.national_id).map(r => r.national_id));
        const empNums = new Set(existing.filter(r => r.emp_num).map(r => r.emp_num));
        let successCount = 0;
        const errors = [];

        await dbRun("BEGIN TRANSACTION");
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNum = i + 2;
            const r = {
                name: (row['نام']||row['name']||'').toString().trim(),
                lname: (row['نام خانوادگی']||row['lname']||'').toString().trim(),
                father_name: (row['نام پدر']||row['father_name']||'').toString().trim(),
                national_id: (row['کد ملی']||row['national_id']||'').toString().trim()||null,
                emp_num: (row['شماره پرسنلی']||row['emp_num']||'').toString().trim()||null,
                hire_date: (row['تاریخ استخدام']||row['hire_date']||'').toString().trim(),
                emp_type: (row['نوع استخدام']||row['emp_type']||'').toString().trim(),
                org_post: (row['پست سازمانی']||row['org_post']||'').toString().trim(),
                job_title: (row['عنوان شغل']||row['job_title']||'').toString().trim(),
                last_degree: (row['آخرین مدرک']||row['last_degree']||'').toString().trim(),
                phone: (row['شماره تماس']||row['phone']||'').toString().trim(),
                address: (row['آدرس']||row['address']||'').toString().trim(),
                status: (row['وضعیت']||row['status']||'فعال').toString().trim(),
                notes: (row['توضیحات']||row['notes']||'').toString().trim()
            };
            if (!r.name||!r.lname) { errors.push(`ردیف ${rowNum}: نام خالی`); continue; }
            if (r.national_id && natIds.has(r.national_id)) { errors.push(`ردیف ${rowNum}: کد ملی "${r.national_id}" تکراری`); continue; }
            if (r.emp_num && empNums.has(r.emp_num)) { errors.push(`ردیف ${rowNum}: شماره پرسنلی "${r.emp_num}" تکراری`); continue; }
            try {
                await dbRun(`INSERT INTO Personnel (name,lname,father_name,national_id,emp_num,hire_date,emp_type,org_post,job_title,last_degree,phone,address,status,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                    [r.name,r.lname,r.father_name,r.national_id,r.emp_num,r.hire_date,r.emp_type,r.org_post,r.job_title,r.last_degree,r.phone,r.address,r.status,r.notes]);
                successCount++;
                if (r.national_id) natIds.add(r.national_id);
                if (r.emp_num) empNums.add(r.emp_num);
            } catch (err) { errors.push(`ردیف ${rowNum}: خطا`); }
        }
        await dbRun("COMMIT");
        res.json({ success: true, imported: successCount, failed: errors.length, errors });
    } catch (e) {
        await dbRun("ROLLBACK").catch(() => {});
        res.status(500).json({ error: "خطا در ثبت" });
    }
});

// ===== MISSIONS CRUD =====
const MISSION_FIELDS = ['decree_num','name','lname','emp_num','job_title','mission_type','device_type','repair_type','region','location','subject','device_serial','duration','overtime_hours','start_date','end_date','issue_date','is_single','is_group','is_supplied','is_unsupplied','is_issued','is_extended','is_gov','is_plane','is_train','is_agency','is_bus','is_personal'];

async function generateDecreeNum() {
    const now = new Date();
    const j = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const datePart = `${j.jy}${String(j.jm).padStart(2,'0')}${String(j.jd).padStart(2,'0')}`;
    const prefix = `RSTC-${datePart}-`;
    const last = await dbGet("SELECT decree_num FROM Missions WHERE decree_num LIKE ? ORDER BY id DESC LIMIT 1", [prefix + '%']);
    let seq = 1;
    if (last && last.decree_num) {
        const parts = last.decree_num.split('-');
        seq = parseInt(parts[2] || '0') + 1;
    }
    return prefix + String(seq).padStart(4, '0');
}

function toJalaali(gy,gm,gd){var g_d_m=[0,31,59,90,120,151,181,212,243,273,304,334];var jy=(gy<=1600)?0:979;gy-=(gy<=1600)?621:1600;var gy2=(gm>2)?(gy+1):gy;var days=365*gy+Math.floor((gy2+3)/4)-Math.floor((gy2+99)/100)+Math.floor((gy2+399)/400)-80+gd+g_d_m[gm-1];jy+=33*Math.floor(days/12053);days%=12053;jy+=4*Math.floor(days/1461);days%=1461;if(days>365){jy+=Math.floor((days-1)/365);days=(days-1)%365;}var jm=(days<186)?1+Math.floor(days/31):7+Math.floor((days-186)/30);var jd=1+((days<186)?(days%31):((days-186)%30));return{jy,jm,jd};}

app.post('/api/missions', authenticateToken, auditMiddleware('Mission'), async (req, res) => {
    try {
        const { name, start_date, end_date, issue_date } = req.body;
        if (!name || !start_date || !end_date || !issue_date)
            return res.status(400).json({ error: 'فیلدهای الزامی: نام و تاریخ‌ها' });
        const decree_num = await generateDecreeNum();
        const body = { ...req.body, decree_num };
        const values = MISSION_FIELDS.map(f => body[f] === undefined ? null : body[f]);
        await dbRun(`INSERT INTO Missions (${MISSION_FIELDS.join(',')}) VALUES (${MISSION_FIELDS.map(() => '?').join(',')})`, values);
        res.json({ success: true, decree_num });
    } catch (e) {
        if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'خطا در شماره حکم!' });
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/missions', authenticateToken, async (req, res) => {
    try {
        // ✅ BUG FIX: بدون JOIN چون مستقیم name/lname ذخیره شده
        res.json(await dbAll("SELECT * FROM Missions ORDER BY id DESC"));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/missions/:id', authenticateToken, auditMiddleware('Mission'), async (req, res) => {
    try {
        const { name, start_date, end_date, issue_date } = req.body;
        if (!name || !start_date || !end_date || !issue_date)
            return res.status(400).json({ error: 'فیلدهای الزامی: نام و تاریخ‌ها' });
        const UPDATE_FIELDS = MISSION_FIELDS.filter(f => f !== 'decree_num');
        const values = UPDATE_FIELDS.map(f => req.body[f] === undefined ? null : req.body[f]);
        await dbRun(`UPDATE Missions SET ${UPDATE_FIELDS.map(f => `${f}=?`).join(',')} WHERE id=?`, [...values, req.params.id]);
        res.json({ success: true });
    } catch (e) {
        if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'این شماره حکم قبلاً ثبت شده است!' });
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/missions/:id', authenticateToken, requireAdmin, auditMiddleware('Mission'), async (req, res) => {
    try { await dbRun("DELETE FROM Missions WHERE id = ?", [req.params.id]); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== REPORTS =====
app.post('/api/reports/missions', authenticateToken, async (req, res) => {
    try {
        const { name, lname, emp_num, decree_num, device_type, device_serial, region, mission_type, location, start_date_from, start_date_to, end_date_from, end_date_to, issue_date_from, issue_date_to } = req.body || {};
        const conditions = [], params = [];
        if (name) { conditions.push("name LIKE ?"); params.push(`%${name}%`); }
        if (lname) { conditions.push("lname LIKE ?"); params.push(`%${lname}%`); }
        if (emp_num) { conditions.push("emp_num LIKE ?"); params.push(`%${emp_num}%`); }
        if (decree_num) { conditions.push("decree_num LIKE ?"); params.push(`%${decree_num}%`); }
        if (device_type) { conditions.push("device_type LIKE ?"); params.push(`%${device_type}%`); }
        if (device_serial) { conditions.push("device_serial LIKE ?"); params.push(`%${device_serial}%`); }
        if (region) { conditions.push("region = ?"); params.push(region); }
        if (mission_type) { conditions.push("mission_type LIKE ?"); params.push(`%${mission_type}%`); }
        if (location) { conditions.push("location LIKE ?"); params.push(`%${location}%`); }
        if (start_date_from) { conditions.push("start_date >= ?"); params.push(start_date_from); }
        if (start_date_to) { conditions.push("start_date <= ?"); params.push(start_date_to); }
        if (end_date_from) { conditions.push("end_date >= ?"); params.push(end_date_from); }
        if (end_date_to) { conditions.push("end_date <= ?"); params.push(end_date_to); }
        if (issue_date_from) { conditions.push("issue_date >= ?"); params.push(issue_date_from); }
        if (issue_date_to) { conditions.push("issue_date <= ?"); params.push(issue_date_to); }
        const where = conditions.length ? " WHERE " + conditions.join(" AND ") : "";
        const rows = await dbAll(`SELECT * FROM Missions${where} ORDER BY id DESC`, params);
        const total = await dbGet(`SELECT COUNT(*) as count FROM Missions${where}`, params);
        res.json({ results: rows, total: total.count });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== BACKUP =====
const fs = require('fs');
app.get('/api/backup', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    const dbPath = path.resolve(DB_PATH);
    if (!fs.existsSync(dbPath)) return res.status(404).json({ error: 'فایل دیتابیس یافت نشد' });
    // ✅ FIX: قبل از خواندن فایل، تمام تراکنش‌های WAL را به فایل اصلی .db منتقل می‌کنیم
    // در غیر این صورت آخرین تغییرات ثبت‌شده ممکن است در بکاپ نباشند
    try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (e) { console.error('Checkpoint warning:', e.message); }
    res.setHeader('Content-Disposition', `attachment; filename=RSTC_Backup_${new Date().toISOString().slice(0,10)}.db`);
    res.setHeader('Content-Type', 'application/octet-stream');
    fs.createReadStream(dbPath).pipe(res);
});

app.post('/api/restore', authenticateToken, express.raw({ type: 'application/octet-stream', limit: '50mb' }), (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    try {
        const dbPath = path.resolve(DB_PATH);
        const backupPath = dbPath + '.bak';

        // ✅ FIX: قبل از جایگزینی فایل، کانکشن زنده فعلی را می‌بندیم
        // در غیر این صورت better-sqlite3 (به‌خصوص در حالت WAL) همچنان به نسخه قدیمی
        // اشاره می‌کند و داده‌های بازیابی‌شده هرگز در پاسخ‌های API دیده نمی‌شوند
        try { db.close(); } catch (e) { console.error('DB close warning:', e.message); }

        if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, backupPath);
        fs.writeFileSync(dbPath, req.body);

        // پاک کردن فایل‌های جانبی WAL/SHM قدیمی که ممکن است با فایل جدید ناسازگار باشند
        [`${dbPath}-wal`, `${dbPath}-shm`].forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });

        // باز کردن مجدد کانکشن روی فایل تازه بازیابی‌شده
        db = new Database(dbPath);
        db.pragma('journal_mode = WAL');

        res.json({ success: true, message: 'بازیابی با موفقیت انجام شد و اطلاعات جدید فعال شدند.' });
    } catch (e) {
        res.status(500).json({ error: 'خطا در بازیابی: ' + e.message });
    }
});

// ===== OPTIONS (Dropdown Management — stored in database) =====
async function readOptions() {
    const rows = await dbAll("SELECT field, label, options FROM SystemOptions");
    const result = {};
    for (const row of rows) {
        result[row.field] = { label: row.label, options: JSON.parse(row.options) };
    }
    return result;
}
async function writeOptionsField(field, label, optionsArray) {
    await dbRun(
        "INSERT OR REPLACE INTO SystemOptions (field, label, options) VALUES (?, ?, ?)",
        [field, label, JSON.stringify(optionsArray)]
    );
}

app.get('/api/options', authenticateToken, async (req, res) => {
    try { res.json(await readOptions()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/options/:field', authenticateToken, async (req, res) => {
    try {
        const all = await readOptions();
        const field = all[req.params.field];
        if (!field) return res.status(404).json({ error: 'فیلد یافت نشد' });
        res.json(field);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/options/:field', authenticateToken, auditMiddleware('Option'), async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    try {
        const { field } = req.params;
        const { label, value } = req.body;
        if (!value || !value.trim()) return res.status(400).json({ error: 'مقدار گزینه الزامی است' });
        const all = await readOptions();
        if (!all[field]) all[field] = { label: label || field, options: [] };
        if (all[field].options.includes(value.trim())) return res.status(400).json({ error: 'این گزینه قبلاً وجود دارد' });
        all[field].options.push(value.trim());
        await writeOptionsField(field, all[field].label, all[field].options);
        res.json({ success: true, options: all[field].options });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/options/:field', authenticateToken, auditMiddleware('Option'), async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    try {
        const { field } = req.params;
        const { oldValue, newValue, label } = req.body;
        if (!newValue || !newValue.trim()) return res.status(400).json({ error: 'مقدار جدید الزامی است' });
        const all = await readOptions();
        if (!all[field]) return res.status(404).json({ error: 'فیلد یافت نشد' });
        const idx = all[field].options.indexOf(oldValue);
        if (idx === -1) return res.status(404).json({ error: 'گزینه یافت نشد' });
        if (oldValue !== newValue.trim() && all[field].options.includes(newValue.trim())) {
            return res.status(400).json({ error: 'این نام قبلاً استفاده شده' });
        }
        all[field].options[idx] = newValue.trim();
        if (label) all[field].label = label;
        await writeOptionsField(field, all[field].label, all[field].options);
        res.json({ success: true, options: all[field].options });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/options/:field/:index', authenticateToken, auditMiddleware('Option'), async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    try {
        const { field, index } = req.params;
        const all = await readOptions();
        if (!all[field]) return res.status(404).json({ error: 'فیلد یافت نشد' });
        const idx = parseInt(index);
        if (isNaN(idx) || idx < 0 || idx >= all[field].options.length) return res.status(400).json({ error: 'ایندکس نامعتبر' });
        all[field].options.splice(idx, 1);
        await writeOptionsField(field, all[field].label, all[field].options);
        res.json({ success: true, options: all[field].options });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== AUDIT LOG API =====
app.get('/api/audit', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { entity, username, limit: lim } = req.query || {};
        const conditions = [], params = [];
        if (entity) { conditions.push("entity = ?"); params.push(entity); }
        if (username) { conditions.push("username LIKE ?"); params.push(`%${username}%`); }
        const where = conditions.length ? " WHERE " + conditions.join(" AND ") : "";
        const rows = await dbAll(`SELECT * FROM AuditLog${where} ORDER BY id DESC LIMIT ?`, [...params, parseInt(lim) || 100]);
        res.json({ results: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ===== SCHEDULED BACKUP =====
// پوشه بکاپ کنار فایل دیتابیس ساخته می‌شود — روی Railway این یعنی داخل همان Volume دائمی
const BACKUP_DIR = path.join(path.dirname(path.resolve(DB_PATH)), 'backups');
function scheduledBackup() {
    try {
        if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
        const dbPath = path.resolve(DB_PATH);
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const dest = path.join(BACKUP_DIR, `rstc_backup_${ts}.db`);
        fs.copyFileSync(dbPath, dest);
        // Keep only last 30 backups
        const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.db')).sort().reverse();
        files.slice(30).forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));
        console.log(`💾 Backup created: ${dest}`);
    } catch (e) { console.error('Backup error:', e.message); }
}
// Run backup check every hour, only backup at 2 AM
setInterval(() => {
    const now = new Date();
    if (now.getHours() === 2 && now.getMinutes() === 0) scheduledBackup();
}, 60000);

// ===== PDF EXPORT (client-side via jsPDF) =====
const { buildMissionDecreeHTML } = require('./pdf_template');

// ===== PDF EXPORT (client-side via jsPDF) =====
// REMOVE server-side PDF generation completely

app.get('/api/missions/:id/pdf', (req, res) => {
    res.status(404).json({ error: 'PDF export is now client-side only. Use jsPDF for PDF generation.' });
});

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ===== START =====
initializeDatabase().then(() => {
    app.listen(PORT, () => console.log(`🚀 RSTC running → http://localhost:${PORT}`));
});
