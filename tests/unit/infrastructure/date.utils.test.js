const { toJalaali, formatJalali } = require('../../../src/infrastructure/utils/date');

describe('toJalaali', () => {
    it('converts Gregorian 2024-01-01 to Jalali 1402-10-11', () => {
        const result = toJalaali(2024, 1, 1);
        expect(result).toEqual({ jy: 1402, jm: 10, jd: 11 });
    });

    it('converts Gregorian 2023-03-21 to Jalali 1402-01-01 (Nowruz)', () => {
        const result = toJalaali(2023, 3, 21);
        expect(result).toEqual({ jy: 1402, jm: 1, jd: 1 });
    });

    it('converts Gregorian 2000-01-01', () => {
        const result = toJalaali(2000, 1, 1);
        expect(result.jy).toBeGreaterThan(0);
        expect(result.jm).toBeGreaterThanOrEqual(1);
        expect(result.jm).toBeLessThanOrEqual(12);
        expect(result.jd).toBeGreaterThanOrEqual(1);
    });

    it('converts year 1600 (boundary)', () => {
        const result = toJalaali(1600, 1, 1);
        expect(result).toBeDefined();
        expect(result.jy).toBeGreaterThan(0);
    });

    it('converts year 1601 (just past boundary)', () => {
        const result = toJalaali(1601, 1, 1);
        expect(result).toBeDefined();
        expect(result.jy).toBeGreaterThan(0);
    });

    it('converts year 1000', () => {
        const result = toJalaali(1000, 6, 15);
        expect(result).toBeDefined();
        expect(result.jy).toBeGreaterThan(0);
    });

    it('returns valid month between 1 and 12', () => {
        const result = toJalaali(2024, 6, 15);
        expect(result.jm).toBeGreaterThanOrEqual(1);
        expect(result.jm).toBeLessThanOrEqual(12);
    });

    it('returns valid day between 1 and 31', () => {
        const result = toJalaali(2024, 6, 15);
        expect(result.jd).toBeGreaterThanOrEqual(1);
        expect(result.jd).toBeLessThanOrEqual(31);
    });
});

describe('formatJalali', () => {
    it('formats a valid ISO date to Jalali string', () => {
        const result = formatJalali('2024-01-01');
        expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
    });

    it('returns dash for null input', () => {
        expect(formatJalali(null)).toBe('\u2014');
    });

    it('returns dash for undefined input', () => {
        expect(formatJalali(undefined)).toBe('\u2014');
    });

    it('returns dash for empty string input', () => {
        expect(formatJalali('')).toBe('\u2014');
    });

    it('returns the original string for invalid ISO date', () => {
        expect(formatJalali('not-a-date')).toBe('not-a-date');
    });

    it('returns dash for an invalid Date string', () => {
        expect(formatJalali('invalid')).toBe('invalid');
    });

    it('formats date with zero-padded month and day', () => {
        const result = formatJalali('2024-01-01');
        const parts = result.split('/');
        expect(parts[1]).toBe(parts[1].padStart(2, '0'));
        expect(parts[2]).toBe(parts[2].padStart(2, '0'));
    });

    it('returns consistent format for the same input', () => {
        const result1 = formatJalali('2024-06-15');
        const result2 = formatJalali('2024-06-15');
        expect(result1).toBe(result2);
    });
});