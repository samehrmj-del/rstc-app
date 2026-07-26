const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { deserializePermissions } = require('../security/permission.service');

function verifyJwt(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return reject(err);
            }

            resolve(user);
        });
    });
}

function createAuthenticateToken(dbGet) {
    return function authenticateToken(req, res, next) {
        const token = (req.headers['authorization'] || '').split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'دسترسی غیرمجاز! لطفاً ابتدا وارد شوید.' });
        }

        verifyJwt(token)
            .then((user) => {
                if (!user.permissions || !Array.isArray(user.permissions)) {
                    return dbGet('SELECT permissions FROM Users WHERE id = ?', [user.id])
                        .then((dbUser) => {
                            user.permissions = deserializePermissions(
                                dbUser && dbUser.permissions ? dbUser.permissions : null
                            );
                            req.user = user;
                            next();
                        })
                        .catch(() => {
                            req.user = user;
                            next();
                        });
                }

                req.user = user;
                next();
            })
            .catch(() => {
                return res.status(403).json({ error: 'توکن نامعتبر یا منقضی شده است.' });
            });
    };
}

module.exports = {
    createAuthenticateToken,
};
