const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const backupFolder = path.join(__dirname, '../backups');

async function selectBackup() {
  if (!fs.existsSync(backupFolder)) {
    console.error('✗ No backups folder found.');
    process.exit(1);
  }

  const files = fs.readdirSync(backupFolder).filter(f => f.endsWith('.sql'));
  if (files.length === 0) {
    console.error('✗ No .sql backup files found in backups/ directory.');
    process.exit(1);
  }

  console.log('Available Backup Files:');
  files.forEach((file, index) => {
    console.log(` [${index + 1}] ${file}`);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\nSelect backup index to restore (or press Enter to cancel): ', (answer) => {
    rl.close();
    const idx = parseInt(answer.trim()) - 1;
    if (isNaN(idx) || idx < 0 || idx >= files.length) {
      console.log('Cancelled.');
      process.exit(0);
    }

    runRestore(files[idx]);
  });
}

function runRestore(filename) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set in backend/.env');
    process.exit(1);
  }

  const matches = dbUrl.match(/mysql:\/\/([^:]*):?([^@]*)@([^:]*):?(\d*)\/(.*)/);
  if (!matches) {
    console.error('Invalid DATABASE_URL format.');
    process.exit(1);
  }

  const [, user, password, host, port, dbName] = matches;
  const backupFile = path.join(backupFolder, filename);

  // Locate mysql.exe
  let mysqlCmd = 'mysql';
  const xamppPath = 'C:\\xampp\\mysql\\bin\\mysql.exe';
  if (fs.existsSync(xamppPath)) {
    mysqlCmd = `"${xamppPath}"`;
  }

  const pwdOption = password ? `-p${password}` : '';
  const cmd = `${mysqlCmd} -h ${host} -P ${port || 3306} -u ${user} ${pwdOption} ${dbName} < "${backupFile}"`;

  console.log(`\nRestoring backup file "${filename}" into database "${dbName}"...`);
  exec(cmd, (error) => {
    if (error) {
      console.error('✗ Restore failed:', error.message);
      process.exit(1);
    }
    console.log('✓ Database restored successfully!');
  });
}

selectBackup();
