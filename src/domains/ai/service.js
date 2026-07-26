const { parseAndAnswer } = require('../../../ai_engine');
const { dbGet, dbAll } = require('../../infrastructure/database/connection');

async function askQuestion(question) {
    try {
        if (!question || !question.trim()) {
            return { status: 400, body: { error: 'سوال الزامی است.' } };
        }

        const answer = await parseAndAnswer(question.trim(), dbGet, dbAll);

        return { status: 200, body: { success: true, question, answer } };
    } catch (e) {
        return { status: 500, body: { error: e.message } };
    }
}

module.exports = {
    askQuestion,
};
