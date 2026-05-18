import { db } from "../config/db.ts";

export const documentRepository = {
  async findByUserId(userId: string): Promise<unknown[]> {
    return db.prepare("SELECT * FROM documents WHERE user_id = ?").all(userId);
  },
};
