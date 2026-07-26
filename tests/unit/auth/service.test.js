const bcrypt = require('bcrypt');
const { hashPassword, legacyHash } = require('../../../src/infrastructure/security/password.service');
const { signJwt } = require('../../../src/infrastructure/security/jwt.service');
const { deserializePermissions } = require('../../../src/infrastructure/security/permission.service');
const { findUserByUsername, updateUserPassword, updateUserLogin } = require('../../../src/domains/auth/repository');
const { login } = require('../../../src/domains/auth/service');

jest.mock('bcrypt');
jest.mock('../../../src/infrastructure/security/password.service');
jest.mock('../../../src/infrastructure/security/jwt.service');
jest.mock('../../../src/infrastructure/security/permission.service');
jest.mock('../../../src/domains/auth/repository');
jest.mock('../../../src/domains/users/repository');

describe('auth/service - login', () => {
    const mockUser = {
        id: 1,
        username: 'testuser',
        password: 'bcrypt_hash',
        role: 'admin',
        permissions: '["read"]',
        status: 'active'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns 400 when username is missing', async () => {
        const result = await login('', 'pass', '127.0.0.1', new Map());
        expect(result.status).toBe(400);
        expect(result.body.success).toBe(false);
    });

    test('returns 400 when password is missing', async () => {
        const result = await login('user', '', '127.0.0.1', new Map());
        expect(result.status).toBe(400);
        expect(result.body.success).toBe(false);
    });

    test('returns 401 when user not found', async () => {
        findUserByUsername.mockResolvedValue(null);
        const result = await login('unknown', 'pass', '127.0.0.1', new Map());
        expect(result.status).toBe(401);
        expect(result.body.success).toBe(false);
        expect(findUserByUsername).toHaveBeenCalledWith('unknown');
    });

    test('returns 403 when user is disabled', async () => {
        findUserByUsername.mockResolvedValue({ ...mockUser, status: 'disabled' });
        const result = await login('testuser', 'pass', '127.0.0.1', new Map());
        expect(result.status).toBe(403);
        expect(result.body.success).toBe(false);
    });

    test('returns 401 when bcrypt password is wrong', async () => {
        findUserByUsername.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(false);
        const result = await login('testuser', 'wrongpass', '127.0.0.1', new Map());
        expect(result.status).toBe(401);
        expect(result.body.success).toBe(false);
        expect(bcrypt.compare).toHaveBeenCalledWith('wrongpass', 'bcrypt_hash');
    });

    test('returns 200 with token on successful bcrypt login', async () => {
        findUserByUsername.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(true);
        signJwt.mockReturnValue('mocked-jwt-token');
        deserializePermissions.mockReturnValue(['read']);

        const loginAttempts = new Map();
        const result = await login('testuser', 'correctpass', '127.0.0.1', loginAttempts);

        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(result.body.token).toBe('mocked-jwt-token');
        expect(result.body.role).toBe('admin');
        expect(result.body.username).toBe('testuser');
        expect(result.body.permissions).toEqual(['read']);

        expect(updateUserLogin).toHaveBeenCalledWith(1, expect.any(String));
        expect(updateUserPassword).not.toHaveBeenCalled();
        expect(loginAttempts.has('127.0.0.1')).toBe(false);
    });

    test('clears loginAttempts when ip and loginAttempts are provided', async () => {
        findUserByUsername.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(true);
        signJwt.mockReturnValue('mocked-jwt-token');
        deserializePermissions.mockReturnValue([]);

        const loginAttempts = new Map([['127.0.0.1', 3]]);
        const result = await login('testuser', 'correctpass', '127.0.0.1', loginAttempts);

        expect(result.status).toBe(200);
        expect(loginAttempts.has('127.0.0.1')).toBe(false);
        expect(loginAttempts.size).toBe(0);
    });

    test('does not clear loginAttempts when ip is missing', async () => {
        findUserByUsername.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(true);
        signJwt.mockReturnValue('mocked-jwt-token');
        deserializePermissions.mockReturnValue([]);

        const loginAttempts = new Map([['127.0.0.1', 3]]);
        const result = await login('testuser', 'correctpass', null, loginAttempts);

        expect(result.status).toBe(200);
        expect(loginAttempts.has('127.0.0.1')).toBe(true);
    });

    test('does not clear loginAttempts when loginAttempts map is missing', async () => {
        findUserByUsername.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(true);
        signJwt.mockReturnValue('mocked-jwt-token');
        deserializePermissions.mockReturnValue([]);

        const result = await login('testuser', 'correctpass', '127.0.0.1', null);

        expect(result.status).toBe(200);
    });

    test('upgrades legacy hash password on successful login', async () => {
        const legacyHex = 'a'.repeat(64);
        const legacyUser = { ...mockUser, password: legacyHex };
        findUserByUsername.mockResolvedValue(legacyUser);
        legacyHash.mockReturnValue(legacyHex);
        bcrypt.compare.mockResolvedValue(false);
        hashPassword.mockResolvedValue('new_bcrypt_hash');
        signJwt.mockReturnValue('mocked-jwt-token');
        deserializePermissions.mockReturnValue([]);

        const result = await login('testuser', 'oldpass', '127.0.0.1', new Map());

        expect(result.status).toBe(200);
        expect(updateUserPassword).toHaveBeenCalledWith(1, 'new_bcrypt_hash');
        expect(updateUserLogin).toHaveBeenCalledWith(1, expect.any(String));
    });

    test('returns 401 when legacy hash does not match', async () => {
        const legacyUser = { ...mockUser, password: 'abc123def456' };
        findUserByUsername.mockResolvedValue(legacyUser);
        legacyHash.mockReturnValue('different_hash');
        signJwt.mockReturnValue('mocked-jwt-token');
        deserializePermissions.mockReturnValue([]);

        const result = await login('testuser', 'wrongpass', '127.0.0.1', new Map());

        expect(result.status).toBe(401);
        expect(updateUserPassword).not.toHaveBeenCalled();
    });

    test('handles DB error on findUserByUsername', async () => {
        findUserByUsername.mockRejectedValue(new Error('DB connection lost'));
        const result = await login('testuser', 'pass', '127.0.0.1', new Map());
        expect(result.status).toBe(500);
        expect(result.body.error).toBe('DB connection lost');
    });

    test('handles DB error on updateUserLogin', async () => {
        findUserByUsername.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(true);
        signJwt.mockReturnValue('mocked-jwt-token');
        deserializePermissions.mockReturnValue([]);
        updateUserLogin.mockRejectedValue(new Error('DB write failed'));

        const result = await login('testuser', 'pass', '127.0.0.1', new Map());
        expect(result.status).toBe(500);
        expect(result.body.error).toBe('DB write failed');
    });
});
