import { db, generateId } from "../config/db.ts";

export type AdminDocumentListItem = DocumentListItem & {
  userName: string;
  userEmail: string;
};

export type DocumentListItem = {
  id: string;
  userId: string;
  filename: string | null;
  type: string;
  status: string;
  rejectionReason: string | null;
  amount: number | null;
  createdAt: string;
};

export type InsertDocumentInput = {
  id: string;
  userId: string;
  filename: string | undefined;
  content: string;
  type: string;
  status: string;
  rejectionReason: string | null;
  amount: number | null;
};

export const documentRepository = {
  async findAllForAdmin(): Promise<AdminDocumentListItem[]> {
    return (await db.prepare(`
      SELECT d.id, d.user_id as userId, d.filename, d.type, d.status,
             d.rejection_reason as rejectionReason, d.amount, d.created_at as createdAt,
             u.name as userName, u.email as userEmail
      FROM documents d
      JOIN users u ON d.user_id = u.id
      ORDER BY d.created_at DESC
    `).all()) as AdminDocumentListItem[];
  },

  async findListedByUserId(userId: string): Promise<DocumentListItem[]> {
    return (await db
      .prepare(
        `SELECT id, user_id as userId, filename, type, status,
         rejection_reason as rejectionReason, amount, created_at as createdAt
         FROM documents WHERE user_id = ? ORDER BY created_at DESC`
      )
      .all(userId)) as DocumentListItem[];
  },

  /** Lista completa para `/api/init`. */
  async findByUserId(userId: string): Promise<unknown[]> {
    return db.prepare("SELECT * FROM documents WHERE user_id = ?").all(userId);
  },

  async insert(input: InsertDocumentInput): Promise<void> {
    await db
      .prepare(
        `INSERT INTO documents (id, user_id, filename, content, type, status, rejection_reason, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.userId,
        input.filename,
        input.content,
        input.type,
        input.status,
        input.rejectionReason,
        input.amount
      );
  },

  createId(): string {
    return generateId("doc");
  },
};
