import 'dotenv/config';
import mysql, { RowDataPacket } from 'mysql2/promise';

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'mobicyclo',
    password: process.env.DB_PASSWORD || 'mobicyclo123',
    database: process.env.DB_NAME || 'mobicyclo',
  });

  try {
    const [userRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM users');
    const [matrixRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM matrices');
    const [positionRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM matrix_positions');
    const [transactionRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM transactions');
    
    console.log({
      userCount: userRows[0].count,
      matrixCount: matrixRows[0].count,
      positionCount: positionRows[0].count,
      transactionCount: transactionRows[0].count,
    });
  } catch (error) {
    console.error('Database query failed:', error);
  } finally {
    await pool.end();
  }
}
main();
