const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

function signJwt(payload) {
    return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '8h' });
}

module.exports = {
    signJwt,
};
