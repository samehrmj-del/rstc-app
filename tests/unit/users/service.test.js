const bcrypt = require('bcrypt');
const { hashPassword } = require('../../../src/infrastructure/security/password.service');
const { getDefaultPermissions, serializePermissions } = require('../../../src/infrastructure/security/permission.service');
const { findUserById, createUser, updateUser, updateUserPassword, deleteUser } = require('../../../src/domains/users/repository');
const {
    createUserRecord,
    updateUserRecord,
    updateUserPasswordRecord,
    updateSelfPassword,
    deleteUserRecord
} = require('../../../src/domains/users/service');

jest.mock('bcrypt');
jest.mock('../../../src/infrastructure/security/password.service');
jest.mock('../../../src/infrastructure/security/permission.service');
jest.mock('../../../src/domains/users/repository');

describe('users/service - createUserRecord', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns 400 when username is missing', async () => {
        const result = await createUserRecord({ password: 'pass' });
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('نام کاربری و رمز عبور الزامی است!');
    });

    test('returns 400 when password is missing', async () => {
        const result = await createUserRecord({ username: 'testuser' });
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('نام کاربری و رمز عبور الزامی است!');
    });

    test('returns 400 when username is too short', async () => {
        const result = await createUserRecord({ username: 'ab', password: 'pass' });
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('نام کاربری باید حداقل ۳ کاراکتر باشد.');
    });

    test('returns 400 when username contains invalid characters', async () => {
        const result = await createUserRecord({ username: 'test user!', password: 'pass' });
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('نام کاربری فقط شامل حروف، اعداد و زیرخط باشد.');
    });

    test('returns 400 when password is too short', async () => {
        const result = await createUserRecord({ username: 'testuser', password: '123' });
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('رمز عبور باید حداقل ۴ کاراکتر باشد.');
    });

    test('returns 200 on success with default permissions', async () => {
        hashPassword.mockResolvedValue('hashed_pw');
        getDefaultPermissions.mockReturnValue(['read']);
        serializePermissions.mockReturnValue('["read"]');
        createUser.mockResolvedValue({ lastID: 1, changes: 1 });

        const result = await createUserRecord({ username: 'testuser', password: 'password123' });

        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(createUser).toHaveBeenCalledWith({
            username: 'testuser',
            password: 'hashed_pw',
            role: 'user',
            permissions: '["read"]',
            status: 'active',
            created_at: expect.any(String)
        });
    });

    test('uses provided permissions when given as array', async () => {
        hashPassword.mockResolvedValue('hashed_pw');
        serializePermissions.mockReturnValue('["read","write"]');
        createUser.mockResolvedValue({ lastID: 1, changes: 1 });

        const result = await createUserRecord({ username: 'testuser', password: 'password123', permissions: ['read', 'write'] });

        expect(result.status).toBe(200);
        expect(serializePermissions).toHaveBeenCalledWith(['read', 'write']);
    });

    test('returns 400 on UNIQUE constraint violation', async () => {
        hashPassword.mockResolvedValue('hashed_pw');
        createUser.mockRejectedValue(new Error('UNIQUE constraint failed'));

        const result = await createUserRecord({ username: 'testuser', password: 'password123' });

        expect(result.status).toBe(400);
        expect(result.body.error).toBe('این نام کاربری قبلاً ثبت شده است!');
    });

    test('returns 500 on other DB errors', async () => {
        hashPassword.mockResolvedValue('hashed_pw');
        createUser.mockRejectedValue(new Error('Some other DB error'));

        const result = await createUserRecord({ username: 'testuser', password: 'password123' });

        expect(result.status).toBe(500);
        expect(result.body.error).toBe('Some other DB error');
    });
});

