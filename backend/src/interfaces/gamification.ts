export const CAREER_MILESTONES = [
  { count: 2, level: "BRONZE" },
  { count: 5, level: "SILVER" },
  { count: 10, level: "GOLD" },
  { count: 50, level: "EMERALD" },
  { count: 100, level: "DIAMOND" },
  { count: 1000, level: "DOUBLE_DIAMOND" },
  { count: 10000, level: "BLACK_DIAMOND" },
  { count: 100000, level: "ROYAL_BLACK_DIAMOND" },
] as const;

export type CareerMilestone = (typeof CAREER_MILESTONES)[number];

export type UserProgressRow = {
  referrals_count: number;
  career_level: string;
  cycle_sales_count: number;
};

export type UserProgressResponse = {
  referrals: number;
  cycles: number;
  networkSales: number;
  currentLevel: string;
  nextMilestone: CareerMilestone | undefined;
  currentMilestone: CareerMilestone | { count: 0; level: "NONE" };
  progressToNext: number;
};
