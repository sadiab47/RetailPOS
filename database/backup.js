const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
}

async function runBackup() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set in backend/.env');
    process.exit(1);
  }

  // Parse connection string
  // Format: mysql://user:password@host:port/database
  const matches = dbUrl.match(/mysql:\/\/([^:]*):?([^@]*)@([^:]*):?(\d*)\/(.*)/);
  if (!matches) {
    console.error('Invalid DATABASE_URL format.');
    process.exit(1);
  }

  const [, user, password, host, port, dbName] = matches;
  const backupFolder = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder);
  }

  const timestamp = getTimestamp();
  const backupFile = path.join(backupFolder, `RetailPOS_${timestamp}.sql`);

  // Locate mysqldump
  let mysqldumpCmd = 'mysqldump';
  const xamppPath = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';
  if (fs.existsSync(xamppPath)) {
    mysqldumpCmd = `"${xamppPath}"`;
  }

  const pwdOption = password ? `-p${password}` : '';
  const cmd = `${mysqldumpCmd} -h ${host} -P ${port || 3306} -u ${user} ${pwdOption} ${dbName} > "${backupFile}"`;

  console.log(`Creating database backup for "${dbName}"...`);
  exec(cmd, (error) => {
    if (error) {
      console.error('✗ Backup failed:', error.message);
      process.exit(1);
    }
    console.log(`✓ Backup successfully created!`);
    console.log(`File saved: backups/RetailPOS_${timestamp}.sql`);
  });
}

runBackup();
