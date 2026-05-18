import type { Request, Response } from "express";
import { settingsService } from "../services/settings_service.ts";

export const settingsController = {
  getBanner: async (_req: Request, res: Response): Promise<void> => {
    try {
      const payload = await settingsService.getBanner();
      res.json(payload);
    } catch {
      res.status(500).json({ error: "Erro interno" });
    }
  },

  getLogo: async (_req: Request, res: Response): Promise<void> => {
    try {
      const payload = await settingsService.getLogo();
      res.json(payload);
    } catch {
      res.status(500).json({ error: "Erro interno" });
    }
  },
};
