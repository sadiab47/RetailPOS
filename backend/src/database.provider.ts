import { createPool } from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 10,
});

export default pool;
