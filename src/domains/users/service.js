const bcrypt = require('bcrypt');
const { hashPassword } = require('../../infrastructure/security/password.service');
const {
    getDefaultPermissions,
    serializePermissions,
} = require('../../infrastructure/security/permission.service');
const {
    findUserById,
    createUser,
    updateUser,
    updateUserPassword,
    deleteUser,
} = require('./repository');

async function createUserRecord(body) {
    const { username, password, role, permissions } = body;
    if (!username || !password) {
        return { status: 400, body: { error: 'نام کاربری و رمز عبور الزامی است!' } };
    }

    if (username.length < 3) {
        return { status: 400, body: { error: 'نام کاربری باید حداقل ۳ کاراکتر باشد.' } };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { status: 400, body: { error: 'نام کاربری فقط شامل حروف، اعداد و زیرخط باشد.' } };
    }

    if (password.length < 4) {
        return { status: 400, body: { error: 'رمز عبور باید حداقل ۴ کاراکتر باشد.' } };
    }

    const finalPerms = Array.isArray(permissions)
        ? permissions
        : getDefaultPermissions(role || 'user');
    try {
        await createUser({
            username,
            password: await hashPassword(password),
            role: role || 'user',
            permissions: serializePermissions(finalPerms),
            status: 'active',
            created_at: new Date().toISOString(),
        });

        return { status: 200, body: { success: true } };
    } catch (e) {
        if (e.message.includes('UNIQUE')) {
            return { status: 400, body: { error: 'این نام کاربری قبلاً ثبت شده است!' } };
        }

        return { status: 500, body: { error: e.message } };
    }
}

async function updateUserRecord(id, body) {
    const { username, role, status, permissions } = body;
    const userId = parseInt(id);
    if (userId === 1 && status === 'disabled') {
        return { status: 400, body: { error: 'کاربر اصلی قابل غیرفعال کردن نیست!' } };
    }

    if (userId === 1 && role !== 'admin') {
        return { status: 400, body: { error: 'نقش کاربر اصلی قابل تغییر نیست!' } };
    }

    const targetUser = await findUserById(userId);
    if (!targetUser) {
        return { status: 404, body: { error: 'کاربر یافت نشد!' } };
    }

    const isTargetAdmin = targetUser.role === 'admin';
    if (isTargetAdmin && role && role !== 'admin') {
        return { status: 400, body: { error: 'نقش ادمین قابل تغییر نیست!' } };
    }

    if (username) {
        if (username.length < 3) {
            return { status: 400, body: { error: 'نام کاربری باید حداقل ۳ کاراکتر باشد.' } };
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return {
                status: 400,
                body: { error: 'نام کاربری فقط شامل حروف، اعداد و زیرخط باشد.' },
            };
        }
    }

    const updates = [];
    const params = [];
    if (username) {
        updates.push('username = ?');
        params.push(username);
    }

    if (role && !isTargetAdmin) {
        updates.push('role = ?');
        params.push(role);
    }

    if (status) {
        updates.push('status = ?');
        params.push(status);
    }

    if (permissions !== undefined) {
        updates.push('permissions = ?');
        params.push(
            serializePermissions(
                Array.isArray(permissions)
                    ? permissions
                    : getDefaultPermissions(role || targetUser.role)
            )
        );
    }

    if (!updates.length) {
        return { status: 400, body: { error: 'تغییری اعمال نشد!' } };
    }

    try {
        await updateUser(userId, updates, params);

        return { status: 200, body: { success: true } };
    } catch (e) {
        if (e.message.includes('UNIQUE')) {
            return { status: 400, body: { error: 'این نام کاربری قبلاً ثبت شده است!' } };
        }

        return { status: 500, body: { error: e.message } };
    }
}

async function updateUserPasswordRecord(id, password) {
    if (!password) {
        return { status: 400, body: { error: 'رمز عبور جدید الزامی است!' } };
    }

    if (password.length < 4) {
        return { status: 400, body: { error: 'رمز عبور باید حداقل ۴ کاراکتر باشد.' } };
    }

    try {
        await updateUserPassword(id, await hashPassword(password));

        return { status: 200, body: { success: true } };
    } catch (e) {
        return { status: 500, body: { error: e.message } };
    }
}

async function updateSelfPassword(userId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
        return { status: 400, body: { error: 'رمز عبور فعلی و جدید الزامی است!' } };
    }

    if (newPassword.length < 4) {
        return { status: 400, body: { error: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد.' } };
    }

    const user = await findUserById(userId);
    if (!user) {
        return { status: 404, body: { error: 'کاربر یافت نشد!' } };
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        return { status: 401, body: { error: 'رمز عبور فعلی اشتباه است!' } };
    }

    try {
        await updateUserPassword(userId, await hashPassword(newPassword));

        return { status: 200, body: { success: true } };
    } catch (e) {
        return { status: 500, body: { error: e.message } };
    }
}

async function deleteUserRecord(id) {
    if (parseInt(id) === 1) {
        return { status: 400, body: { error: 'کاربر اصلی قابل حذف نیست!' } };
    }

    try {
        await deleteUser(id);

        return { status: 200, body: { success: true } };
    } catch (e) {
        return { status: 500, body: { error: e.message } };
    }
}

module.exports = {
    createUserRecord,
    updateUserRecord,
    updateUserPasswordRecord,
    updateSelfPassword,
    deleteUserRecord,
};
