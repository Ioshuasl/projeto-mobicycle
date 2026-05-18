import { db } from "../config/db.ts";

export const notificationRepository = {
  async findByUserId(userId: string): Promise<unknown[]> {
    return db
      .prepare(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
      )
      .all(userId);
  },
};
