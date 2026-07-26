const { dbAll, dbRun } = require('../../infrastructure/database/connection');
const { safeParse } = require('../../infrastructure/utils/json');

async function readOptions() {
    const rows = await dbAll('SELECT field, label, options FROM SystemOptions');
    const result = {};
    for (const row of rows) {
        result[row.field] = { label: row.label, options: safeParse(row.options, []) };
    }

    return result;
}

async function writeOptionsField(field, label, optionsArray) {
    await dbRun('INSERT OR REPLACE INTO SystemOptions (field, label, options) VALUES (?, ?, ?)', [
        field,
        label,
        JSON.stringify(optionsArray),
    ]);
}

module.exports = {
    readOptions,
    writeOptionsField,
};
