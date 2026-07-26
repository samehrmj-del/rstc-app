const fs = require('fs');
const path = require('path');

module.exports = async () => {
  const testDbPath = path.resolve(__dirname, '..', 'tmp', 'test.db');
  const tmpDir = path.resolve(__dirname, '..', 'tmp');
  if (!fs.existsSync(tmpDir)) {
fs.mkdirSync(tmpDir, { recursive: true });
}

  if (fs.existsSync(testDbPath)) {
fs.unlinkSync(testDbPath);
}

  process.env.DB_PATH = testDbPath;
  process.env.JWT_SECRET = 'test-secret';
  process.env.INIT_ADMIN_PASSWORD = 'test-admin-password';
};