describe('users/service - updateUserRecord', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('blocks disabling primary user (id=1)', async () => {
        const result = await updateUserRecord(1, { status: 'disabled' });
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('کاربر اصلی قابل غیرفعال کردن نیست!');
        expect(findUserById).not.toHaveBeenCalled();
    });

    test('blocks changing primary user role from admin', async () => {
        const result = await updateUserRecord(1, { role: 'user' });
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('نقش کاربر اصلی قابل تغییر نیست!');
        expect(findUserById).not.toHaveBeenCalled();
    });

    test('returns 404 when target user not found', async () => {
        findUserById.mockResolvedValue(null);
        const result = await updateUserRecord(5, { username: 'newname' });
        expect(result.status).toBe(404);
        expect(result.body.error).toBe('کاربر یافت نشد!');
    });

    test('blocks changing admin role to non-admin', async () => {
        findUserById.mockResolvedValue({ id: 2, username: 'admin', role: 'admin' });
        const result = await updateUserRecord(2, { role: 'user' });
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('نقش ادمین قابل تغییر نیست!');
        expect(updateUser).not.toHaveBeenCalled();
    });

    test('returns 400 when username too short', async () => {
        findUserById.mockResolvedValue({ id: 2, username: 'admin', role: 'user' });
        const result = await updateUserRecord(2, { username: 'ab' });
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('نام کاربری باید حداقل ۳ کاراکتر باشد.');
    });

    test('returns 400 when username has invalid characters', async () => {
        findUserById.mockResolvedValue({ id: 2, username: 'admin', role: 'user' });
        const result = await updateUserRecord(2, { username: 'test user!' });
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('نام کاربری فقط شامل حروف، اعداد و زیرخط باشد.');
    });

    test('returns 200 on successful update', async () => {
        findUserById.mockResolvedValue({ id: 2, username: 'admin', role: 'user' });
        updateUser.mockResolvedValue({ lastID: 0, changes: 1 });

        const result = await updateUserRecord(2, { username: 'newuser' });

        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(updateUser).toHaveBeenCalledWith(2, ['username = ?'], ['newuser']);
    });

    test('returns 400 when no updates provided', async () => {
        findUserById.mockResolvedValue({ id: 2, username: 'admin', role: 'user' });
        const result = await updateUserRecord(2, {});
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('تغییری اعمال نشد!');
    });

    test('returns 400 on UNIQUE constraint violation', async () => {
        findUserById.mockResolvedValue({ id: 2, username: 'admin', role: 'user' });
        updateUser.mockRejectedValue(new Error('UNIQUE constraint failed'));

        const result = await updateUserRecord(2, { username: 'duplicate' });

        expect(result.status).toBe(400);
        expect(result.body.error).toBe('این نام کاربری قبلاً ثبت شده است!');
    });

    test('returns 400 when trying to change admin role', async () => {
        findUserById.mockResolvedValue({ id: 2, username: 'admin', role: 'admin' });
        const result = await updateUserRecord(2, { role: 'user' });
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('نقش ادمین قابل تغییر نیست!');
        expect(updateUser).not.toHaveBeenCalled();
    });

    test('allows updating non-role fields on admin user', async () => {
        findUserById.mockResolvedValue({ id: 2, username: 'admin', role: 'admin' });
        updateUser.mockResolvedValue({ lastID: 0, changes: 1 });

        const result = await updateUserRecord(2, { username: 'newadmin' });

        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(updateUser).toHaveBeenCalledWith(2, ['username = ?'], ['newadmin']);
    });
});

