/**
 * Testa conexão MySQL usando variáveis de .env.example (ou sobrescritas por .env).
 * Uso: npm run db:test
 *
 * Host remoto / IP sem alterar .env: defina DB_TEST_HOST (tem precedência sobre DB_HOST).
 * Ex.: npx cross-env DB_TEST_HOST=187.77.254.38 npm run db:test
 */
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// Base: valores do .env.example; .env local sobrescreve (se existir).
dotenv.config({ path: path.join(root, '.env.example') });
dotenv.config({ path: path.join(root, '.env'), override: true });

// Sobrescreve host só para este script (útil quando .env tem DB_HOST=db mas você quer testar um IP/hostname remoto).
const hostFromEnv = process.env.DB_HOST || 'localhost';
let host = process.env.DB_TEST_HOST?.trim() || hostFromEnv;
if (process.env.DB_TEST_HOST?.trim()) {
  console.log(`[db:test] Usando DB_TEST_HOST=${host} (ignora DB_HOST do .env para este comando).`);
}
const port = parseInt(process.env.DB_PORT || '3306', 10);
const user = process.env.DB_USER || 'mobicyclo';
const password = process.env.DB_PASSWORD ?? '';
const database = process.env.DB_NAME || 'mobicyclo';

if (!process.env.DB_TEST_HOST?.trim() && host === 'db') {
  console.warn(
    '[db:test] DB_HOST é "db" (rede Docker). Para teste na máquina host, usando localhost.\n'
  );
  host = 'localhost';
}

async function main() {
  console.log(`[db:test] Tentando conectar: ${user}@${host}:${port}/${database}`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 10_000,
    });

    const [rows] = await connection.query('SELECT 1 AS ok');
    console.log('[db:test] Conexão OK. SELECT 1 =>', Array.isArray(rows) ? rows[0] : rows);
    await connection.end();
    process.exit(0);
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { code?: string };
    console.error('[db:test] Falha na conexão:', e.message || err);
    if (e.code) console.error('[db:test] code:', e.code);
    if (e.errno) console.error('[db:test] errno:', e.errno);
    if (connection) {
      try {
        await connection.end();
      } catch {
        /* ignore */
      }
    }
    process.exit(1);
  }
}

main();
