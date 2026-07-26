const bcrypt = require('bcrypt');

function hashPassword(p) {
    return bcrypt.hash(p, 10);
}

function legacyHash(p) {
    const crypto = require('crypto');

    return crypto.createHash('sha256').update(p).digest('hex');
}

module.exports = {
    hashPassword,
    legacyHash,
};
