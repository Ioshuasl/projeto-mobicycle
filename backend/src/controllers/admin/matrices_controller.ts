import type { Request, Response } from "express";
import { HttpError } from "../../interfaces/errors.ts";
import {
  adminMatricesService,
  type AdminFillMatrixInput,
} from "../../services/admin/matrices_service.ts";

export const adminMatricesController = {
  summary: async (_req: Request, res: Response): Promise<void> => {
    try {
      const matrices = await adminMatricesService.getSummary();
      res.json(matrices);
    } catch (err) {
      console.error("Error in /api/admin/matrices/summary:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },

  fillMatrix: async (req: Request, res: Response): Promise<void> => {
    try {
      const outcome = await adminMatricesService.fillMatrix(req.body as AdminFillMatrixInput);
      if (!outcome.ok) {
        res.status(400).json(outcome.body);
        return;
      }
      res.json({ success: true, cycleInfo: outcome.cycleInfo });
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error("Error in /api/admin/fill-matrix:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },

  details: async (req: Request, res: Response): Promise<void> => {
    try {
      const details = await adminMatricesService.getDetails(req.params.id);
      res.json(details);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error("Error in /api/admin/matrix/:id/details:", err);
      res.status(500).json({ error: "Erro ao buscar detalhes da matriz" });
    }
  },
};
