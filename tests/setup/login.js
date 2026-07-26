const request = require('supertest');

async function loginAsAdmin(app) {
    const res = await request(app)
        .post('/api/login')
        .send({ username: 'admin', password: 'test-admin-password' });
    if (!res.headers['set-cookie']) {
        return res.body.token;
    }

    const tokenMatch = res.headers['set-cookie'].find(c => c.startsWith('token='));
    if (tokenMatch) {
        return tokenMatch.split(';')[0].replace('token=', '');
    }

    return res.body.token;
}

module.exports = { loginAsAdmin };
