const {
    getBackupStream,
    listBackupFiles,
    getBackupFileStream,
    validateBackupFile,
    deleteBackupFile,
    restoreBackupFile,
    createBackupFile,
    cleanupOldBackups,
    ensureBackupDir,
} = require('./repository');

async function backupDownload() {
    try {
        const streamInfo = getBackupStream();
        if (!streamInfo) {
            return { status: 404, body: { error: 'فایل دیتابیس یافت نشد' } };
        }

        return { status: 200, body: { streamInfo } };
    } catch (e) {
        return { status: 500, body: { error: e.message } };
    }
}

async function backupList() {
    try {
        await ensureBackupDir();
        const list = await listBackupFiles();

        return {
            status: 200,
            body: { backups: list, settings: { maxBackups: 30, scheduleHour: 2 } },
        };
    } catch (e) {
        return { status: 500, body: { error: e.message } };
    }
}

async function backupDownloadFile(name) {
    const fp = await getBackupFileStream(name);
    if (!fp) {
        return { status: 404, body: { error: 'فایل پشتیبان یافت نشد' } };
    }

    return { status: 200, body: { filePath: fp, filename: name } };
}

async function backupValidate(body) {
    try {
        const result = validateBackupFile(body);

        return { status: 200, body: result };
    } catch (e) {
        return { status: 400, body: { valid: false, error: e.message } };
    }
}

async function backupDelete(name) {
    const deleted = await deleteBackupFile(name);
    if (!deleted) {
        return { status: 404, body: { error: 'فایل پشتیبان یافت نشد' } };
    }

    return { status: 200, body: { success: true, message: 'فایل پشتیبان حذف شد.' } };
}

async function backupRestore(body) {
    try {
        await restoreBackupFile(body);

        return {
            status: 200,
            body: {
                success: true,
                message: 'بازیابی با موفقیت انجام شد و اطلاعات جدید فعال شدند.',
            },
        };
    } catch (e) {
        return { status: 500, body: { error: `خطا در بازیابی: ${e.message}` } };
    }
}

async function scheduledBackup() {
    try {
        await ensureBackupDir();
        await createBackupFile();
        await cleanupOldBackups();
    } catch (e) {
        console.error('Backup error:', e.message);
    }
}

function startScheduledBackup() {
    setInterval(() => {
        const now = new Date();
        if (now.getHours() === 2 && now.getMinutes() === 0) {
            scheduledBackup();
        }
    }, 60000);
}

module.exports = {
    backupDownload,
    backupList,
    backupDownloadFile,
    backupValidate,
    backupDelete,
    backupRestore,
    scheduledBackup,
    startScheduledBackup,
};
