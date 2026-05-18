import type { Response } from "express";
import { HttpError } from "../interfaces/errors.ts";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.ts";
import { documentService } from "../services/document_service.ts";

export const documentController = {
  list: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const documents = await documentService.listForUser(req.user.id);
      res.json(documents);
    } catch (err) {
      console.error("Error in /api/documents:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },

  upload: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await documentService.upload(req.user, req.body);
      res.json(result);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error("Error in /api/documents/upload:", err);
      res.status(500).json({ error: "Erro ao processar documento" });
    }
  },
};
