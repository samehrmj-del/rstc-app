const jwt = require('jsonwebtoken');
const jwtService = require('../../../src/infrastructure/security/jwt.service');

jest.mock('jsonwebtoken');
jest.mock('../../../src/infrastructure/config/env', () => ({
    JWT_SECRET: 'test_jwt_secret'
}));

describe('signJwt', () => {
    it('calls jwt.sign with the payload, secret, HS256 algorithm, and 8h expiration', () => {
        jwt.sign.mockReturnValue('mocked_token');

        const payload = { userId: 1, role: 'admin' };
        const result = jwtService.signJwt(payload);

        expect(jwt.sign).toHaveBeenCalledWith(
            payload,
            'test_jwt_secret',
            { algorithm: 'HS256', expiresIn: '8h' }
        );
        expect(result).toBe('mocked_token');
    });

    it('passes the correct options object', () => {
        jwt.sign.mockReturnValue('token');

        jwtService.signJwt({ sub: 'user123' });

        const callArgs = jwt.sign.mock.calls[0];
        expect(callArgs[2]).toEqual({ algorithm: 'HS256', expiresIn: '8h' });
    });

    it('returns the token string from jwt.sign', () => {
        jwt.sign.mockReturnValue('jwt_token_string');

        const result = jwtService.signJwt({ id: 42 });

        expect(result).toBe('jwt_token_string');
    });

    it('works with an empty payload object', () => {
        jwt.sign.mockReturnValue('token');

        const result = jwtService.signJwt({});

        expect(jwt.sign).toHaveBeenCalledWith({}, 'test_jwt_secret', { algorithm: 'HS256', expiresIn: '8h' });
        expect(result).toBe('token');
    });
});