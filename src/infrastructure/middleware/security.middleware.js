const helmet = require('helmet');
const cors = require('cors');
const { CORS_ORIGIN } = require('../config/env');

const corsOrigin = CORS_ORIGIN === 'false' ? false : CORS_ORIGIN || false;

const helmetMiddleware = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://cdn.sheetjs.com',
                'https://cdn.jsdelivr.net',
            ],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
            fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'data:'],
            imgSrc: ["'self'", 'data:', 'blob:'],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
        },
    },
});

const corsMiddleware = cors({ origin: corsOrigin });

const loginAttempts = new Map();

function rateLimitLogin(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const maxAttempts = 10;
    if (!loginAttempts.has(ip)) {
        loginAttempts.set(ip, { count: 0, resetTime: now + windowMs });
    }

    const record = loginAttempts.get(ip);
    if (now > record.resetTime) {
        record.count = 0;
        record.resetTime = now + windowMs;
    }

    if (record.count >= maxAttempts) {
        const remaining = Math.ceil((record.resetTime - now) / 60000);

        return res.status(429).json({
            success: false,
            message: `تعداد تلاش‌های مجاز تمام شد. ${remaining} دقیقه دیگر تلاش کنید.`,
        });
    }

    record.count++;
    next();
}

setInterval(() => {
    const now = Date.now();
    for (const [ip, r] of loginAttempts.entries()) {
        if (now > r.resetTime) {
            loginAttempts.delete(ip);
        }
    }
}, 300000);

module.exports = {
    helmetMiddleware,
    corsMiddleware,
    rateLimitLogin,
    loginAttempts,
};
