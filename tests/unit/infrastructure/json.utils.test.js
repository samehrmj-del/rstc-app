const { safeParse } = require('../../../src/infrastructure/utils/json');

describe('safeParse', () => {
    it('parses a valid JSON object', () => {
        expect(safeParse('{"key": "value"}')).toEqual({ key: 'value' });
    });

    it('parses a valid JSON array', () => {
        expect(safeParse('[1, 2, 3]')).toEqual([1, 2, 3]);
    });

    it('parses a valid JSON string', () => {
        expect(safeParse('"hello"')).toBe('hello');
    });

    it('parses a valid JSON number', () => {
        expect(safeParse('42')).toBe(42);
    });

    it('parses a valid JSON boolean', () => {
        expect(safeParse('true')).toBe(true);
    });

    it('parses a valid JSON null', () => {
        expect(safeParse('null')).toBeNull();
    });

    it('returns fallback for invalid JSON string', () => {
        expect(safeParse('not json', { fallback: true })).toEqual({ fallback: true });
    });

    it('returns null fallback when no fallback provided and JSON is invalid', () => {
        expect(safeParse('not json')).toBeUndefined();
    });

    it('returns fallback string value for invalid JSON', () => {
        expect(safeParse('invalid', 'default')).toBe('default');
    });

    it('returns fallback array for invalid JSON', () => {
        expect(safeParse('broken', [1, 2])).toEqual([1, 2]);
    });

    it('returns empty array as fallback when fallback is empty array', () => {
        expect(safeParse('invalid', [])).toEqual([]);
    });

    it('handles empty string with fallback', () => {
        expect(safeParse('', 'fallback')).toBe('fallback');
    });

    it('returns null for null input because JSON.parse(null) succeeds', () => {
        expect(safeParse(null, 'fallback')).toBe(null);
    });

    it('handles undefined input with fallback', () => {
        expect(safeParse(undefined, 'fallback')).toBe('fallback');
    });
});