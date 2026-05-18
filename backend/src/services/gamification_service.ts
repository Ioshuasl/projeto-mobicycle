import { HttpError } from "../interfaces/errors.ts";
import {
  CAREER_MILESTONES,
  type UserProgressResponse,
} from "../interfaces/gamification.ts";
import { badgeRepository } from "../repository/badge_repository.ts";
import { gamificationRepository } from "../repository/gamification_repository.ts";
import { userRepository } from "../repository/user_repository.ts";

export const gamificationService = {
  getLeaderboard() {
    return gamificationRepository.findAffiliateLeaderboard();
  },

  async getRankings() {
    const [topReferrers, topCyclers] = await Promise.all([
      gamificationRepository.findTopReferrers(),
      gamificationRepository.findTopCyclers(),
    ]);
    return { topReferrers, topCyclers };
  },

  getAchievements(userId: string) {
    return badgeRepository.findByUserId(userId);
  },

  async getProgress(userId: string): Promise<UserProgressResponse> {
    const user = await userRepository.findProgressStats(userId);
    if (!user) {
      throw new HttpError(404, "Usuário não encontrado");
    }

    const cycles = await gamificationRepository.countCyclesByUserId(userId);

    const nextMilestone = CAREER_MILESTONES.find((m) => m.count > user.referrals_count);
    const currentMilestone =
      [...CAREER_MILESTONES].reverse().find((m) => m.count <= user.referrals_count) ??
      ({ count: 0, level: "NONE" } as const);

    return {
      referrals: user.referrals_count,
      cycles,
      networkSales: user.cycle_sales_count,
      currentLevel: user.career_level,
      nextMilestone,
      currentMilestone,
      progressToNext: nextMilestone
        ? ((user.referrals_count - currentMilestone.count) /
            (nextMilestone.count - currentMilestone.count)) *
          100
        : 100,
    };
  },
};
