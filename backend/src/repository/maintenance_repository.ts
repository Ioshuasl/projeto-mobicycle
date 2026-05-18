import { db, withTransaction } from "../config/db.ts";

const GHOST_USER_IDS = ["sys_explosion", "sys_admin_001"] as const;
const GHOST_POSITIONS = [4, 5, 6, 7] as const;

export const maintenanceRepository = {
  async clearGhostEntries(): Promise<void> {
    await withTransaction(async () => {
      await db.prepare(`
        DELETE FROM matrix_positions
        WHERE (user_id = ? OR user_id = ?)
        AND position IN (?, ?, ?, ?)
      `).run(...GHOST_USER_IDS, ...GHOST_POSITIONS);

      await db.prepare(`
        DELETE FROM matrix_history
        WHERE (user_id = ? OR user_id = ?)
        AND position IN (?, ?, ?, ?)
      `).run(...GHOST_USER_IDS, ...GHOST_POSITIONS);
    });
  },
};
