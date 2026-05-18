import type { Response } from "express";
import { HttpError } from "../interfaces/errors.ts";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.ts";
import { financialService } from "../services/financial_service.ts";

function handleFinancialError(
  err: unknown,
  res: Response,
  fallbackMessage: string,
  status = 500
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(fallbackMessage, err);
  res.status(status).json({ error: fallbackMessage });
}

export const financialController = {
  listTransactions: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const transactions = await financialService.listTransactions(req.user.id);
      res.json(transactions);
    } catch (err) {
      handleFinancialError(err, res, "Erro interno do servidor");
    }
  },

  listVouchers: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const vouchers = await financialService.listVouchers(req.user.id);
      res.json(vouchers);
    } catch {
      res.status(500).json({ error: "Erro ao buscar vouchers" });
    }
  },

  useCashback: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { amount, serviceName } = req.body as { amount?: number; serviceName?: string };
      const result = await financialService.useCashback(
        req.user.id,
        amount ?? 0,
        serviceName ?? ""
      );
      res.json(result);
    } catch (err) {
      handleFinancialError(err, res, "Erro ao processar uso de cashback");
    }
  },

  deposit: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { amount } = req.body as { amount?: number };
      const result = await financialService.deposit(req.user.id, amount ?? 0);
      res.json(result);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "Erro ao processar depósito";
      res.status(400).json({ error: message });
    }
  },

  withdraw: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { amount, pixKey } = req.body as { amount?: number; pixKey?: string };
      const result = await financialService.withdraw(
        req.user.id,
        amount ?? 0,
        pixKey ?? ""
      );
      res.json(result);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "Erro ao processar saque";
      res.status(400).json({ error: message });
    }
  },

  purchaseVoucher: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { amount } = req.body as { amount?: number };
      const result = await financialService.purchaseVoucher(req.user.id, amount ?? 0);
      res.json(result);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: "Erro ao adquirir voucher" });
    }
  },

  sendVoucher: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { voucherId, recipientId, recipientEmail, recipientPhone } = req.body as {
        voucherId?: string;
        recipientId?: string;
        recipientEmail?: string;
        recipientPhone?: string;
      };
      const result = await financialService.sendVoucher(
        req.user.id,
        voucherId ?? "",
        recipientId,
        recipientEmail,
        recipientPhone
      );
      res.json(result);
    } catch (err) {
      handleFinancialError(err, res, "Erro ao enviar voucher");
    }
  },
};
