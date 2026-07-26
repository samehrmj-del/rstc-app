const { dbRun } = require('../../infrastructure/database/connection');
const { findUserByUsername, updateUserPassword } = require('../users/repository');

async function updateUserLogin(userId, lastLogin) {
    return dbRun('UPDATE Users SET last_login = ?, login_count = login_count + 1 WHERE id = ?', [
        lastLogin,
        userId,
    ]);
}

module.exports = {
    findUserByUsername,
    updateUserPassword,
    updateUserLogin,
};
