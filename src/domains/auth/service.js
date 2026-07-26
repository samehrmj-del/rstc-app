const bcrypt = require('bcrypt');
const { hashPassword, legacyHash } = require('../../infrastructure/security/password.service');
const { signJwt } = require('../../infrastructure/security/jwt.service');
const { deserializePermissions } = require('../../infrastructure/security/permission.service');
const { findUserByUsername, updateUserPassword, updateUserLogin } = require('./repository');

async function login(username, password, ip, loginAttempts) {
    if (!username || !password) {
        return {
            status: 400,
            body: { success: false, message: 'نام کاربری و رمز عبور الزامی است.' },
        };
    }

    try {
        const user = await findUserByUsername(username);
        if (!user) {
            return {
                status: 401,
                body: { success: false, message: 'نام کاربری یا رمز عبور اشتباه است' },
            };
        }

        if (user.status === 'disabled') {
            return {
                status: 403,
                body: {
                    success: false,
                    message: 'حساب کاربری غیرفعال شده است. با مدیر سیستم تماس بگیرید.',
                },
            };
        }

        let isMatch = false,
            needsUpgrade = false;
        if (/^[a-fA-F0-9]{64}$/.test(user.password)) {
            isMatch = user.password === legacyHash(password);
            needsUpgrade = isMatch;
        } else {
            isMatch = await bcrypt.compare(password, user.password);
        }

        if (!isMatch) {
            return {
                status: 401,
                body: { success: false, message: 'نام کاربری یا رمز عبور اشتباه است' },
            };
        }

        if (needsUpgrade) {
            await updateUserPassword(user.id, await hashPassword(password));
        }

        if (ip && loginAttempts) {
            loginAttempts.delete(ip);
        }

        const now = new Date().toISOString();
        await updateUserLogin(user.id, now);

        const permissions = deserializePermissions(user.permissions);
        const token = signJwt({
            id: user.id,
            username: user.username,
            role: user.role,
            permissions,
        });

        return {
            status: 200,
            body: { success: true, token, role: user.role, username: user.username, permissions },
        };
    } catch (e) {
        console.error('Login error:', e.message);

        return { status: 500, body: { error: e.message } };
    }
}

module.exports = { login };
