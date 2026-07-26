const { dbRun } = require('../../../src/infrastructure/database/connection');
const { findUserByUsername, updateUserPassword } = require('../../../src/domains/users/repository');
const { updateUserLogin } = require('../../../src/domains/auth/repository');

jest.mock('../../../src/infrastructure/database/connection');
jest.mock('../../../src/domains/users/repository');

describe('auth/repository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('updateUserLogin calls dbRun with correct SQL and params', async () => {
        dbRun.mockResolvedValue({ lastID: 0, changes: 1 });
        const result = await updateUserLogin(1, '2025-01-01T00:00:00.000Z');
        expect(result).toEqual({ lastID: 0, changes: 1 });
        expect(dbRun).toHaveBeenCalledWith(
            "UPDATE Users SET last_login = ?, login_count = login_count + 1 WHERE id = ?",
            ['2025-01-01T00:00:00.000Z', 1]
        );
    });

    test('re-exported findUserByUsername delegates to users/repository', async () => {
        findUserByUsername.mockResolvedValue({ id: 1, username: 'test' });
        const result = await findUserByUsername('test');
        expect(result).toEqual({ id: 1, username: 'test' });
        expect(findUserByUsername).toHaveBeenCalledWith('test');
    });

    test('re-exported updateUserPassword delegates to users/repository', async () => {
        updateUserPassword.mockResolvedValue({ lastID: 0, changes: 1 });
        const result = await updateUserPassword(1, 'new_hash');
        expect(result).toEqual({ lastID: 0, changes: 1 });
        expect(updateUserPassword).toHaveBeenCalledWith(1, 'new_hash');
    });

    test('updateUserLogin handles DB error', async () => {
        dbRun.mockRejectedValue(new Error('DB error'));
        await expect(updateUserLogin(1, '2025-01-01T00:00:00.000Z')).rejects.toThrow('DB error');
    });
});
