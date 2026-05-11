import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'mobicyclo',
    password: process.env.DB_PASSWORD || 'mobicyclo123',
    database: process.env.DB_NAME || 'mobicyclo',
  });

  try {
    const [matrices] = await pool.query('SELECT * FROM matrices');
    console.log(matrices);
  } catch (error) {
    console.error('Database query failed:', error);
  } finally {
    await pool.end();
  }
}
main();
