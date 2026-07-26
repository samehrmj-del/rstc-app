const { readOptions, writeOptionsField } = require('./repository');

async function getAllOptions() {
    try {
        const all = await readOptions();

        return { status: 200, body: all };
    } catch (e) {
        return { status: 500, body: { error: e.message } };
    }
}

async function getOptionByField(field) {
    try {
        const all = await readOptions();
        const option = all[field];
        if (!option) {
            return { status: 404, body: { error: 'فیلد یافت نشد' } };
        }

        return { status: 200, body: option };
    } catch (e) {
        return { status: 500, body: { error: e.message } };
    }
}

async function createOptionValue(field, label, value) {
    try {
        if (!value || !value.trim()) {
            return { status: 400, body: { error: 'مقدار گزینه الزامی است' } };
        }

        const all = await readOptions();
        if (!all[field]) {
            all[field] = { label: label || field, options: [] };
        }

        if (all[field].options.includes(value.trim())) {
            return { status: 400, body: { error: 'این گزینه قبلاً وجود دارد' } };
        }

        all[field].options.push(value.trim());
        await writeOptionsField(field, all[field].label, all[field].options);

        return { status: 200, body: { success: true, options: all[field].options } };
    } catch (e) {
        return { status: 500, body: { error: e.message } };
    }
}

async function updateOptionValue(field, oldValue, newValue, label) {
    try {
        if (!newValue || !newValue.trim()) {
            return { status: 400, body: { error: 'مقدار جدید الزامی است' } };
        }

        const all = await readOptions();
        if (!all[field]) {
            return { status: 404, body: { error: 'فیلد یافت نشد' } };
        }

        const idx = all[field].options.indexOf(oldValue);
        if (idx === -1) {
            return { status: 404, body: { error: 'گزینه یافت نشد' } };
        }

        if (oldValue !== newValue.trim() && all[field].options.includes(newValue.trim())) {
            return { status: 400, body: { error: 'این نام قبلاً استفاده شده' } };
        }

        all[field].options[idx] = newValue.trim();
        if (label) {
            all[field].label = label;
        }

        await writeOptionsField(field, all[field].label, all[field].options);

        return { status: 200, body: { success: true, options: all[field].options } };
    } catch (e) {
        return { status: 500, body: { error: e.message } };
    }
}

async function deleteOptionValue(field, index) {
    try {
        const all = await readOptions();
        if (!all[field]) {
            return { status: 404, body: { error: 'فیلد یافت نشد' } };
        }

        const idx = parseInt(index);
        if (isNaN(idx) || idx < 0 || idx >= all[field].options.length) {
            return { status: 400, body: { error: 'ایندکس نامعتبر' } };
        }

        all[field].options.splice(idx, 1);
        await writeOptionsField(field, all[field].label, all[field].options);

        return { status: 200, body: { success: true, options: all[field].options } };
    } catch (e) {
        return { status: 500, body: { error: e.message } };
    }
}

module.exports = {
    getAllOptions,
    getOptionByField,
    createOptionValue,
    updateOptionValue,
    deleteOptionValue,
};
