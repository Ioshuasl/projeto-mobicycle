import type { Response } from "express";
import { HttpError } from "../interfaces/errors.ts";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.ts";
import { sessionService } from "../services/session_service.ts";

export const sessionController = {
  me: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = await sessionService.getMe(req.user.id);
      res.json(user);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error("Error in /api/me:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },

  init: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const payload = await sessionService.getInit(req.user);
      res.json(payload);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error("Error in /api/init:", err);
      res.status(500).json({
        error: "Erro interno do servidor",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  },
};
