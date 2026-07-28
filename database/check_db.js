const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

async function testConnection() {
  const dbUrl = process.env.DATABASE_URL;
  console.log(`Connecting to database at ${dbUrl}...`);
  try {
    const connection = await mysql.createConnection({
      uri: dbUrl
    });

    console.log("✓ Successfully connected to MySQL database!");

    const [[{ count: usersCount }]] = await connection.query("SELECT COUNT(*) as count FROM users");
    const [[{ count: productsCount }]] = await connection.query("SELECT COUNT(*) as count FROM products");
    const [[{ count: salesCount }]] = await connection.query("SELECT COUNT(*) as count FROM sales");
    const [[{ count: txCount }]] = await connection.query("SELECT COUNT(*) as count FROM inventory_transactions");

    console.log(`\nRecord Counts:`);
    console.log(` - Users: ${usersCount}`);
    console.log(` - Products: ${productsCount}`);
    console.log(` - Sales Invoices: ${salesCount}`);
    console.log(` - Inventory Transactions Ledger: ${txCount}`);

    if (salesCount > 0) {
      const [latestSales] = await connection.query("SELECT invoice_number, customer_name, total, created_at FROM sales ORDER BY id DESC LIMIT 3");
      console.log("\nLatest 3 Sales:");
      latestSales.forEach(sale => {
        console.log(` - Invoice: ${sale.invoice_number} | Customer: ${sale.customer_name} | Total: Rs. ${sale.total} | Date: ${sale.created_at}`);
      });
    }

    await connection.end();
  } catch (error) {
    console.error("✗ Failed to connect or query database:", error.message);
  }
}

testConnection();
