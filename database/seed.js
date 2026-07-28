const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const seedPath = path.join(__dirname, 'seed.sql');

async function runSeed() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set in backend/.env');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const connection = await mysql.createConnection({
    uri: dbUrl,
    multipleStatements: true,
  });

  try {
    console.log('Reading seed.sql...');
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    console.log('Executing seed...');
    await connection.query(seedSql);
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runSeed();
