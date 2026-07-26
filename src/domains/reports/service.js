const { searchReports } = require('./repository');

async function searchMissionsService(filters) {
    try {
        const { rows, total } = await searchReports(filters);

        return { status: 200, body: { results: rows, total: total.count } };
    } catch (e) {
        return { status: 500, body: { error: e.message } };
    }
}

module.exports = { searchMissionsService };
