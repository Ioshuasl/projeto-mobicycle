import type { Request, Response } from "express";
import { adminMaintenanceService } from "../../services/admin/maintenance_service.ts";

function handleResetFailure(res: Response, error: string | undefined, fallback: string): void {
  res.status(500).json({ error: error || fallback });
}

export const adminMaintenanceController = {
  resetAll: async (_req: Request, res: Response): Promise<void> => {
    try {
      console.log("DEBUG: [POST /api/admin/reset-all] Full system reset requested");
      const result = await adminMaintenanceService.resetSystem();
      if (!result.success) {
        handleResetFailure(res, result.error, "Erro interno ao resetar sistema");
        return;
      }
      res.json({ success: true, message: "Sistema resetado com sucesso!" });
    } catch (err) {
      console.error("Error in /api/admin/reset-all:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Erro interno do servidor ao resetar",
      });
    }
  },

  clearGhosts: async (_req: Request, res: Response): Promise<void> => {
    try {
      console.log("DEBUG: Clearing ghost entries...");
      await adminMaintenanceService.clearGhosts();
      res.json({ success: true, message: "Entradas fantasmas removidas com sucesso!" });
    } catch (err) {
      console.error("Error in /api/admin/clear-ghosts:", err);
      res.status(500).json({ error: "Erro interno do servidor ao limpar fantasmas" });
    }
  },

  seed: async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await adminMaintenanceService.resetSystem();
      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (err) {
      console.error("Error in /api/admin/seed:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Erro interno do servidor",
      });
    }
  },

  forceReset: async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await adminMaintenanceService.resetSystem();
      if (result.success) {
        res.json({ success: true, message: "Sistema resetado com sucesso!" });
      } else {
        handleResetFailure(res, result.error, "Erro ao resetar sistema");
      }
    } catch (err) {
      console.error("Error in /api/admin/force-reset:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Erro interno do servidor",
      });
    }
  },
};
