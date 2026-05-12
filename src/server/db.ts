import mysql from 'mysql2/promise';
import crypto from 'crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import logger from './logger.ts';

let pool: Pool;

// S24: AsyncLocalStorage for transaction-scoped connections
// Each transaction gets its own connection, isolated from other concurrent requests
const transactionStorage = new AsyncLocalStorage<PoolConnection>();

// ============================================================
// Camada de compatibilidade de queries
// Ajusta sintaxe legada para MySQL automaticamente
// ============================================================
function formatQuery(sql: string): string {
  return sql
    .replace(/INSERT OR IGNORE/gi, 'INSERT IGNORE')
    .replace(/INSERT OR REPLACE/gi, 'REPLACE');
}

// Helper: get the current query executor (transaction connection or pool)
function getExecutor(): Pool | PoolConnection {
  const txConn = transactionStorage.getStore();
  return txConn || pool;
}

// ============================================================
// Objeto "db" estruturado para suportar o wrapper assíncrono atual
// S24: Queries automatically route to the transaction connection when inside withTransaction()
// ============================================================
export const db = {
  prepare: (sql: string) => {
    const convertedSql = formatQuery(sql);
    const flattenParams = (params: any[]) => {
      const flat = params.flat(Infinity);
      // MySQL não aceita undefined, converter para null
      return flat.map(p => p === undefined ? null : p);
    };
    return {
      run: async (...params: any[]) => {
        const executor = getExecutor();
        const flatParams = flattenParams(params);
        const [result] = await executor.query<ResultSetHeader>(convertedSql, flatParams.length > 0 ? flatParams : undefined);
        return result;
      },
      get: async (...params: any[]) => {
        const executor = getExecutor();
        const flatParams = flattenParams(params);
        const [rows] = await executor.query<RowDataPacket[]>(convertedSql, flatParams.length > 0 ? flatParams : undefined);
        return rows[0] || null;
      },
      all: async (...params: any[]) => {
        const executor = getExecutor();
        const flatParams = flattenParams(params);
        const [rows] = await executor.query<RowDataPacket[]>(convertedSql, flatParams.length > 0 ? flatParams : undefined);
        return rows as any[];
      },
    };
  },
  exec: async (sql: string) => {
    const executor = getExecutor();
    const convertedSql = formatQuery(sql);
    // Suporta múltiplos statements separados por ;
    const statements = convertedSql.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      await executor.query(stmt);
    }
  },
  // Flag para verificar se estamos em transação (usado pelo matrixManager)
  get inTransaction(): boolean {
    return !!transactionStorage.getStore();
  },
  set inTransaction(_v: boolean) {
    // No-op: inTransaction is now derived from AsyncLocalStorage automatically
  },
};

