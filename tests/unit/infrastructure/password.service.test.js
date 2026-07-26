const bcrypt = require('bcrypt');
const passwordService = require('../../../src/infrastructure/security/password.service');

jest.mock('bcrypt');
jest.mock('crypto');

describe('hashPassword', () => {
    it('calls bcrypt.hash with the password and 10 rounds', async () => {
        bcrypt.hash.mockResolvedValue('hashed_password');

        const result = await passwordService.hashPassword('mypassword');

        expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 10);
        expect(result).toBe('hashed_password');
    });

    it('returns the bcrypt hash result', async () => {
        bcrypt.hash.mockResolvedValue('$2b$10$mockedHashValue');

        const result = await passwordService.hashPassword('secret123');

        expect(result).toBe('$2b$10$mockedHashValue');
    });

    it('rejects when bcrypt.hash throws', async () => {
        bcrypt.hash.mockRejectedValue(new Error('bcrypt error'));

        await expect(passwordService.hashPassword('test')).rejects.toThrow('bcrypt error');
    });
});

describe('legacyHash', () => {
    it('calls crypto.createHash with sha256', () => {
        const mockUpdate = jest.fn().mockReturnThis();
        const mockDigest = jest.fn().mockReturnValue('sha256hex');
        const crypto = require('crypto');
        crypto.createHash.mockReturnValue({ update: mockUpdate, digest: mockDigest });

        const result = passwordService.legacyHash('mypassword');

        expect(crypto.createHash).toHaveBeenCalledWith('sha256');
        expect(mockUpdate).toHaveBeenCalledWith('mypassword');
        expect(mockDigest).toHaveBeenCalledWith('hex');
        expect(result).toBe('sha256hex');
    });

    it('updates the hash with the exact password string', () => {
        const mockUpdate = jest.fn().mockReturnThis();
        const mockDigest = jest.fn().mockReturnValue('hex_result');
        const crypto = require('crypto');
        crypto.createHash.mockReturnValue({ update: mockUpdate, digest: mockDigest });

        passwordService.legacyHash('test123');

        expect(mockUpdate).toHaveBeenCalledWith('test123');
    });
});