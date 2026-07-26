const path = require('path');

process.env.DB_PATH = path.resolve(__dirname, '..', 'tmp', 'test.db');

const { helmetMiddleware, corsMiddleware } = require('../../src/infrastructure/middleware/security.middleware');
const authRoutes = require('../../src/domains/auth/routes');
const personnelRoutes = require('../../src/domains/personnel/routes');
const missionsRoutes = require('../../src/domains/missions/routes');
const usersRoutes = require('../../src/domains/users/routes');
const reportsRoutes = require('../../src/domains/reports/routes');
const dashboardRoutes = require('../../src/domains/dashboard/routes');
const backupRoutes = require('../../src/domains/backup/routes');
const optionsRoutes = require('../../src/domains/options/routes');
const auditRoutes = require('../../src/domains/audit/routes');
const aiRoutes = require('../../src/domains/ai/routes');
const { initializeDatabase } = require('../../src/infrastructure/database/initialize');
const express = require('express');

const app = express();
app.disable('x-powered-by');
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));

app.use('/api/login', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/missions', missionsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api', backupRoutes);
app.use('/api/options', optionsRoutes);
app.use('/api/audit', auditRoutes);
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/ai', aiRoutes);

module.exports = { app, initializeDatabase };
