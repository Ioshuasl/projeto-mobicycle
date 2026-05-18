import type { Request, Response } from "express";
import { HttpError } from "../interfaces/errors.ts";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.ts";
import { pushService } from "../services/push_service.ts";

export const pushController = {
  getVapidPublicKey: async (_req: Request, res: Response): Promise<void> => {
    try {
      const payload = await pushService.getVapidPublicKey();
      res.json(payload);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: "Erro interno" });
    }
  },

  subscribe: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { subscription, userId } = req.body as {
        subscription?: unknown;
        userId?: string;
      };
      const result = await pushService.subscribe(req.user, userId, subscription);
      res.json(result);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error("Error in /api/push/subscribe:", err);
      res.status(500).json({ error: "Erro interno" });
    }
  },
};
