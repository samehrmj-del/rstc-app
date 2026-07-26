const NORMALIZE_MAP = {
    '۰': '0',
    '۱': '1',
    '۲': '2',
    '۳': '3',
    '۴': '4',
    '۵': '5',
    '۶': '6',
    '۷': '7',
    '۸': '8',
    '۹': '9',
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
};

function normalizeDigits(str) {
    if (str == null) {
        return str;
    }

    return String(str).replace(/[۰-۹٠-٩]/g, (ch) => NORMALIZE_MAP[ch] || ch);
}

function normalizePersian(str) {
    if (str == null) {
        return str;
    }

    return String(str)
        .replace(/[ي]/g, 'ی')
        .replace(/[ك]/g, 'ک')
        .replace(/[ۀ]/g, 'ه')
        .replace(/[ـ]/g, '')
        .replace(/[\u200C\u200D\u200B\u200E\u200F]/g, '');
}

function esc(str) {
    return String(str == null ? '' : str).replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
}

module.exports = {
    normalizeDigits,
    normalizePersian,
    esc,
};
