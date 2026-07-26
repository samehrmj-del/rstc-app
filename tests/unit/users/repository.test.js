const { dbGet, dbAll, dbRun } = require('../../../src/infrastructure/database/connection');
const {
    findUserById,
    findUserByUsername,
    findAllUsers,
    createUser,
    updateUser,
    updateUserPassword,
    deleteUser
} = require('../../../src/domains/users/repository');

jest.mock('../../../src/infrastructure/database/connection');

describe('users/repository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findUserById', () => {
        test('calls dbGet with correct SQL and params', async () => {
            const mockUser = { id: 1, username: 'test' };
            dbGet.mockResolvedValue(mockUser);

            const result = await findUserById(1);

            expect(result).toEqual(mockUser);
            expect(dbGet).toHaveBeenCalledWith('SELECT * FROM Users WHERE id = ?', [1]);
        });

        test('returns undefined when user not found', async () => {
            dbGet.mockResolvedValue(undefined);

            const result = await findUserById(999);

            expect(result).toBeUndefined();
        });
    });

    describe('findUserByUsername', () => {
        test('calls dbGet with correct SQL and params', async () => {
            const mockUser = { id: 1, username: 'testuser' };
            dbGet.mockResolvedValue(mockUser);

            const result = await findUserByUsername('testuser');

            expect(result).toEqual(mockUser);
            expect(dbGet).toHaveBeenCalledWith('SELECT * FROM Users WHERE username = ?', ['testuser']);
        });

        test('returns undefined when user not found', async () => {
            dbGet.mockResolvedValue(undefined);

            const result = await findUserByUsername('unknown');

            expect(result).toBeUndefined();
        });
    });

    describe('findAllUsers', () => {
        test('calls dbAll with correct SQL', async () => {
            const mockUsers = [
                { id: 1, username: 'user1' },
                { id: 2, username: 'user2' }
            ];
            dbAll.mockResolvedValue(mockUsers);

            const result = await findAllUsers();

            expect(result).toEqual(mockUsers);
            expect(dbAll).toHaveBeenCalledWith('SELECT id, username, role, permissions, status, last_login, login_count, created_at FROM Users ORDER BY id');
        });

        test('returns empty array when no users', async () => {
            dbAll.mockResolvedValue([]);

            const result = await findAllUsers();

            expect(result).toEqual([]);
        });
    });

    describe('createUser', () => {
        test('calls dbRun with correct SQL and params', async () => {
            dbRun.mockResolvedValue({ lastID: 1, changes: 1 });

            const data = {
                username: 'newuser',
                password: 'hashed_pw',
                role: 'user',
                permissions: '[]',
                status: 'active',
                created_at: '2025-01-01T00:00:00.000Z'
            };

            const result = await createUser(data);

            expect(result).toEqual({ lastID: 1, changes: 1 });
            expect(dbRun).toHaveBeenCalledWith(
                'INSERT INTO Users (username, password, role, permissions, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                ['newuser', 'hashed_pw', 'user', '[]', 'active', '2025-01-01T00:00:00.000Z']
            );
        });
    });

    describe('updateUser', () => {
        test('builds dynamic SQL with single update', async () => {
            dbRun.mockResolvedValue({ lastID: 0, changes: 1 });

            const result = await updateUser(1, ['username = ?'], ['newname']);

            expect(result).toEqual({ lastID: 0, changes: 1 });
            expect(dbRun).toHaveBeenCalledWith(
                'UPDATE Users SET username = ? WHERE id = ?',
                ['newname', 1]
            );
        });

        test('builds dynamic SQL with multiple updates', async () => {
            dbRun.mockResolvedValue({ lastID: 0, changes: 1 });

            const result = await updateUser(1, ['username = ?', 'role = ?'], ['newname', 'admin']);

            expect(result).toEqual({ lastID: 0, changes: 1 });
            expect(dbRun).toHaveBeenCalledWith(
                'UPDATE Users SET username = ?, role = ? WHERE id = ?',
                ['newname', 'admin', 1]
            );
        });

        test('appends id as last param', async () => {
            dbRun.mockResolvedValue({ lastID: 0, changes: 1 });

            await updateUser(42, ['status = ?'], ['disabled']);

            expect(dbRun).toHaveBeenCalledWith(
                'UPDATE Users SET status = ? WHERE id = ?',
                ['disabled', 42]
            );
        });
    });

    describe('updateUserPassword', () => {
        test('calls dbRun with correct SQL and params', async () => {
            dbRun.mockResolvedValue({ lastID: 0, changes: 1 });

            const result = await updateUserPassword(1, 'new_hash');

            expect(result).toEqual({ lastID: 0, changes: 1 });
            expect(dbRun).toHaveBeenCalledWith(
                'UPDATE Users SET password = ? WHERE id = ?',
                ['new_hash', 1]
            );
        });
    });

    describe('deleteUser', () => {
        test('calls dbRun with correct SQL and params', async () => {
            dbRun.mockResolvedValue({ lastID: 0, changes: 1 });

            const result = await deleteUser(5);

            expect(result).toEqual({ lastID: 0, changes: 1 });
            expect(dbRun).toHaveBeenCalledWith('DELETE FROM Users WHERE id = ?', [5]);
        });
    });
});
