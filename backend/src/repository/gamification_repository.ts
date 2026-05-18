import { db } from "../config/db.ts";

export type LeaderboardUserRow = Record<string, unknown>;

export type TopReferrerRow = {
  id: string;
  name: string;
  nickname: string;
  avatar: string | null;
  referralsCount: number;
};

export type TopCyclerRow = {
  id: string;
  name: string;
  nickname: string;
  avatar: string | null;
  cycleCount: number;
};

export const gamificationRepository = {
  async findAffiliateLeaderboard(): Promise<LeaderboardUserRow[]> {
    return (await db.prepare(`
      SELECT id, name, nickname, avatar, referrals_count, status, career_level
      FROM users
      WHERE referrals_count > 0
      ORDER BY referrals_count DESC
      LIMIT 10
    `).all()) as LeaderboardUserRow[];
  },

  async findTopReferrers(): Promise<TopReferrerRow[]> {
    return (await db.prepare(`
      SELECT id, name, nickname, avatar, referrals_count as referralsCount
      FROM users
      WHERE referrals_count > 0
      ORDER BY referrals_count DESC
      LIMIT 10
    `).all()) as TopReferrerRow[];
  },

  async findTopCyclers(): Promise<TopCyclerRow[]> {
    return (await db.prepare(`
      SELECT u.id, u.name, u.nickname, u.avatar, COUNT(mc.id) as cycleCount
      FROM users u
      JOIN matrix_cycles mc ON u.id = mc.user_id
      GROUP BY u.id
      ORDER BY cycleCount DESC
      LIMIT 10
    `).all()) as TopCyclerRow[];
  },

  async countCyclesByUserId(userId: string): Promise<number> {
    const row = (await db
      .prepare("SELECT COUNT(*) as count FROM matrix_cycles WHERE user_id = ?")
      .get(userId)) as { count: number };
    return row.count;
  },
};
