import { db } from "../config/db.ts";

export const transactionRepository = {
  async findByUserId(userId: string): Promise<unknown[]> {
    const rows = (await db
      .prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId)) as Array<{ id: string }>;
    return Array.from(new Map(rows.map((t) => [t.id, t])).values());
  },
};
