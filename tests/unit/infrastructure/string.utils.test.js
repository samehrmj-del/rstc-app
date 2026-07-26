const { normalizeDigits, normalizePersian, esc } = require('../../../src/infrastructure/utils/string');

describe('normalizeDigits', () => {
    it('converts Persian digits to ASCII digits', () => {
        expect(normalizeDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
    });

    it('converts Arabic digits to ASCII digits', () => {
        expect(normalizeDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
    });

    it('converts mixed Persian and Arabic digits', () => {
        expect(normalizeDigits('۴۳۲۱٠١٢٣')).toBe('43210123');
    });

    it('preserves ASCII digits', () => {
        expect(normalizeDigits('1234567890')).toBe('1234567890');
    });

    it('preserves non-digit characters', () => {
        expect(normalizeDigits('test-۵-7')).toBe('test-5-7');
    });

    it('handles null input', () => {
        expect(normalizeDigits(null)).toBe(null);
    });

    it('handles undefined input', () => {
        expect(normalizeDigits(undefined)).toBe(undefined);
    });

    it('handles numeric input by converting to string', () => {
        expect(normalizeDigits(123)).toBe('123');
    });
});

describe('normalizePersian', () => {
    it('converts Arabic ya to Persian ya', () => {
        expect(normalizePersian('كتب')).toBe('کتب');
    });

    it('converts Arabic kaf to Persian kaf', () => {
        expect(normalizePersian('كلمة')).toBe('کلمة');
    });

    it('converts Arabic tehmarbuta to Persian he', () => {
        expect(normalizePersian('كتابة')).toBe('کتابة');
    });

    it('removes kashida (tashkeel underscore)', () => {
        expect(normalizePersian('بـ')).toBe('ب');
    });

    it('removes zero-width non-joiner', () => {
        expect(normalizePersian('ه‌ن')).toBe('هن');
    });

    it('removes zero-width joiner', () => {
        expect(normalizePersian('ه\u200Dن')).toBe('هن');
    });

    it('removes zero-width non-breaking space', () => {
        expect(normalizePersian('ه\u200Bن')).toBe('هن');
    });

    it('removes left-to-right mark', () => {
        expect(normalizePersian('\u200Eه')).toBe('ه');
    });

    it('removes right-to-left mark', () => {
        expect(normalizePersian('\u200Fه')).toBe('ه');
    });

    it('handles null input', () => {
        expect(normalizePersian(null)).toBe(null);
    });

    it('handles undefined input', () => {
        expect(normalizePersian(undefined)).toBe(undefined);
    });

    it('handles numeric input by converting to string', () => {
        expect(normalizePersian(123)).toBe('123');
    });
});

describe('esc', () => {
    it('escapes ampersand', () => {
        expect(esc('foo & bar')).toBe('foo &amp; bar');
    });

    it('escapes less-than sign', () => {
        expect(esc('a < b')).toBe('a &lt; b');
    });

    it('escapes greater-than sign', () => {
        expect(esc('a > b')).toBe('a &gt; b');
    });

    it('escapes double quote', () => {
        expect(esc('a " b')).toBe('a &quot; b');
    });

    it('escapes single quote', () => {
        expect(esc("a ' b")).toBe("a &#39; b");
    });

    it('escapes all special characters together', () => {
        expect(esc('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
    });

    it('returns empty string for null', () => {
        expect(esc(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
        expect(esc(undefined)).toBe('');
    });

    it('returns unchanged string for plain text', () => {
        expect(esc('hello world')).toBe('hello world');
    });

    it('handles numeric input by converting to string', () => {
        expect(esc(123)).toBe('123');
    });
});