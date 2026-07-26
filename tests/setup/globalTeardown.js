const fs = require('fs');
const path = require('path');

function retryUnlink(filePath, retries = 5, delay = 100) {
    for (let i = 0; i < retries; i++) {
        try {
            if (fs.existsSync(filePath)) {
fs.unlinkSync(filePath);
}

            return true;
        } catch (e) {
            if (i === retries - 1) {
return false;
}

            const start = Date.now();
            while (Date.now() - start < delay) {
                0;
            }
        }
    }
}

module.exports = async () => {
    try {
        const { db } = require('../../src/infrastructure/database/connection');
        try {
 db.close(); 
} catch (e) { /* ignore */ }
    } catch (e) { /* ignore if connection module already unloaded */ }

    const testDbPath = path.resolve(__dirname, '..', 'tmp', 'test.db');
    retryUnlink(testDbPath);
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    retryUnlink(walPath);
    retryUnlink(shmPath);
};
