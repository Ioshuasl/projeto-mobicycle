import { db } from "../config/db.ts";

export type BadgeRow = Record<string, unknown> & { id: string };

export const badgeRepository = {
  async findByUserId(userId: string): Promise<BadgeRow[]> {
    return (await db.prepare("SELECT * FROM badges WHERE user_id = ?").all(userId)) as BadgeRow[];
  },
};
