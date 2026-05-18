import type { Response } from "express";
import { HttpError } from "../interfaces/errors.ts";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.ts";
import { matrixService } from "../services/matrix_service.ts";

function handleMatrixError(err: unknown, res: Response, fallbackMessage: string): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(fallbackMessage, err);
  res.status(500).json({ error: fallbackMessage });
}

export const matrixController = {
  history: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const history = await matrixService.getHistory(req.user.id);
      res.json(history);
    } catch {
      res.status(500).json({ error: "Erro interno" });
    }
  },

  list: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const matrices = await matrixService.listMatrices(req.user, {
        type: req.query.type as string | undefined,
        page: req.query.page as string | undefined,
        limit: req.query.limit as string | undefined,
      });
      res.json(matrices);
    } catch (err) {
      handleMatrixError(err, res, "Erro ao buscar matrizes");
    }
  },

  join: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId, referrerId } = req.body as { userId?: string; referrerId?: string };
      const outcome = await matrixService.join(req.user, userId ?? "", referrerId);
      if (!outcome.ok) {
        res.status(400).json(outcome.body);
        return;
      }
      res.json({ success: true, cycleInfo: outcome.cycleInfo });
    } catch (err) {
      handleMatrixError(err, res, "Erro interno do servidor");
    }
  },

  reentry: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.body as { userId?: string };
      const outcome = await matrixService.reentry(req.user, userId ?? "");
      if (!outcome.ok) {
        res.status(400).json(outcome.body);
        return;
      }
      res.json({ success: true, cycleInfo: outcome.cycleInfo });
    } catch (err) {
      handleMatrixError(err, res, "Erro interno do servidor");
    }
  },

  userMatrix: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await matrixService.getUserMatrix(req.user, req.params.targetId);
      res.json(result);
    } catch (err) {
      console.error("Error in /api/user/matrix/:targetId:", err);
      res.status(500).json({ error: "Erro interno" });
    }
  },
};
