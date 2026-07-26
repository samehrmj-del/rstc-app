const request = require('supertest');

function expectSuccess(res, body) {
    expect(res.status).toBe(200);
    if (body !== undefined) {
        expect(res.body).toEqual(expect.objectContaining(body));
    }
}

function expectUnauthorized(res) {
    expect(res.status).toBe(401);
}

function expectForbidden(res) {
    expect(res.status).toBe(403);
}

function expectValidationError(res, message) {
    expect(res.status).toBe(400);
    expect(res.body).toEqual(expect.objectContaining({ error: message }));
}

function expectSuccessData(res, dataShape) {
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining(dataShape));
}

module.exports = {
    expectSuccess,
    expectUnauthorized,
    expectForbidden,
    expectValidationError,
    expectSuccessData,
    request
};
