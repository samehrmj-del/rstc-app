const { validatePersonnel } = require('../../../src/domains/personnel/validator');

jest.mock('../../../src/infrastructure/utils/string', () => ({
    normalizeDigits: jest.fn((str) => {
        if (str == null) {
return str;
}

        let result = String(str);
        result = result.replace(/[۰-۹]/g, ch => ({'۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'}[ch] || ch));

        return result;
    })
}));

describe('validatePersonnel', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('missing name -> error', () => {
        const body = { lname: 'LastName' };
        const errors = validatePersonnel(body);
        expect(errors).toContain('نام الزامی است.');
    });

    test('missing lname -> error', () => {
        const body = { name: 'FirstName' };
        const errors = validatePersonnel(body);
        expect(errors).toContain('نام خانوادگی الزامی است.');
    });

    test('null/missing national_id -> no error', () => {
        const body = { name: 'First', lname: 'Last' };
        const errors = validatePersonnel(body);
        expect(errors).not.toContain('کد ملی باید ۱۰ رقم باشد.');
    });

    test('valid 10-digit national_id -> no error, normalized', () => {
        const body = { name: 'First', lname: 'Last', national_id: '1234567890' };
        const errors = validatePersonnel(body);
        expect(errors).toHaveLength(0);
        expect(body.national_id).toBe('1234567890');
    });

    test('9-digit national_id -> padded to 10, valid', () => {
        const body = { name: 'First', lname: 'Last', national_id: '123456789' };
        const errors = validatePersonnel(body);
        expect(errors).toHaveLength(0);
        expect(body.national_id).toBe('0123456789');
    });

    test('invalid national_id length -> error', () => {
        const body = { name: 'First', lname: 'Last', national_id: '12345678901' };
        const errors = validatePersonnel(body);
        expect(errors).toContain('کد ملی باید ۱۰ رقم باشد.');
    });

    test('invalid phone -> error', () => {
        const body = { name: 'First', lname: 'Last', phone: 'abc' };
        const errors = validatePersonnel(body);
        expect(errors).toContain('شماره تماس نامعتبر است.');
    });

    test('valid phone -> no error', () => {
        const body = { name: 'First', lname: 'Last', phone: '09123456789' };
        const errors = validatePersonnel(body);
        expect(errors).not.toContain('شماره تماس نامعتبر است.');
    });

    test('Persian digit normalization', () => {
        const body = { name: 'First', lname: 'Last', national_id: '۱۲۳۴۵۶۷۸۹۰' };
        const errors = validatePersonnel(body);
        expect(errors).toHaveLength(0);
        expect(body.national_id).toBe('1234567890');
    });
});
