const { dbGet, dbAll, dbRun } = require('../../infrastructure/database/connection');
const { normalizeDigits } = require('../../infrastructure/utils/string');

async function findAllPersonnel() {
    return dbAll('SELECT * FROM Personnel ORDER BY id DESC');
}

async function findPersonnelById(id) {
    return dbGet('SELECT * FROM Personnel WHERE id = ?', [id]);
}

async function createPersonnel(data) {
    return dbRun(
        `INSERT INTO Personnel (name,lname,father_name,national_id,emp_num,hire_date,emp_type,org_post,job_title,last_degree,phone,address,status,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
            data.name,
            data.lname,
            data.father_name,
            data.national_id,
            data.emp_num,
            data.hire_date,
            data.emp_type,
            data.org_post,
            data.job_title,
            data.last_degree,
            data.phone,
            data.address,
            data.status,
            data.notes,
        ]
    );
}

async function updatePersonnel(id, data) {
    return dbRun(
        `UPDATE Personnel SET name=?,lname=?,father_name=?,national_id=?,emp_num=?,hire_date=?,emp_type=?,org_post=?,job_title=?,last_degree=?,phone=?,address=?,status=?,notes=? WHERE id=?`,
        [
            data.name,
            data.lname,
            data.father_name,
            data.national_id,
            data.emp_num,
            data.hire_date,
            data.emp_type,
            data.org_post,
            data.job_title,
            data.last_degree,
            data.phone,
            data.address,
            data.status,
            data.notes,
            id,
        ]
    );
}

async function deletePersonnel(id) {
    return dbRun('DELETE FROM Personnel WHERE id = ?', [id]);
}

async function findExistingNationalIdsAndEmpNums() {
    const rows = await dbAll('SELECT national_id, emp_num FROM Personnel');
    const natIds = new Set(rows.filter((r) => r.national_id).map((r) => r.national_id));
    const empNums = new Set(rows.filter((r) => r.emp_num).map((r) => r.emp_num));

    return { natIds, empNums };
}

async function bulkImport(rows) {
    const { natIds, empNums } = await findExistingNationalIdsAndEmpNums();
    let successCount = 0;
    const errors = [];

    await dbRun('BEGIN TRANSACTION');
    try {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;
            const r = {
                name: (row['نام'] || row['name'] || '').toString().trim(),
                lname: (row['نام خانوادگی'] || row['lname'] || '').toString().trim(),
                father_name: (row['نام پدر'] || row['father_name'] || '').toString().trim(),
                national_id:
                    normalizeDigits(
                        (row['کد ملی'] || row['national_id'] || '').toString().trim()
                    ) || null,
                emp_num:
                    normalizeDigits(
                        (row['شماره پرسنلی'] || row['emp_num'] || '').toString().trim()
                    ) || null,
                hire_date: (row['تاریخ استخدام'] || row['hire_date'] || '').toString().trim(),
                emp_type: (row['نوع استخدام'] || row['emp_type'] || '').toString().trim(),
                org_post: (row['پست سازمانی'] || row['org_post'] || '').toString().trim(),
                job_title: (row['عنوان شغل'] || row['job_title'] || '').toString().trim(),
                last_degree: (row['آخرین مدرک'] || row['last_degree'] || '').toString().trim(),
                phone: (row['شماره تماس'] || row['phone'] || '').toString().trim(),
                address: (row['آدرس'] || row['address'] || '').toString().trim(),
                status: (row['وضعیت'] || row['status'] || 'فعال').toString().trim(),
                notes: (row['توضیحات'] || row['notes'] || '').toString().trim(),
            };
            if (!r.name || !r.lname) {
                errors.push(`ردیف ${rowNum}: نام خالی`);
                continue;
            }

            if (r.national_id && natIds.has(r.national_id)) {
                errors.push(`ردیف ${rowNum}: کد ملی "${r.national_id}" تکراری`);
                continue;
            }

            if (r.emp_num && empNums.has(r.emp_num)) {
                errors.push(`ردیف ${rowNum}: شماره پرسنلی "${r.emp_num}" تکراری`);
                continue;
            }

            try {
                await createPersonnel({
                    name: r.name,
                    lname: r.lname,
                    father_name: r.father_name,
                    national_id: r.national_id,
                    emp_num: r.emp_num,
                    hire_date: r.hire_date,
                    emp_type: r.emp_type,
                    org_post: r.org_post,
                    job_title: r.job_title,
                    last_degree: r.last_degree,
                    phone: r.phone,
                    address: r.address,
                    status: r.status,
                    notes: r.notes,
                });
                successCount++;
                if (r.national_id) {
                    natIds.add(r.national_id);
                }

                if (r.emp_num) {
                    empNums.add(r.emp_num);
                }
            } catch (err) {
                errors.push(`ردیف ${rowNum}: خطا`);
            }
        }

        await dbRun('COMMIT');

        return { success: true, imported: successCount, failed: errors.length, errors };
    } catch (e) {
        await dbRun('ROLLBACK').catch(() => {});
        throw e;
    }
}

module.exports = {
    findAllPersonnel,
    findPersonnelById,
    createPersonnel,
    updatePersonnel,
    deletePersonnel,
    findExistingNationalIdsAndEmpNums,
    bulkImport,
};
