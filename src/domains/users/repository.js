const { dbGet, dbAll, dbRun } = require('../../infrastructure/database/connection');

async function findUserById(id) {
    return dbGet('SELECT * FROM Users WHERE id = ?', [id]);
}

async function findUserByUsername(username) {
    return dbGet('SELECT * FROM Users WHERE username = ?', [username]);
}

async function findAllUsers() {
    return dbAll(
        'SELECT id, username, role, permissions, status, last_login, login_count, created_at FROM Users ORDER BY id'
    );
}

async function createUser(data) {
    return dbRun(
        'INSERT INTO Users (username, password, role, permissions, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [data.username, data.password, data.role, data.permissions, data.status, data.created_at]
    );
}

async function updateUser(id, updates, params) {
    const setClause = updates.join(', ');

    return dbRun(`UPDATE Users SET ${setClause} WHERE id = ?`, [...params, id]);
}

async function updateUserPassword(userId, newPasswordHash) {
    return dbRun('UPDATE Users SET password = ? WHERE id = ?', [newPasswordHash, userId]);
}

async function deleteUser(id) {
    return dbRun('DELETE FROM Users WHERE id = ?', [id]);
}

module.exports = {
    findUserById,
    findUserByUsername,
    findAllUsers,
    createUser,
    updateUser,
    updateUserPassword,
    deleteUser,
};