describe('users/service - updateUserPasswordRecord', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns 400 when password is missing', async () => {
        const result = await updateUserPasswordRecord(1, '');
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('رمز عبور جدید الزامی است!');
    });

    test('returns 400 when password is too short', async () => {
        const result = await updateUserPasswordRecord(1, '123');
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('رمز عبور باید حداقل ۴ کاراکتر باشد.');
    });

    test('returns 200 on success', async () => {
        hashPassword.mockResolvedValue('new_hash');
        updateUserPassword.mockResolvedValue({ lastID: 0, changes: 1 });

        const result = await updateUserPasswordRecord(1, 'newpass');

        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(updateUserPassword).toHaveBeenCalledWith(1, 'new_hash');
    });

    test('returns 500 on DB error', async () => {
        hashPassword.mockResolvedValue('new_hash');
        updateUserPassword.mockRejectedValue(new Error('DB error'));

        const result = await updateUserPasswordRecord(1, 'newpass');

        expect(result.status).toBe(500);
        expect(result.body.error).toBe('DB error');
    });
});

describe('users/service - updateSelfPassword', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns 400 when currentPassword is missing', async () => {
        const result = await updateSelfPassword(1, '', 'newpass');
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('رمز عبور فعلی و جدید الزامی است!');
    });

    test('returns 400 when newPassword is missing', async () => {
        const result = await updateSelfPassword(1, 'current', '');
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('رمز عبور فعلی و جدید الزامی است!');
    });

    test('returns 400 when newPassword is too short', async () => {
        const result = await updateSelfPassword(1, 'current', '123');
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('رمز عبور جدید باید حداقل ۴ کاراکتر باشد.');
    });

    test('returns 404 when user not found', async () => {
        findUserById.mockResolvedValue(null);
        const result = await updateSelfPassword(1, 'current', 'newpass');
        expect(result.status).toBe(404);
        expect(result.body.error).toBe('کاربر یافت نشد!');
    });

    test('returns 401 when current password is wrong', async () => {
        findUserById.mockResolvedValue({ id: 1, password: 'bcrypt_hash' });
        bcrypt.compare.mockResolvedValue(false);

        const result = await updateSelfPassword(1, 'wrongpass', 'newpass');

        expect(result.status).toBe(401);
        expect(result.body.error).toBe('رمز عبور فعلی اشتباه است!');
        expect(updateUserPassword).not.toHaveBeenCalled();
    });

    test('returns 200 on success', async () => {
        findUserById.mockResolvedValue({ id: 1, password: 'bcrypt_hash' });
        bcrypt.compare.mockResolvedValue(true);
        hashPassword.mockResolvedValue('new_hash');
        updateUserPassword.mockResolvedValue({ lastID: 0, changes: 1 });

        const result = await updateSelfPassword(1, 'currentpass', 'newpass');

        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(bcrypt.compare).toHaveBeenCalledWith('currentpass', 'bcrypt_hash');
        expect(hashPassword).toHaveBeenCalledWith('newpass');
        expect(updateUserPassword).toHaveBeenCalledWith(1, 'new_hash');
    });

    test('returns 500 on DB error', async () => {
        findUserById.mockResolvedValue({ id: 1, password: 'bcrypt_hash' });
        bcrypt.compare.mockResolvedValue(true);
        hashPassword.mockResolvedValue('new_hash');
        updateUserPassword.mockRejectedValue(new Error('DB error'));

        const result = await updateSelfPassword(1, 'currentpass', 'newpass');

        expect(result.status).toBe(500);
        expect(result.body.error).toBe('DB error');
    });
});

describe('users/service - deleteUserRecord', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('blocks deleting primary user (id=1)', async () => {
        const result = await deleteUserRecord(1);
        expect(result.status).toBe(400);
        expect(result.body.error).toBe('کاربر اصلی قابل حذف نیست!');
        expect(deleteUser).not.toHaveBeenCalled();
    });

    test('returns 200 on success', async () => {
        deleteUser.mockResolvedValue({ lastID: 0, changes: 1 });

        const result = await deleteUserRecord(5);

        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(deleteUser).toHaveBeenCalledWith(5);
    });

    test('returns 500 on DB error', async () => {
        deleteUser.mockRejectedValue(new Error('DB error'));

        const result = await deleteUserRecord(5);

        expect(result.status).toBe(500);
        expect(result.body.error).toBe('DB error');
    });
});
