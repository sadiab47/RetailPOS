const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const schemaPath = path.join(__dirname, 'schema.sql');

async function runMigration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set in backend/.env');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const connection = await mysql.createConnection({
    uri: dbUrl,
    multipleStatements: true, // Allow executing multiple statements
  });

  try {
    console.log('Reading schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema...');
    await connection.query(schemaSql);
    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
