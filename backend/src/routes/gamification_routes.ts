import { Router, type RequestHandler, type Response } from "express";
import { db } from "../config/db.ts";
import { authenticateUser, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";

const CAREER_MILESTONES = [
  { count: 2, level: "BRONZE" },
  { count: 5, level: "SILVER" },
  { count: 10, level: "GOLD" },
  { count: 50, level: "EMERALD" },
  { count: 100, level: "DIAMOND" },
  { count: 1000, level: "DOUBLE_DIAMOND" },
  { count: 10000, level: "BLACK_DIAMOND" },
  { count: 100000, level: "ROYAL_BLACK_DIAMOND" },
] as const;

/** Rankings, achievements, progress, leaderboard (migrado de `server.ts`). */
export function createGamificationRoutes(): Router {
  const router = Router();
  const auth = authenticateUser as RequestHandler;

  router.get("/affiliates/leaderboard", auth, async (_req, res: Response) => {
    try {
      const topUsers = await db.prepare(`
        SELECT id, name, nickname, avatar, referrals_count, status, career_level
        FROM users
        WHERE referrals_count > 0
        ORDER BY referrals_count DESC
        LIMIT 10
      `).all();
      res.json(topUsers);
    } catch {
      res.status(500).json({ error: "Erro ao buscar ranking" });
    }
  });

  router.get("/rankings", auth, async (_req, res: Response) => {
    try {
      const topReferrers = await db.prepare(`
        SELECT id, name, nickname, avatar, referrals_count as referralsCount
        FROM users
        WHERE referrals_count > 0
        ORDER BY referrals_count DESC
        LIMIT 10
      `).all();

      const topCyclers = await db.prepare(`
        SELECT u.id, u.name, u.nickname, u.avatar, COUNT(mc.id) as cycleCount
        FROM users u
        JOIN matrix_cycles mc ON u.id = mc.user_id
        GROUP BY u.id
        ORDER BY cycleCount DESC
        LIMIT 10
      `).all();

      res.json({ topReferrers, topCyclers });
    } catch {
      res.status(500).json({ error: "Erro ao buscar rankings" });
    }
  });

  router.get("/user/achievements", auth, async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    try {
      const badges = await db.prepare("SELECT * FROM badges WHERE user_id = ?").all(user.id);
      res.json(badges);
    } catch {
      res.status(500).json({ error: "Erro ao buscar conquistas" });
    }
  });

  router.get("/user/progress", auth, async (req, res: Response) => {
    const { user: authUser } = req as AuthenticatedRequest;
    try {
      const user = (await db
        .prepare(
          "SELECT referrals_count, career_level, cycle_sales_count FROM users WHERE id = ?"
        )
        .get(authUser.id)) as {
        referrals_count: number;
        career_level: string;
        cycle_sales_count: number;
      };

      const cycleCount = (await db
        .prepare("SELECT COUNT(*) as count FROM matrix_cycles WHERE user_id = ?")
        .get(authUser.id)) as { count: number };

      const nextMilestone = CAREER_MILESTONES.find((m) => m.count > user.referrals_count);
      const currentMilestone =
        [...CAREER_MILESTONES].reverse().find((m) => m.count <= user.referrals_count) ||
        ({ count: 0, level: "NONE" } as const);

      res.json({
        referrals: user.referrals_count,
        cycles: cycleCount.count,
        networkSales: user.cycle_sales_count,
        currentLevel: user.career_level,
        nextMilestone,
        currentMilestone,
        progressToNext: nextMilestone
          ? ((user.referrals_count - currentMilestone.count) /
              (nextMilestone.count - currentMilestone.count)) *
            100
          : 100,
      });
    } catch {
      res.status(500).json({ error: "Erro ao buscar progresso" });
    }
  });

  return router;
}
