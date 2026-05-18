import type { Response } from "express";
import { HttpError } from "../interfaces/errors.ts";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.ts";
import { gamificationService } from "../services/gamification_service.ts";

export const gamificationController = {
  leaderboard: async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const topUsers = await gamificationService.getLeaderboard();
      res.json(topUsers);
    } catch {
      res.status(500).json({ error: "Erro ao buscar ranking" });
    }
  },

  rankings: async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rankings = await gamificationService.getRankings();
      res.json(rankings);
    } catch {
      res.status(500).json({ error: "Erro ao buscar rankings" });
    }
  },

  achievements: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const badges = await gamificationService.getAchievements(req.user.id);
      res.json(badges);
    } catch {
      res.status(500).json({ error: "Erro ao buscar conquistas" });
    }
  },

  progress: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const progress = await gamificationService.getProgress(req.user.id);
      res.json(progress);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: "Erro ao buscar progresso" });
    }
  },
};