// ============================================================
// S24: Transaction-safe implementation using AsyncLocalStorage
// Each call gets its own dedicated connection from the pool,
// completely isolated from other concurrent requests.
// ============================================================
export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await transactionStorage.run(conn, fn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ============================================================
// Inicialização do banco (pool + schema + seeds)
// ============================================================
export async function initDatabase(): Promise<void> {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'mobicyclo',
    password: process.env.DB_PASSWORD || 'mobicyclo123',
    database: process.env.DB_NAME || 'mobicyclo',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_POOL_SIZE || '50'),
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 30000,
    charset: 'utf8mb4',
  });

  // Aguarda conexão com retry
  let retries = 30;
  while (retries > 0) {
    try {
      await pool.execute('SELECT 1');
      logger.info('MySQL connection established');
      break;
    } catch (err) {
      retries--;
      if (retries === 0) {
        logger.error('Failed to connect to MySQL after 30 attempts');
        throw err;
      }
      logger.info(`Waiting for MySQL... (${retries} attempts left)`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Cria schema
  await createSchema();

  // Seed padrão
  await seedDefaults();

  // Migrations
  await runMigrations();
}

// ============================================================
// Schema MySQL
// ============================================================
async function createSchema(): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) NOT NULL PRIMARY KEY,
      firebase_uid VARCHAR(255) UNIQUE,
      name VARCHAR(255),
      nickname VARCHAR(255),
      email VARCHAR(255) UNIQUE,
      password VARCHAR(255),
      cpf VARCHAR(50) UNIQUE,
      phone VARCHAR(50),
      pix_key VARCHAR(255),
      birth_date VARCHAR(50),
      avatar LONGTEXT,
      bank_name VARCHAR(255),
      bank_agency VARCHAR(100),
      bank_account VARCHAR(100),
      bank_account_type VARCHAR(50),
      referrals_count INT DEFAULT 0,
      cycle_sales_count INT DEFAULT 0,
      balance DOUBLE DEFAULT 0,
      debt_balance DOUBLE DEFAULT 0,
      cashback_balance DOUBLE DEFAULT 0,
      snack_fast_cashback DOUBLE DEFAULT 0,
      energy_cashback DOUBLE DEFAULT 0,
      guincho_cashback DOUBLE DEFAULT 0,
      hability_test_cashback DOUBLE DEFAULT 0,
      voucher_balance DOUBLE DEFAULT 0,
      document_status VARCHAR(50) DEFAULT 'PENDING',
      referrer_id VARCHAR(255),
      stars INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'PARTNER',
      referral_code VARCHAR(100) UNIQUE,
      career_level VARCHAR(50) DEFAULT 'NONE',
      cashboard_qualified_referrals INT DEFAULT 0,
      reentry_mode VARCHAR(50) DEFAULT 'AUTO',
      total_earnings DOUBLE DEFAULT 0,
      role VARCHAR(50) DEFAULT 'user',
      is_activated TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referrer_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS matrices (
      id VARCHAR(255) NOT NULL PRIMARY KEY,
      type VARCHAR(50),
      status VARCHAR(50) DEFAULT 'OPEN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS matrix_positions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      matrix_id VARCHAR(255),
      user_id VARCHAR(255),
      position INT,
      UNIQUE KEY unique_matrix_position (matrix_id, position),
      FOREIGN KEY (matrix_id) REFERENCES matrices(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(255) NOT NULL PRIMARY KEY,
      user_id VARCHAR(255),
      amount DOUBLE,
      type VARCHAR(100),
      description TEXT,
      status VARCHAR(50) DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(255) NOT NULL PRIMARY KEY,
      value TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(255) NOT NULL PRIMARY KEY,
      user_id VARCHAR(255),
      type VARCHAR(100),
      message TEXT,
      is_read TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS matrix_cycles (
      id VARCHAR(255) NOT NULL PRIMARY KEY,
      user_id VARCHAR(255),
      matrix_id VARCHAR(255),
      type VARCHAR(50),
      amount DOUBLE DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (matrix_id) REFERENCES matrices(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS documents (
      id VARCHAR(255) NOT NULL PRIMARY KEY,
      user_id VARCHAR(255),
      filename VARCHAR(500),
      content LONGTEXT,
      type VARCHAR(100),
      status VARCHAR(50) DEFAULT 'PENDING',
      rejection_reason TEXT,
      amount DOUBLE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS vouchers (
      id VARCHAR(255) NOT NULL PRIMARY KEY,
      code VARCHAR(255) UNIQUE,
      amount DOUBLE,
      owner_id VARCHAR(255),
      recipient_id VARCHAR(255),
      recipient_email VARCHAR(255),
      recipient_phone VARCHAR(100),
      status VARCHAR(50) DEFAULT 'AVAILABLE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id),
      FOREIGN KEY (recipient_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS badges (
      id VARCHAR(255) NOT NULL PRIMARY KEY,
      user_id VARCHAR(255),
      type VARCHAR(100),
      name VARCHAR(255),
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      user_id VARCHAR(255),
      subscription TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS matrix_history (
      id VARCHAR(255) NOT NULL PRIMARY KEY,
      matrix_id VARCHAR(255),
      user_id VARCHAR(255),
      type VARCHAR(50),
      position INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (matrix_id) REFERENCES matrices(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS user_badges (
      user_id VARCHAR(255),
      badge_id VARCHAR(255),
      awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, badge_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (badge_id) REFERENCES badges(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS mercadopago_deposit_orders (
      id VARCHAR(255) NOT NULL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      amount DOUBLE NOT NULL,
      preference_id VARCHAR(255) NOT NULL,
      mp_payment_id VARCHAR(255) NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE KEY uk_mp_pref (preference_id),
      UNIQUE KEY uk_mp_payment (mp_payment_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ];

  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (err) {
      logger.error(`Error executing statement: ${stmt.substring(0, 60)}...`, err);
    }
  }

  // Índices
  const indexes = [
    `CREATE INDEX idx_matrix_positions_user_id ON matrix_positions(user_id)`,
    `CREATE INDEX idx_transactions_user_id ON transactions(user_id)`,
    `CREATE INDEX idx_notifications_user_id ON notifications(user_id)`,
    `CREATE INDEX idx_documents_user_id ON documents(user_id)`,
    `CREATE INDEX idx_vouchers_owner_id ON vouchers(owner_id)`,
    `CREATE INDEX idx_vouchers_recipient_id ON vouchers(recipient_id)`,
    `CREATE INDEX idx_matrix_cycles_user_id ON matrix_cycles(user_id)`,
    `CREATE INDEX idx_badges_user_id ON badges(user_id)`,
  ];

  for (const idx of indexes) {
    try {
      await pool.query(idx);
    } catch (err: any) {
      // Ignora erro de índice duplicado
      if (!err.message?.includes('Duplicate')) {
        logger.error(`Error creating index: ${idx.substring(0, 60)}...`);
      }
    }
  }

  logger.info('Database schema and indexes verified');
}

// ============================================================
// Default settings seed
// ============================================================
async function seedDefaults(): Promise<void> {
  const defaultSettings: [string, string][] = [
    ['banner_url', 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=2070&auto=format&fit=crop'],
    ['logo_url', 'https://storage.googleapis.com/ais-studio-user-uploads/67ea9a5c-6b3a-4e8a-8e2a-7f1a8e2a7f1a/image.png'],
    ['flow_economy', '0'],
    ['matrix_adhesion_fee', '650'],
    ['matrix_onboard_bonus', '65'],
    ['matrix_cashboard_bonus', '3990'],
    ['matrix_referral_bonus', '65'],
    ['matrix_min_referrals_to_cycle', '2'],
    ['matrix_cashback_snack_fixed', '0'],
    ['matrix_cashback_energy_fixed', '0'],
    ['matrix_cashback_guincho_fixed', '0'],
    ['matrix_cashback_hability_fixed', '0'],
    ['cashback_percent_referral', '10'],
    ['cashback_percent_infinite', '10'],
    ['cashback_percent_unilevel', '10'],
    ['cashback_percent_snack', '5'],
    ['cashback_percent_energy', '5'],
    ['cashback_percent_guincho', '5'],
    ['cashback_percent_hability_test', '5'],
    ['bonus_percent_executivo_1', '5'],
    ['bonus_percent_executivo_2', '10'],
    ['bonus_percent_executivo_3', '15'],
    ['bonus_percent_executivo_4', '20'],
    ['bonus_percent_diamante', '25'],
    ['bonus_percent_black_diamante', '30'],
    ['bonus_percent_vice_presidente', '35'],
    ['bonus_percent_presidente', '40'],
    ['bonus_percent_ceo_ple', '45'],
    ['matrix_formation_rule', 'FILL_BASE'],
    ['bonus_unilevel_l1', '10'],
    ['bonus_unilevel_l2', '5'],
    ['bonus_unilevel_l3', '3'],
    ['bonus_unilevel_l4', '2'],
    ['bonus_unilevel_l5', '1'],
    ['bonus_unilevel_l6', '1'],
    ['bonus_unilevel_l7', '1'],
    ['bonus_unilevel_l8', '1'],
    ['theme_neon_green', '#39ff14'],
    ['theme_neon_blue', '#00f3ff'],
    ['theme_neon_purple', '#bc13fe'],
    ['theme_neon_orange', '#ff6700'],
    ['theme_neon_pink', '#ff00ff'],
    ['image_cache_version', '1'],
    ['service_guincho_urbano_price', '180'],
    ['service_guincho_interurbano_price', '450'],
    ['service_assistencia_mensal_price', '85'],
    ['service_corridas_curta_price', '15'],
    ['service_corridas_media_price', '35'],
    ['service_corridas_longa_price', '75'],
    ['service_snack_rapido_price', '25'],
    ['service_snack_completa_price', '55'],
    ['service_snack_familia_price', '120'],
    ['service_energy_drink_price', '12'],
    ['service_energy_kit_price', '150'],
    ['service_energy_plano_price', '290'],
    ['service_bonus_hability_test_price_1', '100'],
    ['service_bonus_hability_test_price_2', '250'],
    ['service_bonus_hability_test_price_3', '500'],
    ['service_corridas_enabled', '1'],
    ['service_snack_enabled', '1'],
    ['service_energy_enabled', '1'],
    ['service_guincho_enabled', '1'],
    ['service_bonus_hability_test_enabled', '1'],
    ['service_fee_percent_corridas', '10'],
    ['service_fee_percent_energy', '3'],
    ['service_fee_percent_snack', '1.5'],
    ['service_fee_percent_guincho', '0.6'],
    ['service_fee_percent_hability', '0.15'],
  ];

  for (const [key, value] of defaultSettings) {
    try {
      await pool.execute("INSERT IGNORE INTO settings (`key`, value) VALUES (?, ?)", [key, value]);
    } catch (err) {
      // Ignora
    }
  }

  // Admin padrão
  try {
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT COUNT(*) as count FROM users");
    if (rows[0].count === 0) {
      const adminId = "sys_admin_001";
      const adminEmail = "consultorcredenciado@gmail.com";
      const adminPassword = await hashPassword("admin");
      const adminCpf = "000.000.000-00";
      const adminReferralCode = "ADMIN001";

      await pool.execute(
        `INSERT INTO users (id, name, nickname, email, password, cpf, phone, status, role, referral_code, is_activated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [adminId, "Admin Master", "Master", adminEmail, adminPassword, adminCpf, "00000000000", "MASTER", "admin", adminReferralCode]
      );

      await pool.execute(
        `INSERT INTO users (id, name, nickname, email, password, cpf, phone, status, role, referral_code, is_activated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        ["sys_admin_002", "Admin Mobicyclo", "Admin", "admin@mobicyclo.com", await hashPassword("admin"), "111.111.111-11", "11111111111", "MASTER", "admin", "MOBI001"]
      );

      await pool.execute(
        `INSERT INTO users (id, name, nickname, email, password, cpf, phone, status, role, referral_code, is_activated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        ["sys_explosion", "Mobicyclo Explosion", "Explosion", "explosion@mobicyclo.com", await hashPassword("explosion"), "222.222.222-22", "22222222222", "MASTER", "admin", "EXPLOSION001"]
      );

      logger.info('Default admins created');
    }
  } catch (err) {
    logger.error("Error creating default admins:", err);
  }
}

// ============================================================
// Migrations
// ============================================================
async function runMigrations(): Promise<void> {
  try {
    // Atualiza branding dos system users
    await pool.execute(`
      UPDATE users 
      SET name = 'Admin Mobicyclo', email = 'admin@mobicyclo.com' 
      WHERE id = 'sys_admin_002' AND (name LIKE '%SE+SE%' OR email LIKE '%sese.com%')
    `);

    await pool.execute(`
      UPDATE users 
      SET name = 'Mobicyclo Explosion', email = 'explosion@mobicyclo.com' 
      WHERE id = 'sys_explosion' AND (name LIKE '%SE+SE%' OR email LIKE '%sese.com%' OR name = 'Explosion System')
    `);

    // Inicializa campos nulos
    await pool.execute("UPDATE users SET voucher_balance = 0 WHERE voucher_balance IS NULL");
    await pool.execute("UPDATE users SET document_status = 'PENDING' WHERE document_status IS NULL");
    await pool.execute("UPDATE users SET career_level = 'LICENSED' WHERE career_level IS NULL OR career_level = 'NONE' OR career_level IN ('BRONZE', 'SILVER', 'GOLD', 'EMERALD', 'DOUBLE_DIAMOND', 'ROYAL_BLACK_DIAMOND')");

    // Atualiza banner
    const carChargerBanner = 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=2070&auto=format&fit=crop';
    const oldBanner1 = 'https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?q=80&w=2070&auto=format&fit=crop';
    const oldBanner2 = 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=2074&auto=format&fit=crop';
    await pool.execute("UPDATE settings SET value = ? WHERE `key` = 'banner_url' AND (value = ? OR value = ?)", [carChargerBanner, oldBanner1, oldBanner2]);

    logger.info('Migrations executed successfully');
  } catch (err) {
    logger.error("Error during migrations:", err);
  }
}

// ============================================================
// Funções utilitárias exportadas
// ============================================================
// Legacy SHA-256 hash — used only for migration of old passwords
export const legacyHashPassword = (password: string) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// Bcrypt-based secure password hashing
import bcrypt from 'bcrypt';
const BCRYPT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  // If the stored hash looks like a bcrypt hash, use bcrypt comparison
  if (hash.startsWith('$2b$') || hash.startsWith('$2a$')) {
    return bcrypt.compare(password, hash);
  }
  // Legacy SHA-256 fallback for un-migrated passwords
  return legacyHashPassword(password) === hash || password === hash;
};

export const getSetting = async (key: string, defaultValue: string = ''): Promise<string> => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT value FROM settings WHERE `key` = ?", [key]);
    return rows[0]?.value || defaultValue;
  } catch (err) {
    return defaultValue;
  }
};

export const ensureSetting = async (key: string, value: string) => {
  try {
    await pool.execute("INSERT IGNORE INTO settings (`key`, value) VALUES (?, ?)", [key, value]);
    await pool.execute("UPDATE settings SET value = ? WHERE `key` = ?", [value, key]);
  } catch (err) {
    console.error(`[DB] Erro ao salvar setting ${key}:`, err);
  }
};

export const generateId = (prefix: string = '') => `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
