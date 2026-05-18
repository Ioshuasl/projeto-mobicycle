import { db } from "../config/db.ts";

export type NotificationListItem = {
  id: string;
  type: string;
  message: string;
  isRead: number;
  createdAt: string;
};

export const notificationRepository = {
  /** Lista para API `/notifications` (campos explícitos). */
  async findListedByUserId(userId: string): Promise<NotificationListItem[]> {
    return (await db
      .prepare(
        `SELECT id, type, message, is_read as isRead, created_at as createdAt
         FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
      )
      .all(userId)) as NotificationListItem[];
  },

  /** Lista completa para `/api/init`. */
  async findByUserId(userId: string): Promise<unknown[]> {
    return db
      .prepare(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
      )
      .all(userId);
  },

  async findOwnerById(id: string): Promise<{ user_id: string } | null> {
    return (await db
      .prepare("SELECT user_id FROM notifications WHERE id = ?")
      .get(id)) as { user_id: string } | null;
  },

  async markAsRead(id: string): Promise<void> {
    await db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(id);
  },
};
