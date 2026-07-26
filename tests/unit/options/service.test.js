const {
    getAllOptions,
    getOptionByField,
    createOptionValue,
    updateOptionValue,
    deleteOptionValue
} = require('../../../src/domains/options/service');

jest.mock('../../../src/domains/options/repository', () => ({
    readOptions: jest.fn(),
    writeOptionsField: jest.fn()
}));

const { readOptions, writeOptionsField } = require('../../../src/domains/options/repository');

afterEach(() => {
    jest.resetAllMocks();
});

describe('getAllOptions', () => {
    test('success -> 200', async () => {
        const mockOptions = { field1: { label: 'Field 1', options: ['a', 'b'] } };
        readOptions.mockResolvedValue(mockOptions);

        const result = await getAllOptions();

        expect(result.status).toBe(200);
        expect(result.body).toEqual(mockOptions);
    });

    test('DB error -> 500', async () => {
        readOptions.mockRejectedValue(new Error('DB error'));

        const result = await getAllOptions();

        expect(result.status).toBe(500);
        expect(result.body.error).toBe('DB error');
    });
});

describe('getOptionByField', () => {
    test('found -> 200', async () => {
        const mockOptions = { field1: { label: 'Field 1', options: ['a', 'b'] } };
        readOptions.mockResolvedValue(mockOptions);

        const result = await getOptionByField('field1');

        expect(result.status).toBe(200);
        expect(result.body).toEqual({ label: 'Field 1', options: ['a', 'b'] });
    });

    test('not found -> 404', async () => {
        const mockOptions = {};
        readOptions.mockResolvedValue(mockOptions);

        const result = await getOptionByField('field1');

        expect(result.status).toBe(404);
        expect(result.body.error).toBe('فیلد یافت نشد');
    });

    test('DB error -> 500', async () => {
        readOptions.mockRejectedValue(new Error('DB error'));

        const result = await getOptionByField('field1');

        expect(result.status).toBe(500);
        expect(result.body.error).toBe('DB error');
    });
});

describe('deleteOptionValue', () => {
    test('invalid index -> 400', async () => {
        readOptions.mockResolvedValue({
            field1: { label: 'Field 1', options: ['a', 'b'] }
        });

        const result = await deleteOptionValue('field1', 'abc');

        expect(result.status).toBe(400);
    });

    test('success -> 200', async () => {
        readOptions.mockResolvedValue({
            field1: { label: 'Field 1', options: ['a', 'b', 'c'] }
        });

        const result = await deleteOptionValue('field1', 1);

        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(writeOptionsField).toHaveBeenCalledWith('field1', 'Field 1', ['a', 'c']);
    });

    test('DB error -> 500', async () => {
        readOptions.mockRejectedValue(new Error('DB error'));

        const result = await deleteOptionValue('field1', 0);

        expect(result.status).toBe(500);
        expect(result.body.error).toBe('DB error');
    });
});

describe('createOptionValue', () => {
    test('empty value -> 400', async () => {
        readOptions.mockResolvedValue({});

        const result = await createOptionValue('field1', 'Label', '');

        expect(result.status).toBe(400);
        expect(result.body.error).toBe('مقدار گزینه الزامی است');
    });

    test('duplicate value -> 400', async () => {
        readOptions.mockResolvedValue({
            field1: { label: 'Field 1', options: ['existing'] }
        });

        const result = await createOptionValue('field1', 'Label', 'existing');

        expect(result.status).toBe(400);
        expect(result.body.error).toBe('این گزینه قبلاً وجود دارد');
    });

    test('DB error -> 500', async () => {
        readOptions.mockResolvedValue({
            field1: { label: 'Field 1', options: [] }
        });
        writeOptionsField.mockRejectedValue(new Error('DB error'));

        const result = await createOptionValue('field1', 'Field 1', 'newValue');

        expect(result.status).toBe(500);
        expect(result.body.error).toBe('DB error');
    });

    test('success -> 200 + options array', async () => {
        readOptions.mockResolvedValue({
            field1: { label: 'Field 1', options: ['existing'] }
        });

        const result = await createOptionValue('field1', 'Field 1', 'newValue');

        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(result.body.options).toContain('newValue');
        expect(writeOptionsField).toHaveBeenCalledWith('field1', 'Field 1', ['existing', 'newValue']);
    });
});

describe('updateOptionValue', () => {
    test('empty newValue -> 400', async () => {
        readOptions.mockResolvedValue({
            field1: { label: 'Field 1', options: ['a', 'b'] }
        });

        const result = await updateOptionValue('field1', 'a', '', 'New Label');

        expect(result.status).toBe(400);
    });

    test('field not found -> 404', async () => {
        readOptions.mockResolvedValue({});

        const result = await updateOptionValue('field1', 'a', 'b', 'Label');

        expect(result.status).toBe(404);
        expect(result.body.error).toBe('فیلد یافت نشد');
    });

    test('oldValue not found -> 404', async () => {
        readOptions.mockResolvedValue({
            field1: { label: 'Field 1', options: ['a', 'b'] }
        });

        const result = await updateOptionValue('field1', 'c', 'newValue', 'Label');

        expect(result.status).toBe(404);
        expect(result.body.error).toBe('گزینه یافت نشد');
    });

    test('duplicate newValue -> 400', async () => {
        readOptions.mockResolvedValue({
            field1: { label: 'Field 1', options: ['a', 'b', 'c'] }
        });

        const result = await updateOptionValue('field1', 'a', 'b', 'Label');

        expect(result.status).toBe(400);
        expect(result.body.error).toBe('این نام قبلاً استفاده شده');
    });

    test('success -> 200', async () => {
        readOptions.mockResolvedValue({
            field1: { label: 'Field 1', options: ['a', 'b'] }
        });

        const result = await updateOptionValue('field1', 'a', 'updated', 'New Label');

        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(writeOptionsField).toHaveBeenCalledWith('field1', 'New Label', ['updated', 'b']);
    });

    test('DB error -> 500', async () => {
        readOptions.mockRejectedValue(new Error('DB error'));

        const result = await updateOptionValue('field1', 'a', 'updated', 'Label');

        expect(result.status).toBe(500);
        expect(result.body.error).toBe('DB error');
    });
});

describe('deleteOptionValue', () => {
    test('invalid index -> 400', async () => {
        readOptions.mockResolvedValue({
            field1: { label: 'Field 1', options: ['a', 'b'] }
        });

        const result = await deleteOptionValue('field1', 'abc');

        expect(result.status).toBe(400);
    });

    test('success -> 200', async () => {
        readOptions.mockResolvedValue({
            field1: { label: 'Field 1', options: ['a', 'b', 'c'] }
        });

        const result = await deleteOptionValue('field1', 1);

        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(writeOptionsField).toHaveBeenCalledWith('field1', 'Field 1', ['a', 'c']);
    });
});