const { normalizeDigits } = require('../../infrastructure/utils/string');

function validatePersonnel(body) {
    if (body.national_id) {
        body.national_id = normalizeDigits(body.national_id).trim();
    }

    if (body.emp_num) {
        body.emp_num = normalizeDigits(body.emp_num).trim();
    }

    if (body.phone) {
        body.phone = normalizeDigits(body.phone).trim();
    }

    const errors = [];
    if (!body.name || !body.name.trim()) {
        errors.push('نام الزامی است.');
    }

    if (!body.lname || !body.lname.trim()) {
        errors.push('نام خانوادگی الزامی است.');
    }

    if (body.national_id != null && body.national_id !== '') {
        let nid = String(body.national_id).trim();
        if (/^\d{1,9}$/.test(nid)) {
            nid = nid.padStart(10, '0');
        }

        if (!/^\d{10}$/.test(nid)) {
            errors.push('کد ملی باید ۱۰ رقم باشد.');
        } else {
            body.national_id = nid;
        }
    }

    if (body.phone && !/^[0-9+\-\s]{7,15}$/.test(body.phone.trim())) {
        errors.push('شماره تماس نامعتبر است.');
    }

    return errors;
}

module.exports = {
    validatePersonnel,
};
