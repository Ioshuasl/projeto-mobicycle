import { db, generateId } from "../config/db.ts";

export type AdminTransactionListItem = {
  id: string;
  userId: string;
  amount: number;
  type: string;
  description: string;
  status: string;
  createdAt: string;
  userName: string;
  userEmail: string;
};

export type ClawbackSourceTransaction = {
  user_id: string;
  type: string;
  status: string;
};

export type TransactionListItem = {
  id: string;
  amount: number;
  type: string;
  description: string;
  status: string;
  createdAt: string;
};

export const transactionRepository = {
  async findAllForAdmin(limit = 100): Promise<AdminTransactionListItem[]> {
    return (await db.prepare(`
      SELECT
        t.id, t.user_id as userId, t.amount, t.type,
        t.description, t.status, t.created_at as createdAt,
        u.name as userName, u.email as userEmail
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT ?
    `).all(limit)) as AdminTransactionListItem[];
  },

  async findById(id: string): Promise<ClawbackSourceTransaction | null> {
    return (await db.prepare("SELECT user_id, type, status FROM transactions WHERE id = ?").get(
      id
    )) as ClawbackSourceTransaction | null;
  },

  async markRejectedByAdmin(id: string): Promise<void> {
    await db
      .prepare(
        "UPDATE transactions SET status = 'REJECTED', description = 'Estornada pelo Administrador' WHERE id = ?"
      )
      .run(id);
  },

  async insertClawback(userId: string, amount: number): Promise<void> {
    await db
      .prepare(
        "INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'CLAWBACK', 'Estorno de Comissão (Rede)', 'COMPLETED')"
      )
      .run(generateId("tx"), userId, -amount);
  },

  async findListedByUserId(userId: string): Promise<TransactionListItem[]> {
    const rows = (await db
      .prepare(
        `SELECT id, amount, type, description, status, created_at as createdAt
         FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
      )
      .all(userId)) as TransactionListItem[];
    return Array.from(new Map(rows.map((t) => [t.id, t])).values());
  },

  async insertWithdrawal(userId: string, amount: number, description: string): Promise<void> {
    await db
      .prepare(
        "INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'WITHDRAWAL', ?, 'COMPLETED')"
      )
      .run(generateId("tx"), userId, -amount, description);
  },

  async insertAdhesion(userId: string, amount: number): Promise<void> {
    await db
      .prepare(
        "INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'ADHESION', 'Ativação de Licença de Uso', 'COMPLETED')"
      )
      .run(generateId("tx"), userId, amount);
  },

  async findByUserId(userId: string): Promise<unknown[]> {
    const rows = (await db
      .prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId)) as Array<{ id: string }>;
    return Array.from(new Map(rows.map((t) => [t.id, t])).values());
  },
};
