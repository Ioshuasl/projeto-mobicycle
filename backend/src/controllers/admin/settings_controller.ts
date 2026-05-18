import type { Request, Response } from "express";
import { HttpError } from "../../interfaces/errors.ts";
import { settingsService } from "../../services/settings_service.ts";

export const adminSettingsController = {
  getAll: async (_req: Request, res: Response): Promise<void> => {
    try {
      const settings = await settingsService.getAllSettings();
      res.json(settings);
    } catch {
      res.status(500).json({ error: "Erro interno" });
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const { settings } = req.body as { settings?: Record<string, unknown> };
      const result = await settingsService.updateSettings(settings);
      res.json(result);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: "Erro interno" });
    }
  },

  setBanner: async (req: Request, res: Response): Promise<void> => {
    try {
      const { url } = req.body as { url?: string };
      const result = await settingsService.setBannerUrl(url);
      res.json(result);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: "Erro interno" });
    }
  },

  clearImageCache: async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await settingsService.clearImageCache();
      res.json(result);
    } catch (err) {
      console.error("Error clearing image cache:", err);
      res.status(500).json({ error: "Erro ao limpar cache de imagens" });
    }
  },

  generateLogoGet: async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await settingsService.generateLogoToPublic();
      res.json(result);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      res.status(500).json({
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  },

  generateLogoPost: async (_req: Request, res: Response): Promise<void> => {
    try {
      console.log("Generating logo via API...");
      const result = await settingsService.generateLogoToPublic();
      res.json(result);
    } catch (err) {
      console.error("Error generating logo:", err);
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to generate logo",
      });
    }
  },
};
