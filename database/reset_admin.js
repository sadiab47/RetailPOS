const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

async function resetAdmin() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set in backend/.env');
    process.exit(1);
  }

  const plainPassword = 'admin123';
  console.log(`Hashing password "${plainPassword}"...`);
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(plainPassword, salt);

  console.log('Connecting to database...');
  const connection = await mysql.createConnection({
    uri: dbUrl,
  });

  try {
    console.log('Updating admin password...');
    const [result] = await connection.query(
      "UPDATE users SET password_hash = ? WHERE email = 'admin@retailpos.com'",
      [passwordHash]
    );

    if (result.affectedRows === 0) {
      console.log('Admin user not found. Inserting default admin user...');
      await connection.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('Admin User', 'admin@retailpos.com', ?, 'admin')",
        [passwordHash]
      );
    }

    console.log('Admin credentials configured successfully!');
  } catch (error) {
    console.error('Failed to configure admin:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

resetAdmin();
