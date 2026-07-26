require('dotenv').config();
const { PORT, JWT_SECRET } = require('./src/infrastructure/config/env');
const {
    helmetMiddleware,
    corsMiddleware,
} = require('./src/infrastructure/middleware/security.middleware');
const authRoutes = require('./src/domains/auth/routes');
const personnelRoutes = require('./src/domains/personnel/routes');
const missionsRoutes = require('./src/domains/missions/routes');
const usersRoutes = require('./src/domains/users/routes');
const reportsRoutes = require('./src/domains/reports/routes');
const dashboardRoutes = require('./src/domains/dashboard/routes');
const backupRoutes = require('./src/domains/backup/routes');
const optionsRoutes = require('./src/domains/options/routes');
const auditRoutes = require('./src/domains/audit/routes');
const aiRoutes = require('./src/domains/ai/routes');
const { startScheduledBackup } = require('./src/domains/backup/service');
const { initializeDatabase } = require('./src/infrastructure/database/initialize');
const express = require('express');
const path = require('path');
const { registerSwagger } = require('./docs/swagger');

const app = express();
app.disable('x-powered-by');
if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET is not set. Refusing to start.');
    process.exit(1);
}

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 0, etag: false }));

// ===== LOGIN =====
app.use('/api/login', authRoutes);

// ===== DASHBOARD =====
app.use('/api/dashboard', dashboardRoutes);

// ===== USERS =====
app.use('/api/users', usersRoutes);

// ===== PERSONNEL =====
app.use('/api/personnel', personnelRoutes);

// ===== MISSIONS =====
app.use('/api/missions', missionsRoutes);

// ===== REPORTS =====
app.use('/api/reports', reportsRoutes);

// ===== BACKUP =====
app.use('/api', backupRoutes);

// ===== OPTIONS (Dropdown Management — stored in database) =====
app.use('/api/options', optionsRoutes);

// ===== AUDIT LOG API =====
app.use('/api/audit', auditRoutes);

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ===== AI CHAT =====
app.use('/api/ai', aiRoutes);

// ===== SWAGGER DOCS (non-production only) =====
if (process.env.NODE_ENV !== 'production') {
    registerSwagger(app);
}

// ===== START =====
startScheduledBackup();
initializeDatabase().then(() => {
    app.listen(PORT, () => console.log(`🚀 RSTC running → http://localhost:${PORT}`));
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});
