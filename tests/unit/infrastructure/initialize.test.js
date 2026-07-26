describe('database/initialize', () => {
    beforeEach(() => {
        delete process.env.INIT_ADMIN_PASSWORD;
    });

    test('startup succeeds when INIT_ADMIN_PASSWORD exists', async () => {
        jest.resetModules();

        const mockDbRun = jest.fn().mockResolvedValue({ lastID: 1, changes: 1 });
        const mockDbGet = jest.fn().mockResolvedValue(null);
        const mockDbAll = jest.fn().mockResolvedValue([]);
        const mockHashPassword = jest.fn().mockResolvedValue('hashed-password');

        jest.doMock('../../../src/infrastructure/database/connection', () => ({
            dbRun: mockDbRun,
            dbGet: mockDbGet,
            dbAll: mockDbAll,
        }));

        jest.doMock('../../../src/infrastructure/security/password.service', () => ({
            hashPassword: mockHashPassword,
        }));

        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => false),
            readFileSync: jest.fn(),
            renameSync: jest.fn(),
        }));

        process.env.INIT_ADMIN_PASSWORD = 'secure-password';

        const { initializeDatabase } = require('../../../src/infrastructure/database/initialize');
        await initializeDatabase();

        expect(mockHashPassword).toHaveBeenCalledWith('secure-password');
        expect(mockDbRun).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO Users'),
            expect.arrayContaining(['admin', 'hashed-password', 'admin', 'active'])
        );
    });

    test('startup succeeds and updates existing admin password when INIT_ADMIN_PASSWORD exists', async () => {
        jest.resetModules();

        const mockDbRun = jest.fn().mockResolvedValue({ lastID: 1, changes: 1 });
        const mockDbGet = jest.fn().mockResolvedValue({ id: 1 });
        const mockDbAll = jest.fn().mockResolvedValue([]);
        const mockHashPassword = jest.fn().mockResolvedValue('new-hashed-password');

        jest.doMock('../../../src/infrastructure/database/connection', () => ({
            dbRun: mockDbRun,
            dbGet: mockDbGet,
            dbAll: mockDbAll,
        }));

        jest.doMock('../../../src/infrastructure/security/password.service', () => ({
            hashPassword: mockHashPassword,
        }));

        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => false),
            readFileSync: jest.fn(),
            renameSync: jest.fn(),
        }));

        process.env.INIT_ADMIN_PASSWORD = 'new-secure-password';

        const { initializeDatabase } = require('../../../src/infrastructure/database/initialize');
        await initializeDatabase();

        expect(mockHashPassword).toHaveBeenCalledWith('new-secure-password');
        expect(mockDbRun).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE Users SET password'),
            expect.arrayContaining(['new-hashed-password'])
        );
    });

    test('startup fails when INIT_ADMIN_PASSWORD is missing', async () => {
        jest.resetModules();

        jest.doMock('../../../src/infrastructure/database/connection', () => ({
            dbRun: jest.fn(),
            dbGet: jest.fn(),
            dbAll: jest.fn(),
        }));

        jest.doMock('../../../src/infrastructure/security/password.service', () => ({
            hashPassword: jest.fn(),
        }));

        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => false),
            readFileSync: jest.fn(),
            renameSync: jest.fn(),
        }));

        const { initializeDatabase } = require('../../../src/infrastructure/database/initialize');

        await expect(initializeDatabase()).rejects.toThrow(
            'INIT_ADMIN_PASSWORD environment variable is required'
        );
    });

    test('startup fails when INIT_ADMIN_PASSWORD is empty string', async () => {
        jest.resetModules();

        jest.doMock('../../../src/infrastructure/database/connection', () => ({
            dbRun: jest.fn(),
            dbGet: jest.fn(),
            dbAll: jest.fn(),
        }));

        jest.doMock('../../../src/infrastructure/security/password.service', () => ({
            hashPassword: jest.fn(),
        }));

        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => false),
            readFileSync: jest.fn(),
            renameSync: jest.fn(),
        }));

        process.env.INIT_ADMIN_PASSWORD = '';

        const { initializeDatabase } = require('../../../src/infrastructure/database/initialize');

        await expect(initializeDatabase()).rejects.toThrow(
            'INIT_ADMIN_PASSWORD environment variable is required'
        );
    });

    test('startup fails when INIT_ADMIN_PASSWORD is whitespace only', async () => {
        jest.resetModules();

        jest.doMock('../../../src/infrastructure/database/connection', () => ({
            dbRun: jest.fn(),
            dbGet: jest.fn(),
            dbAll: jest.fn(),
        }));

        jest.doMock('../../../src/infrastructure/security/password.service', () => ({
            hashPassword: jest.fn(),
        }));

        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => false),
            readFileSync: jest.fn(),
            renameSync: jest.fn(),
        }));

        process.env.INIT_ADMIN_PASSWORD = '   ';

        const { initializeDatabase } = require('../../../src/infrastructure/database/initialize');

        await expect(initializeDatabase()).rejects.toThrow(
            'INIT_ADMIN_PASSWORD environment variable is required'
        );
    });
});
