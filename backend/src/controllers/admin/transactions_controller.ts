import type { Request, Response } from "express";
import { HttpError } from "../../interfaces/errors.ts";
import { adminTransactionsService } from "../../services/admin/transactions_service.ts";

export const adminTransactionsController = {
  listDocuments: async (_req: Request, res: Response): Promise<void> => {
    try {
      const documents = await adminTransactionsService.listDocuments();
      res.json(documents);
    } catch (err) {
      console.error("Error in /api/admin/documents:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },

  listTransactions: async (_req: Request, res: Response): Promise<void> => {
    try {
      const transactions = await adminTransactionsService.listTransactions();
      res.json(transactions);
    } catch (err) {
      console.error("Error in /api/admin/transactions:", err);
      res.status(500).json({ error: "Erro interno ao buscar transações" });
    }
  },

  clawback: async (req: Request, res: Response): Promise<void> => {
    try {
      await adminTransactionsService.processClawback(req.params.id);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error("Error in clawback:", err);
      res.status(500).json({ error: "Erro ao processar estorno" });
    }
  },
};
