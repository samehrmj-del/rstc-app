const { validatePersonnel } = require('./validator');
const { createPersonnel, updatePersonnel, deletePersonnel, bulkImport } = require('./repository');

async function createPersonnelRecord(body) {
    const errs = validatePersonnel(body);
    if (errs.length) {
        return { status: 400, body: { error: errs.join(' | ') } };
    }

    const {
        name,
        lname,
        father_name,
        national_id,
        emp_num,
        hire_date,
        emp_type,
        org_post,
        job_title,
        last_degree,
        phone,
        address,
        status,
        notes,
    } = body;
    const nid = national_id != null && national_id !== '' ? String(national_id).trim() : null;

    try {
        await createPersonnel({
            name: name.trim(),
            lname: lname.trim(),
            father_name,
            national_id: nid,
            emp_num: emp_num || null,
            hire_date,
            emp_type,
            org_post,
            job_title,
            last_degree,
            phone,
            address,
            status: status || 'فعال',
            notes,
        });

        return { status: 200, body: { success: true } };
    } catch (e) {
        if (e.message.includes('UNIQUE')) {
            return { status: 400, body: { error: 'کد ملی یا شماره پرسنلی قبلاً ثبت شده است!' } };
        }

        return { status: 400, body: { error: e.message } };
    }
}

async function updatePersonnelRecord(id, body) {
    const errs = validatePersonnel(body);
    if (errs.length) {
        return { status: 400, body: { error: errs.join(' | ') } };
    }

    const {
        name,
        lname,
        father_name,
        national_id,
        emp_num,
        hire_date,
        emp_type,
        org_post,
        job_title,
        last_degree,
        phone,
        address,
        status,
        notes,
    } = body;
    const nid = national_id != null && national_id !== '' ? String(national_id).trim() : null;

    try {
        await updatePersonnel(id, {
            name: name.trim(),
            lname: lname.trim(),
            father_name,
            national_id: nid,
            emp_num: emp_num || null,
            hire_date,
            emp_type,
            org_post,
            job_title,
            last_degree,
            phone,
            address,
            status,
            notes,
        });

        return { status: 200, body: { success: true } };
    } catch (e) {
        if (e.message.includes('UNIQUE')) {
            return { status: 400, body: { error: 'کد ملی یا شماره پرسنلی تکراری است!' } };
        }

        return { status: 400, body: { error: e.message } };
    }
}

async function deletePersonnelRecord(id) {
    try {
        await deletePersonnel(id);

        return { status: 200, body: { success: true } };
    } catch (e) {
        return { status: 500, body: { error: e.message } };
    }
}

async function bulkImportPersonnel(data) {
    if (!Array.isArray(data) || !data.length) {
        return { status: 400, body: { error: 'فایل خالی است' } };
    }

    if (data.length > 1000) {
        return { status: 400, body: { error: 'حداکثر ۱۰۰۰ ردیف مجاز است.' } };
    }

    try {
        const result = await bulkImport(data);

        return {
            status: 200,
            body: {
                success: true,
                imported: result.imported,
                failed: result.failed,
                errors: result.errors,
            },
        };
    } catch (e) {
        return { status: 500, body: { error: 'خطا در ثبت' } };
    }
}

module.exports = {
    createPersonnelRecord,
    updatePersonnelRecord,
    deletePersonnelRecord,
    bulkImportPersonnel,
};
