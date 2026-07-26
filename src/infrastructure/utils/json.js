function safeParse(value, fallback) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

module.exports = {
    safeParse,
};
