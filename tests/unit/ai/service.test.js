const { askQuestion } = require('../../../src/domains/ai/service');

jest.mock('../../../ai_engine', () => ({
    parseAndAnswer: jest.fn()
}));

jest.mock('../../../src/infrastructure/database/connection', () => ({
    dbGet: jest.fn(),
    dbAll: jest.fn()
}));

const { parseAndAnswer } = require('../../../ai_engine');

afterEach(() => {
    jest.clearAllMocks();
});

describe('askQuestion', () => {
    test('empty question -> 400', async () => {
        const result = await askQuestion('');

        expect(result.status).toBe(400);
        expect(result.body.error).toBe('سوال الزامی است.');
    });

    test('empty question with whitespace only -> 400', async () => {
        const result = await askQuestion('   ');

        expect(result.status).toBe(400);
        expect(result.body.error).toBe('سوال الزامی است.');
    });

    test('success -> 200 + answer', async () => {
        parseAndAnswer.mockResolvedValue('This is the answer');

        const result = await askQuestion('What is the total count?');

        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
        expect(result.body.answer).toBe('This is the answer');
        expect(result.body.question).toBe('What is the total count?');
        expect(parseAndAnswer).toHaveBeenCalledWith(
            'What is the total count?',
            expect.any(Function),
            expect.any(Function)
        );
    });

    test('parseAndAnswer throws -> 500', async () => {
        parseAndAnswer.mockRejectedValue(new Error('AI engine error'));

        const result = await askQuestion('What is the total count?');

        expect(result.status).toBe(500);
        expect(result.body.error).toBe('AI engine error');
    });
});